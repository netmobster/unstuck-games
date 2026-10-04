<#
  Sets up a life from an envelope: a folder with the doorkeeper, the deck and your envelope in it.

    .\elsible\door\new-life.ps1 -Envelope "$HOME\Downloads\elsible-envelope.md"

  Then open Claude Code in the folder it prints, and say: I'm ready. Open the door.
  The folder goes under ~\Elsible\lives\ unless you give -Into. Nothing here touches the network.
#>
param(
  [Parameter(Mandatory = $true)] [string] $Envelope,
  [string] $Into = ''
)
$ErrorActionPreference = 'Stop'
$kit = $PSScriptRoot                         # elsible\door
$elsible = Split-Path $kit -Parent           # elsible
if (-not (Test-Path -LiteralPath $Envelope)) { throw "No envelope at $Envelope. Download it from the parlor first." }
$head = Get-Content -LiteralPath $Envelope -Raw
if ($head -notmatch '"format":\s*"elsible-envelope/1"') { throw "That file isn't an Elsible envelope (no elsible-envelope/1 inside)." }
if (-not $Into) { $Into = Join-Path $HOME ('Elsible\lives\' + (Get-Date -Format 'yyyy-MM-dd-HHmm')) }
if (Test-Path -LiteralPath (Join-Path $Into 'elsible-envelope.md')) { throw "There's already a life at $Into. Pick another -Into." }

New-Item -ItemType Directory -Force -Path (Join-Path $Into 'deck\packs') | Out-Null
foreach ($f in 'CLAUDE.md', 'weave.md', 'audit.md', 'reveal.template.html') { Copy-Item -LiteralPath (Join-Path $kit $f) -Destination $Into }
Copy-Item -LiteralPath (Join-Path $elsible 'decks\story\deck.json') -Destination (Join-Path $Into 'deck\deck.json')
Get-ChildItem -LiteralPath (Join-Path $elsible 'decks\story\packs') -Filter '*.json' | Copy-Item -Destination (Join-Path $Into 'deck\packs')
Copy-Item -LiteralPath $Envelope -Destination (Join-Path $Into 'elsible-envelope.md')

Write-Host ''
Write-Host "A life is ready at $Into"
Write-Host 'Open Claude Code there and say: I''m ready. Open the door.'
