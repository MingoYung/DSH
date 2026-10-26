[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$JobFile)
$ErrorActionPreference='Stop'
$JobFile=[IO.Path]::GetFullPath($JobFile)
$worker=Join-Path $PSScriptRoot 'worker.ps1'
if(-not(Test-Path -LiteralPath $worker -PathType Leaf)-or-not(Test-Path -LiteralPath $JobFile -PathType Leaf)){throw 'missing-worker-job'}
if($worker.Contains('"')-or$JobFile.Contains('"')){throw 'invalid-worker-path'}
# PowerShell 5 silently exits with Node's DETACHED_PROCESS flag. Start this
# short launcher normally; Start-Process gives the actual hidden worker its
# own console lifetime. No shell evaluates either quoted path.
$arguments='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$worker+'" -JobFile "'+$JobFile+'"'
$powershell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
Start-Process -FilePath $powershell -ArgumentList $arguments -WindowStyle Hidden | Out-Null
