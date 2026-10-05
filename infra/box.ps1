<#
  box.ps1 - runs one named step on an unstuck-games.com box, over SSM.

  DRY RUN BY DEFAULT. Without -Live it checks which account each AWS profile is signed in
  to and prints exactly what it would send. With -Live it sends it, waits for the box, and
  prints what the box said. Claude writes these steps; a person runs them.

    .\infra\box.ps1                    # list the steps
    .\infra\box.ps1 check              # dry run: show what 'check' would send
    .\infra\box.ps1 check -Live        # do it

  The box uses the default AWS profile (account 968053968391). Sign it in with:  aws login
  (The old box, in account 970376923067, is out of reach and has no steps here.)
#>
param([Parameter(Position = 0)][string]$Step, [switch]$Live)

$ErrorActionPreference = 'Continue'
# The box answers in UTF-8 (systemctl prints arrows). Without these the AWS CLI on Windows
# crashes trying to print them, and PowerShell garbles what it does print.
$env:PYTHONUTF8 = '1'; $env:PYTHONIOENCODING = 'utf-8'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$Region = 'us-east-2'
$Bucket = 'unstuck-box-968053968391'
$NewIp  = '18.225.22.191'
$Ns     = 'ns1046.ui-dns.com'
$Boxes  = @{
  new = @{ instance = 'i-071b14e3c340dca70'; profile = 'default';     account = '968053968391'; login = 'aws login' }
}
$Names = @('unstuck-games.com', 'www.unstuck-games.com', 'orbis.unstuck-games.com', 'badmonkeys.unstuck-games.com',
           'ferretbowling.unstuck-games.com', 'elsewhere.unstuck-games.com', 'deadline.unstuck-games.com',
           'seren.unstuck-games.com', 'last-warren.unstuck-games.com', 'elsible.unstuck-games.com')

# ---------------------------------------------------------------- the steps, in the order they are used
$Steps = [ordered]@{}

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

$Steps['nginx'] = @{ box = 'new'; what = 'Puts the repo''s nginx config in place, tests it, and reloads. Nothing is reloaded if the test fails'; script = @'
set -e
cp /etc/nginx/conf.d/unstuck.conf /tmp/unstuck.conf.before
cp /srv/unstuck/infra/nginx/unstuck.conf /etc/nginx/conf.d/unstuck.conf
if ! nginx -t; then cp /tmp/unstuck.conf.before /etc/nginx/conf.d/unstuck.conf; echo "The test failed. The old config is back in place and nothing was reloaded."; exit 1; fi
systemctl reload nginx
echo "nginx reloaded"
'@ }

$Steps['seren-content'] = @{ box = 'new'; what = 'Unpacks SEREN''s content (dm, docs, npcs, adventures, the SRD library) into /srv/seren from the bucket. Anything already there is moved aside, not deleted'; script = @'
set -e
aws s3 cp s3://unstuck-box-968053968391/transfer/seren-content.tgz /tmp/seren-content.tgz --region us-east-2 --only-show-errors
if [ -n "$(ls -A /srv/seren 2>/dev/null)" ]; then mv /srv/seren /srv/seren.before-$(date +%s); fi
mkdir -p /srv/seren && tar -xzf /tmp/seren-content.tgz -C /srv/seren
chown -R ec2-user:ec2-user /srv/seren && rm -f /tmp/seren-content.tgz
echo "/srv/seren: $(du -sh /srv/seren | cut -f1), $(find /srv/seren -type f | wc -l) files: $(ls /srv/seren | paste -sd' ')"
'@ }

$Steps['seren-env'] = @{ box = 'new'; what = 'Writes /etc/seren.env from /unstuck/seren/* in Parameter Store, and makes its cookie and session secrets once'; script = @'
set -e
python3 /srv/unstuck/infra/unstuck-env.py seren --ensure SEREN_COOKIE_SECRET SEREN_SESSION_SECRET
grep -q '^SEREN_PASSWORD=' /etc/seren.env || { echo "No SEREN_PASSWORD yet: add /unstuck/seren/SEREN_PASSWORD in Parameter Store, then run this again."; exit 1; }
'@ }

$Steps['elsewhere-env'] = @{ box = 'new'; what = 'Writes /etc/elsewhere.env from /unstuck/elsewhere/* in Parameter Store, and makes its cookie secret once'; script = @'
set -e
python3 /srv/unstuck/infra/unstuck-env.py elsewhere --ensure ELSEWHERE_COOKIE_SECRET
grep -q '^ELSEWHERE_PASSWORD=' /etc/elsewhere.env || { echo "No ELSEWHERE_PASSWORD yet: add /unstuck/elsewhere/ELSEWHERE_PASSWORD in Parameter Store, then run this again."; exit 1; }
'@ }

$Steps['elsewhere-start'] = @{ box = 'new'; what = 'Starts (or restarts) the Elsewhere world and checks it answers locally'; script = @'
install -d -o ec2-user -g ec2-user /srv/unstuck/elsewhere/web/sessions
systemctl enable elsewhere
systemctl restart elsewhere
sleep 3
echo "elsewhere: $(systemctl is-active elsewhere)"
curl -s -o /dev/null -w 'the world answers on 127.0.0.1:8765/play with %{http_code}\n' http://127.0.0.1:8765/play
journalctl -u elsewhere -n 8 --no-pager
'@ }

$Steps['seren-start'] = @{ box = 'new'; what = 'Starts (or restarts) SEREN and checks it answers locally'; script = @'
systemctl enable seren
systemctl restart seren
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
$inv = $null; $fails = 0
for ($i = 0; $i -lt 300; $i++) {
  Start-Sleep -Seconds 2
  $raw = aws ssm get-command-invocation --profile $box.profile --region $Region --command-id $id --instance-id $box.instance --output json
  if ($LASTEXITCODE -ne 0) { $fails++; if ($fails -ge 10) { Say "Could not read the box's answer 10 times running. The step may still have run: check with  aws ssm get-command-invocation --command-id $id --instance-id $($box.instance)" 'Red'; exit 1 }; continue }
  $fails = 0
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
