<#
  sa-account.ps1 - builds Unstuck Games' walled-off corner of SA's AWS account (962000089613),
  in us-east-2, and launches the box there. PLAN-SA-MOVE.md, phase P2.

  DRY RUN BY DEFAULT: it reads what exists and prints what it would create. Nothing changes.
  -Live creates what's missing. Run it again any time: what exists is left as it is.

    aws sso login --profile selfactual
    .\infra\sa-account.ps1
    .\infra\sa-account.ps1 -Live
    .\infra\sa-account.ps1 -Live -AlertEmail you@example.com   # also the $25 budget, with alerts

  What it makes, every piece tagged Project=unstuck and named unstuck-*:
    1. bucket   unstuck-box-962000089613: private, versioned
    2. role     unstuck-web + its instance profile. It can only: be run over SSM, call Nova and
                Claude on Bedrock, send mail as unstuck-games.com, read /unstuck/* parameters,
                and use its own bucket. No other IAM, no SA parameters, no SA buckets.
    3. firewall security group unstuck-web in the default VPC: 80 and 443 in, nothing else
    4. address  an Elastic IP named unstuck-web
    5. box      t4g.small, Amazon Linux 2023 arm64, 16 GB encrypted disk, IMDSv2 only,
                infra/bootstrap.sh as its first-boot script, then the address attached
    6. budget   "Unstuck monthly", $25, Project=unstuck only (only with -AlertEmail)
  It never touches anything outside that list, and never us-west-2.
#>
param([switch]$Live, [string]$AlertEmail)

$ErrorActionPreference = 'Continue'
$Profile_ = 'selfactual'
$Account  = '962000089613'
$Region   = 'us-east-2'
$Name     = 'unstuck-web'
$Bucket   = "unstuck-box-$Account"
$Tags     = @(@{ Key = 'Project'; Value = 'unstuck' })
$Here     = Split-Path -Parent $MyInvocation.MyCommand.Path
$Utf8     = New-Object System.Text.UTF8Encoding($false)
$P        = @('--profile', $Profile_, '--region', $Region)

function Say($t, $c = 'Gray') { Write-Host $t -ForegroundColor $c }
function Invoke-Aws { $out = & aws @args 2>$null; return @{ ok = ($LASTEXITCODE -eq 0); out = ($out | Out-String).Trim() } }
function JsonFile($obj) {
  $f = Join-Path $env:TEMP ('unstuck-' + [guid]::NewGuid().ToString('N') + '.json')
  # -InputObject, not the pipeline: PowerShell 5.1 unrolls a one-item array piped to ConvertTo-Json
  [IO.File]::WriteAllText($f, (ConvertTo-Json -InputObject $obj -Depth 12 -Compress), $Utf8)
  return $f
}
function Have($what) { Say ("  [have]   {0}" -f $what) 'DarkGray' }
function Make($what) { Say ("  [{0}] {1}" -f $(if ($Live) { 'make' } else { 'would' }), $what) $(if ($Live) { 'Yellow' } else { 'Cyan' }) }
function Fail($what) { Say "  FAILED   $what. Stopping; everything before this line is in place." 'Red'; exit 1 }

Say ("sa-account.ps1  -  {0}" -f $(if ($Live) { 'LIVE' } else { 'DRY RUN (add -Live to create what is missing)' })) $(if ($Live) { 'Yellow' } else { 'Cyan' })

$who = Invoke-Aws sts get-caller-identity --profile $Profile_ --query Account --output text
if (-not $who.ok) { Say "  profile '$Profile_' is not signed in. Run:  aws sso login --profile $Profile_" 'Red'; exit 1 }
if ($who.out -ne $Account) { Say "  profile '$Profile_' is account $($who.out), not $Account. Stopping." 'Red'; exit 1 }
Say "  account $Account, $Region" 'Green'

# ---------------------------------------------------------------- 1. bucket
if ((Invoke-Aws s3api head-bucket --bucket $Bucket @P).ok) { Have "bucket $Bucket" } else {
  Make "bucket $Bucket (private, versioned, tagged)"
  if ($Live) {
    if (-not (Invoke-Aws s3api create-bucket --bucket $Bucket --create-bucket-configuration LocationConstraint=$Region @P).ok) { Fail 'create the bucket' }
    Invoke-Aws s3api put-public-access-block --bucket $Bucket --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" @P | Out-Null
    Invoke-Aws s3api put-bucket-versioning --bucket $Bucket --versioning-configuration Status=Enabled @P | Out-Null
    Invoke-Aws s3api put-bucket-tagging --bucket $Bucket --tagging 'TagSet=[{Key=Project,Value=unstuck}]' @P | Out-Null
  }
}

# ---------------------------------------------------------------- 2. role and instance profile
$trust = @{ Version = '2012-10-17'; Statement = @(@{ Effect = 'Allow'; Principal = @{ Service = 'ec2.amazonaws.com' }; Action = 'sts:AssumeRole' }) }
$access = @{ Version = '2012-10-17'; Statement = @(
  @{ Sid = 'Bedrock'; Effect = 'Allow'
     Action = @('bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream')
     Resource = @('arn:aws:bedrock:*::foundation-model/amazon.nova-*',
                  'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
                  "arn:aws:bedrock:*:${Account}:inference-profile/us.amazon.nova-*",
                  "arn:aws:bedrock:*:${Account}:inference-profile/us.anthropic.claude-*") },
  @{ Sid = 'Mail'; Effect = 'Allow'; Action = @('ses:SendEmail', 'ses:SendRawEmail')
     Resource = "arn:aws:ses:${Region}:${Account}:identity/*"
     Condition = @{ StringLike = @{ 'ses:FromAddress' = '*@unstuck-games.com' } } },
  @{ Sid = 'Settings'; Effect = 'Allow'; Action = @('ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath')
     Resource = @("arn:aws:ssm:${Region}:${Account}:parameter/unstuck", "arn:aws:ssm:${Region}:${Account}:parameter/unstuck/*") },
  @{ Sid = 'Bucket'; Effect = 'Allow'; Action = 's3:ListBucket'; Resource = "arn:aws:s3:::$Bucket" },
  @{ Sid = 'BucketFiles'; Effect = 'Allow'; Action = @('s3:GetObject', 's3:PutObject', 's3:DeleteObject'); Resource = "arn:aws:s3:::$Bucket/*" }
) }

if ((Invoke-Aws iam get-role --role-name $Name --profile $Profile_).ok) { Have "role $Name" } else {
  Make "role $Name (trusted by EC2 only)"
  if ($Live) {
    $f = JsonFile $trust
    $ok = (Invoke-Aws iam create-role --role-name $Name --assume-role-policy-document "file://$f" --tags "Key=Project,Value=unstuck" --profile $Profile_).ok
    Remove-Item $f; if (-not $ok) { Fail 'create the role' }
  }
}
Make "role policy $Name-access: Bedrock (Nova, Claude), SES as @unstuck-games.com, /unstuck/* parameters, its bucket (always rewritten, so it matches this file)"
Make "managed policy AmazonSSMManagedInstanceCore on $Name"
if ($Live) {
  $f = JsonFile $access
  $ok = (Invoke-Aws iam put-role-policy --role-name $Name --policy-name "$Name-access" --policy-document "file://$f" --profile $Profile_).ok
  Remove-Item $f; if (-not $ok) { Fail 'write the role policy' }
  if (-not (Invoke-Aws iam attach-role-policy --role-name $Name --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore --profile $Profile_).ok) { Fail 'attach the SSM policy' }
}
$ip_ = Invoke-Aws iam get-instance-profile --instance-profile-name $Name --profile $Profile_ --query 'InstanceProfile.Roles[].RoleName' --output text
if ($ip_.ok) { Have "instance profile $Name (roles: $($ip_.out))" } else {
  Make "instance profile $Name, holding the role"
  if ($Live) {
    if (-not (Invoke-Aws iam create-instance-profile --instance-profile-name $Name --tags "Key=Project,Value=unstuck" --profile $Profile_).ok) { Fail 'create the instance profile' }
    if (-not (Invoke-Aws iam add-role-to-instance-profile --instance-profile-name $Name --role-name $Name --profile $Profile_).ok) { Fail 'put the role in the instance profile' }
    Say '           waiting 15s: a new instance profile takes a moment to be usable' 'DarkGray'; Start-Sleep -Seconds 15
  }
}

# ---------------------------------------------------------------- 3. security group
$vpc = (Invoke-Aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text @P).out
if (-not $vpc -or $vpc -eq 'None') { Fail "find the default VPC in $Region" }
$sg = (Invoke-Aws ec2 describe-security-groups --filters "Name=group-name,Values=$Name" "Name=vpc-id,Values=$vpc" --query 'SecurityGroups[0].GroupId' --output text @P).out
if ($sg -and $sg -ne 'None') { Have "security group $Name ($sg)" } else {
  Make "security group $Name in ${vpc}: 80 and 443 from anywhere, nothing else (no SSH)"
  if ($Live) {
    $sg = (Invoke-Aws ec2 create-security-group --group-name $Name --description 'unstuck-games.com: http and https only' --vpc-id $vpc --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=unstuck-web},{Key=Project,Value=unstuck}]' --query GroupId --output text @P).out
    if (-not $sg) { Fail 'create the security group' }
    $rules = JsonFile @(
      @{ IpProtocol = 'tcp'; FromPort = 80; ToPort = 80; IpRanges = @(@{ CidrIp = '0.0.0.0/0' }); Ipv6Ranges = @(@{ CidrIpv6 = '::/0' }) },
      @{ IpProtocol = 'tcp'; FromPort = 443; ToPort = 443; IpRanges = @(@{ CidrIp = '0.0.0.0/0' }); Ipv6Ranges = @(@{ CidrIpv6 = '::/0' }) })
    $ok = (Invoke-Aws ec2 authorize-security-group-ingress --group-id $sg --ip-permissions "file://$rules" @P).ok
    Remove-Item $rules; if (-not $ok) { Fail 'open 80 and 443' }
  }
}

# ---------------------------------------------------------------- 4. address
$eip = Invoke-Aws ec2 describe-addresses --filters "Name=tag:Name,Values=$Name" --query 'Addresses[0].[AllocationId,PublicIp,InstanceId]' --output text @P
$alloc = $null; $addr = $null; $attachedTo = $null
if ($eip.ok -and $eip.out -and $eip.out -ne 'None') { $alloc, $addr, $attachedTo = $eip.out -split '\s+' }
if ($alloc -and $alloc -ne 'None') { Have "address $addr ($alloc)" } else {
  Make "Elastic IP named $Name"
  if ($Live) {
    $r = Invoke-Aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=unstuck-web},{Key=Project,Value=unstuck}]' --query '[AllocationId,PublicIp]' --output text @P
    if (-not $r.ok) { Fail 'allocate the address' }
    $alloc, $addr = $r.out -split '\s+'
  }
}

# ---------------------------------------------------------------- 5. the box
$inst = (Invoke-Aws ec2 describe-instances --filters "Name=tag:Name,Values=$Name" 'Name=instance-state-name,Values=pending,running,stopping,stopped' --query 'Reservations[].Instances[].InstanceId' --output text @P).out
if ($inst -and $inst -ne 'None') { Have "box $inst" } else {
  $ami = (Invoke-Aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 --query Parameter.Value --output text @P).out
  Make "box: t4g.small, $ami (Amazon Linux 2023 arm64), 16 GB gp3 encrypted, IMDSv2 only, role $Name, bootstrap.sh as user data"
  if ($Live) {
    $ud = Join-Path $Here 'bootstrap.sh'
    if (-not (Test-Path $ud)) { Fail "find $ud" }
    # bash must never see a CR, whatever this checkout did to the line endings
    $udFile = Join-Path $env:TEMP ('unstuck-userdata-' + [guid]::NewGuid().ToString('N') + '.sh')
    [IO.File]::WriteAllText($udFile, ([IO.File]::ReadAllText($ud) -replace "`r", ''), $Utf8)
    $disk = JsonFile @(@{ DeviceName = '/dev/xvda'; Ebs = @{ VolumeSize = 16; VolumeType = 'gp3'; Encrypted = $true; DeleteOnTermination = $true } })
    $inst = $null
    for ($try = 1; $try -le 6 -and -not $inst; $try++) {
      $r = Invoke-Aws ec2 run-instances --image-id $ami --instance-type t4g.small --iam-instance-profile Name=$Name `
             --security-group-ids $sg --block-device-mappings "file://$disk" --user-data "file://$udFile" `
             --metadata-options "HttpTokens=required,HttpEndpoint=enabled" `
             --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=unstuck-web},{Key=Project,Value=unstuck}]' 'ResourceType=volume,Tags=[{Key=Name,Value=unstuck-web},{Key=Project,Value=unstuck}]' `
             --query 'Instances[0].InstanceId' --output text @P
      if ($r.ok -and $r.out) { $inst = $r.out } else { Say "           not yet (try $try of 6), waiting 10s" 'DarkGray'; Start-Sleep -Seconds 10 }
    }
    Remove-Item $udFile, $disk -ErrorAction SilentlyContinue
    if (-not $inst) { Fail 'launch the box' }
    Say "           launched $inst, waiting for it to run" 'DarkGray'
    aws ec2 wait instance-running --instance-ids $inst @P
  }
}
if ($alloc -and $inst -and $attachedTo -ne $inst) {
  Make "attach $addr to $inst"
  if ($Live -and -not (Invoke-Aws ec2 associate-address --allocation-id $alloc --instance-id $inst @P).ok) { Fail 'attach the address' }
}

# ---------------------------------------------------------------- 6. budget
if ($AlertEmail) {
  $have = (Invoke-Aws budgets describe-budget --account-id $Account --budget-name 'Unstuck monthly' --profile $Profile_).ok
  if ($have) { Have 'budget Unstuck monthly' } else {
    Make "budget 'Unstuck monthly', `$25, Project=unstuck only, alerts at 80% actual and 100% forecast"
    if ($Live) {
      $b = JsonFile @{ BudgetName = 'Unstuck monthly'; BudgetType = 'COST'; TimeUnit = 'MONTHLY'; BudgetLimit = @{ Amount = '25'; Unit = 'USD' }
                       CostFilters = @{ TagKeyValue = @('user:Project$unstuck') } }
      $n = JsonFile @(
        @{ Notification = @{ NotificationType = 'ACTUAL'; ComparisonOperator = 'GREATER_THAN'; Threshold = 80; ThresholdType = 'PERCENTAGE' }; Subscribers = @(@{ SubscriptionType = 'EMAIL'; Address = $AlertEmail }) },
        @{ Notification = @{ NotificationType = 'FORECASTED'; ComparisonOperator = 'GREATER_THAN'; Threshold = 100; ThresholdType = 'PERCENTAGE' }; Subscribers = @(@{ SubscriptionType = 'EMAIL'; Address = $AlertEmail }) })
      $ok = (Invoke-Aws budgets create-budget --account-id $Account --budget "file://$b" --notifications-with-subscribers "file://$n" --profile $Profile_).ok
      Remove-Item $b, $n; if (-not $ok) { Fail 'create the budget' }
    }
  }
  Make 'cost allocation tag Project switched on (a budget can only filter by a tag that is switched on; AWS may refuse until it has seen the tag on a bill, so this one is allowed to fail)'
  if ($Live) { Invoke-Aws ce update-cost-allocation-tags-status --cost-allocation-tags-status "TagKey=Project,Status=Active" --profile $Profile_ | Out-Null }
} else { Say '  [skip]   budget: pass -AlertEmail to add it' 'DarkGray' }

Say ''
if (-not $Live) { Say 'Nothing was changed. Run again with -Live to create what is marked [would].' 'Cyan'; exit 0 }
Say "Done. The box is $inst at $addr. Its first boot runs bootstrap.sh (a few minutes)." 'Green'
Say 'Next:  .\infra\box.ps1 check -Box sa        (dry, then -Live once SSM sees the box)' 'Green'
