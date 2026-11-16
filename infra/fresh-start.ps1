<#
  fresh-start.ps1 - the settings and SEREN content for the box in SA's account, made new instead
  of copied from the old account (which can't be signed in to). PLAN-SA-MOVE.md, P2 fresh start.

  DRY RUN BY DEFAULT: shows what it would write. -Live writes. Run after infra\sa-account.ps1 -Live
  (the bucket has to exist).

    aws sso login --profile selfactual
    .\infra\fresh-start.ps1
    .\infra\fresh-start.ps1 -Live

  1. settings  /unstuck/seren/* and /unstuck/elsewhere/* in SA's Parameter Store, us-east-2.
               The plain ones come from infra/*.env.example. The secret ones are typed in here,
               hidden, and go to AWS through a file that is deleted at once; nothing is printed.
               Press Enter on a question to leave that setting out. A setting that already exists
               is kept unless -Overwrite. Cookie and session secrets are not asked for: the box
               makes them itself (seren-env, elsewhere-env).
  2. content   SEREN's private content (the corpus, campaigns, NPCs, the SRD library), packed from
               -Content (default: PROJECTS\UNSTUCK\seren\content) WITHOUT players/ (local accounts
               and saves), to s3://unstuck-box-962000089613/transfer/seren-content.tgz, where the
               box's seren-content step picks it up.
#>
param([switch]$Live, [switch]$Overwrite,
      [string]$Content = (Join-Path $env:USERPROFILE 'OneDrive\Desktop\PROJECTS\UNSTUCK\seren\content'))

$ErrorActionPreference = 'Continue'
$Prof    = 'selfactual'
$Account = '962000089613'
$Region  = 'us-east-2'
$Bucket  = "unstuck-box-$Account"
$Utf8    = New-Object System.Text.UTF8Encoding($false)

function Say($t, $c = 'Gray') { Write-Host $t -ForegroundColor $c }
function Invoke-Aws { $out = & aws @args 2>$null; return @{ ok = ($LASTEXITCODE -eq 0); out = ($out | Out-String).Trim() } }

Say ("fresh-start.ps1  -  {0}" -f $(if ($Live) { 'LIVE' } else { 'DRY RUN (add -Live to write)' })) $(if ($Live) { 'Yellow' } else { 'Cyan' })
$who = Invoke-Aws sts get-caller-identity --profile $Prof --query Account --output text
if (-not $who.ok) { Say "  profile '$Prof' is not signed in. Run:  aws sso login --profile $Prof" 'Red'; exit 1 }
if ($who.out -ne $Account) { Say "  profile '$Prof' is account $($who.out), not $Account. Stopping." 'Red'; exit 1 }
Say "  account $Account, $Region" 'Green'

# ---------------------------------------------------------------- 1. settings
# Plain settings, from the env examples (blank and secret lines left out).
$plain = @()
foreach ($svc in 'seren', 'elsewhere') {
  $file = Join-Path $PSScriptRoot "$svc.env.example"
  foreach ($line in [IO.File]::ReadAllLines($file)) {
    if ($line -match '^\s*([A-Z][A-Z0-9_]*)=(.+)$') {
      $plain += @{ svc = $svc; name = $Matches[1]; value = $Matches[2].Trim() }
    }
  }
}
# What a person decides: hidden = typed without showing.
$asked = @(
  @{ svc = 'seren';     name = 'SEREN_PASSWORD';             hidden = $true;  q = "SEREN's door password (new)" },
  @{ svc = 'elsewhere'; name = 'ELSEWHERE_PASSWORD';         hidden = $true;  q = "Elsewhere's door password (new)" },
  @{ svc = 'seren';     name = 'SEREN_GOOGLE_CLIENT_ID';     hidden = $false; q = 'Google sign-in client ID (Google Cloud, project seren-509216, client "SEREN web"; Enter = password door only)' },
  @{ svc = 'seren';     name = 'SEREN_GOOGLE_CLIENT_SECRET'; hidden = $true;  q = 'Google sign-in client secret (Enter = none)' },
  @{ svc = 'seren';     name = 'SEREN_ALLOW';                hidden = $false; q = 'Who may sign in with Google, comma-separated emails (Enter = anyone)' }
)

function Exists($n) { return (Invoke-Aws ssm get-parameter --name $n --profile $Prof --region $Region --query Parameter.Name --output text).ok }
function Put($n, $v, $type) {
  $f = Join-Path $env:TEMP ('param-' + [guid]::NewGuid().ToString('N') + '.json')
  [IO.File]::WriteAllText($f, (ConvertTo-Json -InputObject @{ Name = $n; Value = $v; Type = $type; Overwrite = $true } -Compress), $Utf8)
  try { $r = Invoke-Aws ssm put-parameter --cli-input-json "file://$f" --profile $Prof --region $Region } finally { Remove-Item $f -Force -ErrorAction SilentlyContinue }
  return $r.ok
}

Say "`n1. settings in Parameter Store" 'Cyan'
foreach ($p in $plain) {
  $n = "/unstuck/$($p.svc)/$($p.name)"
  if ((Exists $n) -and -not $Overwrite) { Say "  [have]   $n" 'DarkGray'; continue }
  Say ("  [{0}] {1} = {2}" -f $(if ($Live) { 'put' } else { 'would' }), $n, $p.value) $(if ($Live) { 'Yellow' } else { 'Cyan' })
  if ($Live -and -not (Put $n $p.value 'String')) { Say "  FAILED to write $n. Stopping." 'Red'; exit 1 }
}
foreach ($a in $asked) {
  $n = "/unstuck/$($a.svc)/$($a.name)"
  if ((Exists $n) -and -not $Overwrite) { Say "  [have]   $n" 'DarkGray'; continue }
  $type = $(if ($a.hidden) { 'SecureString' } else { 'String' })
  if (-not $Live) { Say "  [would]  $n ($type): asks you for it" 'Cyan'; continue }
  if ($a.hidden) {
    $s = Read-Host -AsSecureString "  $($a.q)"
    $v = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
  } else { $v = Read-Host "  $($a.q)" }
  if (-not $v) { Say "  [skip]   $n (left out)" 'DarkGray'; continue }
  $ok = Put $n $v $type; $v = $null
  if (-not $ok) { Say "  FAILED to write $n. Stopping." 'Red'; exit 1 }
  Say "  [put]    $n ($type)" 'Yellow'
}

# ---------------------------------------------------------------- 2. SEREN content
Say "`n2. SEREN content" 'Cyan'
if (-not (Test-Path (Join-Path $Content 'library'))) { Say "  No SEREN content at $Content (no library folder). Pass -Content <folder>." 'Red'; exit 1 }
$dirs = Get-ChildItem $Content -Directory | Where-Object { $_.Name -ne 'players' } | ForEach-Object { $_.Name }
$files = (Get-ChildItem $Content -Recurse -File | Where-Object { $_.FullName -notlike (Join-Path $Content 'players\*') }).Count
Say "  from $Content : $($dirs -join ', ') ($files files; players/ left out)"
if (-not (Invoke-Aws s3api head-bucket --bucket $Bucket --profile $Prof --region $Region).ok) {
  Say "  [wait]   bucket $Bucket doesn't exist yet: run infra\sa-account.ps1 -Live first" 'Red'; if ($Live) { exit 1 } else { exit 0 }
}
Say ("  [{0}] s3://{1}/transfer/seren-content.tgz" -f $(if ($Live) { 'put' } else { 'would' }), $Bucket) $(if ($Live) { 'Yellow' } else { 'Cyan' })
if ($Live) {
  $tgz = Join-Path $env:TEMP ('seren-content-' + [guid]::NewGuid().ToString('N') + '.tgz')
  try {
    & tar.exe -czf $tgz -C $Content @dirs
    if ($LASTEXITCODE -ne 0) { Say '  FAILED to pack the content' 'Red'; exit 1 }
    if (-not (Invoke-Aws s3 cp $tgz "s3://$Bucket/transfer/seren-content.tgz" --profile $Prof --region $Region --only-show-errors).ok) { Say '  FAILED to upload' 'Red'; exit 1 }
    Say ("  [put]    {0:N1} MB" -f ((Get-Item $tgz).Length / 1MB)) 'Yellow'
  } finally { Remove-Item $tgz -Force -ErrorAction SilentlyContinue }
}

Say ''
if (-not $Live) { Say 'Nothing was written. Run again with -Live to do it.' 'Cyan'; exit 0 }
Say 'Done. On the box:  .\infra\box.ps1 seren-content -Box sa -Live, then seren-env, elsewhere-env, the starts.' 'Green'
