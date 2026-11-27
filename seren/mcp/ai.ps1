<#
  Switch Seren's AI between real and fake while it's running. No restart, same tunnel address.

    .\seren\mcp\ai.ps1 real     # the real weaver on Bedrock (Opus, UG's corner of SA's account; needs 'aws sso login --profile selfactual')
    .\seren\mcp\ai.ps1 fake     # canned books, nothing spent
    .\seren\mcp\ai.ps1          # say which it is now
#>
param([ValidateSet('real', 'fake', '')][string]$Mode = '')
$file = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) '.local\ai-mode'
if ($Mode) {
  if ($Mode -eq 'real') {
    & aws sts get-caller-identity --profile selfactual --query Account --output text 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "AWS isn't signed in. Run 'aws sso login --profile selfactual' first." }
  }
  New-Item -ItemType Directory -Force (Split-Path -Parent $file) | Out-Null
  Set-Content -Path $file -Value $Mode -Encoding ascii
  Write-Host "Seren AI is now $Mode. The next weave uses it."
} elseif (Test-Path $file) {
  Write-Host ("Seren AI: " + (Get-Content $file -Raw).Trim())
} else {
  Write-Host 'Seren AI: as run-tunnel.ps1 started it (fake unless -Real).'
}
