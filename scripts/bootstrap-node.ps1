$ErrorActionPreference = "Stop"

$version = "20.15.1"
$toolsRoot = Join-Path $PSScriptRoot "..\.tools"
$installRoot = Join-Path $toolsRoot "node"
$nodeExe = Join-Path $installRoot "node.exe"

if (Test-Path -LiteralPath $nodeExe) {
  Write-Output "Node is already installed at $installRoot"
  Write-Output "Run: `$env:Path = '$installRoot;' + `$env:Path"
  exit 0
}

$archive = Join-Path $toolsRoot "node.zip"
$extractRoot = Join-Path $toolsRoot "node-extract"
$url = "https://nodejs.org/dist/v$version/node-v$version-win-x64.zip"

New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
Invoke-WebRequest -Uri $url -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $extractRoot -Force
$expanded = Join-Path $extractRoot "node-v$version-win-x64"

if (-not (Test-Path -LiteralPath (Join-Path $expanded "node.exe"))) {
  throw "The downloaded Node archive did not contain node.exe."
}

Move-Item -LiteralPath $expanded -Destination $installRoot
Remove-Item -LiteralPath $archive -Force
Remove-Item -LiteralPath $extractRoot -Recurse -Force

Write-Output "Node $version installed at $installRoot"
Write-Output "Run: `$env:Path = '$installRoot;' + `$env:Path"
