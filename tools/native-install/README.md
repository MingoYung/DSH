# Native first-screen compatibility installer

This optional tool manages the earliest startup page for the specifically
verified Windows DSH NEXT 2.0.19-next build. The normal animation plugin works
without it. The UI action prepares all files, starts an independent helper,
waits for its ready/armed handshake, then asks the native desktop to quit.
The helper waits for every DSH NEXT process to exit before atomically changing
`resources/app.asar` and reopening the app. There is no fixed relaunch delay
and no force-stop operation.

No npm, Python, network access or separate Node installation is needed. The
manual entry uses DSH's bundled Node runtime:

Version 0.6 upgrades the 0.5 carrier once. The new carrier reads the saved
animation selection and verified local MP4/WebM on each startup; changing
the selected video does not rewrite the application archive. User videos
remain data, never executable author code. The bundled built-in animation
still uses its reviewed responsive Canvas. An invalid custom entry skips the
early carrier and leaves the normal Host fallback available.

```powershell
& .\Install-FirstScreen.ps1
& .\Install-FirstScreen.ps1 -Action Inspect
& .\Install-FirstScreen.ps1 -Action Rollback
```

The default executable is `%LOCALAPPDATA%\Programs\DSH NEXT\DSH NEXT.exe`.
Use `-Executable 'C:\absolute\path\DSH NEXT.exe'` for an explicit alternative;
the same binary/archive whitelist is still enforced. In the manual route,
quit from DSH's own menu/tray when prompted. An external script cannot safely
substitute a main-window close for the app's real quit operation. The plugin
settings button can call the authenticated native quit API automatically.

The installer checks EXE, archive, payload and the ten animation assets before
arming. Unsupported versions or changed files stop without changing the app.
The original archive is preserved at
`resources/.dsh-awakening-backup/app.asar`; a previous managed patch is upgraded
from this verified original, never used as the original backup. Rollback does
not require healthy source animation files. Metadata lives under the adjacent
`jobs/` directory and reports only fixed error codes to the plugin UI.

The helper waits up to 90 seconds for exit. Cancellation uses a one-way flag,
and the authorization is rechecked immediately before replacement. A failed
handshake cleans up only its owned helper process; it never terminates DSH.
The GUI relaunch explicitly removes `ELECTRON_RUN_AS_NODE` from the helper's
environment. Safety/recovery mode is skipped by the native carrier.

ASAR serialization and integrity metadata use the vendored official
`@electron/asar@4.0.1` Pickle and integrity files under `vendor/`, with the
complete MIT license retained. The native payload adapts the separately
credited MIT DSH Desktop sources. No EXE, security fuse, shortcut or user
Profile is modified.
