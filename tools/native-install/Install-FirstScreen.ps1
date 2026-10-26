[CmdletBinding()]
param(
 [ValidateSet('Install','Rollback','Inspect')][string]$Action='Install',
 [string]$Executable
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if(-not $Executable){$Executable=Join-Path $env:LOCALAPPDATA 'Programs\DSH NEXT\DSH NEXT.exe'}
$Executable=[IO.Path]::GetFullPath($Executable)
if(-not(Test-Path -LiteralPath $Executable -PathType Leaf)){throw 'DSH NEXT was not found. Pass -Executable with the absolute path of the supported DSH NEXT.exe.'}
if(-not[IO.Path]::GetFileName($Executable).Equals('DSH NEXT.exe',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsupported desktop executable. Nothing was started.'}
$plainRoot=[IO.Path]::GetDirectoryName($Executable);$plainCursor=$Executable
while($plainCursor){$plainItem=Get-Item -LiteralPath $plainCursor -Force;if(($plainItem.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne 0){throw 'Linked desktop paths are not supported. Nothing was started.'};if($plainCursor-eq$plainRoot){break};$plainCursor=[IO.Path]::GetDirectoryName($plainCursor)}
$binaryStream=[IO.File]::OpenRead($Executable);$algorithm=[Security.Cryptography.SHA256]::Create()
try{$binaryHash=[BitConverter]::ToString($algorithm.ComputeHash($binaryStream)).Replace('-','').ToLowerInvariant()}finally{$binaryStream.Dispose();$algorithm.Dispose()}
$binaryPolicy=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'policy.json'),[Text.Encoding]::UTF8)|ConvertFrom-Json
if($binaryHash-ne$binaryPolicy.exeSha256){throw 'This desktop build has not been verified. Nothing was started or modified.'}
$cli=Join-Path $PSScriptRoot 'cli.mjs'
function InvokeNative([string]$Operation,[string]$JobId=''){
 if($Operation-notin@('inspect','install','rollback','cancel')-or($JobId-and$JobId-notmatch'^[a-f0-9-]{36}$')){throw 'Invalid installer operation.'}
 $start=New-Object Diagnostics.ProcessStartInfo
 $start.FileName=$Executable
 # Windows file names cannot contain quotes; the other two tokens are enums
 # or a validated UUID. No shell interprets this native argv string.
 $start.Arguments='"'+$cli+'" '+$Operation+' '+$JobId
 $start.UseShellExecute=$false;$start.CreateNoWindow=$true
 $start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
 $start.EnvironmentVariables['ELECTRON_RUN_AS_NODE']='1'
 $nativeProcess=New-Object Diagnostics.Process
 $nativeProcess.StartInfo=$start
 try{
  $null=$nativeProcess.Start()
  $output=$nativeProcess.StandardOutput.ReadToEndAsync();$errors=$nativeProcess.StandardError.ReadToEndAsync()
  if(-not$nativeProcess.WaitForExit(60000)){$nativeProcess.Kill();throw 'The preparation helper timed out. No DSH process was force-stopped.'}
  $lines=$output.Result -split "`r?`n"|Where-Object{$_}
  if(-not$lines){throw 'The preparation helper did not return a result.'}
  $result=($lines|Select-Object -Last 1)|ConvertFrom-Json
  if(-not$result.ok){throw ('Installer stopped: '+$result.errorCode)}
  return $result.result
 }finally{$nativeProcess.Dispose()}
}
function ReadStatus([string]$File){
 $stream=New-Object IO.FileStream($File,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite-bor[IO.FileShare]::Delete))
 $reader=New-Object IO.StreamReader($stream,[Text.Encoding]::UTF8)
 try{return($reader.ReadToEnd()|ConvertFrom-Json)}finally{$reader.Dispose();$stream.Dispose()}
}
$operation=$Action.ToLowerInvariant()
if($operation-eq'inspect'){InvokeNative 'inspect'|ConvertTo-Json -Depth 6;exit 0}
Write-Host 'Checking the supported desktop build, animation assets and original backup...'
$prepared=InvokeNative $operation
if($prepared.phase-ne'prepared'-or$prepared.jobId-notmatch'^[a-f0-9-]{36}$'){throw 'The external helper was not prepared. DSH has not been asked to quit.'}
Write-Host 'Prepared. If DSH is open, use its application menu or tray > Quit now.'
Write-Host 'This script will wait for the real processes to exit, apply the verified change, and reopen DSH. It never force-stops DSH.'
$statusPath=Join-Path ([IO.Path]::GetDirectoryName($Executable)) ('resources\.dsh-awakening-backup\jobs\'+$prepared.jobId+'\status.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($watch.Elapsed.TotalSeconds-lt 115){
 try{$state=ReadStatus $statusPath}catch{Start-Sleep -Milliseconds 250;continue}
 if($state.id-ne$prepared.jobId){throw 'Unexpected installer job.'}
 if($state.phase-eq'complete'){Write-Host 'Completed. DSH has been reopened.';exit 0}
 if($state.phase-in@('error','timeout','cancelled')){Write-Host ('Stopped: '+$state.phase) -ForegroundColor Yellow;if($state.PSObject.Properties.Name-contains'errorCode'){Write-Host $state.errorCode};exit 1}
 Start-Sleep -Milliseconds 250
}
try{InvokeNative 'cancel' $prepared.jobId|Out-Null}catch{}
throw 'The helper did not complete in time. It was cancelled; reopen DSH manually and check the plugin status.'
