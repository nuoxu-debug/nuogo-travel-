$root = Split-Path -Parent $PSScriptRoot
$npm = Join-Path $root ".tools\node\npm.cmd"
$nodeTools = Join-Path $root ".tools\node"
$out = Join-Path $root "artifacts\vite-detached.log"
$err = Join-Path $root "artifacts\vite-detached.err.log"

$env:PATH = "$nodeTools;$env:PATH"
Start-Process `
  -FilePath $npm `
  -ArgumentList @("run", "dev", "--workspace", "client", "--", "--host", "127.0.0.1") `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err
