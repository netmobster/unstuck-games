<#
  box.ps1 - runs one named step on an unstuck-games.com box, over SSM.

  DRY RUN BY DEFAULT. Without -Live it checks which account each AWS profile is signed in
  to and prints exactly what it would send. With -Live it sends it, waits for the box, and
  prints what the box said. Claude writes these steps; a person runs them.

    .\infra\box.ps1                    # list the steps
    .\infra\box.ps1 check              # dry run: show what 'check' would send
    .\infra\box.ps1 check -Live        # do it

  The new box uses the default AWS profile (account 968053968391). The old box uses the
  profile 'unstuck-old' (account 970376923067). Sign them in with:
    aws login
    aws login --profile unstuck-old --region us-east-2
#>
param([Parameter(Position = 0)][string]$Step, [switch]$Live)

$ErrorActionPreference = 'Continue'
$Region = 'us-east-2'
$Bucket = 'unstuck-box-968053968391'
$NewIp  = '18.225.22.191'
$OldIp  = '3.23.50.161'
$Ns     = 'ns1046.ui-dns.com'
$Boxes  = @{
  new = @{ instance = 'i-071b14e3c340dca70'; profile = 'default';     account = '968053968391'; login = 'aws login' }
  old = @{ instance = 'i-0da082b463daa7314'; profile = 'unstuck-old'; account = '970376923067'; login = 'aws login --profile unstuck-old --region us-east-2' }
}
$Names = @('unstuck-games.com', 'www.unstuck-games.com', 'orbis.unstuck-games.com', 'badmonkeys.unstuck-games.com',
           'ferretbowling.unstuck-games.com', 'elsewhere.unstuck-games.com', 'deadline.unstuck-games.com',
           'seren.unstuck-games.com', 'last-warren.unstuck-games.com', 'elsible.unstuck-games.com')

# ---------------------------------------------------------------- the steps, in the order they are used
$Steps = [ordered]@{}

$Steps['old-check'] = @{ box = 'old'; what = 'Read-only: what the old box runs, its env names (never values), its data and certificate'; script = @'
. /etc/os-release; echo "$PRETTY_NAME $(uname -m)"
git -C /srv/unstuck log --oneline -1
echo "== services"
for s in nginx elsewhere unstuck-contact unstuck-feed.timer seren; do printf '  %-22s %s\n' "$s" "$(systemctl is-active $s)"; done
echo "== every unit in /etc/systemd/system"; ls /etc/systemd/system/*.service /etc/systemd/system/*.timer 2>/dev/null | xargs -n1 basename | paste -sd' '
echo "== env names, values not shown"
for f in /etc/*.env; do echo "  $f: $(sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' "$f" | paste -sd' ')"; done
echo "== data"; du -sh /srv/* 2>/dev/null
echo "== /srv/seren"; ls /srv/seren 2>/dev/null | paste -sd' '
echo "  player folders: $(ls -d /srv/seren/players/*/ 2>/dev/null | wc -l)"
echo "== certificate"; certbot certificates 2>/dev/null | grep -E 'Domains|Expiry'
echo "== cron"; crontab -l 2>/dev/null; ls /etc/cron.d 2>/dev/null | paste -sd' '
'@ }

$Steps['check'] = @{ box = 'new'; what = 'Read-only: the new box - build, services, nginx, certificate, Nova from its role, SEREN data'; script = @'
. /etc/os-release; echo "$PRETTY_NAME $(uname -m), $(python3 --version)"
echo "== repo";  git -C /srv/unstuck log --oneline -1
echo "== build"; tail -n 1 /var/log/unstuck-bootstrap.log
echo "== services"
for s in nginx unstuck-contact unstuck-feed.timer certbot-renew-unstuck.timer elsewhere seren; do printf '  %-30s %s\n' "$s" "$(systemctl is-active $s)"; done
echo "== nginx"; nginx -t 2>&1 | tail -n 1; echo "  conf.d/unstuck.conf: $(wc -l < /etc/nginx/conf.d/unstuck.conf) lines"
echo "== certificate"; certbot certificates 2>/dev/null | grep -E 'Domains|Expiry' || echo "  none yet"
echo "== Nova, through the box's own role"
python3 - <<'PY'
import boto3
c = boto3.client("bedrock-runtime", region_name="us-east-2")
for m in ("amazon.nova-micro-v1:0", "us.amazon.nova-lite-v1:0", "us.amazon.nova-pro-v1:0"):
    try:
        r = c.converse(modelId=m, messages=[{"role": "user", "content": [{"text": "Reply with one word: ready"}]}], inferenceConfig={"maxTokens": 5})
        print("  %-26s %s" % (m, r["output"]["message"]["content"][0]["text"].strip()))
    except Exception as e:
        print("  %-26s FAILED %s" % (m, str(e)[:160]))
PY
echo "== /srv/seren"; du -sh /srv/seren; ls /srv/seren | paste -sd' '
'@ }

$Steps['nginx-http'] = @{ box = 'new'; what = 'Port 80 only until the first certificate exists (fixes the first boot), then reload nginx'; script = @'
set -e
cd /srv/unstuck
if [ -f /etc/letsencrypt/live/unstuck-games.com/fullchain.pem ]; then
  cp infra/nginx/unstuck.conf /etc/nginx/conf.d/unstuck.conf
else
  sed -n '/plain http: renewals/,$p' infra/nginx/unstuck.conf > /etc/nginx/conf.d/unstuck.conf
fi
nginx -t
systemctl reload nginx
echo "nginx reloaded, conf.d/unstuck.conf has $(wc -l < /etc/nginx/conf.d/unstuck.conf) lines"
'@ }

$Steps['pull'] = @{ box = 'new'; what = 'git pull on the new box (main must already have the change)'; script = @'
set -e
cd /srv/unstuck && git pull --ff-only && git log --oneline -1
'@ }

$Steps['feed'] = @{ box = 'new'; what = 'Fills the updates-page feed cache now, instead of waiting for the daily timer'; script = @'
systemctl start unstuck-feed.service
sleep 2
ls -la /srv/cache/feed.json && head -c 160 /srv/cache/feed.json; echo
'@ }

$Steps['contact-log'] = @{ box = 'new'; what = 'Read-only: the contact service''s last lines (did SES send, or keep it on disk only?) and the messages it holds'; script = @'
journalctl -u unstuck-contact -n 15 --no-pager
echo "== messages kept: $(ls /srv/contact 2>/dev/null | wc -l)"
'@ }

$Steps['seren-snapshot'] = @{ box = 'old'; what = 'Stops SEREN on the old box, packs /srv/seren and /etc/seren.env, uploads them to the new bucket (a one-hour upload link). SEREN stays stopped there, so nothing is written to the old copy.'; script = @'
set -e
systemctl stop seren
tar -czf /tmp/seren.tgz -C / srv/seren etc/seren.env
ls -la /tmp/seren.tgz
curl -sS --fail -T /tmp/seren.tgz '{{UPLOAD_URL}}'
rm -f /tmp/seren.tgz
echo "uploaded. SEREN is stopped on the old box."
'@ }

$Steps['seren-restore'] = @{ box = 'new'; what = 'Unpacks the snapshot into /srv/seren and /etc/seren.env, then makes new cookie and session secrets on the box (everyone signs in again once)'; script = @'
set -e
aws s3 cp s3://unstuck-box-968053968391/transfer/seren.tgz /tmp/seren.tgz --region us-east-2 --only-show-errors
rm -rf /tmp/seren-in && mkdir /tmp/seren-in && tar -xzf /tmp/seren.tgz -C /tmp/seren-in
if [ -n "$(ls -A /srv/seren)" ]; then mv /srv/seren /srv/seren.before-$(date +%s); mkdir /srv/seren; fi
cp -a /tmp/seren-in/srv/seren/. /srv/seren/
chown -R ec2-user:ec2-user /srv/seren
install -m 600 -o root -g root /tmp/seren-in/etc/seren.env /etc/seren.env
rm -rf /tmp/seren-in /tmp/seren.tgz
python3 /srv/unstuck/infra/unstuck-env.py seren --rotate SEREN_COOKIE_SECRET SEREN_SESSION_SECRET
du -sh /srv/seren
echo "player folders: $(ls -d /srv/seren/players/*/ 2>/dev/null | wc -l)"
python3 -c "import sqlite3; c = sqlite3.connect('/srv/seren/players/accounts.db'); print('accounts:', c.execute('select count(*) from accounts').fetchone()[0])" || echo "no accounts.db"
'@ }

$Steps['seren-start'] = @{ box = 'new'; what = 'Starts SEREN on the new box and checks it answers locally'; script = @'
systemctl enable --now seren
sleep 3
echo "seren: $(systemctl is-active seren)"
curl -s -o /dev/null -w 'the table answers on 127.0.0.1:8790 with %{http_code}\n' http://127.0.0.1:8790/
journalctl -u seren -n 12 --no-pager
'@ }

$Steps['cert'] = @{ box = 'new'; what = 'Let''s Encrypt certificate for every name whose DNS already points at the new box, then the full nginx config. Running it accepts the Let''s Encrypt subscriber agreement, as the old box did.'; script = @'
set -e
certbot certonly --webroot -w /srv/unstuck --cert-name unstuck-games.com --expand --non-interactive --agree-tos --register-unsafely-without-email {{DOMAINS}}
cp /srv/unstuck/infra/nginx/unstuck.conf /etc/nginx/conf.d/unstuck.conf
nginx -t
systemctl reload nginx
certbot certificates 2>/dev/null | grep -E 'Domains|Expiry'
'@ }

$Steps['seren-rollback'] = @{ box = 'old'; what = 'Undo: starts SEREN on the old box again. Then point seren back at the old IP in IONOS.'; script = @'
systemctl start seren
echo "seren on the old box: $(systemctl is-active seren). Now point seren's A record back at 3.23.50.161."
'@ }

# ---------------------------------------------------------------- helpers
function Say($t, $c = 'Gray') { Write-Host $t -ForegroundColor $c }

function MovedNames {
  $out = @()
  foreach ($n in $Names) {
    $ip = $null
    try { $ip = (Resolve-DnsName $n -Type A -Server $Ns -DnsOnly -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -First 1).IPAddress } catch { }
    if ($ip -eq $NewIp) { $out += $n }
  }
  return $out
}

function UploadUrl($key) {
  # A one-hour presigned PUT, signed with the new account's credentials for this one object.
  $c = aws configure export-credentials --format process | ConvertFrom-Json
  if (-not $c) { return $null }
  $env:AWS_ACCESS_KEY_ID = $c.AccessKeyId; $env:AWS_SECRET_ACCESS_KEY = $c.SecretAccessKey; $env:AWS_SESSION_TOKEN = $c.SessionToken
  $py = "import boto3; print(boto3.client('s3', region_name='$Region').generate_presigned_url('put_object', Params={'Bucket': '$Bucket', 'Key': '$key'}, ExpiresIn=3600))"
  $url = python -c $py
  Remove-Item Env:AWS_ACCESS_KEY_ID, Env:AWS_SECRET_ACCESS_KEY, Env:AWS_SESSION_TOKEN -ErrorAction SilentlyContinue
  return $url
}

# ---------------------------------------------------------------- list
if (-not $Step) {
  Say 'Steps (run one with:  .\infra\box.ps1 <step>   then add -Live to send it):' 'Cyan'
  foreach ($k in $Steps.Keys) { Say ("  {0,-15} [{1}] {2}" -f $k, $Steps[$k].box, $Steps[$k].what) }
  exit 0
}
if (-not $Steps.Contains($Step)) { Say "No step called '$Step'. Run .\infra\box.ps1 to list them." 'Red'; exit 1 }

$s   = $Steps[$Step]
$box = $Boxes[$s.box]
Say ("{0}  on the {1} box ({2})  -  {3}" -f $Step, $s.box, $box.instance, $(if ($Live) { 'LIVE' } else { 'DRY RUN (add -Live to send)' })) $(if ($Live) { 'Yellow' } else { 'Cyan' })
Say "  $($s.what)"

# ---------------------------------------------------------------- safe checks, dry run or not
$who = aws sts get-caller-identity --profile $box.profile --query Account --output text
if ($LASTEXITCODE -ne 0 -or -not $who) { Say "  AWS        profile '$($box.profile)' is not signed in. Run:  $($box.login)" 'Red'; exit 1 }
if ($who.Trim() -ne $box.account) { Say "  AWS        profile '$($box.profile)' is account $who, expected $($box.account). Stopping." 'Red'; exit 1 }
Say "  AWS        profile '$($box.profile)' is account $who" 'Green'

# A Windows checkout can turn this file's line endings into CRLF; bash on the box must never see a CR.
$script = $s.script.Replace("`r", '')
if ($Step -eq 'cert') {
  $moved = MovedNames
  if (-not $moved) { Say "  DNS        no name points at $NewIp yet. Move a record in IONOS first." 'Red'; exit 1 }
  Say "  DNS        pointing at the new box: $($moved -join ', ')" 'Green'
  $script = $script.Replace('{{DOMAINS}}', (($moved | ForEach-Object { "-d $_" }) -join ' '))
}
if ($script.Contains('{{UPLOAD_URL}}')) {
  if ($Live) {
    $url = UploadUrl 'transfer/seren.tgz'
    if (-not $url) { Say '  S3         could not make the upload link (is the default profile signed in, and boto3 installed?)' 'Red'; exit 1 }
    $script = $script.Replace('{{UPLOAD_URL}}', $url)
  } else {
    $script = $script.Replace('{{UPLOAD_URL}}', '<a one-hour upload link to s3://' + $Bucket + '/transfer/seren.tgz, made at send time>')
  }
}

Say ''
foreach ($line in ($script -split "`n")) { if ($line.Trim()) { Say "  | $line" 'DarkGray' } }
if (-not $Live) { Say "`nNothing was sent. Run again with -Live to do it." 'Cyan'; exit 0 }

# ---------------------------------------------------------------- live: send, wait, print
$params = Join-Path $env:TEMP "box-$Step.json"
@{ commands = @($script) } | ConvertTo-Json -Compress | Set-Content -Path $params -Encoding ascii
$id = aws ssm send-command --profile $box.profile --region $Region --instance-ids $box.instance --document-name AWS-RunShellScript `
      --comment "box.ps1 $Step" --parameters "file://$params" --query Command.CommandId --output text
Remove-Item $params -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0 -or -not $id) { Say 'Could not send the command.' 'Red'; exit 1 }
Say "`nsent ($id), waiting for the box..." 'Yellow'
$inv = $null
for ($i = 0; $i -lt 300; $i++) {
  Start-Sleep -Seconds 2
  $raw = aws ssm get-command-invocation --profile $box.profile --region $Region --command-id $id --instance-id $box.instance --output json
  if ($LASTEXITCODE -ne 0) { continue }
  $inv = $raw | Out-String | ConvertFrom-Json
  if ($inv.Status -ne 'Pending' -and $inv.Status -ne 'InProgress' -and $inv.Status -ne 'Delayed') { break }
}
if ($inv.StandardOutputContent) { Say $inv.StandardOutputContent.TrimEnd() }
if ($inv.Status -ne 'Success') {
  Say "`n$Step ended $($inv.Status)." 'Red'
  if ($inv.StandardErrorContent) { Say $inv.StandardErrorContent.TrimEnd() 'Red' }
  exit 1
}
Say "`n$Step done." 'Green'
