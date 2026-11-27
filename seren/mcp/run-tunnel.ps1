<#
  Seren inside Claude, from this laptop.

  Starts a Cloudflare quick tunnel (a random https://....trycloudflare.com address, no account,
  gone when this window closes), then the Seren MCP server behind it, and prints the address to
  add to Claude as a custom connector.

    .\seren\mcp\run-tunnel.ps1            # fake AI: canned books, nothing spent
    .\seren\mcp\run-tunnel.ps1 -Real      # the real weaver on Bedrock (run 'aws sso login --profile selfactual' first)
    .\seren\mcp\run-tunnel.ps1 -Real -Tier paid

  Ctrl+C stops both. The address changes every run, so re-add the connector each time.
  Risk, accepted by Jay 26 Nov: no sign-in, so anyone who has the address can use the tools while
  it is up. The tools never serve a campaign's truths.
#>
param(
  [switch]$Real,
  [ValidateSet('free', 'paid')][string]$Tier = 'free',
  [int]$Port = 3020
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Join-Path $here '.venv\Scripts\python.exe'
$cf = Join-Path $here 'bin\cloudflared.exe'

if (-not (Test-Path $py)) {
  Write-Host 'No .venv yet. Making one...'
  python -m venv (Join-Path $here '.venv')
  & $py -m pip install -q 'mcp==2.2.0' uvicorn boto3 'botocore[crt]'
}
if (-not (Test-Path $cf)) {
  $known = @(
    'C:\Users\Lenovo\OneDrive\Desktop\SA\SA CC WORK\the-desktop\bin\cloudflared-desk.exe',
    'C:\Users\Lenovo\OneDrive\Desktop\SA\SA CC WORK\minder\app\bin\cloudflared-minder.exe'
  )
  $found = $known | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $found) { throw 'No cloudflared. Install it with: winget install Cloudflare.cloudflared' }
  New-Item -ItemType Directory -Force (Join-Path $here 'bin') | Out-Null
  Copy-Item $found $cf
}

if ($Real) {
  & aws sts get-caller-identity --profile selfactual --query Account --output text 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "AWS isn't signed in. Run 'aws sso login --profile selfactual', then try again." }
}

# 0. Clear out any old Seren server still holding the port. Ctrl+C ends this script's loop, but the venv's
#    python.exe is a launcher that starts a second python, and that one can outlive it (27 Nov: three
#    orphans in a row blocked 3020). Only Seren's own server.py is stopped; anything else is reported.
function Stop-SerenServers {
  Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -match 'seren\\mcp\\server\.py' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
Stop-SerenServers
Start-Sleep -Milliseconds 600
$held = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($held) {
  $who = (Get-CimInstance Win32_Process -Filter "ProcessId=$($held.OwningProcess)").CommandLine
  throw "Port $Port is in use by something that isn't Seren: $who. Try -Port with another number."
}

# 1. The tunnel, logging to a file we can read the address out of.
$log = Join-Path $env:TEMP ('seren-tunnel-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.log')
# HTTPS to our own server: AVG's Web Shield rewrites plain-HTTP loopback /mcp traffic (Imprint Desk, 10 Nov).
$certs = Join-Path $here 'certs'
if (-not (Test-Path (Join-Path $certs 'cert.pem'))) {
  New-Item -ItemType Directory -Force $certs | Out-Null
  $openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
  & $openssl req -x509 -newkey rsa:2048 -nodes -keyout (Join-Path $certs 'key.pem') -out (Join-Path $certs 'cert.pem') `
    -days 365 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' 2>$null
}
$tunnel = Start-Process -FilePath $cf -ArgumentList @('tunnel', '--no-autoupdate', '--protocol', 'http2', '--no-tls-verify', '--url', "https://127.0.0.1:$Port") `
  -RedirectStandardError $log -WindowStyle Hidden -PassThru
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) {
  Stop-Process -Id $tunnel.Id -ErrorAction SilentlyContinue
  throw "The tunnel didn't give an address in 30 seconds. Its log: $log"
}

# 2. The server, told its public address (for the app's art, music and CSP).
$env:SEREN_PUBLIC_URL = $url
$env:SEREN_MCP_PORT = "$Port"
$env:SEREN_TIER = $Tier
if ($Real) { $env:SEREN_AI = 'bedrock' } else { $env:SEREN_AI = 'mock' }

Write-Host ''
Write-Host '  Seren is up.' -ForegroundColor Yellow
Write-Host ''
Write-Host "  Add this to Claude as a custom connector:  $url/mcp" -ForegroundColor Green
Write-Host '  (claude.ai: Settings > Connectors > Add custom connector)'
Write-Host ''
if ($Real) { Write-Host "  AI: real, Bedrock, tier $Tier" } else { Write-Host '  AI: fake. Books are canned; nothing is spent.' }
Write-Host "  Books are saved in seren\.local\books"
Write-Host '  Ctrl+C stops the server and the tunnel.'
Write-Host ''

try {
  # If the server stops (or CC stops it to load a fix), start it again behind the SAME tunnel, so the
  # connector's address stays good. Ctrl+C ends the loop, and the tunnel with it.
  while ($true) {
    & $py (Join-Path $here 'server.py')
    Write-Host '  The server stopped. Starting it again in 2 seconds (Ctrl+C to quit)...' -ForegroundColor Yellow
    Start-Sleep -Seconds 2
  }
}
finally {
  Stop-Process -Id $tunnel.Id -ErrorAction SilentlyContinue
  Stop-SerenServers
  Write-Host 'Tunnel and server closed.'
}
