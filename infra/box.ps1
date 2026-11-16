<#
  box.ps1 - runs one named step on an unstuck-games.com box, over SSM.

  DRY RUN BY DEFAULT. Without -Live it checks which account each AWS profile is signed in
  to and prints exactly what it would send. With -Live it sends it, waits for the box, and
  prints what the box said. Claude writes these steps; a person runs them.

    .\infra\box.ps1                    # list the steps
    .\infra\box.ps1 check              # dry run: show what 'check' would send
    .\infra\box.ps1 check -Live        # do it
    .\infra\box.ps1 check -Box sa      # the same, on the box in SA's account

  Two boxes while Unstuck Games moves into SA's AWS account (PLAN-SA-MOVE.md):
    old  account 968053968391, the default AWS profile. Sign in with:  aws login
    sa   account 962000089613, the 'selfactual' profile. Sign in with:  aws sso login --profile selfactual
         Its instance and address are found by their Name tag, unstuck-web.
  -Box picks one. It defaults to 'old' until DNS has moved. A few steps are pinned to one box
  (carry-out runs on old, carry-in on sa), and two run here on this computer (copy-params,
  carry-copy), with both profiles signed in.
  (The box before those, in account 970376923067, is out of reach and has no steps here.)
#>
param([Parameter(Position = 0)][string]$Step, [switch]$Live, [ValidateSet('old', 'sa')][string]$Box = 'old')

$ErrorActionPreference = 'Continue'
# The box answers in UTF-8 (systemctl prints arrows). Without these the AWS CLI on Windows
# crashes trying to print them, and PowerShell garbles what it does print.
$env:PYTHONUTF8 = '1'; $env:PYTHONIOENCODING = 'utf-8'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$Region = 'us-east-2'
$Ns     = 'ns1046.ui-dns.com'
$Boxes  = @{
  old = @{ instance = 'i-071b14e3c340dca70'; ip = '18.225.22.191'; profile = 'default'; account = '968053968391'
           login = 'aws login'; bucket = 'unstuck-box-968053968391' }
  # instance and ip are looked up by tag (Name=unstuck-web) once the profile is signed in
  sa  = @{ instance = $null; ip = $null; profile = 'selfactual'; account = '962000089613'
           login = 'aws sso login --profile selfactual'; bucket = 'unstuck-box-962000089613' }
}
$Names = @('unstuck-games.com', 'www.unstuck-games.com', 'orbis.unstuck-games.com', 'badmonkeys.unstuck-games.com',
           'ferretbowling.unstuck-games.com', 'elsewhere.unstuck-games.com', 'deadline.unstuck-games.com',
           'seren.unstuck-games.com', 'last-warren.unstuck-games.com', 'elsible.unstuck-games.com')

# ---------------------------------------------------------------- the steps, in the order they are used
$Steps = [ordered]@{}

$Steps['check'] = @{ what = 'Read-only: the box - build, services, nginx, certificate, Nova from its role, SEREN data'; script = @'
PY=$(command -v python3.11 || command -v python3)
. /etc/os-release; echo "$PRETTY_NAME $(uname -m), $($PY --version)"
echo "== repo";  git -C /srv/unstuck log --oneline -1
echo "== build"; tail -n 1 /var/log/unstuck-bootstrap.log
echo "== services"
for s in nginx unstuck-contact unstuck-feed.timer certbot-renew-unstuck.timer elsewhere seren unstuck-bunny; do printf '  %-30s %-9s %s\n' "$s" "$(systemctl is-active $s)" "$(systemctl show -p ExecStart --value $s | grep -o 'python3[.0-9]*' | head -n 1)"; done
echo "== nginx"; nginx -t 2>&1 | tail -n 1; echo "  conf.d/unstuck.conf: $(wc -l < /etc/nginx/conf.d/unstuck.conf) lines"
echo "== certificate"; certbot certificates 2>/dev/null | grep -E 'Domains|Expiry' || echo "  none yet"
echo "== Nova, through the box's own role"
$PY - <<'PY'
import boto3
c = boto3.client("bedrock-runtime", region_name="us-east-2")
for m in ("us.amazon.nova-micro-v1:0", "us.amazon.nova-lite-v1:0", "us.amazon.nova-pro-v1:0"):
    try:
        r = c.converse(modelId=m, messages=[{"role": "user", "content": [{"text": "Reply with one word: ready"}]}], inferenceConfig={"maxTokens": 5})
        print("  %-26s %s" % (m, r["output"]["message"]["content"][0]["text"].strip()))
    except Exception as e:
        print("  %-26s FAILED %s" % (m, str(e)[:160]))
PY
echo "== /srv/seren"; du -sh /srv/seren; ls /srv/seren | paste -sd' '
'@ }

$Steps['nginx-http'] = @{ what = 'Port 80 only until the first certificate exists (fixes the first boot), then reload nginx'; script = @'
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

$Steps['pull'] = @{ what = 'git pull on the new box (main must already have the change)'; script = @'
set -e
cd /srv/unstuck && git pull --ff-only && git log --oneline -1
'@ }

$Steps['feed'] = @{ what = 'Fills the updates-page feed cache now, instead of waiting for the daily timer'; script = @'
systemctl start unstuck-feed.service
sleep 2
ls -la /srv/cache/feed.json && head -c 160 /srv/cache/feed.json; echo
'@ }

$Steps['contact-log'] = @{ what = 'Read-only: the contact service''s last lines (did SES send, or keep it on disk only?) and the messages it holds'; script = @'
journalctl -u unstuck-contact -n 15 --no-pager
echo "== messages kept: $(ls /srv/contact 2>/dev/null | wc -l)"
'@ }

$Steps['nginx'] = @{ what = 'Puts the repo''s nginx config in place, tests it, and reloads. Nothing is reloaded if the test fails'; script = @'
set -e
cp /etc/nginx/conf.d/unstuck.conf /tmp/unstuck.conf.before
cp /srv/unstuck/infra/nginx/unstuck.conf /etc/nginx/conf.d/unstuck.conf
if ! nginx -t; then cp /tmp/unstuck.conf.before /etc/nginx/conf.d/unstuck.conf; echo "The test failed. The old config is back in place and nothing was reloaded."; exit 1; fi
systemctl reload nginx
echo "nginx reloaded"
'@ }

$Steps['seren-content'] = @{ what = 'Unpacks SEREN''s content (dm, docs, npcs, adventures, the SRD library) into /srv/seren from the bucket. Anything already there is moved aside, not deleted'; script = @'
set -e
aws s3 cp s3://{{BUCKET}}/transfer/seren-content.tgz /tmp/seren-content.tgz --region us-east-2 --only-show-errors
if [ -n "$(ls -A /srv/seren 2>/dev/null)" ]; then mv /srv/seren /srv/seren.before-$(date +%s); fi
mkdir -p /srv/seren && tar -xzf /tmp/seren-content.tgz -C /srv/seren
chown -R ec2-user:ec2-user /srv/seren && rm -f /tmp/seren-content.tgz
echo "/srv/seren: $(du -sh /srv/seren | cut -f1), $(find /srv/seren -type f | wc -l) files: $(ls /srv/seren | paste -sd' ')"
'@ }

$Steps['seren-env'] = @{ what = 'Writes /etc/seren.env from /unstuck/seren/* in Parameter Store, and makes its cookie and session secrets once'; script = @'
set -e
$(command -v python3.11 || command -v python3) /srv/unstuck/infra/unstuck-env.py seren --ensure SEREN_COOKIE_SECRET SEREN_SESSION_SECRET
grep -q '^SEREN_PASSWORD=' /etc/seren.env || { echo "No SEREN_PASSWORD yet: add /unstuck/seren/SEREN_PASSWORD in Parameter Store, then run this again."; exit 1; }
'@ }

$Steps['elsewhere-env'] = @{ what = 'Writes /etc/elsewhere.env from /unstuck/elsewhere/* in Parameter Store, and makes its cookie secret once'; script = @'
set -e
$(command -v python3.11 || command -v python3) /srv/unstuck/infra/unstuck-env.py elsewhere --ensure ELSEWHERE_COOKIE_SECRET
grep -q '^ELSEWHERE_PASSWORD=' /etc/elsewhere.env || { echo "No ELSEWHERE_PASSWORD yet: add /unstuck/elsewhere/ELSEWHERE_PASSWORD in Parameter Store, then run this again."; exit 1; }
'@ }

$Steps['elsewhere-start'] = @{ what = 'Starts (or restarts) the Elsewhere world and checks it answers locally'; script = @'
install -d -o ec2-user -g ec2-user /srv/unstuck/elsewhere/web/sessions
systemctl enable elsewhere
systemctl restart elsewhere
sleep 3
echo "elsewhere: $(systemctl is-active elsewhere)"
curl -s -o /dev/null -w 'the world answers on 127.0.0.1:8765/play with %{http_code}\n' http://127.0.0.1:8765/play
journalctl -u elsewhere -n 8 --no-pager
'@ }

$Steps['seren-start'] = @{ what = 'Starts (or restarts) SEREN and checks it answers locally'; script = @'
systemctl enable seren
systemctl restart seren
sleep 3
echo "seren: $(systemctl is-active seren)"
curl -s -o /dev/null -w 'the table answers on 127.0.0.1:8790 with %{http_code}\n' http://127.0.0.1:8790/
journalctl -u seren -n 12 --no-pager
'@ }

$Steps['bunny-env'] = @{ what = 'Bunny Goes, once: writes /etc/bunny.env with its two secret-link keys (made here, only ever on the box), and makes /srv/bunny'; script = @'
set -e
$(command -v python3.11 || command -v python3) /srv/unstuck/infra/unstuck-env.py bunny --ensure BUNNY_KEY BUNNY_BEBU_KEY
install -d -m 700 -o ec2-user -g ec2-user /srv/bunny
echo "/srv/bunny ready: $(stat -c '%U %a' /srv/bunny)"
'@ }

$Steps['bunny-start'] = @{ what = 'Starts (or restarts) the Bunny Goes service, and checks it answers and refuses a call with no key'; script = @'
systemctl enable unstuck-bunny
systemctl restart unstuck-bunny
sleep 2
echo "unstuck-bunny: $(systemctl is-active unstuck-bunny)"
curl -s -w '  health %{http_code}\n' http://127.0.0.1:8775/health
curl -s -o /dev/null -w '  state without the key: %{http_code} (401 is right)\n' http://127.0.0.1:8775/state
curl -s -o /dev/null -w '  the page, through nginx: %{http_code}\n' https://unstuck-games.com/bunny-goes/
curl -s -o /dev/null -w '  the save, through nginx, without the key: %{http_code} (401 is right)\n' https://unstuck-games.com/bunny-goes/api/state
journalctl -u unstuck-bunny -n 5 --no-pager
'@ }

$Steps['bunny-links'] = @{ what = 'Prints the two Bunny Goes secret links. THE OUTPUT IS SECRET: Bunny''s link is hers, the Bebu link also writes notes. Nothing else is changed'; script = @'
. /etc/bunny.env
echo "Bunny's link (send her this one):"
echo "  https://unstuck-games.com/bunny-goes/#k=$BUNNY_KEY"
echo "Bebu's link (yours: it can also publish notes, in Bebu mode):"
echo "  https://unstuck-games.com/bunny-goes/?bebu=edit#k=$BUNNY_KEY&b=$BUNNY_BEBU_KEY"
'@ }

$Steps['cert'] = @{ what = 'Let''s Encrypt certificate for every name whose DNS already points at the new box, then the full nginx config. Running it accepts the Let''s Encrypt subscriber agreement, as the old box did.'; script = @'
set -e
certbot certonly --webroot -w /srv/unstuck --cert-name unstuck-games.com --expand --non-interactive --agree-tos --register-unsafely-without-email {{DOMAINS}}
cp /srv/unstuck/infra/nginx/unstuck.conf /etc/nginx/conf.d/unstuck.conf
nginx -t
systemctl reload nginx
certbot certificates 2>/dev/null | grep -E 'Domains|Expiry'
'@ }

# ---------------------------------------------------------------- upkeep
# Copies only the units that differ from the box's, restarts only the services among them,
# and puts every changed unit back if one of those services won't stay up.
$UnitsScript = @'
set -e
bk=$(mktemp -d); changed=""
cd /srv/unstuck/infra/systemd
for f in *.service *.timer; do
  if [ -f "/etc/systemd/system/$f" ] && [ "$(md5sum < "$f")" = "$(md5sum < "/etc/systemd/system/$f")" ]; then continue; fi
  if [ -f "/etc/systemd/system/$f" ]; then cp "/etc/systemd/system/$f" "$bk/"; fi
  cp "$f" /etc/systemd/system/
  changed="$changed $f"
done
if [ -z "$changed" ]; then echo "Every unit already matches the repo. Nothing was restarted."; exit 0; fi
echo "units changed:$changed"
systemctl daemon-reload
restart() { for u in $changed; do case "$u" in unstuck-feed.service) ;; *) systemctl restart "$u" || true ;; esac; done; sleep 4; }
restart
bad=""
for u in $changed; do
  case "$u" in unstuck-feed.service) continue ;; esac
  st=$(systemctl is-active "$u" || true)
  printf '  %-26s %-9s %s\n' "$u" "$st" "$(systemctl show -p ExecStart --value "$u" | grep -o 'python3[.0-9]*' | head -n 1)"
  [ "$st" = active ] || bad="$bad $u"
done
if [ -n "$bad" ]; then
  for u in $changed; do if [ -f "$bk/$u" ]; then cp "$bk/$u" /etc/systemd/system/; else rm -f "/etc/systemd/system/$u"; fi; done
  systemctl daemon-reload
  restart
  for u in $bad; do journalctl -u "$u" -n 12 --no-pager; done
  echo "Not running after the change:$bad. The old units are back in place and restarted."
  exit 1
fi
echo "every changed service is running"
'@

$Steps['units'] = @{ what = 'Puts the repo''s systemd units in place and restarts the services whose unit changed. If one won''t stay up, the old units go back and the step fails'; script = $UnitsScript }

$Steps['py311'] = @{ what = 'Once: installs Python 3.11 and boto3, checks every service''s code parses under 3.11, then does ''units'' to move the services onto it'; script = @'
set -e
dnf install -y -q python3.11 python3.11-pip
python3.11 -m pip install --quiet --upgrade boto3
python3.11 - <<'PY'
import ast, pathlib, sys, zoneinfo
import boto3
zoneinfo.ZoneInfo("America/Toronto")
root = pathlib.Path("/srv/unstuck")
files = [p for d in ("seren/web", "elsewhere/web", "services") for p in (root / d).glob("*.py")]
files += [root / "scripts/fetch-feed.py", root / "infra/unstuck-env.py"]
for p in files:
    ast.parse(p.read_text(encoding="utf-8"), str(p))
print("python %s, boto3 %s: all %d service files parse" % (sys.version.split()[0], boto3.__version__, len(files)))
PY
'@ + "`n" + $UnitsScript }

# ---------------------------------------------------------------- the move into SA's account (PLAN-SA-MOVE.md)
# What a box holds that the repo doesn't: SEREN's content and saves, the contact archive, Bunny's
# picks, the feed cache, the certificate, the env files (their cookie secrets and Bunny's link
# keys were made on the box, so carrying them keeps everyone signed in and every link working),
# and the files in the checkout that git doesn't track (Elsewhere's sessions and world).
$Steps['carry-out'] = @{ on = 'old'; what = 'Packs everything the old box holds that the repo doesn''t into its bucket (transfer/carry.tgz). Changes nothing on the box'; script = @'
set -e
cd /
list=""
for p in srv/seren srv/contact srv/bunny srv/cache etc/letsencrypt etc/seren.env etc/elsewhere.env etc/bunny.env; do
  if [ -e "/$p" ]; then list="$list $p"; fi
done
git -C /srv/unstuck ls-files --others | grep -v -e '^\.well-known/' -e '__pycache__/' -e 'node_modules/' -e '^\.venv/' | sed 's|^|srv/unstuck/|' > /tmp/carry-untracked || true
tar -czpf /tmp/carry.tgz $list -T /tmp/carry-untracked
echo "packed: $list, plus $(wc -l < /tmp/carry-untracked) untracked files from the checkout"
echo "  $(du -h /tmp/carry.tgz | cut -f1), $(tar -tzf /tmp/carry.tgz | wc -l) entries, sha256 $(sha256sum /tmp/carry.tgz | cut -c1-16)"
aws s3 cp /tmp/carry.tgz s3://{{BUCKET}}/transfer/carry.tgz --region us-east-2 --only-show-errors
rm -f /tmp/carry.tgz /tmp/carry-untracked
echo "in s3://{{BUCKET}}/transfer/carry.tgz"
'@ }

$Steps['carry-copy'] = @{ local = $true; what = 'On this computer: copies transfer/carry.tgz from the old bucket to the SA bucket, then deletes the local copy. Never unpacks it' }

$Steps['carry-in'] = @{ on = 'sa'; what = 'Unpacks transfer/carry.tgz on the SA box. Anything already in /srv/seren, /srv/contact or /srv/bunny is copied aside first, not lost'; script = @'
set -e
aws s3 cp s3://{{BUCKET}}/transfer/carry.tgz /tmp/carry.tgz --region us-east-2 --only-show-errors
echo "got $(du -h /tmp/carry.tgz | cut -f1), sha256 $(sha256sum /tmp/carry.tgz | cut -c1-16)"
stamp=$(date +%s)
for p in /srv/seren /srv/contact /srv/bunny; do
  if [ -n "$(ls -A $p 2>/dev/null)" ]; then cp -a $p $p.before-$stamp; echo "  kept the old $p as $p.before-$stamp"; fi
done
tar -xzpf /tmp/carry.tgz -C /
chown -R ec2-user:ec2-user /srv/unstuck /srv/seren /srv/contact /srv/cache
if [ -d /srv/bunny ]; then chown -R ec2-user:ec2-user /srv/bunny; chmod 700 /srv/bunny; fi
for f in /etc/seren.env /etc/elsewhere.env /etc/bunny.env; do if [ -f $f ]; then chown root:root $f; chmod 600 $f; fi; done
rm -f /tmp/carry.tgz
echo "== carried in"
for p in /srv/seren /srv/contact /srv/bunny /srv/cache; do printf '  %-14s %s files\n' "$p" "$(find $p -type f 2>/dev/null | wc -l)"; done
ls /etc/seren.env /etc/elsewhere.env /etc/bunny.env 2>/dev/null | sed 's/^/  /'
certbot certificates 2>/dev/null | grep -E 'Domains|Expiry' || echo "  no certificate"
'@ }

$Steps['copy-params'] = @{ local = $true; what = 'On this computer: copies every /unstuck/* parameter from the old account to SA''s, as SecureStrings. Never prints a value. A dry run lists the names only' }

# ---------------------------------------------------------------- the two steps that run here, not on a box
function Invoke-Local($name) {
  $old = $Boxes['old']; $sa = $Boxes['sa']
  if ($name -eq 'copy-params') {
    $names = aws ssm get-parameters-by-path --path /unstuck/ --recursive --profile $old.profile --region $Region --query 'Parameters[].Name' --output json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { Say '  Could not list the old account''s parameters.' 'Red'; exit 1 }
    Say "  $($names.Count) parameters under /unstuck/ in the old account:"
    foreach ($n in $names) { Say "    $n" }
    if (-not $Live) { Say "`nNothing was copied. Run again with -Live to do it." 'Cyan'; exit 0 }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $done = 0
    foreach ($n in $names) {
      $p = aws ssm get-parameter --name $n --with-decryption --profile $old.profile --region $Region --query Parameter --output json | ConvertFrom-Json
      if ($LASTEXITCODE -ne 0 -or -not $p) { Say "  could not read $n. Stopping." 'Red'; exit 1 }
      # the value goes through a file, never the command line, and the file is gone right after
      $tmp = Join-Path $env:TEMP ('param-' + [guid]::NewGuid().ToString('N') + '.json')
      $json = @{ Name = $n; Value = $p.Value; Type = 'SecureString'; Overwrite = $true } | ConvertTo-Json -Compress
      [IO.File]::WriteAllText($tmp, $json, $utf8)
      $p = $null; $json = $null
      try { aws ssm put-parameter --cli-input-json "file://$tmp" --profile $sa.profile --region $Region --output text | Out-Null; $ok = ($LASTEXITCODE -eq 0) }
      finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
      if (-not $ok) { Say "  could not write $n. Stopping after $done." 'Red'; exit 1 }
      $done++; Say "    copied $n" 'Green'
    }
    Say "`ncopy-params done: $done of $($names.Count)." 'Green'
  }
  if ($name -eq 'carry-copy') {
    $from = "s3://$($old.bucket)/transfer/carry.tgz"; $to = "s3://$($sa.bucket)/transfer/carry.tgz"
    $size = aws s3api head-object --bucket $old.bucket --key transfer/carry.tgz --profile $old.profile --region $Region --query ContentLength --output text
    if ($LASTEXITCODE -ne 0) { Say "  No $from yet. Run carry-out -Live first." 'Red'; exit 1 }
    Say "  $from ($size bytes)  ->  $to"
    if (-not $Live) { Say "`nNothing was copied. Run again with -Live to do it." 'Cyan'; exit 0 }
    $tmp = Join-Path $env:TEMP ('carry-' + [guid]::NewGuid().ToString('N') + '.tgz')
    try {
      aws s3 cp $from $tmp --profile $old.profile --region $Region --only-show-errors
      if ($LASTEXITCODE -ne 0) { Say '  download failed' 'Red'; exit 1 }
      aws s3 cp $tmp $to --profile $sa.profile --region $Region --only-show-errors
      if ($LASTEXITCODE -ne 0) { Say '  upload failed' 'Red'; exit 1 }
    } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
    $got = aws s3api head-object --bucket $sa.bucket --key transfer/carry.tgz --profile $sa.profile --region $Region --query ContentLength --output text
    if ($got -ne $size) { Say "  sizes differ: $size sent, $got arrived" 'Red'; exit 1 }
    Say "`ncarry-copy done: $got bytes in $to, and the local copy is deleted." 'Green'
  }
}

# ---------------------------------------------------------------- helpers
function Say($t, $c = 'Gray') { Write-Host $t -ForegroundColor $c }

function MovedNames {
  $out = @()
  foreach ($n in $Names) {
    $ip = $null
    try { $ip = (Resolve-DnsName $n -Type A -Server $Ns -DnsOnly -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -First 1).IPAddress } catch { }
    if ($ip -eq $target.ip) { $out += $n }
  }
  return $out
}

# ---------------------------------------------------------------- list
if (-not $Step) {
  Say 'Steps (run one with:  .\infra\box.ps1 <step>   then add -Live to send it):' 'Cyan'
  foreach ($k in $Steps.Keys) {
    $where = if ($Steps[$k].local) { 'here' } elseif ($Steps[$k].on) { $Steps[$k].on } else { '-Box' }
    Say ("  {0,-15} [{1}] {2}" -f $k, $where, $Steps[$k].what)
  }
  exit 0
}
if (-not $Steps.Contains($Step)) { Say "No step called '$Step'. Run .\infra\box.ps1 to list them." 'Red'; exit 1 }

$s = $Steps[$Step]
if ($s.on -and $s.on -ne $Box) {
  if ($PSBoundParameters.ContainsKey('Box')) { Say "$Step only runs on the $($s.on) box. Leave -Box off, or use -Box $($s.on)." 'Red'; exit 1 }
  $Box = $s.on
}

# ---------------------------------------------------------------- safe checks, dry run or not
function SignedIn($b) {
  $who = aws sts get-caller-identity --profile $b.profile --query Account --output text
  if ($LASTEXITCODE -ne 0 -or -not $who) { Say "  AWS        profile '$($b.profile)' is not signed in. Run:  $($b.login)" 'Red'; exit 1 }
  if ($who.Trim() -ne $b.account) { Say "  AWS        profile '$($b.profile)' is account $who, expected $($b.account). Stopping." 'Red'; exit 1 }
  Say "  AWS        profile '$($b.profile)' is account $($who.Trim())" 'Green'
}

if ($s.local) {
  Say ("{0}  here, between the two accounts  -  {1}" -f $Step, $(if ($Live) { 'LIVE' } else { 'DRY RUN (add -Live to do it)' })) $(if ($Live) { 'Yellow' } else { 'Cyan' })
  Say "  $($s.what)"
  SignedIn $Boxes['old']; SignedIn $Boxes['sa']
  Invoke-Local $Step
  exit 0
}

$target = $Boxes[$Box]
SignedIn $target
if ($Box -eq 'sa') {
  $target.instance = (aws ec2 describe-instances --profile $target.profile --region $Region --filters "Name=tag:Name,Values=unstuck-web" "Name=instance-state-name,Values=running" --query 'Reservations[].Instances[].InstanceId' --output text | Out-String).Trim()
  $target.ip = (aws ec2 describe-addresses --profile $target.profile --region $Region --filters "Name=tag:Name,Values=unstuck-web" --query 'Addresses[0].PublicIp' --output text | Out-String).Trim()
  if (-not $target.instance -or $target.instance -match '\s') { Say "  BOX        no single running instance tagged unstuck-web in SA's account ('$($target.instance)'). Run infra\sa-account.ps1 first." 'Red'; exit 1 }
}
Say ("{0}  on the {1} box ({2}, {3})  -  {4}" -f $Step, $Box, $target.instance, $target.ip, $(if ($Live) { 'LIVE' } else { 'DRY RUN (add -Live to send)' })) $(if ($Live) { 'Yellow' } else { 'Cyan' })
Say "  $($s.what)"

# A Windows checkout can turn this file's line endings into CRLF; bash on the box must never see a CR.
$script = $s.script.Replace("`r", '').Replace('{{BUCKET}}', $target.bucket)
if ($Step -eq 'cert') {
  $moved = MovedNames
  if (-not $moved) { Say "  DNS        no name points at $($target.ip) yet. Move a record in IONOS first." 'Red'; exit 1 }
  Say "  DNS        pointing at the new box: $($moved -join ', ')" 'Green'
  $script = $script.Replace('{{DOMAINS}}', (($moved | ForEach-Object { "-d $_" }) -join ' '))
}
Say ''
foreach ($line in ($script -split "`n")) { if ($line.Trim()) { Say "  | $line" 'DarkGray' } }
if (-not $Live) { Say "`nNothing was sent. Run again with -Live to do it." 'Cyan'; exit 0 }

# ---------------------------------------------------------------- live: send, wait, print
$params = Join-Path $env:TEMP "box-$Step.json"
@{ commands = @($script) } | ConvertTo-Json -Compress | Set-Content -Path $params -Encoding ascii
$id = aws ssm send-command --profile $target.profile --region $Region --instance-ids $target.instance --document-name AWS-RunShellScript `
      --comment "box.ps1 $Step" --parameters "file://$params" --query Command.CommandId --output text
Remove-Item $params -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0 -or -not $id) { Say 'Could not send the command.' 'Red'; exit 1 }
Say "`nsent ($id), waiting for the box..." 'Yellow'
$inv = $null; $fails = 0
for ($i = 0; $i -lt 300; $i++) {
  Start-Sleep -Seconds 2
  $raw = aws ssm get-command-invocation --profile $target.profile --region $Region --command-id $id --instance-id $target.instance --output json
  if ($LASTEXITCODE -ne 0) { $fails++; if ($fails -ge 10) { Say "Could not read the box's answer 10 times running. The step may still have run: check with  aws ssm get-command-invocation --command-id $id --instance-id $($target.instance)" 'Red'; exit 1 }; continue }
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
