[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$JobFile)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$cfg=$null
$didReplace=$false
$sawClosed=$false
$workerLock=$null
$safeJob=$false
function Sha([string]$File){return (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant()}
function Plain([string]$File,[string]$Base){
 $absolute=[IO.Path]::GetFullPath($File);$root=[IO.Path]::GetFullPath($Base).TrimEnd('\')
 if(-not($absolute.Equals($root,[StringComparison]::OrdinalIgnoreCase)-or$absolute.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase))){throw 'unsafe-path'}
 $cursor=$absolute
 while($cursor){$item=Get-Item -LiteralPath $cursor -Force -ErrorAction SilentlyContinue;if($item-and(($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne 0)){throw 'unsafe-path'};if($cursor.Equals($root,[StringComparison]::OrdinalIgnoreCase)){break};$cursor=[IO.Path]::GetDirectoryName($cursor)}
}
function AtomicJson([string]$File,$Value){
 Plain $File $cfg.installRoot
 $tmp=$File+'.writing-'+[guid]::NewGuid().ToString()
 [IO.File]::WriteAllText($tmp,($Value|ConvertTo-Json -Depth 8 -Compress),(New-Object Text.UTF8Encoding($false)))
 for($attempt=0;;$attempt++){
  try{if(Test-Path -LiteralPath $File){[IO.File]::Replace($tmp,$File,[NullString]::Value)}else{[IO.File]::Move($tmp,$File)};break}
  catch{if($attempt-ge 30){throw};Start-Sleep -Milliseconds 10}
 }
}
function ReadJson([string]$File){
 $stream=New-Object IO.FileStream($File,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite-bor[IO.FileShare]::Delete))
 $reader=New-Object IO.StreamReader($stream,[Text.Encoding]::UTF8)
 try{return ($reader.ReadToEnd()|ConvertFrom-Json)}finally{$reader.Dispose();$stream.Dispose()}
}
function State([string]$Phase,[string]$Code=''){
 if(-not$safeJob){throw 'invalid-job-path'}
 $value=[ordered]@{id=$cfg.id;nonce=$cfg.nonce;action=$cfg.action;phase=$Phase;updatedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();workerPid=$PID}
 if($Code){$value.errorCode=$Code}
 AtomicJson (Join-Path $cfg.jobDirectory 'status.json') $value
}
function Authorization{
 if(Test-Path -LiteralPath (Join-Path $cfg.jobDirectory 'cancelled.flag')){return 'cancelled'}
 try{$auth=ReadJson (Join-Path $cfg.jobDirectory 'authorization.json');if($auth.id-eq$cfg.id-and$auth.nonce-eq$cfg.nonce){return [string]$auth.state}}catch{}
 return 'cancelled'
}
function RunningDsh{return @(Get-Process -Name 'DSH NEXT' -ErrorAction SilentlyContinue)}
function AssertClosed{if(@(RunningDsh).Count-ne 0){throw 'dsh-still-running'}}
function Expired{return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-gt[long]$cfg.expiresAt}
function Reopen{
 if((Sha $cfg.executable)-ne$cfg.expectedExe){throw 'desktop-changed'}
 # Host and helper may inherit this from Electron's Node child. A real GUI
 # relaunch must remove it rather than opening a Node process/REPL.
 Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
 Start-Process -FilePath $cfg.executable -WorkingDirectory $cfg.installRoot | Out-Null
}
try{
 $cfg=ReadJson ([IO.Path]::GetFullPath($JobFile))
 if($cfg.schema-ne 1-or$cfg.id-notmatch'^[a-f0-9-]{36}$'-or$cfg.nonce-notmatch'^[a-f0-9-]{36}$'-or$cfg.action-notin@('install','rollback')){throw 'invalid-job'}
 $resources=Join-Path $cfg.installRoot 'resources';$backupRoot=Join-Path $resources '.dsh-awakening-backup'
 $expectedJob=Join-Path (Join-Path $backupRoot 'jobs') $cfg.id
 if([IO.Path]::GetFullPath($cfg.jobDirectory)-ne[IO.Path]::GetFullPath($expectedJob)){throw 'invalid-job-path'}
 foreach($row in @(@($cfg.executable,(Join-Path $cfg.installRoot 'DSH NEXT.exe')),@($cfg.target,(Join-Path $resources 'app.asar')),@($cfg.backup,(Join-Path $backupRoot 'app.asar')),@($cfg.candidate,(Join-Path $expectedJob 'candidate.asar')))){
  if([IO.Path]::GetFullPath($row[0])-ne[IO.Path]::GetFullPath($row[1])){throw 'invalid-job-path'};Plain $row[0] $cfg.installRoot
 }
 if([IO.Path]::GetFullPath($JobFile)-ne[IO.Path]::GetFullPath((Join-Path $expectedJob 'job.json'))){throw 'invalid-job-path'}
 $safeJob=$true
 $lockPath=Join-Path $expectedJob 'worker.lock';Plain $lockPath $cfg.installRoot
 # Only one worker may act on this job. The OS drops this lock even if the
 # helper crashes; a second invocation must not overwrite the active status.
 try{$workerLock=New-Object IO.FileStream($lockPath,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None,4096,[IO.FileOptions]::DeleteOnClose)}catch{exit 0}
 $nowMs=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
 if($cfg.createdAt-gt($nowMs+5000)-or$cfg.expiresAt-gt($nowMs+110000)-or$cfg.expiresAt-le$cfg.createdAt){throw 'invalid-job-expiry'}
 if(Expired){State 'cancelled' 'expired-job';exit 0}
 foreach($digest in @($cfg.expectedBefore,$cfg.expectedAfter,$cfg.originalSha256,$cfg.expectedExe)){if($digest-notmatch'^[a-f0-9]{64}$'){throw 'invalid-job-hash'}}
 if((Sha $cfg.executable)-ne$cfg.expectedExe-or(Sha $cfg.target)-ne$cfg.expectedBefore-or(Sha $cfg.backup)-ne$cfg.originalSha256-or(Sha $cfg.candidate)-ne$cfg.expectedAfter){throw 'prepared-files-changed'}
 State 'worker-ready'
 $armWatch=[Diagnostics.Stopwatch]::StartNew()
 while((Authorization)-eq'pending'){
  if($armWatch.Elapsed.TotalSeconds-ge[Math]::Min(10,[double]$cfg.armTimeoutSeconds)){State 'cancelled' 'not-armed';exit 0};Start-Sleep -Milliseconds 100
 }
 if((Authorization)-ne'armed'){State 'cancelled';exit 0}
 State 'waiting-exit'
 $watch=[Diagnostics.Stopwatch]::StartNew()
 while(@(RunningDsh).Count-gt 0){
  if((Authorization)-ne'armed'){State 'cancelled';exit 0}
  if(Expired){State 'cancelled' 'expired-job';exit 0}
  if($watch.Elapsed.TotalSeconds-ge[Math]::Min(90,[double]$cfg.waitExitSeconds)){State 'timeout' 'dsh-exit-timeout';exit 0}
  Start-Sleep -Milliseconds 250
 }
 $sawClosed=$true
 if(Expired){State 'cancelled' 'expired-job';exit 0}
 if((Authorization)-ne'armed'){State 'cancelled';exit 0}
 if(Expired){State 'cancelled' 'expired-job';exit 0}
 State 'installing'
 AssertClosed
 if((Sha $cfg.executable)-ne$cfg.expectedExe-or(Sha $cfg.target)-ne$cfg.expectedBefore-or(Sha $cfg.backup)-ne$cfg.originalSha256-or(Sha $cfg.candidate)-ne$cfg.expectedAfter){throw 'prepared-files-changed'}
 if((Authorization)-ne'armed'){State 'cancelled';exit 0}
 # The prepared candidate is already on this volume. Replace consumes only
 # this job-owned candidate; the permanent original backup is never replaced.
 [IO.File]::Replace($cfg.candidate,$cfg.target,[NullString]::Value)
 $didReplace=$true
 if((Sha $cfg.target)-ne$cfg.expectedAfter){throw 'installed-file-mismatch'}
 AtomicJson (Join-Path $backupRoot 'manifest.json') ([ordered]@{schema=1;toolVersion='0.5.0';originalSha256=$cfg.originalSha256;patchedSha256=$cfg.expectedAfter;backup=$cfg.backup;target=$cfg.target;lastAction=$cfg.action})
 State 'relaunching'
 Reopen
 State 'complete'
}catch{
 $code=[string]$_.Exception.Message
 if($code-notmatch'^[a-z][a-z0-9-]{2,60}$'){$code='worker-failed'}
 if($cfg-and$safeJob){
  # Restore only our own known candidate if applying/relaunching failed. Never
  # overwrite a later update or any unknown archive bytes.
  if($didReplace){try{
   AssertClosed
   if((Sha $cfg.target)-eq$cfg.expectedAfter-and(Sha $cfg.backup)-eq$cfg.originalSha256){
    $restore=Join-Path $cfg.jobDirectory 'error-restore.asar';Plain $restore $cfg.installRoot
    [IO.File]::Copy($cfg.backup,$restore,$false)
    if((Sha $restore)-eq$cfg.originalSha256){[IO.File]::Replace($restore,$cfg.target,[NullString]::Value)}
   }
  }catch{}}
  try{State 'error' $code}catch{}
  if($sawClosed){try{if(@(RunningDsh).Count-eq 0-and(Sha $cfg.executable)-eq$cfg.expectedExe){$digest=Sha $cfg.target;if($digest-eq$cfg.originalSha256-or$digest-eq$cfg.expectedBefore){Reopen}}}catch{}}
 }
 exit 1
}finally{
 if($cfg-and$workerLock){try{
  $last=ReadJson (Join-Path $cfg.jobDirectory 'status.json')
  if($last.phase-in@('error','timeout','cancelled')-and(Test-Path -LiteralPath $cfg.candidate)){
   Plain $cfg.candidate $cfg.installRoot
   # A cancelled attempt need not retain another full desktop archive. Keep
   # unknown/corrupt bytes for diagnosis; remove only our verified candidate.
   if((Sha $cfg.candidate)-eq$cfg.expectedAfter){[IO.File]::Delete($cfg.candidate)}
  }
 }catch{}}
 if($workerLock){$workerLock.Dispose()}
}
