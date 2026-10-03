<#
  Deploy The Last Warren to last-warren.unstuck-games.com.

  DRY RUN BY DEFAULT. Without -Live it checks everything and prints the commands it would
  send to the box, and sends nothing. With -Live it sends them over SSM, one step at a time,
  and stops at the first failure.

  The steps (all on the box, through SSM - there is no SSH):
    1. git pull --ff-only in /srv/unstuck            (main must already contain the game)
    2. install infra/nginx/unstuck.conf, nginx -t, reload
    3. expand the Let's Encrypt certificate to include last-warren.unstuck-games.com
    4. reload nginx so the new certificate is served
    5. check https://last-warren.unstuck-games.com/ and /play/ answer 200

  Run from the repo root, after `aws login`:
    .\infra\deploy-last-warren.ps1          # dry run
    .\infra\deploy-last-warren.ps1 -Live    # do it
#>
param([switch]$Live)

$ErrorActionPreference = 'Stop'
$Region   = 'us-east-2'
$Instance = 'i-0da082b463daa7314'
$Host5    = 'last-warren.unstuck-games.com'
$Names    = @('unstuck-games.com','www.unstuck-games.com','orbis.unstuck-games.com','badmonkeys.unstuck-games.com',
              'ferretbowling.unstuck-games.com','elsewhere.unstuck-games.com','deadline.unstuck-games.com',
              'seren.unstuck-games.com', $Host5)
$CertArgs = ($Names | ForEach-Object { "-d $_" }) -join ' '

$Steps = @(
  @{ name = 'pull';    cmd = 'cd /srv/unstuck && git pull --ff-only && git log --oneline -1' },
  @{ name = 'nginx';   cmd = 'cp /srv/unstuck/infra/nginx/unstuck.conf /etc/nginx/conf.d/unstuck.conf && nginx -t && systemctl reload nginx' },
  @{ name = 'cert';    cmd = "certbot certonly --webroot -w /srv/unstuck --cert-name unstuck-games.com --expand --non-interactive $CertArgs" },
  @{ name = 'reload';  cmd = 'nginx -t && systemctl reload nginx' },
  @{ name = 'check';   cmd = "curl -s -o /dev/null -w 'page %{http_code} ' https://$Host5/ && curl -s -o /dev/null -w 'play %{http_code}' https://$Host5/play/" }
)

function Say($t, $c = 'Gray') { Write-Host $t -ForegroundColor $c }

# ---- checks that are safe in a dry run
Say "The Last Warren deploy  -  $(if ($Live) { 'LIVE' } else { 'DRY RUN (add -Live to send)' })" $(if ($Live) { 'Yellow' } else { 'Cyan' })

try { $ip = (Resolve-DnsName $Host5 -Type A -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -First 1).IPAddress } catch { $ip = $null }
if ($ip -eq '3.23.50.161') { Say "  DNS        $Host5 -> $ip" 'Green' } else { Say "  DNS        $Host5 does not resolve to 3.23.50.161 yet (got '$ip'). The certificate step will fail until it does." 'Red'; if ($Live) { exit 1 } }

git fetch -q origin 2>$null
$mainHasGame = git ls-tree --name-only origin/main the-last-warren 2>$null
if ($mainHasGame) { Say "  main       origin/main contains the-last-warren/" 'Green' } else { Say "  main       origin/main does not contain the-last-warren/ yet: merge the PR first." 'Red'; if ($Live) { exit 1 } }

try { $who = aws sts get-caller-identity --query Arn --output text 2>$null; if (-not $who) { throw 'no identity' }; Say "  AWS        $who" 'Green' }
catch { Say "  AWS        not logged in: run 'aws login' and try again." 'Red'; if ($Live) { exit 1 } }

Say ''
foreach ($s in $Steps) { Say ("  {0,-7} {1}" -f $s.name, $s.cmd) }
if (-not $Live) { Say "`nNothing was sent. Run again with -Live to do it." 'Cyan'; exit 0 }

# ---- live: one SSM command per step, waiting for each
foreach ($s in $Steps) {
  Say "`n> $($s.name)" 'Yellow'
  $params = Join-Path $env:TEMP "lw-ssm-$($s.name).json"
  @{ commands = @($s.cmd) } | ConvertTo-Json -Compress | Set-Content -Path $params -Encoding ascii
  $id = aws ssm send-command --region $Region --instance-ids $Instance --document-name AWS-RunShellScript `
        --parameters "file://$params" --query Command.CommandId --output text
  do {
    Start-Sleep -Seconds 2
    $inv = aws ssm get-command-invocation --region $Region --command-id $id --instance-id $Instance --output json 2>$null | ConvertFrom-Json
  } while ($inv -and ($inv.Status -eq 'Pending' -or $inv.Status -eq 'InProgress' -or $inv.Status -eq 'Delayed'))
  if ($inv.StandardOutputContent) { Say $inv.StandardOutputContent.Trim() }
  if ($inv.Status -ne 'Success') {
    Say "Step '$($s.name)' ended $($inv.Status):" 'Red'
    if ($inv.StandardErrorContent) { Say $inv.StandardErrorContent.Trim() 'Red' }
    Say 'Stopped. Nothing after this step was sent.' 'Red'
    exit 1
  }
}
Say "`nLive: https://$Host5/  -  https://$Host5/play/" 'Green'
