import { i as readPrivateFile, r as privateDirectory, t as atomicJson } from "./private-files-BEfKAzcX.js";
import { a as maskSecrets } from "./log-record-CNOFHxkW.js";
import { desktopKeybindings } from "./keybindings.js";
import { r as NATIVE_ACCESS_HEADER } from "./desktop-contract-Djnia2On.js";
import { _ as unpackedPath, f as parseFeatures, p as profileName, s as NEXT_PACKAGE, v as cleanupDisposableTree } from "./recovery-BEvwjPuD.js";
import { n as IPC, r as SHELL_URL, t as APP_URL } from "./ipc-Cfin-W5Q.js";
import { DesktopBrowserGuests } from "./browser-guests.js";
import { desktopPermission } from "./permissions.js";
import { a as PNPM_IGNORE_MINIMUM_RELEASE_AGE, i as PNPM_DISABLE_UPDATE_NOTIFIER, n as bundledPnpmEntry, o as applyDesktopPackageManagerPolicy, t as ELECTRON_HEADERS_URL } from "./bundled-pnpm-DVPaEPh6.js";
import { n as startCrashReporting, t as NextDesktopRuntime } from "./desktop-runtime-Dz_Q4Rg6.js";
import { i as notificationEnabled, r as notificationCopy } from "./notifications-Byu3rRfH.js";
import { o as parsePreferences, r as probeSystemProxy, s as portsChanged } from "./system-proxy-CLT0Su1n.js";
import { appRequestHeaders, forwardWebRequest, serveWebDocument } from "./web-document.js";
import { installAppDownloads } from "./app-downloads.js";
import { n as createPackageRunner } from "./extensions-HJ5fQg8B.js";
import { createRequire } from "node:module";
import { chmodSync, constants, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep, win32 } from "node:path";
import { X509Certificate, createHash, createPrivateKey, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { access, chmod, copyFile, lstat, mkdir, mkdtemp, open, readFile, readdir, readlink, rename, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { bindingKey, effectiveShortcuts, parseShortcutDefinitions, parseShortcutEdit, presentBinding } from "@deepseek-ai/dsh-client-shortcuts/protocol";
import { parseDocument } from "yaml";
import { BrowserWindow, Menu, Notification, Tray, app, clipboard, crashReporter, desktopCapturer, dialog, ipcMain, nativeImage, nativeTheme, net, protocol, safeStorage, screen, session, shell, systemPreferences } from "electron";
import { execFile, spawn } from "node:child_process";
import { freemem, homedir, networkInterfaces, totalmem, userInfo } from "node:os";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { DSH_ENV_PREFIX, SENSITIVE_ENV_PATTERN, scrubbedParentEnv } from "@deepseek-ai/dsh-subprocess";
import { generate } from "selfsigned";
//#region src/keyboard.ts
/** Product-window preference IPC and native menu interception during physical-key dispatch/recording. */
/**
* Install application-owned configuration handlers and attach each product window's input lifecycle.
* @param getWindow - current product window.
* @param userData - Electron-resolved device preference directory.
* @param platform - local device platform.
* @param updateMenu - rebuild the application menu when the close accelerator or availability changes.
* @param overlayInput - Current shell-owned input blocking state for the product window.
* @returns menu construction, editor key delivery, window attachment, and teardown operations.
*/
function installDesktopShortcuts(getWindow, userData, platform, updateMenu, overlayInput) {
	let definitions = [];
	let recording = false;
	let revision;
	let closeBinding = null;
	let editingInput;
	const scopedDesktop = platform === "windows" || platform === "macos";
	const disposers = /* @__PURE__ */ new Set();
	const guestInputs = /* @__PURE__ */ new Map();
	const closeAccelerator = () => presentBinding(closeBinding, platform).aria?.replace("Meta+", "Command+").replace(/Arrow(Up|Down|Left|Right)$/u, "$1");
	const sendMenuClose = () => {
		const window = getWindow();
		if (window === void 0 || window.isDestroyed() || !window.isFocused() || !window.isEnabled() || revision === void 0 || recording || overlayInput(window).blocked) return;
		window.webContents.send(IPC.shortcutsInput, {
			kind: "menu",
			commandId: "page.close",
			revision
		});
	};
	let keys = /* @__PURE__ */ new Set();
	const publish = (snapshot) => {
		const wasEnabled = revision !== void 0;
		const previousAccelerator = closeAccelerator();
		revision = definitions.length === 0 || snapshot.status === "loading" ? void 0 : snapshot.revision;
		const rows = snapshot.status === "loading" ? [] : effectiveShortcuts(definitions, snapshot.document, "desktop", platform);
		keys = new Set(rows.flatMap((row) => row.binding !== null && row.issue === null && row.conflicts.length === 0 ? [bindingKey(row.binding)] : []));
		const close = rows.find((row) => row.id === "page.close");
		closeBinding = close?.issue === null && close.conflicts.length === 0 ? close.binding : null;
		if (wasEnabled !== (revision !== void 0) || previousAccelerator !== closeAccelerator()) updateMenu();
		const window = getWindow();
		if (window !== void 0 && !window.isDestroyed() && window.webContents.mainFrame.url.startsWith("dsh-app://app/")) window.webContents.send(IPC.shortcutsChanged, snapshot);
	};
	const persistence = desktopKeybindings(userData, platform, publish);
	const assertSender = (event) => {
		const window = getWindow();
		if (window === void 0 || window.isDestroyed() || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error("desktop shortcuts: rejected sender");
		if (!event.senderFrame.url.startsWith("dsh-app://app/")) throw new Error("desktop shortcuts: rejected origin");
		return window;
	};
	ipcMain.handle(IPC.shortcutsGet, async (event, input) => {
		assertSender(event);
		definitions = parseShortcutDefinitions(input);
		persistence.setDefinitions(definitions);
		return persistence.readCurrent();
	});
	ipcMain.handle(IPC.shortcutsEdit, async (event, input, expectedRevision) => {
		assertSender(event);
		if (typeof expectedRevision !== "string") throw new Error("desktop shortcuts: invalid revision");
		return persistence.edit(parseShortcutEdit(input), expectedRevision);
	});
	ipcMain.handle(IPC.shortcutsRecording, (event, active) => {
		const window = assertSender(event);
		if (typeof active !== "boolean") throw new Error("desktop shortcuts: invalid recording state");
		recording = active;
		window.webContents.setIgnoreMenuShortcuts(active);
	});
	ipcMain.handle(IPC.shortcutsCloseWindow, (event, expected) => {
		const window = assertSender(event);
		if (expected !== revision || revision === void 0 || recording || !window.isFocused() || !window.isEnabled() || overlayInput(window).blocked) return;
		window.close();
	});
	function attachInput(window, contents, guestName) {
		let deadKey = false;
		const held = /* @__PURE__ */ new Set();
		const consumed = /* @__PURE__ */ new Map();
		let inputFrame = null;
		let inputRevision;
		let overlayRevision = overlayInput(window).revision;
		const resetInput = () => {
			deadKey = false;
			held.clear();
			consumed.clear();
			inputFrame = null;
			inputRevision = void 0;
			if (!contents.isDestroyed()) contents.setIgnoreMenuShortcuts(false);
		};
		if (guestName !== void 0) guestInputs.set(contents, {
			window,
			reset: resetInput
		});
		const resetWindow = () => {
			resetInput();
			for (const guest of guestInputs.values()) if (guest.window === window) guest.reset();
		};
		const clear = () => {
			resetInput();
			if (guestName !== void 0) return;
			definitions = [];
			keys.clear();
			recording = false;
			persistence.setDefinitions(null);
		};
		const navigation = (event) => {
			if (event.isMainFrame && !event.isSameDocument) clear();
		};
		const beforeInput = (event, input) => {
			const overlay = overlayInput(window);
			if (overlay.revision !== overlayRevision) {
				resetInput();
				overlayRevision = overlay.revision;
			}
			if (overlay.blocked) {
				event.preventDefault();
				return;
			}
			if (event.defaultPrevented) {
				resetInput();
				return;
			}
			if (editingInput === contents) {
				held.clear();
				consumed.clear();
				contents.setIgnoreMenuShortcuts(true);
				return;
			}
			if (window !== getWindow() || !window.isFocused() || !window.isEnabled() || revision === void 0 || guestName !== void 0 && !contents.isFocused()) {
				contents.setIgnoreMenuShortcuts(false);
				held.clear();
				consumed.clear();
				return;
			}
			const modifiers = [
				"control",
				"alt",
				"shift",
				"meta"
			].filter((modifier) => input[modifier]);
			const key = bindingKey({
				code: input.code,
				modifiers
			});
			const match = keys.has(key);
			const menuMatch = closeBinding !== null && closeBinding.secondCode === void 0 && modifiers.join("+") === closeBinding.modifiers.join("+") && input.key.toUpperCase() === (closeBinding.code.startsWith("Key") ? closeBinding.code.slice(3) : input.code === closeBinding.code ? input.key.toUpperCase() : "");
			contents.setIgnoreMenuShortcuts(recording || match || menuMatch);
			const frame = contents.focusedFrame;
			const composing = input.isComposing || input.key === "Dead" || deadKey || input.modifiers.includes("altgr");
			if (input.type === "keyDown") deadKey = input.key === "Dead";
			if (recording || composing || frame === null) {
				held.clear();
				consumed.clear();
				return;
			}
			let binding = {
				code: input.code,
				modifiers
			};
			let priority = false;
			if (scopedDesktop) {
				if (frame !== inputFrame || inputRevision !== revision) {
					held.clear();
					inputFrame = frame;
					inputRevision = revision;
				}
				const modifierKey = /^(Control|Alt|Shift|Meta)(Left|Right)$/u.test(input.code);
				if (input.type === "keyUp") {
					if (consumed.get(input.code) === "press") event.preventDefault();
					consumed.delete(input.code);
					held.delete(input.code);
					if (modifierKey) held.clear();
					return;
				}
				if (!input.isAutoRepeat) consumed.delete(input.code);
				if (modifierKey) {
					held.clear();
					return;
				}
				if (input.isAutoRepeat && consumed.has(input.code) && !match) {
					event.preventDefault();
					return;
				}
				if (input.isAutoRepeat && !held.has(input.code) && !match) return;
				held.add(input.code);
				const codes = [input.code, ...[...held].filter((value) => value !== input.code)];
				codes.sort();
				const pair = {
					code: codes[0],
					...codes[1] === void 0 ? {} : { secondCode: codes[1] },
					modifiers
				};
				priority = keys.has(key);
				if (codes.length === 2 && keys.has(bindingKey(pair))) {
					binding = pair;
					priority = true;
				}
			}
			const main = guestName === void 0 && frame === contents.mainFrame;
			if (!priority && (main || !match)) return;
			event.preventDefault();
			if (input.type !== "keyDown") return;
			if (scopedDesktop) {
				if (!input.isAutoRepeat) {
					if (binding.secondCode !== void 0) {
						consumed.set(binding.code, "repeat");
						consumed.set(binding.secondCode, "repeat");
					}
					consumed.set(input.code, "press");
				}
				held.clear();
			}
			let embedding = frame;
			while (guestName === void 0 && !main && embedding.parent !== null && embedding.parent !== contents.mainFrame) embedding = embedding.parent;
			window.webContents.send(IPC.shortcutsInput, {
				kind: guestName === void 0 ? main ? "keyboard" : "iframe" : "webview",
				revision,
				frameName: guestName ?? (main ? "" : embedding.name),
				code: binding.code,
				...binding.secondCode === void 0 ? {} : { secondCode: binding.secondCode },
				repeat: input.isAutoRepeat,
				control: input.control,
				alt: input.alt,
				shift: input.shift,
				meta: input.meta
			});
		};
		const dispose = () => {
			contents.off("did-start-navigation", navigation);
			contents.off("before-input-event", beforeInput);
			contents.off("blur", resetInput);
			contents.off("destroyed", dispose);
			if (guestName === void 0) {
				window.off("blur", resetWindow);
				window.off("closed", closed);
			}
			disposers.delete(dispose);
			guestInputs.delete(contents);
			if (!contents.isDestroyed()) contents.setIgnoreMenuShortcuts(false);
		};
		const closed = () => {
			clear();
			dispose();
		};
		contents.on("did-start-navigation", navigation);
		contents.on("before-input-event", beforeInput);
		contents.on("blur", resetInput);
		contents.once("destroyed", dispose);
		if (guestName === void 0) {
			window.on("closed", closed);
			window.on("blur", resetWindow);
		}
		disposers.add(dispose);
		return dispose;
	}
	return {
		sendEditingKey(keyCode, modifiers) {
			const window = getWindow();
			if (window === void 0 || window.isDestroyed() || overlayInput(window).blocked) return;
			const contents = [...guestInputs].find(([guest, owner]) => owner.window === window && !guest.isDestroyed() && guest.isFocused())?.[0] ?? window.webContents;
			contents.focus();
			const previous = editingInput;
			editingInput = contents;
			try {
				contents.sendInputEvent({
					type: "keyDown",
					keyCode,
					modifiers
				});
				contents.sendInputEvent({
					type: "keyUp",
					keyCode,
					modifiers
				});
			} finally {
				editingInput = previous;
				if (!contents.isDestroyed()) contents.setIgnoreMenuShortcuts(recording);
			}
		},
		fileMenu: (labels) => {
			const accelerator = closeAccelerator();
			return {
				label: labels.fileMenu,
				submenu: [{
					id: "dsh-page-close",
					label: labels.closePage,
					enabled: revision !== void 0,
					...accelerator === void 0 ? {} : { accelerator },
					click: sendMenuClose
				}]
			};
		},
		attach(window) {
			attachInput(window, window.webContents);
		},
		attachGuest: attachInput,
		dispose() {
			for (const dispose of disposers) dispose();
			persistence.dispose();
			for (const channel of [
				IPC.shortcutsGet,
				IPC.shortcutsEdit,
				IPC.shortcutsRecording,
				IPC.shortcutsCloseWindow
			]) ipcMain.removeHandler(channel);
		}
	};
}
/** Return whether one process invocation belongs to the installer quit handoff. */
function isDesktopInstallerQuitRequest(argv, platform) {
	return platform === "win32" && argv.includes("--dsh-installer-quit");
}
//#endregion
//#region src/single-instance.ts
/** Electron single-instance ownership before any Desktop profile lifecycle begins. */
/**
* Claim the process-lifetime Desktop lock and route later launches to the owner.
* @param application - Electron application singleton.
* @param focusOwner - focus or recreate the primary window after a later launch.
* @returns true only in the process that may access the Desktop profile.
*/
function claimDesktopSingleInstance(application, focusOwner, invocation = {
	platform: process.platform,
	argv: process.argv
}) {
	if (!application.requestSingleInstanceLock()) {
		application.quit();
		return false;
	}
	if (isDesktopInstallerQuitRequest(invocation.argv, invocation.platform)) {
		application.quit();
		return false;
	}
	application.on("second-instance", (_event, argv = []) => {
		if (isDesktopInstallerQuitRequest(argv, invocation.platform)) application.quit();
		else focusOwner();
	});
	return true;
}
//#endregion
//#region src/menu-locale.ts
/** Built-in Desktop languages and the native-menu copy. */
const en = {
	application: "Application",
	edit: "Edit",
	menuBar: "Application menu",
	undo: "Undo",
	redo: "Redo",
	cut: "Cut",
	copy: "Copy",
	paste: "Paste",
	delete: "Delete",
	selectAll: "Select All"
};
const zh = {
	application: "应用",
	edit: "编辑",
	menuBar: "应用菜单",
	undo: "撤销",
	redo: "重做",
	cut: "剪切",
	copy: "复制",
	paste: "粘贴",
	delete: "删除",
	selectAll: "全选"
};
/** Follow the OS preference order, using the same primary-language match as the official frontend. */
function preferredDesktopLocale(languages) {
	for (const language of languages) {
		const primary = language.toLowerCase().replaceAll("_", "-").split("-")[0];
		if (primary === "zh" || primary === "en") return primary;
	}
	return "en";
}
function resolveDesktopLocale(language) {
	return { messages: language.toLowerCase().startsWith("zh") ? zh : en };
}
//#endregion
//#region src/native-locale.ts
/** Recovery must not depend on a running Host to recover the UI language. */
function supported(value) {
	if (typeof value !== "string" || !/^(zh|en)(?:[-_][a-zA-Z0-9]+)*$/iu.test(value)) return void 0;
	return preferredDesktopLocale([value]);
}
var NativeLocaleStore = class {
	home;
	constructor(home) {
		this.home = home;
	}
	get file() {
		return join(this.home, "desktop-locale.json");
	}
	read() {
		try {
			const value = JSON.parse(readPrivateFile(this.file, 64 * 1024) ?? "{}");
			if (!value || typeof value !== "object" || Array.isArray(value)) return {};
			return Object.fromEntries(Object.entries(value).filter(([, locale]) => supported(locale) !== void 0));
		} catch {
			return {};
		}
	}
	resolve(profile, fallback) {
		try {
			const document = parseDocument(readPrivateFile(join(this.home, "profiles", profile, "cordis.patch.yml")) ?? "[]", { logLevel: "silent" });
			if (document.errors.length === 0) {
				const rows = document.toJS({ maxAliasCount: 100 });
				if (Array.isArray(rows)) {
					let preference;
					for (const row of rows) if (row?.id === "locale" && row.disabled !== true && row.config && Object.hasOwn(row.config, "preference")) preference = supported(row.config.preference);
					if (preference) return preference;
				}
			}
		} catch {}
		return supported(this.read()[profile]) ?? preferredDesktopLocale([fallback]);
	}
	remember(profile, language) {
		const locale = supported(language);
		if (!locale) return;
		const saved = this.read();
		if (saved[profile] === locale) return;
		atomicJson(this.file, {
			...saved,
			[profile]: locale
		});
	}
};
//#endregion
//#region src/system-proxy-configuration.ts
/**
* Read whether the operating system configures any proxy at all, without asking Chromium.
*
* `probeSystemProxy` retries a DIRECT answer because a session can answer before its configuration
* lands (electron#26166). That can only hide a configuration that exists: with no manual proxy, no
* PAC file and no proxy auto-discovery, the first DIRECT is the answer, and each retry only delays
* the Host start. macOS is read from the same SystemConfiguration dictionary Chromium uses, through
* `scutil --proxy`. Other platforms answer `unknown`, which keeps the retries.
* @module
*/
/** Global proxy dictionary switches that can route an HTTP or HTTPS request through a proxy. */
const MACOS_PROXY_SWITCHES = [
	"HTTPEnable",
	"HTTPSEnable",
	"SOCKSEnable",
	"ProxyAutoConfigEnable",
	"ProxyAutoDiscoveryEnable"
];
const SCUTIL_TIMEOUT_MS = 1e3;
/**
* Read the global proxy dictionary `scutil --proxy` prints.
* @param output - the command's standard output.
* @returns `none` only for a dictionary whose proxy switches are all absent or 0.
*/
function parseScutilProxy(output) {
	if (!/^<dictionary> \{$/mu.test(output)) return "unknown";
	const values = new Map([...output.matchAll(/^ {2}([A-Za-z]+) : (.*)$/gmu)].map((match) => [match[1], match[2].trim()]));
	return MACOS_PROXY_SWITCHES.some((key) => values.has(key) && values.get(key) !== "0") ? "configured" : "none";
}
/**
* Ask the operating system whether it configures any proxy.
* @param platform - the running platform.
* @param run - runs a command and resolves its standard output; injectable for tests.
* @returns the operating system's answer; never rejects.
*/
async function readSystemProxyConfiguration(platform, run = (file, args) => new Promise((resolve, reject) => {
	execFile(file, args, {
		encoding: "utf8",
		timeout: SCUTIL_TIMEOUT_MS,
		windowsHide: true
	}, (error, stdout) => {
		if (error) reject(error);
		else resolve(stdout);
	});
})) {
	if (platform !== "darwin") return "unknown";
	try {
		return parseScutilProxy(await run("/usr/sbin/scutil", ["--proxy"]));
	} catch {
		return "unknown";
	}
}
//#endregion
//#region src/shell-environment.ts
/** Recover selected login-shell exports for packaged Unix desktop launches. */
const DEFAULT_CAPTURE_TIMEOUT_MS = 2e3;
const MAX_CAPTURE_BYTES = 1024 * 1024;
const SUPPORTED_SHELL_ARGUMENTS = /* @__PURE__ */ new Map([
	["bash", ["-ilc"]],
	["fish", [
		"--login",
		"--interactive",
		"--command"
	]],
	["zsh", ["-ilc"]]
]);
/**
* Exported rc variables that Desktop may recover in addition to PATH.
*
* Keep this list deliberately narrow: shell startup files are trusted user
* code, but their complete exported environment is not an appropriate ambient
* API for Electron or model-facing subprocesses.
*/
const DESKTOP_SHELL_ENVIRONMENT_KEYS = /* @__PURE__ */ new Set([
	"ANDROID_HOME",
	"ANDROID_SDK_ROOT",
	"ASDF_DATA_DIR",
	"ASDF_DIR",
	"BUN_INSTALL",
	"CARGO_HOME",
	"CONDA_DEFAULT_ENV",
	"CONDA_PREFIX",
	"DENO_INSTALL",
	"DOTNET_ROOT",
	"FLUTTER_ROOT",
	"GEM_HOME",
	"GEM_PATH",
	"GOBIN",
	"GOMODCACHE",
	"GOPATH",
	"GOROOT",
	"HOMEBREW_CELLAR",
	"HOMEBREW_PREFIX",
	"HOMEBREW_REPOSITORY",
	"JAVA_HOME",
	"LANG",
	"LANGUAGE",
	"MISE_CACHE_DIR",
	"MISE_CONFIG_DIR",
	"MISE_DATA_DIR",
	"MISE_STATE_DIR",
	"NVM_BIN",
	"NVM_DIR",
	"NVM_INC",
	"PNPM_HOME",
	"PYENV_ROOT",
	"RBENV_ROOT",
	"RUSTUP_HOME",
	"SDKMAN_DIR",
	"SDKROOT",
	"TZ",
	"VIRTUAL_ENV",
	"VOLTA_HOME"
]);
/**
* Parse the NUL-delimited payload emitted by the shell capture command.
* @param payload - Captured bytes from the command's private file descriptor.
* @param startMarker - Random record that begins the environment payload.
* @param endMarker - Random record that ends the environment payload.
* @returns Environment entries found between the markers.
*/
function parseShellEnvironment(payload, startMarker, endMarker) {
	const start = `${startMarker}\0`;
	const end = `${endMarker}\0`;
	const text = payload.toString("utf8");
	const startIndex = text.indexOf(start);
	if (startIndex < 0) throw new Error("desktop shell environment did not emit its start marker");
	const bodyStart = startIndex + start.length;
	const endIndex = text.indexOf(end, bodyStart);
	if (endIndex < 0) throw new Error("desktop shell environment did not emit its end marker");
	const environment = {};
	for (const record of text.slice(bodyStart, endIndex).split("\0")) {
		if (record === "") continue;
		const separator = record.indexOf("=");
		if (separator <= 0) throw new Error("desktop shell environment emitted an invalid record");
		environment[record.slice(0, separator)] = record.slice(separator + 1);
	}
	return environment;
}
/**
* Capture one interactive login shell's exported environment without accepting
* startup-file stdout or stderr as environment records.
* @param shell - Absolute zsh, bash, or fish executable.
* @param home - Working directory for shell startup.
* @param environment - Already-scrubbed environment inherited by the shell.
* @param timeoutMs - Hard deadline before the shell is killed.
* @returns Environment printed after the shell startup files finish.
*/
async function captureLoginShellEnvironment(shell, home, environment, timeoutMs = DEFAULT_CAPTURE_TIMEOUT_MS) {
	if (!isAbsolute(shell)) throw new Error("desktop shell environment requires an absolute shell path");
	const shellArguments = SUPPORTED_SHELL_ARGUMENTS.get(basename(shell).toLowerCase());
	if (shellArguments === void 0) throw new Error("desktop shell environment does not support this shell");
	const nonce = randomBytes(16).toString("hex");
	const startMarker = `dsh-shell-env-start-${nonce}`;
	const endMarker = `dsh-shell-env-end-${nonce}`;
	const command = `/usr/bin/printf '%s\\0' '${startMarker}'; /usr/bin/env -0; /usr/bin/printf '%s\\0' '${endMarker}'`;
	const child = spawn(shell, [...shellArguments, command], {
		cwd: home,
		detached: true,
		env: environment,
		stdio: [
			"ignore",
			"pipe",
			"ignore"
		],
		windowsHide: true
	});
	const killShellTree = () => {
		try {
			if (child.pid === void 0) child.kill("SIGKILL");
			else process.kill(-child.pid, "SIGKILL");
		} catch {
			try {
				child.kill("SIGKILL");
			} catch {}
		}
	};
	const output = child.stdout;
	if (output === null) {
		const closed = new Promise((resolve) => {
			child.once("error", () => {});
			child.once("close", () => {
				resolve();
			});
		});
		killShellTree();
		await closed;
		throw new Error("desktop shell environment has no capture stream");
	}
	return await new Promise((resolve, reject) => {
		const chunks = [];
		let byteLength = 0;
		let failure;
		let reading = true;
		const stopReading = () => {
			if (!reading) return;
			reading = false;
			output.off("data", accept);
		};
		const failAndKill = (error) => {
			if (failure !== void 0) return;
			failure = error;
			stopReading();
			output.destroy();
			killShellTree();
		};
		const accept = (chunk) => {
			try {
				const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
				byteLength += buffer.byteLength;
				if (byteLength > MAX_CAPTURE_BYTES) {
					failAndKill(/* @__PURE__ */ new Error(`desktop shell environment exceeded ${String(MAX_CAPTURE_BYTES)} bytes`));
					return;
				}
				chunks.push(buffer);
			} catch (error) {
				failAndKill(error instanceof Error ? error : new Error(String(error)));
			}
		};
		output.on("data", accept);
		child.once("error", failAndKill);
		const timer = setTimeout(() => {
			failAndKill(/* @__PURE__ */ new Error(`desktop shell environment timed out after ${String(timeoutMs)}ms`));
		}, timeoutMs);
		child.once("close", () => {
			clearTimeout(timer);
			stopReading();
			if (failure !== void 0) {
				reject(failure);
				return;
			}
			try {
				resolve(parseShellEnvironment(Buffer.concat(chunks), startMarker, endMarker));
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	});
}
function inheritedEnvironment(fallbackReason) {
	return {
		updates: {},
		source: "process",
		fallbackReason
	};
}
function isOfficiallyScrubbedName(name) {
	return !SENSITIVE_ENV_PATTERN.test(name) && !name.toUpperCase().startsWith(DSH_ENV_PREFIX);
}
function isSelectedShellEnvironmentName(name) {
	return name === "PATH" || name.startsWith("LC_") || DESKTOP_SHELL_ENVIRONMENT_KEYS.has(name);
}
/**
* Select safe, useful login-shell exports without overriding an explicit app
* launch environment. PATH is the sole exception: its login-shell value wins.
*/
function selectDesktopShellEnvironment(captured, inherited) {
	const updates = {};
	for (const [name, value] of Object.entries(captured)) {
		if (value === void 0 || !isOfficiallyScrubbedName(name) || !isSelectedShellEnvironmentName(name)) continue;
		if (name === "PATH") {
			if (value !== "") updates.PATH = value;
			continue;
		}
		if (inherited[name] === void 0) updates[name] = value;
	}
	return updates;
}
function resolveUserShell(options) {
	if (options.shell !== void 0) return options.shell;
	try {
		const accountShell = userInfo().shell;
		if (accountShell !== "" && accountShell !== null) return accountShell;
	} catch {}
	return options.environment.SHELL;
}
/**
* Resolve selected login-shell exports for a desktop Host launch.
* @param options - Platform, launch environment and optional capture seams.
* @returns Updates for packaged Unix desktops, otherwise an empty update set.
*/
async function resolveDesktopShellEnvironment(options) {
	if (!options.isPackaged) return inheritedEnvironment("not-packaged");
	if (options.platform === "win32") return inheritedEnvironment("windows");
	if (options.platform !== "darwin" && options.platform !== "linux") return inheritedEnvironment("unsupported-platform");
	const shell = resolveUserShell(options);
	if (shell === void 0 || shell === "") return inheritedEnvironment("missing-shell");
	if (!isAbsolute(shell) || !SUPPORTED_SHELL_ARGUMENTS.has(basename(shell).toLowerCase())) return inheritedEnvironment("unsupported-shell");
	try {
		const captureEnvironment = {
			...(options.scrubParent ?? scrubbedParentEnv)(),
			HOME: options.home,
			SHELL: shell
		};
		const updates = selectDesktopShellEnvironment(await (options.capture ?? captureLoginShellEnvironment)(shell, options.home, captureEnvironment, options.timeoutMs ?? DEFAULT_CAPTURE_TIMEOUT_MS), options.environment);
		if (updates.PATH === void 0) return inheritedEnvironment("missing-path");
		return {
			updates,
			source: "login-shell"
		};
	} catch {
		return inheritedEnvironment("capture-failed");
	}
}
//#endregion
//#region src/shell-locale.ts
/** Give GUI launches a UTF-8 locale when neither the launch environment nor the login shell names one, as Terminal.app does for its shells. */
/** Where macOS installs its locale definitions. */
const LOCALE_DIRECTORY = "/usr/share/locale";
/** The variables POSIX programs consult for their character set; any one of them keeps the environment as it is. */
const LOCALE_VARIABLES = [
	"LC_ALL",
	"LC_CTYPE",
	"LANG"
];
/**
* UTF-8 locale names for the system languages, most preferred first, ending with the English and
* language-neutral names every macOS installs.
* @param languages - BCP 47 tags as `app.getPreferredSystemLanguages()` lists them.
* @returns Candidate names such as `zh_CN.UTF-8`.
*/
function utf8LocaleCandidates(languages) {
	const candidates = [];
	for (const tag of languages) {
		const [language, ...rest] = tag.split("-");
		if (language === void 0 || !/^[A-Za-z]{2,3}$/u.test(language)) continue;
		const region = rest.find((part) => /^[A-Za-z]{2}$/u.test(part));
		const script = rest.find((part) => /^[A-Za-z]{4}$/u.test(part));
		const resolved = region ?? (language.toLowerCase() === "zh" ? script?.toLowerCase() === "hant" ? "TW" : "CN" : void 0);
		if (resolved !== void 0) candidates.push(`${language.toLowerCase()}_${resolved.toUpperCase()}.UTF-8`);
	}
	candidates.push("en_US.UTF-8", "C.UTF-8");
	return [...new Set(candidates)];
}
/**
* Set `LANG` to the first installed candidate when the environment names no locale at all.
*
* Finder and Dock launches carry no locale variables, and many shell startup files export none
* because Terminal.app sets `LANG` for the shells it opens. Without one, the Host's terminals and
* tool subprocesses run in the C locale, where `ls` prints `?` for every non-ASCII file name. The
* fallback never overrides a value the launch environment or the login shell provided.
* @param environment - Environment the Host will inherit; `LANG` is set in place.
* @param platform - Only macOS keeps its locales in one fixed directory and omits `LANG` from GUI launches.
* @param languages - System languages in preference order.
* @param installed - Whether a locale name is installed; defaults to the system locale directory.
* @returns The locale set, or undefined when the environment already had one or none is installed.
*/
function ensureUtf8Locale(environment, platform, languages, installed = (name) => existsSync(join(LOCALE_DIRECTORY, name))) {
	if (platform !== "darwin" || LOCALE_VARIABLES.some((name) => environment[name])) return void 0;
	const locale = utf8LocaleCandidates(languages).find(installed);
	if (locale !== void 0) environment.LANG = locale;
	return locale;
}
//#endregion
//#region src/update-state.ts
function updateLabel(state, language) {
	const t = (zh, en) => language.toLowerCase().startsWith("zh") ? zh : en;
	switch (state.phase) {
		case "checking": return t("正在检查更新…", "Checking for updates…");
		case "current": return t("已是最新版本", "Up to date");
		case "available": return t(`发现新版本 ${state.version}`, `Update available: ${state.version}`);
		case "downloading": {
			const progress = state.total ? `${Math.min(100, Math.floor((state.received ?? 0) / state.total * 100))}%` : `${Math.floor((state.received ?? 0) / 1048576)} MB`;
			return t(`正在下载更新 ${progress}`, `Downloading update ${progress}`);
		}
		case "preparing": return t("正在准备安装…", "Preparing update…");
		case "ready": return t(`${state.version} 已下载，安装并重启`, `${state.version} downloaded — Install and restart`);
		case "installing": return t("正在安装并重启…", "Installing and restarting…");
		case "error":
			if (state.error === "development") return t("开发环境可检查更新，请使用安装版进行更新。", "Updates can be checked in development. Install a packaged build to update.");
			if (state.error === "unsupported") return t("当前平台暂不支持应用内更新。", "In-app updates are unavailable on this platform.");
			if (state.error === "service") return t("暂时无法获取 Next 更新，请稍后重试。", "Next updates are temporarily unavailable. Try again later.");
			return t("更新未完成，请重试。", "The update could not be completed. Please retry.");
		default: return t("检查更新", "Check for updates");
	}
}
function updateAction(state) {
	if (state.phase === "ready") return "install-update";
	if (state.phase === "available" || state.phase === "error" && state.version && state.error !== "service") return "download-update";
	if ([
		"idle",
		"current",
		"error"
	].includes(state.phase)) return "check-updates";
}
//#endregion
//#region src/desktop-menu.ts
function desktopMenu(state, language, show, run) {
	const t = (zh, en) => language.toLowerCase().startsWith("zh") ? zh : en;
	const action = (label, type, enabled = true) => ({
		label,
		enabled: enabled && (!state.busy || type === "controls"),
		click: () => run({ type }),
		...type === "controls" ? { accelerator: "CmdOrCtrl+," } : {}
	});
	return [
		{
			label: t("打开 DSH NEXT", "Open DSH NEXT"),
			click: show
		},
		action(t("重新加载界面", "Reload Interface"), "reload", state.phase === "ready"),
		action(t("退出并重启", "Quit and Restart"), "restart-app"),
		{ type: "separator" },
		...["darwin", "win32"].includes(state.platform) ? [action(t("打开 DSH 终端", "Open DSH Terminal"), "terminal")] : [],
		action(t("导出诊断信息…", "Export Diagnostics…"), "diagnostics"),
		action(state.safeMode ? t("退出安全模式并重启…", "Exit Safe Mode and Restart…") : t("进入安全模式…", "Enter Safe Mode…"), state.safeMode ? "normal-mode" : "safe-mode"),
		{ type: "separator" },
		{
			label: `${t("Profile：", "Profile: ")}${state.selected}`,
			submenu: [
				...state.profiles.map((name) => ({
					label: state.unavailableProfiles.includes(name) ? `${name}${t("（不可用于桌面端）", " (Unavailable for Desktop)")}` : name,
					type: "radio",
					checked: name === state.selected,
					enabled: !state.busy && !state.unavailableProfiles.includes(name),
					click: () => {
						if (name !== state.selected || state.safeMode || state.phase !== "ready") run({
							type: "switch",
							name
						});
					}
				})),
				{ type: "separator" },
				{
					label: t("新建 Profile…", "New Profile…"),
					enabled: !state.busy,
					click: () => run({
						type: "controls",
						page: "create-profile"
					})
				},
				{
					label: t("管理 Profile…", "Manage Profiles…"),
					click: () => run({
						type: "controls",
						page: "profiles"
					})
				}
			]
		},
		{ type: "separator" },
		action(t("设置…", "Settings…"), "controls"),
		...["darwin", "win32"].includes(state.platform) && state.updates ? [action(updateLabel(state.updates, language), updateAction(state.updates) ?? "check-updates", !!updateAction(state.updates))] : [],
		...state.browserUrl ? [action(t("在浏览器中打开", "Open in Browser"), "open-browser")] : [],
		{
			label: t("恢复助手…", "Recovery Assistant…"),
			click: () => run({
				type: "controls",
				page: "recovery"
			})
		},
		{ type: "separator" },
		{
			label: t("退出", "Quit"),
			accelerator: "CmdOrCtrl+Q",
			click: () => run({ type: "quit" })
		}
	];
}
//#endregion
//#region src/window-material.ts
function windowMaterial(preferences, platform = process.platform) {
	if (platform === "darwin") return preferences.macosMaterial;
	return "off";
}
//#endregion
//#region src/native-desktop.ts
/** Electron-only tray, materials, and user-turn notifications. */
function applyWindowMaterial(window, preferences) {
	const material = windowMaterial(preferences);
	if (process.platform === "darwin") window.setVibrancy(material === "transparent" ? "sidebar" : null);
	window.setBackgroundColor(material === "off" ? nativeTheme.shouldUseDarkColors ? "#1b1b1c" : "#f9fafb" : "#00000000");
	window.webContents.send(IPC.material, material);
}
var NativeDesktop = class {
	options;
	tray;
	notifications = /* @__PURE__ */ new Set();
	constructor(options) {
		this.options = options;
	}
	get available() {
		return !!this.tray && !this.tray.isDestroyed();
	}
	createTray() {
		try {
			const icon = nativeImage.createFromPath(unpackedPath(join(this.options.root, "assets", process.platform === "darwin" ? "tray-iconTemplate.png" : "tray-icon-blue.png")));
			if (icon.isEmpty()) throw new Error("Tray icon is unavailable");
			if (process.platform === "darwin") icon.setTemplateImage(true);
			this.tray = new Tray(icon);
			this.tray.on("click", this.options.show);
			this.tray.on("double-click", this.options.show);
			this.refresh();
		} catch (error) {
			this.options.warn(error);
		}
	}
	items() {
		return desktopMenu(this.options.state(), this.options.language(), this.options.show, this.options.run);
	}
	refresh() {
		if (process.platform !== "win32") Menu.setApplicationMenu(Menu.buildFromTemplate([
			{
				label: "DSH NEXT",
				submenu: this.items()
			},
			{ role: "editMenu" },
			{ role: "viewMenu" },
			{ role: "windowMenu" }
		]));
		if (!this.available) return;
		const state = this.options.state();
		this.tray.setToolTip(`DSH NEXT · ${state.selected} · ${state.phase}${state.updates && state.updates.phase !== "idle" ? ` · ${updateLabel(state.updates, this.options.language())}` : ""}`);
		if (process.platform === "darwin") {
			const progress = state.updates;
			this.tray.setTitle(progress?.phase === "downloading" ? progress.total ? `${Math.min(100, Math.floor((progress.received ?? 0) / progress.total * 100))}%` : `${Math.floor((progress.received ?? 0) / 1048576)} MB` : progress?.phase === "ready" ? "✓" : "");
		}
		this.tray.setContextMenu(Menu.buildFromTemplate(this.items()));
	}
	notify(message) {
		const state = this.options.state();
		const window = this.options.window();
		if (!Notification.isSupported() || !notificationEnabled(state.preferences, message.outcome) || window?.isFocused()) return;
		const notification = new Notification(notificationCopy(message, this.options.language()));
		this.notifications.add(notification);
		notification.once("click", this.options.show);
		notification.once("close", () => this.notifications.delete(notification));
		notification.once("failed", (_event, error) => {
			this.notifications.delete(notification);
			this.options.warn(error);
		});
		notification.show();
		if (this.notifications.size > 10) {
			const oldest = this.notifications.values().next().value;
			oldest.close();
			this.notifications.delete(oldest);
		}
	}
	notifyUpdate(version, onSelect) {
		if (!Notification.isSupported()) {
			onSelect();
			return;
		}
		const notification = new Notification({
			title: "DSH NEXT",
			body: this.options.language().toLowerCase().startsWith("zh") ? `发现新版本 v${version}，点击下载更新。` : `DSH NEXT v${version} is available. Click to download the update.`
		});
		this.notifications.add(notification);
		notification.once("click", () => {
			this.options.show();
			onSelect();
		});
		notification.once("close", () => this.notifications.delete(notification));
		notification.once("failed", (_event, error) => {
			this.notifications.delete(notification);
			this.options.warn(error);
		});
		notification.show();
		if (this.notifications.size > 10) {
			const oldest = this.notifications.values().next().value;
			oldest.close();
			this.notifications.delete(oldest);
		}
	}
	close() {
		this.tray?.destroy();
		this.tray = void 0;
		for (const item of this.notifications) item.close();
		this.notifications.clear();
	}
};
//#endregion
//#region src/lan-addresses.ts
/** Startup-sampled IPv4 authorities admitted by the Desktop LAN HTTPS edge. */
function canonicalIpv4(address) {
	const parts = address.split(".");
	return parts.length === 4 && parts.every((part) => /^\d{1,3}$/u.test(part) && String(Number(part)) === part && Number(part) <= 255);
}
/** Return a stable, duplicate-free snapshot of non-loopback LAN IPv4 literals. */
function desktopLanAddresses(interfaces = networkInterfaces()) {
	const addresses = Object.values(interfaces).flatMap((values) => values ?? []).filter((value) => value.family === "IPv4" && !value.internal && canonicalIpv4(value.address)).map((value) => value.address);
	return Object.freeze([...new Set(addresses)].sort((left, right) => left.localeCompare(right)));
}
//#endregion
//#region src/lan-https-certificate.ts
/** Private local CA and short-lived certificates for Desktop LAN HTTPS. */
const STATE_DIRECTORY_NAME = "lan-https";
const STATE_FILENAME = "ca.json";
const STATE_VERSION$1 = 1;
const PRIVATE_DIRECTORY_MODE$1 = 448;
const PRIVATE_FILE_MODE$3 = 384;
const MAX_STATE_BYTES$1 = 128 * 1024;
const MAX_ADDRESSES = 64;
const CA_COMMON_NAME = "DeepSeek Harness Desktop Local CA";
const CA_VALIDITY_DAYS = 3650;
const LEAF_VALIDITY_DAYS = 30;
const RSA_KEY_SIZE = 2048;
const SERVER_AUTH_OID = "1.3.6.1.5.5.7.3.1";
const CHECK_POSIX_MODE = process.platform !== "win32";
const SHA256_WITH_RSA_OID = Buffer.from("06092a864886f70d01010b", "hex");
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
/** Stable, non-secret failure surfaced by the LAN HTTPS certificate boundary. */
var DesktopLanHttpsCertificateError = class extends Error {
	code;
	constructor(code, message, options = {}) {
		super(message, options.cause === void 0 ? void 0 : { cause: options.cause });
		this.name = "DesktopLanHttpsCertificateError";
		this.code = code;
	}
};
/** Log only the certificate boundary's controlled description, never a raw OS error or key material. */
function lanHttpsCertificateDiagnostic(error) {
	if (!(error instanceof DesktopLanHttpsCertificateError)) return "LAN HTTPS certificate setup failed (unexpected error)";
	return `LAN HTTPS certificate setup failed (${error.code}): ${error.message}`;
}
function certificateError(code, message, cause) {
	return new DesktopLanHttpsCertificateError(code, `dsh-desktop-next: ${message}`, cause === void 0 ? {} : { cause });
}
/** Exact state path below one Electron userData directory. */
function desktopLanHttpsCertificateStatePath(userDataDir) {
	if (typeof userDataDir !== "string" || userDataDir.length === 0 || /[\0\r\n]/u.test(userDataDir) || !isAbsolute(userDataDir)) throw certificateError("certificate-state", "LAN HTTPS userData must be an absolute path without control characters.");
	return join(resolve(userDataDir), STATE_DIRECTORY_NAME, STATE_FILENAME);
}
/**
* Load or create the installation-local CA, then issue a fresh RSA leaf for
* the exact canonical IPv4 addresses supplied by the ingress boundary.
*/
async function createLanHttpsCertificate(userDataDir, addresses, protector) {
	const statePath = desktopLanHttpsCertificateStatePath(userDataDir);
	const validatedAddresses = validateAddresses(addresses);
	const usableProtector = await requireAvailableProtector(protector);
	await prepareStateDirectory$1(resolve(userDataDir), join(resolve(userDataDir), STATE_DIRECTORY_NAME));
	let ca;
	try {
		ca = await withFileLock(statePath, async () => {
			const stateText = await readPrivateStateFile(statePath);
			if (stateText !== void 0) return openPersistedCa(parsePersistedState(stateText), usableProtector);
			const created = await generateCa();
			await persistCa(statePath, created, usableProtector);
			return created;
		}, { waitMs: 1e4 });
	} catch (cause) {
		if (cause instanceof DesktopLanHttpsCertificateError) throw cause;
		throw certificateError("certificate-state", "LAN HTTPS CA state could not be accessed safely.", cause);
	}
	const leaf = await generateLeaf(ca, validatedAddresses);
	return Object.freeze({
		key: leaf.privateKey,
		cert: `${leaf.certificate}${ca.certificate}`,
		caCertificate: ca.certificate,
		caFingerprint: createHash("sha256").update(ca.x509.raw).digest("hex"),
		addresses: validatedAddresses
	});
}
function validateAddresses(addresses) {
	if (!Array.isArray(addresses) || addresses.length === 0) throw certificateError("no-address", "LAN HTTPS needs at least one IPv4 address.");
	if (addresses.length > MAX_ADDRESSES) throw certificateError("invalid-address", `LAN HTTPS accepts at most ${String(MAX_ADDRESSES)} addresses.`);
	const copy = Array.from(addresses);
	for (const address of copy) if (!isCanonicalIpv4(address)) throw certificateError("invalid-address", `LAN HTTPS address is not canonical IPv4: ${String(address)}`);
	return Object.freeze(copy);
}
function isCanonicalIpv4(value) {
	if (typeof value !== "string") return false;
	const parts = value.split(".");
	return parts.length === 4 && parts.every((part) => {
		if (!/^(?:0|[1-9][0-9]{0,2})$/u.test(part)) return false;
		const octet = Number(part);
		return octet >= 0 && octet <= 255;
	});
}
async function requireAvailableProtector(protector) {
	if (protector === void 0 || typeof protector.seal !== "function" || typeof protector.open !== "function") throw certificateError("certificate-unavailable", "LAN HTTPS private-key protection is unavailable.");
	try {
		if ((typeof protector.available === "function" ? await protector.available() : protector.available) !== true) throw certificateError("certificate-unavailable", "LAN HTTPS private-key protection is unavailable.");
	} catch (cause) {
		if (cause instanceof DesktopLanHttpsCertificateError) throw cause;
		throw certificateError("certificate-unavailable", "LAN HTTPS private-key protection check failed.", cause);
	}
	return protector;
}
async function prepareStateDirectory$1(userDataDir, stateDirectory) {
	try {
		const userDataInfo = await lstat(userDataDir);
		if (!userDataInfo.isDirectory() || userDataInfo.isSymbolicLink()) throw certificateError("certificate-state", "LAN HTTPS userData must be an ordinary directory.");
		try {
			await mkdir(stateDirectory, { mode: PRIVATE_DIRECTORY_MODE$1 });
			await chmod(stateDirectory, PRIVATE_DIRECTORY_MODE$1);
		} catch (cause) {
			if (cause.code !== "EEXIST") throw cause;
		}
		const stateInfo = await lstat(stateDirectory);
		if (!stateInfo.isDirectory() || stateInfo.isSymbolicLink()) throw certificateError("certificate-state", "LAN HTTPS state directory must be an ordinary directory.");
		if (CHECK_POSIX_MODE && (stateInfo.mode & 511) !== PRIVATE_DIRECTORY_MODE$1) throw certificateError("certificate-state", "LAN HTTPS state directory permissions must be 700.");
	} catch (cause) {
		if (cause instanceof DesktopLanHttpsCertificateError) throw cause;
		throw certificateError("certificate-state", "LAN HTTPS state directory is unavailable.", cause);
	}
}
async function readPrivateStateFile(statePath) {
	let pathInfo;
	try {
		pathInfo = await lstat(statePath);
	} catch (cause) {
		if (cause.code === "ENOENT") return void 0;
		throw certificateError("certificate-state", "LAN HTTPS CA state could not be inspected.", cause);
	}
	if (!pathInfo.isFile() || pathInfo.isSymbolicLink()) throw certificateError("certificate-state", "LAN HTTPS CA state must be an ordinary file.");
	assertPrivateFile(pathInfo.mode, pathInfo.size);
	let handle;
	try {
		handle = await open(statePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	} catch (cause) {
		throw certificateError("certificate-state", "LAN HTTPS CA state could not be opened safely.", cause);
	}
	try {
		const openedInfo = await handle.stat();
		if (!openedInfo.isFile() || openedInfo.dev !== pathInfo.dev || openedInfo.ino !== pathInfo.ino) throw certificateError("certificate-state", "LAN HTTPS CA state changed while it was being opened.");
		assertPrivateFile(openedInfo.mode, openedInfo.size);
		const bytes = Buffer.alloc(131073);
		let offset = 0;
		while (offset < bytes.byteLength) {
			const { bytesRead } = await handle.read(bytes, offset, bytes.byteLength - offset, null);
			if (bytesRead === 0) break;
			offset += bytesRead;
		}
		if (offset > MAX_STATE_BYTES$1) throw certificateError("certificate-state", `LAN HTTPS CA state exceeds ${String(MAX_STATE_BYTES$1)} bytes.`);
		try {
			return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, offset));
		} catch (cause) {
			throw certificateError("certificate-state", "LAN HTTPS CA state must contain valid UTF-8.", cause);
		}
	} finally {
		await handle.close();
	}
}
function assertPrivateFile(mode, size) {
	if (size > MAX_STATE_BYTES$1) throw certificateError("certificate-state", `LAN HTTPS CA state exceeds ${String(MAX_STATE_BYTES$1)} bytes.`);
	if (CHECK_POSIX_MODE && (mode & 511) !== PRIVATE_FILE_MODE$3) throw certificateError("certificate-state", "LAN HTTPS CA state permissions must be 600.");
}
function parsePersistedState(text) {
	let value;
	try {
		value = JSON.parse(text);
	} catch (cause) {
		throw certificateError("certificate-state", "LAN HTTPS CA state must contain valid JSON.", cause);
	}
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw certificateError("certificate-state", "LAN HTTPS CA state root must be an object.");
	const object = value;
	const keys = Object.keys(object).sort();
	if (keys.length !== 3 || keys[0] !== "certificate" || keys[1] !== "sealedPrivateKey" || keys[2] !== "version") throw certificateError("certificate-state", "LAN HTTPS CA state contains unexpected fields.");
	if (object.version !== STATE_VERSION$1) throw certificateError("certificate-state", "LAN HTTPS CA state has an unsupported version.");
	if (typeof object.certificate !== "string") throw certificateError("certificate-state", "LAN HTTPS CA certificate must be PEM text.");
	if (typeof object.sealedPrivateKey !== "string" || !isCanonicalBase64(object.sealedPrivateKey)) throw certificateError("certificate-state", "LAN HTTPS sealed CA private key must be canonical base64.");
	return Object.freeze({
		version: STATE_VERSION$1,
		certificate: object.certificate,
		sealedPrivateKey: object.sealedPrivateKey
	});
}
function isCanonicalBase64(value) {
	if (value.length === 0 || value.length > MAX_STATE_BYTES$1 || value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) return false;
	return Buffer.from(value, "base64").toString("base64") === value;
}
async function openPersistedCa(state, protector) {
	const sealed = Buffer.from(state.sealedPrivateKey, "base64");
	let opened;
	try {
		const output = await protector.open(sealed);
		if (!(output instanceof Uint8Array) || output.byteLength === 0 || output.byteLength > MAX_STATE_BYTES$1) throw new TypeError("protector returned invalid plaintext");
		opened = Buffer.from(output);
	} catch (cause) {
		throw certificateError("certificate-unavailable", "LAN HTTPS CA private key could not be opened.", cause);
	} finally {
		sealed.fill(0);
	}
	try {
		let privateKey;
		try {
			privateKey = new TextDecoder("utf-8", { fatal: true }).decode(opened);
		} catch (cause) {
			throw certificateError("certificate-state", "LAN HTTPS CA private key plaintext is not valid UTF-8.", cause);
		}
		return validateCa(state.certificate, privateKey, true);
	} finally {
		opened.fill(0);
	}
}
async function generateCa() {
	const notBeforeDate = /* @__PURE__ */ new Date(Date.now() - 1440 * 60 * 1e3);
	const notAfterDate = new Date(notBeforeDate.getTime() + CA_VALIDITY_DAYS * 24 * 60 * 60 * 1e3);
	try {
		const generated = await generate([{
			name: "commonName",
			value: CA_COMMON_NAME
		}], {
			algorithm: "sha256",
			keyType: "rsa",
			keySize: RSA_KEY_SIZE,
			notBeforeDate,
			notAfterDate,
			extensions: [{
				name: "basicConstraints",
				cA: true,
				pathLenConstraint: 0,
				critical: true
			}, {
				name: "keyUsage",
				keyCertSign: true,
				cRLSign: true,
				critical: true
			}]
		});
		return validateCa(generated.cert, generated.private);
	} catch (cause) {
		if (cause instanceof DesktopLanHttpsCertificateError) throw cause;
		throw certificateError("certificate-unavailable", "LAN HTTPS local CA could not be generated.", cause);
	}
}
function validateCa(certificate, privateKey, requireCanonical = false) {
	try {
		const x509 = new X509Certificate(certificate);
		const canonicalCertificate = x509.toString();
		const keyObject = createPrivateKey(privateKey);
		const canonicalPrivateKey = exportPrivateKey(keyObject);
		if (requireCanonical && (certificate !== canonicalCertificate || privateKey !== canonicalPrivateKey)) throw new TypeError("CA material is not canonical PEM");
		if (!x509.ca || x509.subject !== `CN=${CA_COMMON_NAME}` || x509.issuer !== x509.subject || keyObject.asymmetricKeyType !== "rsa" || !x509.checkPrivateKey(keyObject) || !x509.verify(x509.publicKey) || !usesSha256WithRsa(x509)) throw new TypeError("CA certificate invariants are not satisfied");
		const now = Date.now();
		if (x509.validFromDate.getTime() > now || x509.validToDate.getTime() <= now) throw new TypeError("CA certificate is outside its validity period");
		return Object.freeze({
			certificate: canonicalCertificate,
			privateKey: canonicalPrivateKey,
			x509
		});
	} catch (cause) {
		throw certificateError("certificate-state", "LAN HTTPS CA state does not contain a valid matching CA keypair.", cause);
	}
}
function exportPrivateKey(key) {
	const exported = key.export({
		type: "pkcs8",
		format: "pem"
	});
	return typeof exported === "string" ? exported : exported.toString("utf8");
}
async function persistCa(statePath, ca, protector) {
	const plaintext = Buffer.from(ca.privateKey, "utf8");
	let sealed;
	try {
		const output = await protector.seal(plaintext);
		if (!(output instanceof Uint8Array) || output.byteLength === 0 || output.byteLength > MAX_STATE_BYTES$1) throw new TypeError("protector returned invalid sealed bytes");
		sealed = Buffer.from(output);
		if (sealed.equals(plaintext) || sealed.includes(Buffer.from("PRIVATE KEY", "utf8"))) throw new TypeError("protector did not conceal the private key");
	} catch (cause) {
		throw certificateError("certificate-unavailable", "LAN HTTPS CA private key could not be sealed.", cause);
	} finally {
		plaintext.fill(0);
	}
	try {
		const state = Object.freeze({
			version: STATE_VERSION$1,
			certificate: ca.certificate,
			sealedPrivateKey: sealed.toString("base64")
		});
		await writeFileAtomic(statePath, `${JSON.stringify(state, void 0, 2)}\n`, {
			mode: PRIVATE_FILE_MODE$3,
			dirMode: PRIVATE_DIRECTORY_MODE$1
		});
		if (CHECK_POSIX_MODE) await chmod(statePath, PRIVATE_FILE_MODE$3);
	} catch (cause) {
		throw certificateError("certificate-state", "LAN HTTPS CA state could not be persisted safely.", cause);
	} finally {
		sealed.fill(0);
	}
}
async function generateLeaf(ca, addresses) {
	const primaryAddress = addresses[0];
	if (primaryAddress === void 0) throw certificateError("no-address", "LAN HTTPS needs at least one IPv4 address.");
	const notBeforeDate = /* @__PURE__ */ new Date(Date.now() - 300 * 1e3);
	const notAfterDate = new Date(notBeforeDate.getTime() + LEAF_VALIDITY_DAYS * 24 * 60 * 60 * 1e3);
	try {
		const generated = await generate([{
			name: "commonName",
			value: primaryAddress
		}], {
			algorithm: "sha256",
			keyType: "rsa",
			keySize: RSA_KEY_SIZE,
			notBeforeDate,
			notAfterDate,
			ca: {
				key: ca.privateKey,
				cert: ca.certificate
			},
			extensions: [
				{
					name: "basicConstraints",
					cA: false,
					critical: true
				},
				{
					name: "keyUsage",
					digitalSignature: true,
					keyEncipherment: true,
					critical: true
				},
				{
					name: "extKeyUsage",
					serverAuth: true,
					critical: true
				},
				{
					name: "subjectAltName",
					critical: true,
					altNames: addresses.map((address) => ({
						type: 7,
						ip: address
					}))
				}
			]
		});
		const x509 = new X509Certificate(generated.cert);
		const keyObject = createPrivateKey(generated.private);
		const privateKey = exportPrivateKey(keyObject);
		const certificate = x509.toString();
		if (x509.ca || keyObject.asymmetricKeyType !== "rsa" || !x509.checkPrivateKey(keyObject) || !x509.verify(ca.x509.publicKey) || !usesSha256WithRsa(x509) || !x509.keyUsage?.includes(SERVER_AUTH_OID) || addresses.some((address) => x509.checkIP(address) !== address)) throw new TypeError("issued leaf certificate invariants are not satisfied");
		return Object.freeze({
			privateKey,
			certificate
		});
	} catch (cause) {
		throw certificateError("certificate-unavailable", "LAN HTTPS server certificate could not be generated.", cause);
	}
}
function usesSha256WithRsa(certificate) {
	return certificate.raw.indexOf(SHA256_WITH_RSA_OID) >= 0;
}
Object.freeze({
	stateDirectoryName: STATE_DIRECTORY_NAME,
	stateFilename: STATE_FILENAME,
	stateVersion: STATE_VERSION$1,
	directoryMode: PRIVATE_DIRECTORY_MODE$1,
	fileMode: PRIVATE_FILE_MODE$3,
	maxStateBytes: MAX_STATE_BYTES$1,
	maxAddresses: MAX_ADDRESSES,
	caValidityDays: CA_VALIDITY_DAYS,
	leafValidityDays: LEAF_VALIDITY_DAYS,
	rsaKeySize: RSA_KEY_SIZE
});
//#endregion
//#region src/desktop-terminal.ts
const RUN_AS_NODE = "ELECTRON_RUN_AS_NODE";
const DEFAULT_PROFILE = "DSH_DESKTOP_DEFAULT_PROFILE";
const DSH_HOME = "DSH_HOME";
const PATH = "PATH";
const WINDOWS_APP_EXECUTABLE = "DSH_DESKTOP_APP_EXECUTABLE";
const WINDOWS_DSH_BOOTSTRAP = "DSH_DESKTOP_DSH_BOOTSTRAP";
const WINDOWS_ELECTRON_VERSION = "DSH_DESKTOP_ELECTRON_VERSION";
const WINDOWS_PNPM_ENTRY = "DSH_DESKTOP_PNPM_ENTRY";
const WINDOWS_PROFILE_DIRECTORY = "DSH_DESKTOP_PROFILE_DIRECTORY";
const WINDOWS_TERMINAL_MODE = "DSH_DESKTOP_TERMINAL_MODE";
const WINDOWS_PRODUCT_VERSION = "DSH_DESKTOP_PRODUCT_VERSION";
const WINDOWS_SHIM_DIRECTORY = "DSH_DESKTOP_SHIM_DIRECTORY";
const WINDOWS_POWERSHELL_WELCOME = "DSH_DESKTOP_POWERSHELL_WELCOME";
const WINDOWS_CMD_WELCOME = "DSH_DESKTOP_CMD_WELCOME";
const WINDOWS_SHELL_EXECUTABLE = "DSH_DESKTOP_SHELL_EXECUTABLE";
const WINDOWS_GENERATED_ENVIRONMENT_KEYS = /* @__PURE__ */ new Set([
	DEFAULT_PROFILE,
	WINDOWS_APP_EXECUTABLE,
	WINDOWS_DSH_BOOTSTRAP,
	WINDOWS_ELECTRON_VERSION,
	WINDOWS_PNPM_ENTRY,
	WINDOWS_PROFILE_DIRECTORY,
	WINDOWS_PRODUCT_VERSION,
	WINDOWS_TERMINAL_MODE,
	WINDOWS_SHIM_DIRECTORY,
	WINDOWS_POWERSHELL_WELCOME,
	WINDOWS_CMD_WELCOME,
	WINDOWS_SHELL_EXECUTABLE
]);
const STATE_DIRECTORY_MODE = 448;
const EXECUTABLE_FILE_MODE = 448;
const PRIVATE_FILE_MODE$2 = 384;
const WINDOWS_SHELL_COMMANDS = [
	"pwsh.exe",
	"powershell.exe",
	"cmd.exe"
];
/**
* Keep generated command shims stable for one selected profile.
* @param userDataDir - Electron-owned persistent data directory.
* @param profileName - profile embedded in the generated DSH shim.
* @returns private per-profile terminal state directory.
*/
function desktopTerminalStateDirectory(userDataDir, profileName$1) {
	assertScriptValue("user data directory", userDataDir);
	profileName(profileName$1);
	return join(userDataDir, "cli", createHash("sha256").update(profileName$1, "utf8").digest("hex"));
}
/** Reject values that cannot be represented safely in generated command files. */
function assertScriptValue(label, value) {
	if (value.length === 0) throw new Error(`dsh-desktop-next: terminal ${label} must not be empty`);
	if (/[\0\r\n]/.test(value)) throw new Error(`dsh-desktop-next: terminal ${label} must not contain NUL or newlines`);
}
/** Quote one arbitrary value as a POSIX shell word. */
function quoteSh(value) {
	return `'${value.replaceAll("'", `'"'"'`)}'`;
}
/** Escape printable text following an `echo(` batch builtin. */
function escapeBatchText(value) {
	if (/\r|\n/.test(value)) throw new Error("dsh-desktop-next: terminal Windows welcome text must not contain newlines");
	return value.replaceAll("^", "^^").replaceAll("%", "%%").replaceAll("&", "^&").replaceAll("|", "^|").replaceAll("<", "^<").replaceAll(">", "^>").replaceAll("(", "^(").replaceAll(")", "^)");
}
/** Remove a temporary file while preserving every error except absence. */
function unlinkTemporaryFile(filename) {
	try {
		unlinkSync(filename);
	} catch (cause) {
		if (cause.code !== "ENOENT") throw cause;
	}
}
/** Replace one generated file without following a pre-existing target symlink. */
function replacePrivateFile(filename, contents, mode) {
	const temporary = join(dirname(filename), `.${basename(filename)}.${process.pid}.${randomUUID()}.tmp`);
	try {
		writeFileSync(temporary, contents, {
			encoding: "utf8",
			flag: "wx",
			mode
		});
		chmodSync(temporary, mode);
		renameSync(temporary, filename);
	} finally {
		unlinkTemporaryFile(temporary);
	}
}
/** Create and verify the private directory holding terminal launch files. */
function prepareStateDirectory(stateDir) {
	mkdirSync(stateDir, {
		recursive: true,
		mode: STATE_DIRECTORY_MODE
	});
	const stat = lstatSync(stateDir);
	if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`dsh-desktop-next: terminal state path is not a private directory: ${stateDir}`);
	chmodSync(stateDir, STATE_DIRECTORY_MODE);
}
/** Build a command shim that enables Electron's Node mode only for its child. */
function macShim(appExecutable, binPath) {
	const entry = binPath === void 0 ? "" : ` ${quoteSh(binPath)}`;
	return [
		"#!/bin/sh",
		`${RUN_AS_NODE}=1 exec ${quoteSh(appExecutable)}${entry} "$@"`,
		""
	].join("\n");
}
/** Build a command shim that enables Electron's Node mode only for its child. */
function windowsShim() {
	return [
		"@echo off",
		"setlocal DisableDelayedExpansion",
		`set "${RUN_AS_NODE}=1"`,
		`"%${WINDOWS_APP_EXECUTABLE}%" %*`,
		"exit /b %errorlevel%",
		""
	].join("\r\n");
}
/** Build the DSH shim with Loader internals and one process-local default profile. */
function macDshShim(options) {
	return [
		"#!/bin/sh",
		[
			`${DEFAULT_PROFILE}=${quoteSh(options.profileName)}`,
			`${RUN_AS_NODE}=1`,
			`exec ${quoteSh(options.appExecutable)} --expose-internals ${quoteSh(options.dshBootstrapPath)} "$@"`
		].join(" "),
		""
	].join("\n");
}
/** Build the Windows DSH shim with Loader internals and one local default profile. */
function windowsDshShim() {
	return [
		"@echo off",
		"setlocal DisableDelayedExpansion",
		`set "${RUN_AS_NODE}=1"`,
		`"%${WINDOWS_APP_EXECUTABLE}%" --expose-internals "%${WINDOWS_DSH_BOOTSTRAP}%" %*`,
		"exit /b %errorlevel%",
		""
	].join("\r\n");
}
/** Build a pnpm shim with Electron native-module settings scoped to its process tree. */
function macPnpmShim(options) {
	return [
		"#!/bin/sh",
		[
			`${RUN_AS_NODE}=1`,
			"npm_config_runtime=electron",
			`npm_config_target=${quoteSh(options.electronVersion)}`,
			`npm_config_disturl=${quoteSh(ELECTRON_HEADERS_URL)}`,
			`exec ${quoteSh(options.appExecutable)} ${quoteSh(options.pnpmBinPath)} ${PNPM_DISABLE_UPDATE_NOTIFIER} ${PNPM_IGNORE_MINIMUM_RELEASE_AGE} "$@"`
		].join(" "),
		""
	].join("\n");
}
/** Build a pnpm batch shim with Electron settings local to its `setlocal` child tree. */
function windowsPnpmShim() {
	return [
		"@echo off",
		"setlocal DisableDelayedExpansion",
		`set "${RUN_AS_NODE}=1"`,
		"set \"npm_config_runtime=electron\"",
		`set "npm_config_target=%${WINDOWS_ELECTRON_VERSION}%"`,
		`set "npm_config_disturl=${ELECTRON_HEADERS_URL}"`,
		`"%${WINDOWS_APP_EXECUTABLE}%" "%${WINDOWS_PNPM_ENTRY}%" ${PNPM_DISABLE_UPDATE_NOTIFIER} ${PNPM_IGNORE_MINIMUM_RELEASE_AGE} %*`,
		"exit /b %errorlevel%",
		""
	].join("\r\n");
}
/** Build a zsh startup file that preserves the user's rc and then restores desktop variables. */
function macZshRc(options, shimDir) {
	return [
		"if [[ -n \"${DSH_DESKTOP_USER_ZDOTDIR:-}\" && -r \"${DSH_DESKTOP_USER_ZDOTDIR}/.zshrc\" ]]; then",
		"  ZDOTDIR=\"${DSH_DESKTOP_USER_ZDOTDIR}\"",
		"  source \"${DSH_DESKTOP_USER_ZDOTDIR}/.zshrc\"",
		"fi",
		`unset ${RUN_AS_NODE}`,
		`export ${DSH_HOME}=${quoteSh(options.homeDir)}`,
		"typeset -U path",
		`path=(${quoteSh(shimDir)} $path)`,
		"export PATH",
		`unset DSH_DESKTOP_USER_ZDOTDIR`,
		""
	].join("\n");
}
/** Build a bash startup file that preserves the user's rc and then restores desktop variables. */
function macBashRc(options, shimDir) {
	return [
		"if [ -n \"${DSH_DESKTOP_USER_BASHRC:-}\" ] && [ -r \"${DSH_DESKTOP_USER_BASHRC}\" ]; then",
		"  . \"${DSH_DESKTOP_USER_BASHRC}\"",
		"fi",
		`unset ${RUN_AS_NODE}`,
		`export ${DSH_HOME}=${quoteSh(options.homeDir)}`,
		"case \":${PATH:-}:\" in",
		`  *:${quoteSh(shimDir)}:*) ;;`,
		`  *) export PATH=${quoteSh(shimDir)}:"\${PATH:-}" ;;`,
		"esac",
		"unset DSH_DESKTOP_USER_BASHRC",
		""
	].join("\n");
}
function terminalModeLabel(mode) {
	if (mode === "safe") return "安全模式临时环境 / Safe mode: temporary environment";
	if (mode === "recovery") return "恢复修复终端：原 Profile / Recovery terminal: original Profile";
	return "正常环境 / Normal environment";
}
/** Build the macOS script opened by LaunchServices in the user's terminal. */
function macWelcome(options, shimDir, bashRcPath) {
	return [
		"#!/bin/sh",
		`unset ${RUN_AS_NODE}`,
		`export ${DSH_HOME}=${quoteSh(options.homeDir)}`,
		`export PATH=${quoteSh(shimDir)}:"\${PATH:-}"`,
		`cd ${quoteSh(options.profileDir)}`,
		"printf '\\033[2J\\033[3J\\033[H'",
		`printf '%s\\n' ${quoteSh(`DSH Desktop ${options.productVersion} terminal`)}`,
		`printf '%s\\n' ${quoteSh(terminalModeLabel(options.mode))}`,
		`printf '%s\\n' ${quoteSh(`Profile: ${options.profileName}`)}`,
		`printf '%s\\n' ${quoteSh(`Profile directory: ${options.profileDir}`)}`,
		`printf '%s\\n' ${quoteSh(`Harness home: ${options.homeDir}`)}`,
		`printf '%s\\n' ${quoteSh(`Plugin commands without --profile modify the ${options.profileName} profile.`)}`,
		`printf '%s\\n' ${quoteSh("Commands:")}`,
		`printf '  %s\\n' ${quoteSh("dsh --dump-config")}`,
		`printf '  %s\\n' ${quoteSh("dsh plugin add <third-party-plugin>")}`,
		`printf '  %s\\n' ${quoteSh("dsh plugin remove <third-party-plugin>")}`,
		`printf '  %s\\n' ${quoteSh("dsh plugin update")}`,
		`printf '%s\\n' ${quoteSh("Restart DSH Desktop after plugin changes.")}`,
		"case \"${SHELL:-/bin/zsh}\" in",
		"  */bash)",
		"    export DSH_DESKTOP_USER_BASHRC=\"${HOME:-}/.bashrc\"",
		`    exec "\${SHELL}" --noprofile --rcfile ${quoteSh(bashRcPath)} -i`,
		"    ;;",
		"  */zsh)",
		"    export DSH_DESKTOP_USER_ZDOTDIR=\"${ZDOTDIR:-${HOME:-}}\"",
		`    export ZDOTDIR=${quoteSh(options.stateDir)}`,
		"    exec \"${SHELL}\" -i",
		"    ;;",
		"  *)",
		"    export DSH_DESKTOP_USER_ZDOTDIR=\"${ZDOTDIR:-${HOME:-}}\"",
		`    export ZDOTDIR=${quoteSh(options.stateDir)}`,
		"    exec /bin/zsh -i",
		"    ;;",
		"esac",
		""
	].join("\n");
}
/** Build the PowerShell script that remains active in the new console. */
function windowsWelcome() {
	return [
		`Remove-Item Env:${RUN_AS_NODE} -ErrorAction SilentlyContinue`,
		`$dshDesktopShimDir = $env:${WINDOWS_SHIM_DIRECTORY}`,
		`$dshDesktopPath = @($env:${PATH} -split ';' | Where-Object { -not [string]::Equals($_, $dshDesktopShimDir, [StringComparison]::OrdinalIgnoreCase) })`,
		`$env:${PATH} = (@($dshDesktopShimDir) + $dshDesktopPath) -join ';'`,
		`Set-Location -LiteralPath $env:${WINDOWS_PROFILE_DIRECTORY}`,
		`Write-Host ("DSH Desktop {0} terminal" -f $env:${WINDOWS_PRODUCT_VERSION})`,
		`Write-Host $env:${WINDOWS_TERMINAL_MODE}`,
		`Write-Host ("Profile: {0}" -f $env:${DEFAULT_PROFILE})`,
		`Write-Host ("Profile directory: {0}" -f $env:${WINDOWS_PROFILE_DIRECTORY})`,
		`Write-Host ("Harness home: {0}" -f $env:${DSH_HOME})`,
		`Write-Host ("Plugin commands without --profile modify the {0} profile." -f $env:${DEFAULT_PROFILE})`,
		`Write-Host 'Commands:'`,
		`Write-Host '  dsh --dump-config'`,
		`Write-Host '  dsh plugin add <third-party-plugin>'`,
		`Write-Host '  dsh plugin remove <third-party-plugin>'`,
		`Write-Host '  dsh plugin update'`,
		`Write-Host 'Restart DSH Desktop after plugin changes.'`,
		""
	].join("\r\n");
}
/** Build the fallback batch welcome script used when PowerShell is unavailable. */
function windowsCmdWelcome() {
	return [
		"@echo off",
		"setlocal EnableDelayedExpansion",
		`set "${RUN_AS_NODE}="`,
		`cd /d "!${WINDOWS_PROFILE_DIRECTORY}!"`,
		`echo(DSH Desktop !${WINDOWS_PRODUCT_VERSION}! terminal`,
		`echo(!${WINDOWS_TERMINAL_MODE}!`,
		`echo(Profile: !${DEFAULT_PROFILE}!`,
		`echo(Profile directory: !${WINDOWS_PROFILE_DIRECTORY}!`,
		`echo(Harness home: !${DSH_HOME}!`,
		`echo(Plugin commands without --profile modify the !${DEFAULT_PROFILE}! profile.`,
		"echo(Commands:",
		`echo(  ${escapeBatchText("dsh --dump-config")}`,
		`echo(  ${escapeBatchText("dsh plugin add <third-party-plugin>")}`,
		`echo(  ${escapeBatchText("dsh plugin remove <third-party-plugin>")}`,
		`echo(  ${escapeBatchText("dsh plugin update")}`,
		`echo(${escapeBatchText("Restart DSH Desktop after plugin changes.")}`,
		"endlocal & set \"ELECTRON_RUN_AS_NODE=\"",
		""
	].join("\r\n");
}
/** Create command shims and the interactive welcome script. */
function prepareDesktopTerminalFiles(options) {
	if (options.platform !== "darwin" && options.platform !== "win32") throw new Error(`dsh-desktop-next: terminal is unsupported on ${options.platform}`);
	profileName(options.profileName);
	for (const [label, value] of [
		["application executable", options.appExecutable],
		["dsh bootstrap", options.dshBootstrapPath],
		["pnpm entry", options.pnpmBinPath],
		["Electron version", options.electronVersion],
		["profile directory", options.profileDir],
		["Harness home", options.homeDir],
		["state directory", options.stateDir],
		["product version", options.productVersion]
	]) assertScriptValue(label, value);
	prepareStateDirectory(options.stateDir);
	const shimDir = join(options.stateDir, "bin");
	prepareStateDirectory(shimDir);
	if (options.platform === "darwin") {
		const files = {
			shimDir,
			dshShimPath: join(shimDir, "dsh"),
			pnpmShimPath: join(shimDir, "pnpm"),
			nodeShimPath: join(shimDir, "node"),
			welcomePath: join(options.stateDir, "welcome.command")
		};
		const bashRcPath = join(options.stateDir, "bashrc");
		replacePrivateFile(files.dshShimPath, macDshShim(options), EXECUTABLE_FILE_MODE);
		replacePrivateFile(files.pnpmShimPath, macPnpmShim(options), EXECUTABLE_FILE_MODE);
		replacePrivateFile(files.nodeShimPath, macShim(options.appExecutable), EXECUTABLE_FILE_MODE);
		replacePrivateFile(join(options.stateDir, ".zshrc"), macZshRc(options, shimDir), PRIVATE_FILE_MODE$2);
		replacePrivateFile(bashRcPath, macBashRc(options, shimDir), PRIVATE_FILE_MODE$2);
		replacePrivateFile(files.welcomePath, macWelcome(options, shimDir, bashRcPath), EXECUTABLE_FILE_MODE);
		return files;
	}
	if (options.platform === "win32") {
		const windowsCmdWelcomePath = join(options.stateDir, "welcome.cmd");
		const files = {
			shimDir,
			dshShimPath: join(shimDir, "dsh.cmd"),
			pnpmShimPath: join(shimDir, "pnpm.cmd"),
			nodeShimPath: join(shimDir, "node.cmd"),
			welcomePath: join(options.stateDir, "welcome.ps1"),
			windowsCmdWelcomePath
		};
		replacePrivateFile(files.dshShimPath, windowsDshShim(), PRIVATE_FILE_MODE$2);
		replacePrivateFile(files.pnpmShimPath, windowsPnpmShim(), PRIVATE_FILE_MODE$2);
		replacePrivateFile(files.nodeShimPath, windowsShim(), PRIVATE_FILE_MODE$2);
		replacePrivateFile(files.welcomePath, windowsWelcome(), PRIVATE_FILE_MODE$2);
		replacePrivateFile(windowsCmdWelcomePath, windowsCmdWelcome(), PRIVATE_FILE_MODE$2);
		return files;
	}
	throw new Error(`dsh-desktop-next: terminal is unsupported on ${options.platform}`);
}
/** Copy the Host environment and scope desktop command discovery to one terminal child. */
function terminalEnvironment(options, files) {
	const source = options.environment ?? process.env;
	const env = {};
	let inheritedPath;
	for (const [key, value] of Object.entries(source)) {
		const normalized = key.toUpperCase();
		if (normalized === RUN_AS_NODE || normalized === DSH_HOME) continue;
		if (options.platform === "win32" && WINDOWS_GENERATED_ENVIRONMENT_KEYS.has(normalized)) continue;
		if (normalized === PATH) {
			inheritedPath ??= value;
			continue;
		}
		env[key] = value;
	}
	const delimiter = options.platform === "win32" ? ";" : ":";
	env[PATH] = inheritedPath === void 0 || inheritedPath.length === 0 ? files.shimDir : `${files.shimDir}${delimiter}${inheritedPath}`;
	env[DSH_HOME] = options.homeDir;
	if (options.platform === "win32") {
		env[DEFAULT_PROFILE] = options.profileName;
		env[WINDOWS_APP_EXECUTABLE] = options.appExecutable;
		env[WINDOWS_DSH_BOOTSTRAP] = options.dshBootstrapPath;
		env[WINDOWS_ELECTRON_VERSION] = options.electronVersion;
		env[WINDOWS_PNPM_ENTRY] = options.pnpmBinPath;
		env[WINDOWS_PROFILE_DIRECTORY] = options.profileDir;
		env[WINDOWS_PRODUCT_VERSION] = options.productVersion;
		env[WINDOWS_TERMINAL_MODE] = terminalModeLabel(options.mode);
		env[WINDOWS_SHIM_DIRECTORY] = files.shimDir;
		env[WINDOWS_POWERSHELL_WELCOME] = files.welcomePath;
		if (files.windowsCmdWelcomePath !== void 0) env[WINDOWS_CMD_WELCOME] = files.windowsCmdWelcomePath;
	}
	return env;
}
/** Read one Windows environment value without trusting its key casing. */
function windowsEnvironmentValue(environment, name) {
	const normalized = name.toUpperCase();
	for (const [key, value] of Object.entries(environment)) if (key.toUpperCase() === normalized) return value;
}
/** Resolve known Windows shells from explicit system paths and then the inherited PATH. */
function defaultWindowsExecutableResolver(command, environment, exists) {
	const candidates = [];
	const systemRoot = windowsEnvironmentValue(environment, "SystemRoot");
	if (command.toLowerCase() === "powershell.exe" && systemRoot !== void 0) candidates.push(win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"));
	if (command.toLowerCase() === "cmd.exe") {
		const comSpec = windowsEnvironmentValue(environment, "ComSpec");
		if (comSpec !== void 0) candidates.push(comSpec);
		if (systemRoot !== void 0) candidates.push(win32.join(systemRoot, "System32", "cmd.exe"));
	}
	const inheritedPath = windowsEnvironmentValue(environment, PATH);
	if (inheritedPath !== void 0) for (const rawDir of inheritedPath.split(";")) {
		const dir = rawDir.startsWith("\"") && rawDir.endsWith("\"") ? rawDir.slice(1, -1) : rawDir;
		if (dir.length > 0) candidates.push(win32.join(dir, command));
	}
	return candidates.find((candidate) => exists(candidate));
}
/** Resolve the preferred Windows Terminal host, preserving an explicit adapter. */
function resolveWindowsTerminal(options, _environment) {
	return options.windowsTerminal;
}
/** Select PowerShell 7, Windows PowerShell, or the built-in command prompt. */
function resolveWindowsShell(options, environment) {
	const exists = options.windowsExecutableExists ?? existsSync;
	const resolveExecutable = options.windowsExecutableResolver ?? defaultWindowsExecutableResolver;
	for (const command of WINDOWS_SHELL_COMMANDS) {
		const executable = resolveExecutable(command, environment, exists);
		if (executable === void 0) continue;
		assertScriptValue(`${command} executable`, executable);
		return {
			kind: command === "cmd.exe" ? "cmd" : "powershell",
			executable
		};
	}
	throw new Error("dsh-desktop-next: terminal requires pwsh.exe, powershell.exe, or cmd.exe on Windows");
}
/** Convert one selected Windows shell into an argv-only launch. */
function windowsShellArgv(shell, files) {
	if (shell.kind === "cmd") {
		const welcome = files.windowsCmdWelcomePath;
		if (welcome === void 0) throw new Error("dsh-desktop-next: terminal did not generate the Windows command prompt welcome script");
		return [
			"/D",
			"/K",
			"call",
			welcome
		];
	}
	return [
		"-NoLogo",
		"-NoExit",
		"-ExecutionPolicy",
		"Bypass",
		"-File",
		files.welcomePath
	];
}
/** Resolve the trusted command processor used only to invoke the `start` broker. */
function resolveWindowsCommandProcessor(options, environment, shell) {
	if (shell.kind === "cmd") return shell.executable;
	const exists = options.windowsExecutableExists ?? existsSync;
	const executable = (options.windowsExecutableResolver ?? defaultWindowsExecutableResolver)("cmd.exe", environment, exists);
	if (executable === void 0) throw new Error("dsh-desktop-next: terminal requires cmd.exe to create a visible Windows console");
	assertScriptValue("cmd.exe executable", executable);
	return executable;
}
/** Build the trusted batch broker whose `start` command owns the visible console. */
function windowsLaunchBroker(shell) {
	const target = shell.kind === "cmd" ? `"!${WINDOWS_SHELL_EXECUTABLE}!" /D /K call "!${WINDOWS_CMD_WELCOME}!"` : `"!${WINDOWS_SHELL_EXECUTABLE}!" -NoLogo -NoExit -ExecutionPolicy Bypass -File "!${WINDOWS_POWERSHELL_WELCOME}!"`;
	return [
		"@echo off",
		"setlocal EnableDelayedExpansion",
		`start "DSH NEXT" /D "!${WINDOWS_PROFILE_DIRECTORY}!" ${target}`,
		"exit /b %errorlevel%",
		""
	].join("\r\n");
}
/** Report a launcher error without leaving an unhandled EventEmitter error. */
function reportLaunchError(options, cause) {
	if (options.onLaunchError !== void 0) try {
		options.onLaunchError(cause);
		return;
	} catch (reportCause) {
		const detail = reportCause instanceof Error ? reportCause.message : String(reportCause);
		process.stderr.write(`dsh-desktop-next: terminal error reporter failed: ${detail}\n`);
		return;
	}
	process.stderr.write(`dsh-desktop-next: failed to open terminal: ${cause.message}\n`);
}
/**
* Generate a private desktop CLI environment and open it in a native terminal.
* @param options - packaged CLI paths, profile identity, private state, and process adapter.
* @returns generated file paths and the platform launcher process.
*/
function openDesktopTerminal(options) {
	const files = prepareDesktopTerminalFiles(options);
	const env = terminalEnvironment(options, files);
	let command;
	let args;
	let detached = true;
	let windowsHide = false;
	let launcherCwd = options.profileDir;
	let windowsLauncherPath;
	if (options.platform === "darwin") {
		command = "/usr/bin/open";
		args = [
			"-a",
			"Terminal",
			files.welcomePath
		];
	} else {
		const shell = resolveWindowsShell(options, env);
		const shellArgs = windowsShellArgv(shell, files);
		const windowsTerminal = resolveWindowsTerminal(options, env);
		if (windowsTerminal !== void 0) {
			command = windowsTerminal.executable;
			args = [
				...windowsTerminal.arguments ?? [],
				shell.executable,
				...shellArgs
			];
		} else {
			command = resolveWindowsCommandProcessor(options, env, shell);
			env[WINDOWS_SHELL_EXECUTABLE] = shell.executable;
			windowsLauncherPath = join(options.stateDir, "launch.cmd");
			replacePrivateFile(windowsLauncherPath, windowsLaunchBroker(shell), PRIVATE_FILE_MODE$2);
			args = [
				"/D",
				"/S",
				"/C",
				basename(windowsLauncherPath)
			];
			detached = false;
			windowsHide = true;
			launcherCwd = options.stateDir;
		}
	}
	const spawnOptions = {
		cwd: launcherCwd,
		detached,
		env,
		shell: false,
		stdio: "ignore",
		windowsHide
	};
	const child = options.spawn(command, args, spawnOptions);
	let launchFailureReported = false;
	const reportLaunchFailure = (cause) => {
		if (launchFailureReported) return;
		launchFailureReported = true;
		reportLaunchError(options, cause);
	};
	child.once("error", reportLaunchFailure);
	child.once("exit", (code, signal) => {
		if (code === 0) return;
		const outcome = code === null ? `signal ${signal ?? "unknown"}` : `code ${String(code)}`;
		reportLaunchFailure(/* @__PURE__ */ new Error(`terminal launcher exited with ${outcome}`));
	});
	child.unref();
	return {
		shimDir: files.shimDir,
		dshShimPath: files.dshShimPath,
		pnpmShimPath: files.pnpmShimPath,
		nodeShimPath: files.nodeShimPath,
		welcomePath: files.welcomePath,
		...windowsLauncherPath === void 0 ? {} : { windowsLauncherPath },
		child
	};
}
//#endregion
//#region ../dsh-plugin-desktop/src/auxiliary-window-options.ts
/** Whether a renderer-owned frame is needed below visible native controls. */
function auxiliaryWindowHasCustomFrame(platform = process.platform, windowControls = true) {
	return windowControls && (platform === "darwin" || platform === "win32");
}
/** Hide the ordinary OS title row while retaining native window controls. */
function auxiliaryWindowChromeOptions(platform = process.platform, windowControls = true) {
	if (!windowControls) return {
		frame: false,
		closable: false,
		minimizable: false,
		maximizable: false
	};
	if (platform === "darwin") return {
		titleBarStyle: "hiddenInset",
		trafficLightPosition: {
			x: 16,
			y: 12
		}
	};
	if (platform === "win32") return {
		titleBarStyle: "hidden",
		titleBarOverlay: {
			color: "#00000000",
			symbolColor: "#7f858f",
			height: 36
		},
		hasShadow: true,
		roundedCorners: true,
		thickFrame: true
	};
	return {};
}
//#endregion
//#region ../dsh-plugin-desktop/src/context-menu.ts
/**
* Build the official editing template. Editable targets get the full editing
* set, selected read-only text gets Copy alone, and anything else gets no menu.
* Availability comes from Chromium's edit flags. Empty accelerators suppress
* Electron's default shortcut labels for native roles; Windows additionally
* needs explicit labels because its native roles are not localized.
*/
function editingContextMenuTemplate(params, platform, labels) {
	const { isEditable, selectionText, editFlags } = params;
	const items = [];
	if (isEditable) items.push({
		role: "undo",
		enabled: editFlags.canUndo
	}, {
		role: "redo",
		enabled: editFlags.canRedo
	}, { type: "separator" }, {
		role: "cut",
		enabled: editFlags.canCut
	}, {
		role: "copy",
		enabled: editFlags.canCopy
	}, {
		role: "paste",
		enabled: editFlags.canPaste
	}, { type: "separator" }, {
		role: "selectAll",
		enabled: editFlags.canSelectAll
	});
	else if (selectionText.length > 0) items.push({
		role: "copy",
		enabled: editFlags.canCopy
	});
	return items.map((item) => ({
		...item,
		...platform === "win32" && item.role !== void 0 && item.role in labels ? { label: labels[item.role] } : {},
		accelerator: ""
	}));
}
/** Pop the editing menu over `window` on every `context-menu` event; returns the listener remover. */
function installEditingContextMenu(webContents, window, options) {
	const listener = (_event, params) => {
		if (window.isDestroyed()) return;
		const template = editingContextMenuTemplate(params, options.platform, options.labels());
		if (template.length === 0) return;
		options.menu().buildFromTemplate(template).popup({ window });
	};
	webContents.on("context-menu", listener);
	return () => {
		webContents.off("context-menu", listener);
	};
}
//#endregion
//#region src/main-window-state.ts
/** Durable size, position and maximized state for the one DSH NEXT main window. */
const STATE_VERSION = 1;
const MAX_STATE_BYTES = 4 * 1024;
const MAIN_WINDOW_STATE_FILENAME = "desktop-window-state.json";
function isSafeCoordinate(value) {
	return typeof value === "number" && Number.isSafeInteger(value);
}
function isPositiveDimension(value) {
	return isSafeCoordinate(value) && value > 0;
}
function parseBounds(value) {
	if (value === null || typeof value !== "object") throw new Error("main-window bounds must be an object");
	const candidate = value;
	if (!isSafeCoordinate(candidate.x) || !isSafeCoordinate(candidate.y)) throw new Error("main-window coordinates must be safe integers");
	if (!isPositiveDimension(candidate.width) || !isPositiveDimension(candidate.height)) throw new Error("main-window dimensions must be positive safe integers");
	return {
		x: candidate.x,
		y: candidate.y,
		width: candidate.width,
		height: candidate.height
	};
}
function parseState(value) {
	if (value === null || typeof value !== "object") throw new Error("main-window state must be an object");
	const candidate = value;
	if (candidate.version !== STATE_VERSION) throw new Error("main-window state has an unsupported version");
	if (typeof candidate.maximized !== "boolean") throw new Error("main-window maximized state must be a boolean");
	return {
		bounds: parseBounds(candidate.bounds),
		maximized: candidate.maximized
	};
}
/** Filesystem-backed state store in the Desktop data directory. */
var FileMainWindowStateStore = class {
	statePath;
	constructor(homeDirectory) {
		this.statePath = join(homeDirectory, MAIN_WINDOW_STATE_FILENAME);
	}
	read() {
		const text = readPrivateFile(this.statePath, MAX_STATE_BYTES);
		return text === void 0 ? void 0 : parseState(JSON.parse(text));
	}
	write(state) {
		const { bounds, maximized } = parseState({
			...state,
			version: STATE_VERSION
		});
		atomicJson(this.statePath, {
			version: STATE_VERSION,
			bounds,
			maximized
		});
	}
};
/** Keep a restored rectangle usable when monitor layout or work area has changed. */
function fitMainWindowBounds(bounds, workArea, minimum) {
	const restored = parseBounds(bounds);
	const available = parseBounds(workArea);
	const minWidth = isPositiveDimension(minimum.width) ? minimum.width : 1;
	const minHeight = isPositiveDimension(minimum.height) ? minimum.height : 1;
	const width = Math.max(minWidth, Math.min(restored.width, available.width));
	const height = Math.max(minHeight, Math.min(restored.height, available.height));
	const visibleWidth = Math.max(0, Math.min(restored.x + width, available.x + available.width) - Math.max(restored.x, available.x));
	const topEdgeIsReachable = restored.y >= available.y - 32 && restored.y < available.y + available.height - 36;
	if (width === restored.width && height === restored.height && visibleWidth >= Math.min(64, width) && topEdgeIsReachable) return restored;
	const maxX = available.x + Math.max(0, available.width - width);
	const maxY = available.y + Math.max(0, available.height - height);
	return {
		x: Math.min(maxX, Math.max(available.x, restored.x)),
		y: Math.min(maxY, Math.max(available.y, restored.y)),
		width,
		height
	};
}
/**
* Read the state a settled main window should reopen with. Hidden, minimized, fullscreen and
* destroyed windows keep `previous`: they are not a layout to reopen, and closing to the tray or
* quitting hides the window before the last capture. On macOS a maximized window also keeps the
* previous normal bounds, because Electron updates them there only for programmatic changes, not
* for a zoom from the title bar; Windows and Linux report the restore rectangle, which follows a
* maximized window moved to another display.
* @param window - the main window.
* @param previous - the last settled state, if any.
* @param platform - the running platform.
* @returns the state to keep, or `undefined` while nothing has settled yet.
*/
function captureMainWindowState(window, previous, platform) {
	if (window.isDestroyed() || !window.isVisible() || window.isMinimized() || window.isFullScreen()) return previous;
	const maximized = window.isMaximized();
	const bounds = maximized && platform === "darwin" && previous !== void 0 ? previous.bounds : window.getNormalBounds();
	return {
		bounds: {
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height
		},
		maximized
	};
}
/** Compare two states without relying on object identity. */
function sameMainWindowState(left, right) {
	return left.maximized === right.maximized && left.bounds.x === right.bounds.x && left.bounds.y === right.bounds.y && left.bounds.width === right.bounds.width && left.bounds.height === right.bounds.height;
}
//#endregion
//#region src/update-installer.ts
/** Native installer handoff with explicit user-visible progress on Windows and macOS. */
const execute = promisify(execFile);
const MAC_PROGRESS_UI_SCRIPT = `
ObjC.import("Cocoa");
const app = $.NSApplication.sharedApplication;
app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
const env = $.NSProcessInfo.processInfo.environment;
const title = ObjC.unwrap(env.objectForKey("DSH_UPDATE_TITLE")) || "DSH NEXT";
const message = ObjC.unwrap(env.objectForKey("DSH_UPDATE_MESSAGE")) || "Updating DSH NEXT…";
const win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(0, 0, 380, 110), $.NSTitledWindowMask, $.NSBackingStoreBuffered, false);
win.setTitle($(title));
win.setLevel($.NSFloatingWindowLevel);
win.setReleasedWhenClosed(false);
const content = win.contentView;
const label = $.NSTextField.alloc.initWithFrame($.NSMakeRect(24, 58, 332, 24));
label.setStringValue($(message));
label.setBezeled(false);
label.setDrawsBackground(false);
label.setEditable(false);
label.setSelectable(false);
label.setFont($.NSFont.systemFontOfSize(13));
content.addSubview(label);
const bar = $.NSProgressIndicator.alloc.initWithFrame($.NSMakeRect(24, 28, 332, 20));
bar.setStyle($.NSProgressIndicatorBarStyle);
bar.setIndeterminate(true);
bar.startAnimation(null);
content.addSubview(bar);
win.center;
win.makeKeyAndOrderFront(null);
app.activateIgnoringOtherApps(true);
app.run;
`;
const MAC_UPDATE_SCRIPT = [
	"/usr/bin/osascript -l JavaScript -e \"$DSH_UPDATE_UI_SCRIPT\" >/dev/null 2>&1 &",
	"UI_PID=$!",
	"cleanup() { kill \"$UI_PID\" 2>/dev/null || true; }",
	"trap cleanup EXIT",
	"i=0",
	"while kill -0 \"$DSH_UPDATE_PID\" 2>/dev/null; do",
	"  i=$((i + 1))",
	"  [ \"$i\" -ge 150 ] && exit 1",
	"  sleep 0.2",
	"done",
	"BACKUP=\"${DSH_UPDATE_INSTALLED}.backup-$$\"",
	"rm -rf \"$BACKUP\"",
	"mv \"$DSH_UPDATE_INSTALLED\" \"$BACKUP\" || exit 1",
	"if mv \"$DSH_UPDATE_STAGED\" \"$DSH_UPDATE_INSTALLED\" 2>/dev/null || /usr/bin/ditto \"$DSH_UPDATE_STAGED\" \"$DSH_UPDATE_INSTALLED\"; then",
	"  rm -rf \"$BACKUP\" \"$DSH_UPDATE_DIR\"",
	"else",
	"  rm -rf \"$DSH_UPDATE_INSTALLED\"",
	"  mv \"$BACKUP\" \"$DSH_UPDATE_INSTALLED\"",
	"  cleanup",
	"  /usr/bin/open \"$DSH_UPDATE_INSTALLED\"",
	"  exit 1",
	"fi",
	"/usr/bin/xattr -dr com.apple.quarantine \"$DSH_UPDATE_INSTALLED\" 2>/dev/null || true",
	"sleep 0.8",
	"cleanup",
	"/usr/bin/open \"$DSH_UPDATE_INSTALLED\" --args --updated"
].join("\n");
/** Check both bundle identity and embedded SemVer before validating the signature. */
function assertNextMacBundle(identifier, manifest, version) {
	if (identifier.trim() !== "ai.deepseek.dsh.desktop.next" || !manifest || typeof manifest !== "object" || manifest.name !== "dsh-desktop-next" || manifest.version !== version) throw new Error("The downloaded application does not match this Next release");
}
function assertNextWindowsInstaller(info, version) {
	if (info.ProductName !== "DSH NEXT" || info.ProductVersion !== version) throw new Error("The installer does not match this Next release");
}
var NextUpdateInstaller = class {
	options;
	prepared;
	nativeReady = false;
	constructor(options) {
		this.options = options;
	}
	async prepare(path, version, directory, signal) {
		this.prepared = void 0;
		this.nativeReady = false;
		if (this.options.platform === "win32") {
			const info = await execute(join(process.env.SystemRoot ?? "C:\\Windows", "System32/WindowsPowerShell/v1.0/powershell.exe"), [
				"-NoProfile",
				"-NonInteractive",
				"-EncodedCommand",
				Buffer.from("$ErrorActionPreference=\"Stop\"; (Get-Item -LiteralPath $env:DSH_UPDATE_INSTALLER).VersionInfo | Select-Object ProductName,ProductVersion | ConvertTo-Json -Compress", "utf16le").toString("base64")
			], {
				signal,
				timeout: 3e4,
				windowsHide: true,
				env: {
					...process.env,
					DSH_UPDATE_INSTALLER: path
				},
				maxBuffer: 16384
			});
			assertNextWindowsInstaller(JSON.parse(info.stdout.replace(/^\uFEFF/, "")), version);
			this.prepared = {
				path,
				version
			};
			return;
		}
		if (this.options.platform !== "darwin") throw new Error("Unsupported update platform");
		const mount = join(directory, "volume");
		await mkdir(mount, { mode: 448 });
		const run = (file, args) => execute(file, args, {
			signal,
			timeout: 10 * 6e4,
			maxBuffer: 1024 * 1024
		});
		const installed = dirname(dirname(dirname(this.options.executable)));
		if (!installed.endsWith(".app")) throw new Error("Invalid installed Next application bundle");
		await run("/usr/bin/codesign", [
			"--verify",
			"--deep",
			"--strict",
			installed
		]);
		let attached = false;
		try {
			await run("/usr/bin/hdiutil", [
				"attach",
				"-readonly",
				"-nobrowse",
				"-noautoopen",
				"-mountpoint",
				mount,
				path
			]);
			attached = true;
			const apps = (await readdir(mount, { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"));
			if (apps.length !== 1) throw new Error("Expected one application in the Next disk image");
			const bundle = join(mount, apps[0].name);
			const info = await run("/usr/libexec/PlistBuddy", [
				"-c",
				"Print :CFBundleIdentifier",
				join(bundle, "Contents", "Info.plist")
			]);
			const manifestPath = join(bundle, "Contents", "Resources", "app", "package.json");
			const meta = await lstat(manifestPath);
			if (!meta.isFile() || meta.isSymbolicLink() || meta.size > 128 * 1024) throw new Error("Invalid Next application manifest");
			assertNextMacBundle(info.stdout, JSON.parse(await readFile(manifestPath, "utf8")), version);
			await run("/usr/bin/codesign", [
				"--verify",
				"--deep",
				"--strict",
				bundle
			]);
			const installedSignature = await run("/usr/bin/codesign", [
				"-dv",
				"--verbose=4",
				installed
			]);
			const candidateSignature = await run("/usr/bin/codesign", [
				"-dv",
				"--verbose=4",
				bundle
			]);
			const team = /^TeamIdentifier=([A-Z0-9]+)$/m.exec(installedSignature.stderr)?.[1];
			if (!team || !candidateSignature.stderr.split("\n").includes(`TeamIdentifier=${team}`)) throw new Error("Next update signing team does not match the installed application");
			const staged = join(directory, apps[0].name);
			await run("/usr/bin/ditto", [bundle, staged]);
			this.prepared = {
				path,
				version,
				directory,
				bundle: staged,
				installed
			};
		} finally {
			await execute("/usr/bin/hdiutil", ["detach", mount], { timeout: 3e4 }).catch(async () => {
				try {
					await execute("/usr/bin/hdiutil", [
						"detach",
						"-force",
						mount
					], { timeout: 3e4 });
				} catch (error) {
					if (attached) throw error;
				}
			});
		}
	}
	/** Validate that the prepared bundle and target directory are ready before shutting down the app. */
	async stage() {
		const prepared = this.prepared;
		if (!prepared) throw new Error("No prepared Next update");
		if (this.options.platform === "win32") return;
		if (this.nativeReady) return;
		if (!prepared.bundle || !prepared.installed || !prepared.directory) throw new Error("No prepared Next update");
		const stat = await lstat(prepared.bundle);
		if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Prepared Next application bundle is unavailable");
		await access(dirname(prepared.installed), constants.W_OK);
		await access(prepared.installed, constants.W_OK);
		this.nativeReady = true;
	}
	/** Called after the Host and windows have finished shutting down. */
	async launch() {
		if (this.options.platform === "darwin") {
			const prepared = this.prepared;
			if (!this.nativeReady || !prepared?.bundle || !prepared.installed || !prepared.directory) throw new Error("No prepared update installer");
			const message = (this.options.language?.() ?? "en").toLowerCase().startsWith("zh") ? `正在更新 DSH NEXT 至 ${prepared.version}，请稍候…` : `Updating DSH NEXT to ${prepared.version}, please wait…`;
			await new Promise((resolve, reject) => {
				const child = spawn("/bin/sh", ["-c", MAC_UPDATE_SCRIPT], {
					detached: true,
					stdio: "ignore",
					shell: false,
					cwd: "/",
					env: {
						...process.env,
						DSH_UPDATE_PID: String(process.pid),
						DSH_UPDATE_STAGED: prepared.bundle,
						DSH_UPDATE_INSTALLED: prepared.installed,
						DSH_UPDATE_DIR: prepared.directory,
						DSH_UPDATE_TITLE: "DSH NEXT",
						DSH_UPDATE_MESSAGE: message,
						DSH_UPDATE_UI_SCRIPT: MAC_PROGRESS_UI_SCRIPT
					}
				});
				child.once("error", reject);
				child.once("spawn", () => {
					child.off("error", reject);
					child.on("error", this.options.log);
					child.unref();
					resolve();
				});
			});
			return;
		}
		if (this.options.platform !== "win32" || !this.prepared) throw new Error("No prepared update installer");
		await new Promise((resolve, reject) => {
			const child = spawn(this.prepared.path, ["--updated", "--force-run"], {
				detached: true,
				stdio: "ignore",
				shell: false,
				windowsHide: false
			});
			child.once("error", reject);
			child.once("spawn", () => {
				child.off("error", reject);
				child.on("error", this.options.log);
				child.unref();
				resolve();
			});
		});
	}
};
//#endregion
//#region src/relaunch.ts
/** Explicit launch modes survive a native relaunch without leaking into later restarts. */
const RECOVERY_ARGUMENT = "--next-recovery";
const SAFE_ARGUMENT = "--next-safe-mode";
const ONBOARDING_ARGUMENT = "--next-onboarding";
/** Marks the instance an elevated Windows launch restarted with the user's normal token; never carried forward. */
const DE_ELEVATED_ARGUMENT = "--next-de-elevated";
function relaunchArguments(argv, recovery, safe, onboarding = false) {
	return [...argv.filter((value) => value !== "--next-recovery" && value !== "--next-safe-mode" && value !== "--next-onboarding" && value !== "--next-de-elevated"), ...recovery ? [RECOVERY_ARGUMENT] : safe ? [SAFE_ARGUMENT] : onboarding ? [ONBOARDING_ARGUMENT] : []];
}
/**
* POSIX `sh` handoff run as `sh -c SCRIPT <pid> <bundle> <executable> [args...]`.
*
* It waits for the old app to exit first: until then LaunchServices would only
* activate the instance that is quitting, and a new one would lose the
* single-instance lock to it. If `open` fails, the executable starts the way
* Electron's relauncher would have started it.
*/
const MAC_RELAUNCH_SCRIPT = [
	"bundle=$1 executable=$2",
	"shift 2",
	"while kill -0 \"$0\" 2>/dev/null; do sleep 0.1; done",
	"/usr/bin/open -n -a \"$bundle\" --args \"$@\" || exec \"$executable\" \"$@\""
].join("\n");
/**
* The app bundle to restart through LaunchServices, when LaunchServices started this run.
*
* LaunchServices sets `__CFBundleIdentifier` to the identifier of the app it
* starts, and child processes inherit it. It therefore names this app after a
* launch from Finder, the Dock, `open` or a login item, and after an in-app
* relaunch of such a run. A run started from a terminal, a development script or
* a test harness inherits its launcher's value instead.
*/
function launchServicesBundle(executable, env, bundleIdentifier) {
	if (env.__CFBundleIdentifier !== bundleIdentifier) return void 0;
	return /^(\/.+\.app)\/Contents\/MacOS\/[^/]+$/u.exec(executable)?.[1];
}
/**
* Pid of the AppImage runtime that extracted this run, when there is one.
*
* With `--appimage-extract-and-run` (or `APPIMAGE_EXTRACT_AND_RUN=1`) the
* runtime unpacks the image into a directory named after its hash, stays
* behind as this process's parent, and deletes that directory once the app
* exits. A FUSE-mounted run replaces the runtime with the app instead.
*/
function appImageExtractingRuntimePid(appImage, parentPid = process.ppid, resolve = realpathSync) {
	try {
		return resolve(`/proc/${parentPid}/exe`) === resolve(appImage) ? parentPid : void 0;
	} catch {
		return;
	}
}
/**
* Bash handoff run as `bash -c SCRIPT '<pid>...' <AppImage> [args...]`.
*
* It closes every inherited descriptor above stderr first (`child_process`
* passes on whatever the main process left without close-on-exec: files in
* the old mount, the old crash handler's socket, listening sockets), then
* waits for every listed pid: the old app, so the new one gets the
* single-instance lock, and an extracting runtime, so it has finished deleting
* the directory the new runtime extracts into again. POSIX `sh` cannot close
* descriptors above 9; `AppRun` needs bash anyway.
*/
const APPIMAGE_RELAUNCH_SCRIPT = [
	"for fd in /proc/$$/fd/*; do fd=${fd##*/}; if [ \"$fd\" -gt 2 ]; then eval \"exec $fd>&-\"; fi; done",
	"for pid in $0; do while kill -0 \"$pid\" 2>/dev/null; do sleep 0.1; done; done",
	"exec \"$@\""
].join("\n");
/** Drop this run's mount from the search paths `AppRun` prefixed, so restarts do not pile them up. */
function appImageRelaunchEnvironment(env) {
	const next = { ...env };
	const appDir = env.APPDIR;
	if (!appDir) return next;
	for (const name of [
		"PATH",
		"LD_LIBRARY_PATH",
		"XDG_DATA_DIRS",
		"GSETTINGS_SCHEMA_DIR"
	]) {
		const value = next[name];
		if (value === void 0) continue;
		const kept = value.split(":").filter((entry) => entry !== appDir && !entry.startsWith(`${appDir}/`));
		if (kept.length === 0) delete next[name];
		else next[name] = kept.join(":");
	}
	return next;
}
/**
* Schedule a new app process with `args` once this one exits.
*
* Usually this is `app.relaunch({ args })`. Two kinds of run are restarted by a
* detached shell spawned from the main process instead.
*
* On macOS, Electron's relauncher waits for this process to exit and then
* spawns the new one itself, so macOS keeps this exited process responsible for
* the new app and every child it starts. Permissions such as Local Network then
* no longer reach the app: its children's LAN connections fail at once with
* EHOSTUNREACH and no prompt appears (#1515). A run that LaunchServices started
* is restarted through LaunchServices, as Finder and the Dock start it, and gets
* the environment LaunchServices gives every launch. Other runs keep Electron's
* relauncher, which preserves the environment they inherited.
*
* Inside an AppImage, Electron's relauncher cannot restart the app: its default
* target lives in this run's `/tmp/.mount_*` FUSE mount, which is torn down with
* this process, and targeting `$APPIMAGE` instead fails because Chromium starts
* the relauncher helper with `no_new_privs`, so the new runtime's setuid
* `fusermount` cannot mount the image. The shell keeps normal privileges, waits
* for this pid to exit, then execs the AppImage file. An extracted run restarts
* extracted, since the runtime consumes `--appimage-extract-and-run` and FUSE is
* usually why it was used.
*/
function relaunchApp(app, args, environment = {}) {
	const platform = environment.platform ?? process.platform;
	const env = environment.env ?? process.env;
	const executable = environment.executable ?? process.execPath;
	const bundle = platform === "darwin" ? launchServicesBundle(executable, env, environment.bundleIdentifier ?? "ai.deepseek.dsh.desktop.next") : void 0;
	if (bundle !== void 0) {
		const child = (environment.spawn ?? spawn)("/bin/sh", [
			"-c",
			MAC_RELAUNCH_SCRIPT,
			String(environment.pid ?? process.pid),
			bundle,
			executable,
			...args
		], {
			detached: true,
			stdio: "ignore",
			env
		});
		child.on("error", environment.reportError ?? ((cause) => {
			console.error(`LaunchServices relaunch failed: ${cause.message}`);
		}));
		child.unref();
		return;
	}
	const appImage = platform === "linux" ? env.APPIMAGE : void 0;
	if (!appImage) {
		app.relaunch({ args: [...args] });
		return;
	}
	const reportError = environment.reportError ?? ((cause) => {
		console.error(`AppImage relaunch failed: ${cause.message}`);
	});
	const runtimePid = "runtimePid" in environment ? environment.runtimePid : appImageExtractingRuntimePid(appImage);
	const pids = [environment.pid ?? process.pid, ...runtimePid === void 0 ? [] : [runtimePid]];
	const childEnv = appImageRelaunchEnvironment(env);
	if (runtimePid !== void 0) childEnv.APPIMAGE_EXTRACT_AND_RUN = "1";
	const child = (environment.spawn ?? spawn)("/usr/bin/env", [
		"bash",
		"-c",
		APPIMAGE_RELAUNCH_SCRIPT,
		pids.join(" "),
		appImage,
		...args
	], {
		detached: true,
		stdio: "ignore",
		env: childEnv
	});
	child.on("error", reportError);
	child.unref();
}
//#endregion
//#region src/runtime-tree.ts
/** Descriptor sealed at the payload root; a packaged application carries it inside `app.asar`. */
const DESKTOP_RUNTIME_FILE = "desktop-runtime.json";
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*|[a-z0-9][a-z0-9._~-]*)$/u;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
function record(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Resolve one portable resource path without permitting traversal or absolute paths.
* @param root - Runtime root.
* @param path - Slash-separated relative path from durable metadata.
* @returns Absolute resource path.
*/
function runtimePath(root, path) {
	if (path === "" || isAbsolute(path) || path.includes("\\") || path.includes(":") || path.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error(`desktop runtime: invalid relative path ${JSON.stringify(path)}`);
	return join(root, ...path.split("/"));
}
/**
* Validate release facts read from a packaged or generated descriptor.
* @param value - Parsed `release` field.
* @returns The release facts.
*/
function parseNextRelease(value) {
	if (!record(value) || value.schemaVersion !== 1) throw new Error("desktop runtime: unsupported release schema");
	for (const field of [
		"version",
		"dshVersion",
		"electronVersion",
		"pnpmVersion"
	]) if (typeof value[field] !== "string" || !VERSION.test(value[field])) throw new Error(`desktop runtime: invalid release ${field}`);
	return {
		schemaVersion: 1,
		version: value.version,
		dshVersion: value.dshVersion,
		electronVersion: value.electronVersion,
		pnpmVersion: value.pnpmVersion
	};
}
function parseTarget(platform, archs) {
	if (typeof platform !== "string" || platform === "" || !Array.isArray(archs) || archs.length === 0 || archs.some((arch) => typeof arch !== "string" || arch === "")) throw new Error("desktop runtime: invalid target");
	const unique = [...new Set(archs)].sort();
	if (unique.length !== archs.length) throw new Error("desktop runtime: duplicate target architecture");
	return {
		platform,
		archs: unique
	};
}
/**
* Validate packaged metadata and check the shared package records.
* @param value - Parsed descriptor document.
* @returns Runtime metadata whose file inventory is verified only during packaging.
*/
function parseDesktopRuntime(value) {
	if (!record(value) || value.schemaVersion !== 1 || !Array.isArray(value.sharedPackages) || !Array.isArray(value.files)) throw new Error("desktop runtime: invalid descriptor");
	const release = parseNextRelease(value.release);
	const { platform, archs } = parseTarget(value.platform, value.archs);
	const sharedPackages = value.sharedPackages.map((entry) => {
		if (!record(entry) || typeof entry.name !== "string" || !PACKAGE_NAME.test(entry.name) || typeof entry.version !== "string" || !VERSION.test(entry.version) || entry.path !== `node_modules/${entry.name}`) throw new Error("desktop runtime: invalid shared package record");
		return {
			name: entry.name,
			version: entry.version,
			path: entry.path
		};
	});
	if (new Set(sharedPackages.map((entry) => entry.name)).size !== sharedPackages.length) throw new Error("desktop runtime: duplicate shared package");
	if (sharedPackages.find((entry) => entry.name === "@deepseek-ai/dsh")?.version !== release.dshVersion) throw new Error("desktop runtime: missing or mismatched @deepseek-ai/dsh");
	return {
		schemaVersion: 1,
		release,
		platform,
		archs,
		sharedPackages,
		files: value.files
	};
}
/**
* Read packaged metadata from the descriptor file and check the shared package records.
* @param descriptorFile - Descriptor at the application root; inside Electron, `app.asar` reads like a directory.
* @returns Runtime metadata whose file inventory is verified only during packaging.
*/
function readDesktopRuntime(descriptorFile) {
	return parseDesktopRuntime(JSON.parse(readFileSync(descriptorFile, "utf8")));
}
/**
* Read the version of one package installed at the application root.
* @param appRoot - Application directory; inside Electron, `app.asar` reads like a directory.
* @param name - Package name.
* @returns The installed version.
*/
function readInstalledPackageVersion(appRoot, name) {
	const manifest = JSON.parse(readFileSync(join(runtimePath(appRoot, `node_modules/${name}`), "package.json"), "utf8"));
	if (!record(manifest) || typeof manifest.version !== "string") throw new Error(`desktop runtime: ${name} has no version`);
	return manifest.version;
}
/**
* Check at startup that the installed payload is the one this application was released with.
* File bytes are verified only during packaging; here the descriptor must exist, parse, and
* name the running shell, dsh runtime, platform and architecture.
* @param descriptorFile - Descriptor at the application root; inside Electron, `app.asar` reads like a directory.
* @param identity - Facts of the running application.
* @returns The sealed descriptor.
*/
function verifyPackagedRuntimeIdentity(descriptorFile, identity) {
	const descriptor = readDesktopRuntime(descriptorFile);
	if (descriptor.release.version !== identity.version) throw new Error(`desktop runtime: payload ${descriptor.release.version} does not belong to DSH NEXT ${identity.version}`);
	if (descriptor.release.dshVersion !== identity.dshVersion) throw new Error(`desktop runtime: payload declares dsh ${descriptor.release.dshVersion} but ${identity.dshVersion} is installed`);
	if (descriptor.platform !== identity.platform || !descriptor.archs.includes(identity.arch)) throw new Error(`desktop runtime: payload for ${descriptor.platform} ${descriptor.archs.join("/")} cannot run on ${identity.platform} ${identity.arch}`);
	return descriptor;
}
//#endregion
//#region src/native-permissions.ts
/** OS permission policy kept independent of Electron for headless validation. */
var NativePermissions = class {
	native;
	pending = /* @__PURE__ */ new Map();
	constructor(native) {
		this.native = native;
	}
	query(value) {
		const permission = desktopPermission(value);
		const status = this.native.platform === "darwin" || this.native.platform === "win32" ? this.native.status(permission) : "unknown";
		return {
			permission,
			status,
			canRequest: this.native.platform === "darwin" && (status === "not-determined" || permission !== "microphone" && status === "denied"),
			canOpenSettings: this.settingsUrl(permission) !== void 0
		};
	}
	request(value) {
		const permission = desktopPermission(value);
		const pending = this.pending.get(permission);
		if (pending) return pending;
		const current = this.query(permission);
		if (!current.canRequest) return Promise.resolve(current);
		const request = (async () => {
			if (permission === "microphone") await this.native.microphone();
			else if (permission === "screen") await this.native.screen();
			else await this.native.accessibility();
			return this.query(permission);
		})().finally(() => this.pending.delete(permission));
		this.pending.set(permission, request);
		return request;
	}
	async openSettings(value) {
		const url = this.settingsUrl(desktopPermission(value));
		if (!url) throw new Error("This platform has no Desktop permission settings shortcut");
		await this.native.openSettings(url);
	}
	settingsUrl(permission) {
		if (this.native.platform === "darwin") return `x-apple.systempreferences:com.apple.preference.security?${{
			microphone: "Privacy_Microphone",
			screen: "Privacy_ScreenCapture",
			accessibility: "Privacy_Accessibility"
		}[permission]}`;
		if (this.native.platform === "win32" && permission === "microphone") return "ms-settings:privacy-microphone";
	}
};
//#endregion
//#region src/electron-permissions.ts
/** Native controls for Computer Use and trusted renderer media access. */
function createNativePermissions() {
	return new NativePermissions({
		platform: process.platform,
		status: (permission) => permission === "accessibility" ? process.platform === "darwin" ? systemPreferences.isTrustedAccessibilityClient(false) ? "granted" : "denied" : "unknown" : systemPreferences.getMediaAccessStatus(permission),
		microphone: () => systemPreferences.askForMediaAccess("microphone"),
		screen: async () => {
			await desktopCapturer.getSources({
				types: ["screen"],
				thumbnailSize: {
					width: 0,
					height: 0
				}
			});
		},
		accessibility: async () => {
			systemPreferences.isTrustedAccessibilityClient(true);
		},
		openSettings: (url) => shell.openExternal(url)
	});
}
/** Use the existing native menu for systems without the macOS screen-sharing picker. */
async function chooseScreen(window, language) {
	const sources = await desktopCapturer.getSources({
		types: ["screen", "window"],
		thumbnailSize: {
			width: 0,
			height: 0
		}
	});
	if (window.isDestroyed() || sources.length === 0) return void 0;
	const zh = language.startsWith("zh");
	return new Promise((resolve) => {
		const menu = Menu.buildFromTemplate([
			{
				label: zh ? "选择共享的屏幕或窗口" : "Choose a screen or window to share",
				enabled: false
			},
			...sources.map((source) => ({
				label: source.name,
				click: () => resolve(source)
			})),
			{ type: "separator" },
			{
				label: zh ? "取消" : "Cancel",
				click: () => resolve(void 0)
			}
		]);
		const closed = () => {
			menu.closePopup(window);
			resolve(void 0);
		};
		window.once("closed", closed);
		menu.popup({
			window,
			callback: () => {
				window.removeListener("closed", closed);
				resolve(void 0);
			}
		});
	});
}
function appOrigin(value) {
	try {
		const url = new URL(value);
		return url.protocol === "dsh-app:" && url.host === "app";
	} catch {
		return false;
	}
}
/** A frame may close while native consent is open; settle its callback at most once. */
function replyOnce(callback, warn) {
	let replied = false;
	return (value) => {
		if (replied) return;
		replied = true;
		try {
			callback(value);
		} catch (error) {
			warn(error);
		}
	};
}
function installMediaPermissions(session, options) {
	const trusted = (contents, url, isMainFrame) => {
		const owner = options.window();
		return !!owner && !owner.isDestroyed() && owner.webContents === contents && !contents.isDestroyed() && isMainFrame && appOrigin(url) && contents.getURL().startsWith("dsh-app://app/");
	};
	session.setPermissionCheckHandler((contents, permission, origin, details) => {
		if (!trusted(contents, origin, details.isMainFrame)) return false;
		if (permission === "media") return details.mediaType === "audio";
		return true;
	});
	session.setPermissionRequestHandler((contents, permission, callback, details) => {
		const reply = replyOnce(callback, options.warn);
		const allowed = () => trusted(contents, details.requestingUrl, details.isMainFrame);
		if (!allowed()) return reply(false);
		if (permission !== "media") return reply(true);
		const mediaTypes = "mediaTypes" in details ? details.mediaTypes : void 0;
		reply(!!mediaTypes?.length && mediaTypes.every((type) => type === "audio"));
	});
	let picking = false;
	session.setDisplayMediaRequestHandler((request, callback) => {
		const reply = replyOnce(callback, options.warn);
		const owner = options.window();
		if (picking || !owner || owner.isDestroyed() || request.frame !== owner.webContents.mainFrame || !appOrigin(request.securityOrigin) || !owner.webContents.getURL().startsWith("dsh-app://app/") || !request.userGesture || !request.videoRequested || !owner.isFocused()) return reply({});
		picking = true;
		chooseScreen(owner, options.language()).then((source) => {
			if (!owner.isDestroyed() && request.frame === owner.webContents.mainFrame && owner.webContents.getURL().startsWith("dsh-app://app/")) reply(source ? { video: source } : {});
			else reply({});
		}).catch((error) => {
			options.warn(error);
			reply({});
		}).finally(() => {
			picking = false;
		});
	}, { useSystemPicker: true });
}
//#endregion
//#region src/data-directory.ts
/**
* Resolve the Next data directory: a directory chosen in the app wins, `DSH_DESKTOP_NEXT_HOME`
* applies only without one, and `~/.dsh` is the default. The choice and the record of the last
* launch live in one fixed directory, outside every data directory and independent of the
* environment, so neither moves when the variable is added, changed or lost.
*/
const DATA_DIRECTORY_VARIABLE = "DSH_DESKTOP_NEXT_HOME";
const LOCATION_FILE = "desktop-next-location.json";
const LAST_HOME_FILE = "desktop-next-last-home.json";
function defaultDataDirectory(userHome = homedir()) {
	return join(userHome, ".dsh");
}
function dataDirectoryLocationRoot(packaged, appData, packageRoot) {
	return packaged ? join(appData(), "DSH NEXT", "home") : join(packageRoot, ".desktop-next", "home");
}
function dataDirectoryLocationFile(locationRoot) {
	return join(locationRoot, LOCATION_FILE);
}
function readHome(path) {
	const value = JSON.parse(readPrivateFile(path) ?? "null");
	if (value === null) return void 0;
	if (typeof value !== "object" || !("home" in value) || typeof value.home !== "string" || !isAbsolute(value.home)) throw new Error("Invalid Next data directory");
	return resolve(value.home);
}
function fallbackDirectory(environmentHome, userHome) {
	return environmentHome ? resolve(environmentHome) : defaultDataDirectory(userHome);
}
function readDataDirectory(locationRoot, environmentHome, userHome) {
	const fallback = fallbackDirectory(environmentHome, userHome);
	const source = environmentHome ? "environment" : "default";
	try {
		const home = readHome(dataDirectoryLocationFile(locationRoot));
		if (home === void 0) return {
			home: fallback,
			source,
			fallback
		};
		privateDirectory(home);
		return {
			home,
			source: "desktop",
			fallback
		};
	} catch (error) {
		return {
			home: fallback,
			source,
			fallback,
			error: String(error)
		};
	}
}
/**
* The data directory of the last launch. Until one is recorded, the former rule answers: the
* variable used to move the choice into its own directory, so an upgrade cannot switch silently.
*/
function previousDataDirectory(locationRoot, environmentHome, userHome) {
	try {
		const recorded = readHome(join(locationRoot, LAST_HOME_FILE));
		if (recorded !== void 0) return {
			home: recorded,
			recorded: true
		};
	} catch {}
	const fallback = fallbackDirectory(environmentHome, userHome);
	let home = fallback;
	try {
		home = readHome(dataDirectoryLocationFile(environmentHome ? fallback : locationRoot)) ?? fallback;
	} catch {}
	return {
		home,
		recorded: false
	};
}
/**
* The last launch's directory when this launch would leave it for another one: it still holds
* Next data, or it was recorded and cannot be reached now, such as on a disconnected drive.
*/
function dataDirectoryChange(locationRoot, home, environmentHome, userHome) {
	const previous = previousDataDirectory(locationRoot, environmentHome, userHome);
	if (sameDirectory(previous.home, home)) return void 0;
	let reachable = false;
	try {
		reachable = lstatSync(previous.home, { throwIfNoEntry: false })?.isDirectory() === true;
	} catch {}
	if (reachable ? !holdsNextData(previous.home) : !previous.recorded) return void 0;
	return {
		previous: previous.home,
		reachable
	};
}
function rememberDataDirectory(locationRoot, home) {
	const path = join(locationRoot, LAST_HOME_FILE);
	try {
		if (readHome(path) === resolve(home)) return;
	} catch {}
	atomicJson(path, { home: resolve(home) });
}
/** Compare as the file system resolves both paths, ignoring case on Windows. */
function sameDirectory(left, right) {
	const canonical = (path) => {
		try {
			return realpathSync.native(path);
		} catch {
			return resolve(path);
		}
	};
	const [a, b] = [canonical(left), canonical(right)];
	return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
/** A directory that a Next launch has already set up. */
function holdsNextData(home) {
	const isFile = (path) => lstatSync(path, { throwIfNoEntry: false })?.isFile() === true;
	try {
		return isFile(join(home, "desktop-next.json")) || isFile(join(home, "profiles", "desktop", "package.json"));
	} catch {
		return false;
	}
}
/** The fallback directory may already hold data shared with Stable or the CLI. */
function validateDataDirectory(target, current, fallback) {
	if (!isAbsolute(target) || target.includes("\0")) throw new Error("Data directory must be an absolute path");
	const destination = resolve(target);
	const nested = relative(current, destination);
	if (nested && !nested.startsWith("..") && !isAbsolute(nested)) throw new Error("Choose a directory outside the current data directory");
	privateDirectory(destination);
	const entries = readdirSync(destination);
	if (destination !== fallback && destination !== current && entries.length > 0 && !holdsNextData(destination)) throw new Error("Choose an empty directory or an existing Next data directory");
	return destination;
}
//#endregion
//#region src/data-backup.ts
/** Copy a stopped Next data directory into a new folder that can later be selected as a data directory. */
/** Chromium keeps live, machine-bound state there and rebuilds it; a former choice file would redirect the copy. */
const SKIPPED = /* @__PURE__ */ new Set(["electron-user-data", "desktop-next-location.json"]);
/** Clone where the file system can (APFS, ReFS, btrfs); never replace an existing file. */
const COPY_MODE = constants.COPYFILE_EXCL | constants.COPYFILE_FICLONE;
function contains(parent, child) {
	const path = relative(parent, child);
	return path === "" || path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}
function backupDirectoryName(home, now = /* @__PURE__ */ new Date()) {
	const two = (value) => String(value).padStart(2, "0");
	const stamp = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
	return `${basename(home).replace(/^\.+/u, "") || "dsh"}-backup-${stamp}`;
}
function assertBackupLocation(home, destination) {
	if (contains(resolve(home), resolve(destination))) throw new Error("Choose a backup location outside the current data directory");
}
/**
* Copy files, directories and links without following links. Links into the data directory are
* retargeted into the copy, so the backup never depends on the original; on Windows, directory
* links become junctions, which need no privilege. The copy is written beside the destination
* under a `.partial` name and renamed only when complete, so an interrupted backup is never
* mistaken for a whole one; a failed copy removes it.
*/
async function copyDataDirectory(source, destination) {
	const from = resolve(source), to = resolve(destination);
	assertBackupLocation(from, to);
	if (await lstat(to).then(() => true, () => false)) throw new Error(`Backup destination already exists: ${to}`);
	const partial = `${to}.partial`;
	await mkdir(partial, { mode: 448 });
	try {
		await copyEntries(from, partial, to, from, to);
		await rename(partial, to);
	} catch (error) {
		await rm(partial, {
			recursive: true,
			force: true
		});
		throw error;
	}
}
/** `written` is where an entry is copied now; `final` is where it lives after the rename. */
async function copyEntries(directory, written, final, from, to) {
	for (const name of await readdir(directory)) {
		if (directory === from && SKIPPED.has(name)) continue;
		const path = join(directory, name), copy = join(written, name);
		const info = await lstat(path);
		if (info.isSymbolicLink()) await copyLink(path, copy, join(final, name), from, to);
		else if (info.isDirectory()) {
			await mkdir(copy, { mode: info.mode & 511 | 448 });
			await copyEntries(path, copy, join(final, name), from, to);
		} else if (info.isFile()) await copyFile(path, copy, COPY_MODE);
	}
}
async function copyLink(path, copy, final, from, to) {
	const link = await readlink(path);
	const resolved = resolve(dirname(path), link);
	const target = !contains(from, resolved) ? resolved : isAbsolute(link) ? join(to, relative(from, resolved)) : link;
	if (process.platform !== "win32") {
		await symlink(target, copy);
		return;
	}
	const directory = await stat(path).then((info) => info.isDirectory(), () => void 0);
	if (directory === true) {
		await symlink(resolve(dirname(final), target), copy, "junction");
		return;
	}
	try {
		await symlink(target, copy, "file");
	} catch {
		if (directory === false) await copyFile(path, copy, COPY_MODE);
	}
}
//#endregion
//#region src/platform-login-window.ts
/** Sign-in partition; no `persist:` prefix, so Platform cookies never reach disk. */
const PLATFORM_LOGIN_PARTITION = "dsh-platform-login";
const CALLBACK_PATH = "/oauth/callback";
/** The Host holds the callback response until the exchange settles; an attempt lasts at most minutes. */
const CALLBACK_TIMEOUT = 15 * 6e4;
const LOOPBACK = [
	"localhost",
	"127.0.0.1",
	"[::1]"
];
/**
* Decide one request made inside the sign-in window.
* @param value - request URL.
* @param resourceType - Electron `webRequest` resource type.
* @param hostOrigin - current Host origin, or `undefined` while the Host is down.
* @returns `callback` for the Host's OAuth callback navigation, `allow` for public Platform traffic, else `cancel`.
*/
function classifyPlatformLoginRequest(value, resourceType, hostOrigin) {
	if (!URL.canParse(value)) return "cancel";
	const url = new URL(value);
	if ([
		"about:",
		"data:",
		"blob:"
	].includes(url.protocol)) return resourceType === "mainFrame" ? "cancel" : "allow";
	if (url.username !== "" || url.password !== "") return "cancel";
	if (hostOrigin !== void 0 && url.origin === hostOrigin) return resourceType === "mainFrame" && url.pathname === CALLBACK_PATH ? "callback" : "cancel";
	if (LOOPBACK.includes(url.hostname) || url.hostname.startsWith("127.")) return "cancel";
	if (url.protocol === "https:") return "allow";
	return url.protocol === "wss:" && !["mainFrame", "subFrame"].includes(resourceType) ? "allow" : "cancel";
}
/**
* Replay an intercepted callback against the Host as the native renderer.
* @param callback - callback URL the Platform navigated to.
* @param host - native Host credentials.
* @param fetchImpl - HTTP client, replaceable in tests.
* @returns the Host's status: 302 after success, 204 after a failed exchange, 4xx for a stale or foreign callback.
*/
async function forwardPlatformLoginCallback(callback, host, fetchImpl = fetch) {
	const source = new URL(callback);
	const target = new URL(host.url);
	if (source.origin !== target.origin || source.pathname !== CALLBACK_PATH) throw new Error("Not a Host sign-in callback");
	target.pathname = source.pathname;
	target.search = source.search;
	target.hash = "";
	const response = await fetchImpl(target, {
		method: "GET",
		redirect: "manual",
		signal: AbortSignal.timeout(CALLBACK_TIMEOUT),
		headers: {
			cookie: host.cookie,
			[NATIVE_ACCESS_HEADER]: host.token
		}
	});
	await response.body?.cancel();
	return response.status;
}
/** Owns the single built-in sign-in window and its in-memory session. */
var PlatformLoginWindow = class {
	options;
	window;
	popups = /* @__PURE__ */ new Set();
	configured;
	clearing = Promise.resolve();
	constructor(options) {
		this.options = options;
	}
	/**
	* Show an attempt's authorization page, replacing any earlier sign-in window.
	* @param url - authorization URL validated by host-process.ts.
	*/
	open(url) {
		const loginSession = this.loginSession();
		const previous = this.window;
		this.window = void 0;
		for (const popup of [...this.popups]) if (!popup.isDestroyed()) popup.destroy();
		if (previous !== void 0 && !previous.isDestroyed()) previous.destroy();
		this.clear(loginSession);
		const parent = this.options.parent();
		const window = new this.options.BrowserWindow({
			width: 520,
			height: 720,
			minWidth: 400,
			minHeight: 560,
			show: false,
			title: this.options.title(),
			autoHideMenuBar: true,
			backgroundColor: this.options.dark() ? "#1f1f1f" : "#ffffff",
			...parent !== void 0 && !parent.isDestroyed() ? { parent } : {},
			webPreferences: popupPreferences(loginSession)
		});
		this.window = window;
		this.guard(window.webContents, loginSession);
		window.on("page-title-updated", (event) => {
			event.preventDefault();
		});
		window.once("ready-to-show", () => {
			if (!window.isDestroyed()) {
				window.show();
				window.focus();
			}
		});
		window.on("closed", () => {
			if (this.window !== window) return;
			this.window = void 0;
			this.clear(loginSession);
		});
		this.clearing.then(async () => {
			if (!window.isDestroyed()) await window.loadURL(url);
		}).catch((error) => {
			if (!String(error).includes("ERR_ABORTED")) this.options.warn(error);
		});
	}
	/** Close the sign-in window, if any, and forget its Platform cookies. */
	close() {
		const window = this.window;
		for (const popup of [...this.popups]) if (!popup.isDestroyed()) popup.destroy();
		if (window !== void 0 && !window.isDestroyed()) window.destroy();
	}
	loginSession() {
		const loginSession = this.options.session(PLATFORM_LOGIN_PARTITION);
		if (this.configured === loginSession) return loginSession;
		this.configured = loginSession;
		loginSession.setPermissionRequestHandler((_contents, _permission, callback) => {
			callback(false);
		});
		loginSession.setPermissionCheckHandler(() => false);
		loginSession.setDevicePermissionHandler(() => false);
		loginSession.setDisplayMediaRequestHandler((_request, callback) => {
			callback({});
		});
		loginSession.on("will-download", (event) => {
			event.preventDefault();
		});
		loginSession.webRequest.onBeforeRequest((details, callback) => {
			const host = this.options.host();
			const decision = classifyPlatformLoginRequest(details.url, details.resourceType, host === void 0 ? void 0 : new URL(host.url).origin);
			callback({ cancel: decision !== "allow" });
			if (decision === "callback" && host !== void 0) forwardPlatformLoginCallback(details.url, host).then((status) => {
				if (status !== 204 && status !== 302) this.options.warn(/* @__PURE__ */ new Error(`Platform sign-in callback returned HTTP ${status}`));
			}, (error) => {
				this.options.warn(error);
			});
		});
		return loginSession;
	}
	guard(contents, loginSession) {
		contents.setWindowOpenHandler(({ url }) => classifyPlatformLoginRequest(url, "mainFrame", void 0) === "allow" ? {
			action: "allow",
			overrideBrowserWindowOptions: {
				autoHideMenuBar: true,
				webPreferences: popupPreferences(loginSession)
			}
		} : { action: "deny" });
		contents.on("did-create-window", (child) => {
			this.popups.add(child);
			child.once("closed", () => {
				this.popups.delete(child);
			});
			this.guard(child.webContents, loginSession);
		});
		contents.on("will-attach-webview", (event) => {
			event.preventDefault();
		});
		contents.on("login", (event, _details, _authInfo, callback) => {
			event.preventDefault();
			callback();
		});
	}
	clear(loginSession) {
		this.clearing = this.clearing.then(() => loginSession.clearStorageData()).catch((error) => {
			this.options.warn(error);
		});
	}
};
function popupPreferences(loginSession) {
	return {
		session: loginSession,
		sandbox: true,
		contextIsolation: true,
		nodeIntegration: false,
		webviewTag: false,
		spellcheck: false
	};
}
//#endregion
//#region ../dsh-plugin-desktop/src/desktop-installation-id.ts
/** Private installation identity used only by DSH Desktop update checks. */
/** Header carrying the pseudonymous Desktop installation identity. */
const DESKTOP_INSTALLATION_ID_HEADER = "X-DSH-Desktop-Installation-Id";
/** Relative state location below Electron's userData directory. */
const DESKTOP_INSTALLATION_ID_RELATIVE_PATH = join("identity", "installation-id");
const PRIVATE_DIRECTORY_MODE = 448;
const PRIVATE_FILE_MODE$1 = 384;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
/** Failure raised when the identity state path is unsafe or cannot be persisted. */
var DesktopInstallationIdError = class extends Error {
	constructor(message, options = {}) {
		super(message, options.cause === void 0 ? void 0 : { cause: options.cause });
		this.name = "DesktopInstallationIdError";
	}
};
/** Return the exact private state path for one Electron userData directory. */
function desktopInstallationIdPath(userDataDirectory) {
	if (userDataDirectory.length === 0 || /[\0\r\n]/u.test(userDataDirectory) || !isAbsolute(userDataDirectory)) throw new DesktopInstallationIdError("Desktop userData must be an absolute path without control characters.");
	return join(resolve(userDataDirectory), DESKTOP_INSTALLATION_ID_RELATIVE_PATH);
}
/** Parse one canonical lowercase UUID v4 without accepting surrounding text. */
function parseDesktopInstallationId(value) {
	return typeof value === "string" && UUID_V4_PATTERN.test(value) ? value : void 0;
}
/** Require one canonical UUID v4 before it can enter an outbound header. */
function assertDesktopInstallationId(value) {
	const parsed = parseDesktopInstallationId(value);
	if (parsed === void 0) throw new DesktopInstallationIdError("Desktop installation identity must be a canonical lowercase UUID v4.");
	return parsed;
}
/**
* Return the installation UUID for one Desktop userData tree.
*
* A missing or corrupt ordinary file is rebuilt atomically. Symbolic links,
* directories, and other special entries are rejected rather than followed or
* removed. Persistence failures are explicit: callers must not silently emit a
* fresh, process-local identifier on every update check.
*/
async function getOrCreateDesktopInstallationId(userDataDirectory, options = {}) {
	const statePath = desktopInstallationIdPath(userDataDirectory);
	await prepareIdentityDirectory(dirname(statePath));
	try {
		return await withFileLock(statePath, async () => {
			const persisted = await readPersistedInstallationId(statePath);
			if (persisted !== void 0) return persisted;
			const generated = assertDesktopInstallationId((options.randomUUID ?? randomUUID)());
			await writeFileAtomic(statePath, `${generated}\n`, {
				mode: PRIVATE_FILE_MODE$1,
				dirMode: PRIVATE_DIRECTORY_MODE
			});
			return generated;
		});
	} catch (cause) {
		if (cause instanceof DesktopInstallationIdError) throw cause;
		throw new DesktopInstallationIdError("Desktop installation identity could not be persisted safely.", { cause });
	}
}
async function prepareIdentityDirectory(directory) {
	try {
		await mkdir(directory, {
			recursive: true,
			mode: PRIVATE_DIRECTORY_MODE
		});
		const stat = await lstat(directory);
		if (!stat.isDirectory() || stat.isSymbolicLink()) throw new DesktopInstallationIdError("Desktop identity state directory must be an ordinary directory.");
		await chmod(directory, PRIVATE_DIRECTORY_MODE);
	} catch (cause) {
		if (cause instanceof DesktopInstallationIdError) throw cause;
		throw new DesktopInstallationIdError("Desktop identity state directory is unavailable.", { cause });
	}
}
async function readPersistedInstallationId(statePath) {
	let stat;
	try {
		stat = await lstat(statePath);
	} catch (cause) {
		if (cause.code === "ENOENT") return void 0;
		throw new DesktopInstallationIdError("Desktop installation identity state could not be inspected.", { cause });
	}
	if (!stat.isFile() || stat.isSymbolicLink()) throw new DesktopInstallationIdError("Desktop installation identity state must be an ordinary file.");
	if (stat.size > 128) return void 0;
	const handle = await open(statePath, "r");
	try {
		const opened = await handle.stat();
		if (!opened.isFile() || opened.size > 128) return void 0;
		if (opened.dev !== stat.dev || opened.ino !== stat.ino) throw new DesktopInstallationIdError("Desktop installation identity state changed while it was being opened.");
		const buffer = Buffer.alloc(129);
		const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, 0);
		if (bytesRead > 128) return void 0;
		const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, bytesRead));
		const match = /^([0-9a-f-]+)\n?$/u.exec(text);
		const parsed = match === null ? void 0 : parseDesktopInstallationId(match[1]);
		if (parsed === void 0) return void 0;
		await handle.chmod(PRIVATE_FILE_MODE$1);
		return parsed;
	} catch (cause) {
		if (cause instanceof TypeError) return void 0;
		if (cause instanceof DesktopInstallationIdError) throw cause;
		throw new DesktopInstallationIdError("Desktop installation identity state could not be read safely.", { cause });
	} finally {
		await handle.close();
	}
}
//#endregion
//#region ../dsh-plugin-desktop/src/update-checker.ts
/** Headless version checks against the public DSH Desktop release service. */
/** Public endpoint returning the latest DSH Desktop version for a requested channel. */
const DESKTOP_VERSION_ENDPOINT = "https://www.dshdesktop.cn/api/desktop/version";
/** Header carrying the installed Desktop version to the fixed version endpoint. */
const DESKTOP_CURRENT_VERSION_HEADER = "X-DSH-Desktop-Version";
/** Header selecting an isolated Desktop release stream. */
const DESKTOP_RELEASE_CHANNEL_HEADER = "X-DSH-Desktop-Channel";
const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;
/**
* Parse strict SemVer with an optional lowercase `v` prefix.
* @param input - complete version or release tag.
* @returns parsed identifiers, or null when the input is not valid SemVer.
*/
function parseSemVer(input) {
	const version = input.startsWith("v") ? input.slice(1) : input;
	const match = SEMVER_PATTERN.exec(version);
	if (match === null) return null;
	const prerelease = match[4]?.split(".") ?? [];
	if (prerelease.some((identifier) => isNumeric(identifier) && hasLeadingZero(identifier))) return null;
	return {
		version,
		major: match[1],
		minor: match[2],
		patch: match[3],
		prerelease,
		build: match[5]?.split(".") ?? []
	};
}
/**
* Check the fixed DSH Desktop version endpoint for a release in one channel.
* @param options - installed version, caller-owned signal, and optional request adapter.
* @returns a successful comparison, or null when any request or validation step fails.
*/
async function checkForDesktopUpdate(options) {
	const current = parseCanonicalChannelVersion(options.currentVersion, options.currentChannel ?? options.channel);
	if (current === null) return null;
	let headers;
	try {
		headers = desktopVersionRequestHeaders(options.installationId, current.version, options.channel);
	} catch {
		return null;
	}
	const init = {
		method: "GET",
		headers,
		cache: "no-store",
		redirect: "error",
		...options.signal === void 0 ? {} : { signal: options.signal }
	};
	const request = options.request ?? defaultRequest;
	let response;
	try {
		response = await request(DESKTOP_VERSION_ENDPOINT, init);
	} catch {
		return null;
	}
	if (response.status !== 200) return null;
	let body;
	try {
		body = await readLimitedBody(response);
	} catch {
		return null;
	}
	let digestInput;
	try {
		digestInput = JSON.parse(body);
	} catch {
		digestInput = void 0;
	}
	const latest = parseVersionResponse(body, options.channel);
	if (latest === null) return null;
	const comparison = compareParsedSemVer(latest, current);
	const digests = parseInstallerDigestResponse(digestInput);
	return {
		status: comparison > 0 || options.allowDowngrade === true && comparison !== 0 ? "update-available" : "up-to-date",
		currentVersion: current.version,
		latestVersion: latest.version,
		...digests === void 0 ? {} : { installerSha256: digests }
	};
}
/** Build the complete header set for the fixed version-check request only. */
function desktopVersionRequestHeaders(installationId, currentVersion, channel) {
	const headers = { Accept: "application/json" };
	if (channel !== void 0) headers[DESKTOP_RELEASE_CHANNEL_HEADER] = channel;
	if (currentVersion !== void 0) {
		const parsed = channel === void 0 ? parseCanonicalChannelVersion(currentVersion, "stable") : parseCanonicalSupportedVersion(currentVersion);
		if (parsed === null) throw new Error(channel === void 0 ? "Desktop current version must be canonical stable SemVer." : "Desktop current version must be canonical SemVer.");
		headers[DESKTOP_CURRENT_VERSION_HEADER] = parsed.version;
	}
	if (installationId !== void 0) headers[DESKTOP_INSTALLATION_ID_HEADER] = assertDesktopInstallationId(installationId);
	return headers;
}
async function defaultRequest(url, init) {
	return globalThis.fetch(url, init);
}
async function readLimitedBody(response) {
	const declaredLength = response.headers.get("content-length");
	if (declaredLength !== null && /^[0-9]+$/u.test(declaredLength) && BigInt(declaredLength) > BigInt(4096)) throw new Error("version response is too large");
	if (response.body === null) return "";
	const reader = response.body.getReader();
	const decoder = new TextDecoder("utf-8", { fatal: true });
	let bytesRead = 0;
	let body = "";
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			bytesRead += chunk.value.byteLength;
			if (bytesRead > 4096) {
				await reader.cancel().catch(() => void 0);
				throw new Error("version response is too large");
			}
			body += decoder.decode(chunk.value, { stream: true });
		}
		return body + decoder.decode();
	} finally {
		reader.releaseLock();
	}
}
function parseVersionResponse(body, expectedChannel) {
	let value;
	try {
		value = JSON.parse(body);
	} catch {
		return null;
	}
	if (!isRecord(value) || typeof value.version !== "string") return null;
	if (expectedChannel !== "stable" && value.channel !== expectedChannel) return null;
	if (value.channel !== void 0 && value.channel !== expectedChannel) return null;
	return parseCanonicalUpdateVersion(value.version, expectedChannel);
}
/** Stable may promote a Next installer while keeping the stable service stream authoritative. */
function parseCanonicalUpdateVersion(input, channel) {
	return parseCanonicalChannelVersion(input, channel) ?? (channel === "stable" ? parseCanonicalChannelVersion(input, "next") : null);
}
function parseCanonicalChannelVersion(input, channel) {
	const parsed = parseCanonicalVersion(input);
	if (parsed === null) return null;
	if (channel === "stable") return parsed.prerelease.length === 0 ? parsed : null;
	if (channel === "next" && parsed.prerelease.length === 1 && parsed.prerelease[0] === "next") return parsed;
	return parsed.prerelease.length === 2 && parsed.prerelease[0] === channel && isNumeric(parsed.prerelease[1]) ? parsed : null;
}
/**
* Extract optional per-platform installer digests from the parsed version
* response: `{ "version": "2.0.2", "sha256": { "windows": "<hex>", "mac": "<hex>" } }`.
* Hex digits are case-normalized; absent or malformed fields simply leave the
* digest gate unset for that platform.
*/
function parseInstallerDigestResponse(value) {
	if (!isRecord(value) || !isRecord(value.sha256)) return void 0;
	const digests = {};
	const normalize = (digest) => {
		if (typeof digest !== "string") return void 0;
		const normalized = digest.trim().toLowerCase();
		return /^[0-9a-f]{64}$/u.test(normalized) ? normalized : void 0;
	};
	const windows = normalize(value.sha256.windows);
	const mac = normalize(value.sha256.mac);
	if (windows !== void 0) digests.win32 = windows;
	if (mac !== void 0) digests.darwin = mac;
	return Object.keys(digests).length > 0 ? digests : void 0;
}
function parseCanonicalSupportedVersion(input) {
	return parseCanonicalChannelVersion(input, "stable") ?? parseCanonicalChannelVersion(input, "beta") ?? parseCanonicalChannelVersion(input, "next");
}
function parseCanonicalVersion(input) {
	const parsed = parseSemVer(input);
	return parsed !== null && parsed.version === input ? parsed : null;
}
function compareParsedSemVer(left, right) {
	for (const key of [
		"major",
		"minor",
		"patch"
	]) {
		const comparison = compareNumeric(left[key], right[key]);
		if (comparison !== 0) return comparison;
	}
	if (left.prerelease.length === 0) return right.prerelease.length === 0 ? 0 : 1;
	if (right.prerelease.length === 0) return -1;
	const length = Math.max(left.prerelease.length, right.prerelease.length);
	for (let index = 0; index < length; index += 1) {
		const leftIdentifier = left.prerelease[index];
		const rightIdentifier = right.prerelease[index];
		if (leftIdentifier === void 0) return -1;
		if (rightIdentifier === void 0) return 1;
		if (leftIdentifier === rightIdentifier) continue;
		const leftNumeric = isNumeric(leftIdentifier);
		const rightNumeric = isNumeric(rightIdentifier);
		if (leftNumeric && rightNumeric) return compareNumeric(leftIdentifier, rightIdentifier);
		if (leftNumeric) return -1;
		if (rightNumeric) return 1;
		return leftIdentifier < rightIdentifier ? -1 : 1;
	}
	return 0;
}
function compareNumeric(left, right) {
	if (left.length !== right.length) return left.length < right.length ? -1 : 1;
	if (left === right) return 0;
	return left < right ? -1 : 1;
}
function isNumeric(identifier) {
	return /^[0-9]+$/u.test(identifier);
}
function hasLeadingZero(identifier) {
	return identifier.length > 1 && identifier.startsWith("0");
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
//#region ../dsh-plugin-desktop/src/update-download.ts
/** Headless, confirmation-gated downloads for DSH Desktop installers. */
/** Fixed download endpoints that record one user-confirmed installer download. */
const DESKTOP_DOWNLOAD_URLS = {
	darwin: "https://www.dshdesktop.cn/api/downloads/mac",
	win32: "https://www.dshdesktop.cn/api/downloads/windows"
};
/** Header pinning a download request and response to the checked release. */
const DESKTOP_TARGET_VERSION_HEADER = "X-DSH-Desktop-Target-Version";
/** Maximum accepted installer size, in bytes. */
const MAX_UPDATE_DOWNLOAD_BYTES = 1024 * 1024 * 1024;
/** Typed failure from installer request, validation, or cancellation. */
var UpdateDownloadError = class extends Error {
	/** Stable programmatic failure category. */
	code;
	/** HTTP status for an unsuccessful response, otherwise undefined. */
	status;
	/**
	* Create one safe update-download failure.
	* @param code - Stable failure category.
	* @param message - Diagnostic text without response content.
	* @param options - Optional HTTP status and underlying failure.
	*/
	constructor(code, message, options = {}) {
		super(message, options.cause === void 0 ? void 0 : { cause: options.cause });
		this.name = "UpdateDownloadError";
		this.code = code;
		this.status = options.status;
	}
};
const PRIVATE_FILE_MODE = 384;
const DECIMAL_BYTES = /^(0|[1-9][0-9]*)$/u;
const DMG_TRAILER_BYTES = 512;
const DMG_TRAILER_MAGIC = Buffer.from("koly", "ascii");
const DOS_HEADER_BYTES = 64;
const PE_OFFSET_POSITION = 60;
const PE_MAGIC = Buffer.from([
	80,
	69,
	0,
	0
]);
/**
* Download one installer after its caller has obtained user confirmation.
* @param options - Fixed platform, release version, selected destination, request, and cancellation inputs.
* @returns Absolute path to the completely written and validated installer.
* @throws {UpdateDownloadError} For invalid inputs, transport failures, rejected responses, cancellation, and invalid installers.
*/
async function downloadDesktopUpdate(options) {
	const platform = validatedPlatform(options.platform);
	const channel = options.channel ?? "stable";
	validatedVersion(options.version, channel);
	const destinationPath = validatedArtifactPath(options.destinationPath, platform);
	const expectedSha256 = normalizedExpectedDigest(options.expectedSha256);
	const paths = await prepareDownloadPaths(destinationPath);
	throwIfAborted(options.signal);
	let response;
	let finalUrl;
	try {
		const settled = await options.request(DESKTOP_DOWNLOAD_URLS[platform], {
			method: "GET",
			headers: {
				[DESKTOP_RELEASE_CHANNEL_HEADER]: channel,
				[DESKTOP_TARGET_VERSION_HEADER]: options.version
			},
			cache: "no-store",
			redirect: "follow",
			...options.signal === void 0 ? {} : { signal: options.signal }
		});
		response = settled.response;
		finalUrl = settled.finalUrl;
	} catch (cause) {
		if (options.signal?.aborted === true || isAbortFailure(cause)) throw aborted(cause);
		throw new UpdateDownloadError("network", "The update installer could not be downloaded.", { cause });
	}
	if (response.status !== 200) {
		await discardResponseBody(response);
		throw new UpdateDownloadError("http-status", `The update download service returned HTTP ${String(response.status)}.`, { status: response.status });
	}
	if (response.body === null) throw new UpdateDownloadError("empty-body", "The update download service returned an empty body.");
	try {
		assertSecureDownloadUrl(finalUrl);
		assertDeclaredSize(response);
	} catch (cause) {
		await discardResponseBody(response);
		throw cause;
	}
	let failure;
	try {
		const declared = Number(response.headers.get("content-length"));
		await writeResponseBody(paths.temporary, response.body, options.signal, (received) => {
			options.onProgress?.(received, Number.isFinite(declared) && declared > 0 ? declared : void 0);
		});
		throwIfAborted(options.signal);
		await validateArtifact(paths.temporary, platform);
		if (expectedSha256 !== void 0) await assertInstallerDigest(paths.temporary, expectedSha256);
		throwIfAborted(options.signal);
		await unlinkIfPresent(paths.completed);
		await rename(paths.temporary, paths.completed);
		return paths.completed;
	} catch (cause) {
		failure = options.signal?.aborted === true || isAbortFailure(cause) ? aborted(cause) : cause;
		throw failure;
	} finally {
		try {
			await unlinkIfPresent(paths.temporary);
		} catch (cleanupCause) {
			if (failure === void 0) throw cleanupCause;
			throw new AggregateError([failure, cleanupCause], "Failed to download and clean up the update installer.");
		}
	}
}
/** Fixed default filename shown by the native destination picker. */
function desktopUpdateFilename(platform, version, channel = "stable") {
	validatedPlatform(platform);
	validatedVersion(version, channel);
	const extension = platform === "darwin" ? "dmg" : "exe";
	const platformName = platform === "darwin" ? "mac" : "windows";
	return `${parseCanonicalChannelVersion(version, "next") !== null ? "DSH-NEXT" : channel === "beta" ? "DSH-Desktop-Beta" : "DSH-Desktop"}-${version}-${platformName}.${extension}`;
}
function validatedPlatform(platform) {
	if (platform !== "darwin" && platform !== "win32") throw new UpdateDownloadError("invalid-options", `Unsupported update download platform: ${String(platform)}`);
	return platform;
}
function validatedVersion(version, channel = "stable") {
	if (parseCanonicalUpdateVersion(version, channel) === null) throw new UpdateDownloadError("invalid-options", `The update version must match the ${channel} channel.`);
	return version;
}
async function prepareDownloadPaths(destinationPath) {
	const directory = dirname(destinationPath);
	const directoryStat = await lstat(directory);
	if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new UpdateDownloadError("invalid-options", "The update destination directory must be a real directory.");
	const completedStat = await lstatOptional(destinationPath);
	if (completedStat !== void 0) {
		if (!completedStat.isFile() || completedStat.isSymbolicLink()) throw new UpdateDownloadError("invalid-options", "The completed update path is not a regular file.");
	}
	return {
		completed: destinationPath,
		temporary: join(directory, `.${basename(destinationPath)}.${process.pid}.${randomUUID()}.partial`)
	};
}
function validatedArtifactPath(path, platform) {
	if (path.length === 0 || /[\0\r\n]/u.test(path) || !isAbsolute(path)) throw new UpdateDownloadError("invalid-options", "The update destination path must be absolute.");
	const expectedExtension = platform === "darwin" ? ".dmg" : ".exe";
	if (extname(path).toLowerCase() !== expectedExtension) throw new UpdateDownloadError("invalid-options", `The update destination must use ${expectedExtension}.`);
	return resolve(path);
}
async function lstatOptional(filename) {
	try {
		return await lstat(filename);
	} catch (cause) {
		if (cause.code === "ENOENT") return void 0;
		throw cause;
	}
}
/** Release a rejected response body so its connection does not linger until GC. */
async function discardResponseBody(response) {
	await response.body?.cancel().catch(() => void 0);
}
function assertDeclaredSize(response) {
	const declared = response.headers.get("content-length");
	if (declared === null || !DECIMAL_BYTES.test(declared)) return;
	if (BigInt(declared) > BigInt(1073741824)) throw new UpdateDownloadError("response-too-large", `The update installer exceeds ${String(MAX_UPDATE_DOWNLOAD_BYTES)} bytes.`);
}
/** Require a usable HTTPS URL even when an update channel permits external artifact hosts. */
function assertSecureDownloadUrl(finalUrl) {
	let parsed;
	try {
		parsed = new URL(finalUrl);
	} catch {
		throw new UpdateDownloadError("redirect-origin", "The update download transport reported no usable final URL.");
	}
	if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port && parsed.port !== "443") throw new UpdateDownloadError("redirect-origin", "The update download must settle on HTTPS.");
	return parsed;
}
/** Normalize the optional expected digest at option validation time, before any network work. */
function normalizedExpectedDigest(expected) {
	if (expected === void 0) return void 0;
	const normalized = expected.trim().toLowerCase();
	if (!/^[0-9a-f]{64}$/u.test(normalized)) throw new UpdateDownloadError("invalid-options", "The expected installer digest is not a hex SHA-256.");
	return normalized;
}
/**
* Verify the downloaded installer against the published digest. The file is
* hashed in bounded chunks — installers reach hundreds of megabytes, and a
* single whole-file buffer would spike main-process memory — and compared in
* constant time over the decoded bytes.
*/
async function assertInstallerDigest(filename, expected) {
	const expectedBytes = Buffer.from(expected, "hex");
	const hash = createHash("sha256");
	const handle = await open(filename, "r");
	try {
		const chunk = Buffer.alloc(1024 * 1024);
		while (true) {
			const result = await handle.read(chunk, 0, chunk.byteLength, null);
			if (result.bytesRead === 0) break;
			hash.update(result.bytesRead === chunk.byteLength ? chunk : chunk.subarray(0, result.bytesRead));
		}
	} finally {
		await handle.close();
	}
	const actualBytes = hash.digest();
	if (actualBytes.byteLength !== expectedBytes.byteLength || !timingSafeEqual(actualBytes, expectedBytes)) throw new UpdateDownloadError("invalid-artifact", "The update installer does not match the published digest.");
}
async function writeResponseBody(filename, body, signal, onProgress) {
	const handle = await open(filename, "wx", PRIVATE_FILE_MODE);
	const reader = body.getReader();
	let bytesWritten = 0;
	try {
		while (true) {
			throwIfAborted(signal);
			const chunk = await reader.read();
			throwIfAborted(signal);
			if (chunk.done) break;
			if (chunk.value.byteLength > 1073741824 - bytesWritten) throw new UpdateDownloadError("response-too-large", `The update installer exceeds ${String(MAX_UPDATE_DOWNLOAD_BYTES)} bytes.`);
			await writeAll(handle, chunk.value);
			bytesWritten += chunk.value.byteLength;
			onProgress?.(bytesWritten);
		}
		if (bytesWritten === 0) throw new UpdateDownloadError("empty-body", "The update download service returned an empty body.");
		await handle.sync();
	} catch (cause) {
		await reader.cancel(cause).catch(() => void 0);
		throw cause;
	} finally {
		reader.releaseLock();
		await handle.close();
	}
}
async function writeAll(handle, chunk) {
	let offset = 0;
	while (offset < chunk.byteLength) {
		const result = await handle.write(chunk, offset, chunk.byteLength - offset, null);
		if (result.bytesWritten === 0) throw new Error("The update installer write made no progress.");
		offset += result.bytesWritten;
	}
}
async function validateArtifact(filename, platform) {
	const handle = await open(filename, "r");
	try {
		const stat = await handle.stat();
		if (!stat.isFile() || stat.size <= 0 || stat.size > 1073741824) throw invalidArtifact(platform);
		if (platform === "darwin") {
			if (stat.size < DMG_TRAILER_BYTES) throw invalidArtifact(platform);
			const magic = Buffer.alloc(DMG_TRAILER_MAGIC.byteLength);
			if ((await handle.read(magic, 0, magic.byteLength, stat.size - DMG_TRAILER_BYTES)).bytesRead !== magic.byteLength || !magic.equals(DMG_TRAILER_MAGIC)) throw invalidArtifact(platform);
			return;
		}
		if (stat.size < DOS_HEADER_BYTES) throw invalidArtifact(platform);
		const dosHeader = Buffer.alloc(DOS_HEADER_BYTES);
		if ((await handle.read(dosHeader, 0, dosHeader.byteLength, 0)).bytesRead !== dosHeader.byteLength || dosHeader[0] !== 77 || dosHeader[1] !== 90) throw invalidArtifact(platform);
		const peOffset = dosHeader.readUInt32LE(PE_OFFSET_POSITION);
		if (peOffset > stat.size - PE_MAGIC.byteLength) throw invalidArtifact(platform);
		const peMagic = Buffer.alloc(PE_MAGIC.byteLength);
		if ((await handle.read(peMagic, 0, peMagic.byteLength, peOffset)).bytesRead !== peMagic.byteLength || !peMagic.equals(PE_MAGIC)) throw invalidArtifact(platform);
	} finally {
		await handle.close();
	}
}
function invalidArtifact(platform) {
	return new UpdateDownloadError("invalid-artifact", platform === "darwin" ? "The downloaded file is not a UDIF disk image." : "The downloaded file is not a PE executable.");
}
function throwIfAborted(signal) {
	if (signal?.aborted !== true) return;
	throw aborted(signal.reason);
}
function aborted(cause) {
	return new UpdateDownloadError("aborted", "The update installer download was cancelled.", { cause });
}
function isAbortFailure(value) {
	return value instanceof UpdateDownloadError ? value.code === "aborted" : typeof value === "object" && value !== null && "name" in value && value.name === "AbortError";
}
async function unlinkIfPresent(filename) {
	try {
		await unlink(filename);
	} catch (cause) {
		if (cause.code !== "ENOENT") throw cause;
	}
}
//#endregion
//#region src/updates.ts
/** Main-process update ownership survives a stopped or broken Profile Host. */
var NextUpdates = class {
	options;
	state;
	result;
	operation;
	controller;
	timer;
	directory;
	notifiedVersion;
	cacheReady;
	disposed = false;
	constructor(options) {
		this.options = options;
		this.state = {
			phase: "idle",
			installable: options.packaged && ["darwin", "win32"].includes(options.platform)
		};
	}
	snapshot() {
		return { ...this.state };
	}
	initializeCache() {
		return this.cacheReady ??= (async () => {
			const cache = join(this.options.userData, "next-updates");
			privateDirectory(cache);
			try {
				const text = readPrivateFile(join(cache, "state.json"), 4096);
				const parsed = text ? JSON.parse(text) : void 0;
				if (typeof parsed?.notifiedVersion === "string") this.notifiedVersion = parsed.notifiedVersion;
			} catch (error) {
				this.options.log(error);
			}
			for (const entry of await readdir(cache, { withFileTypes: true })) if (entry.isDirectory() && /^download-[A-Za-z0-9]+$/.test(entry.name)) await rm(join(cache, entry.name), {
				recursive: true,
				force: true
			}).catch(this.options.log);
		})();
	}
	recordNotifiedVersion(version) {
		this.notifiedVersion = version;
		try {
			atomicJson(join(this.options.userData, "next-updates", "state.json"), { notifiedVersion: version });
		} catch (error) {
			this.options.log(error);
		}
	}
	set(patch) {
		if (this.disposed) return;
		this.state = {
			...this.state,
			error: void 0,
			...patch
		};
		this.options.changed();
	}
	start() {
		if (!this.options.packaged || !["darwin", "win32"].includes(this.options.platform) || this.timer || this.disposed) return;
		this.initializeCache().catch(this.options.log);
		const poll = () => {
			if (this.disposed) return;
			if ([
				"idle",
				"current",
				"error"
			].includes(this.state.phase)) this.check(true);
			this.timer = setTimeout(poll, 360 * 6e4);
			this.timer.unref();
		};
		this.timer = setTimeout(poll, 3e4);
		this.timer.unref();
	}
	run(task) {
		if (this.disposed) return Promise.resolve();
		if (this.operation) return this.operation;
		this.controller = new AbortController();
		const signal = this.controller.signal;
		this.operation = (async () => {
			try {
				await this.initializeCache();
				signal.throwIfAborted();
				await task(signal);
			} catch (error) {
				if (!signal.aborted) {
					this.options.log(error);
					this.set({
						phase: "error",
						error: "download"
					});
				}
			}
		})().finally(() => {
			this.operation = void 0;
			this.controller = void 0;
		});
		return this.operation;
	}
	async query(signal) {
		let installationId;
		if (this.options.packaged) try {
			installationId = await getOrCreateDesktopInstallationId(this.options.userData);
		} catch (error) {
			this.options.log(error);
		}
		return checkForDesktopUpdate({
			currentVersion: this.options.version,
			channel: "next",
			installationId,
			request: this.options.request,
			signal: AbortSignal.any([signal, AbortSignal.timeout(2e4)])
		});
	}
	check(background = false) {
		if (this.state.phase === "ready" || this.state.phase === "installing") return Promise.resolve();
		return this.run(async (signal) => {
			this.set({ phase: "checking" });
			try {
				this.result = await this.query(signal) ?? void 0;
				if (!this.result) {
					this.set({
						phase: "error",
						error: "service",
						version: void 0
					});
					return;
				}
				this.set({
					phase: this.result.status === "update-available" ? "available" : "current",
					version: this.result.latestVersion
				});
				if (this.result.status === "update-available") {
					if (background && this.state.installable && this.result.latestVersion !== this.notifiedVersion) {
						this.recordNotifiedVersion(this.result.latestVersion);
						if (!this.disposed) this.options.available?.(this.result.latestVersion);
					} else if (!background && this.result.latestVersion !== this.notifiedVersion) this.recordNotifiedVersion(this.result.latestVersion);
				}
			} catch (error) {
				this.options.log(error);
				this.set({
					phase: "error",
					error: "service"
				});
			}
		});
	}
	download() {
		if (!this.state.installable) {
			this.set({
				phase: "error",
				error: this.options.packaged ? "unsupported" : "development"
			});
			return Promise.resolve();
		}
		if (this.state.phase === "ready" || this.state.phase === "installing") return Promise.resolve();
		return this.run(async (signal) => {
			let preparing = false;
			try {
				this.set({ phase: "checking" });
				const result = await this.query(signal);
				if (!result) {
					this.set({
						phase: "error",
						error: "service"
					});
					return;
				}
				this.result = result;
				if (result.status !== "update-available") {
					this.set({
						phase: "current",
						version: result.latestVersion
					});
					return;
				}
				if (result.latestVersion !== this.notifiedVersion) this.recordNotifiedVersion(result.latestVersion);
				const platform = this.options.platform;
				const cache = join(this.options.userData, "next-updates");
				privateDirectory(cache);
				if (this.directory) await rm(this.directory, {
					recursive: true,
					force: true
				});
				const directory = this.directory = await mkdtemp(join(cache, "download-"));
				this.set({
					phase: "downloading",
					version: result.latestVersion,
					received: 0,
					total: void 0
				});
				let lastProgress = 0;
				const path = await downloadDesktopUpdate({
					platform,
					version: result.latestVersion,
					channel: "next",
					destinationPath: join(directory, desktopUpdateFilename(platform, result.latestVersion, "next")),
					request: this.options.artifactRequest,
					expectedSha256: result.installerSha256?.[platform],
					signal: AbortSignal.any([signal, AbortSignal.timeout(60 * 6e4)]),
					onProgress: (received, total) => {
						if (Date.now() - lastProgress < 250 && received !== total) return;
						lastProgress = Date.now();
						this.set({
							received,
							total
						});
					}
				});
				signal.throwIfAborted();
				preparing = true;
				this.set({ phase: "preparing" });
				await this.options.prepare(path, result.latestVersion, directory, signal);
				signal.throwIfAborted();
				this.set({ phase: "ready" });
			} catch (error) {
				this.options.log(error);
				this.set({
					phase: "error",
					error: preparing ? "prepare" : "download"
				});
			}
		});
	}
	async install() {
		if (this.disposed || this.state.phase !== "ready") return;
		this.set({ phase: "installing" });
		try {
			await this.options.install();
		} catch (error) {
			this.options.log(error);
			this.set({
				phase: "error",
				error: "install"
			});
		}
	}
	async dispose(keepInstaller = false) {
		this.disposed = true;
		clearTimeout(this.timer);
		this.controller?.abort();
		await this.operation;
		if (this.directory && !keepInstaller) await rm(this.directory, {
			recursive: true,
			force: true
		}).catch(this.options.log);
	}
};
//#endregion
//#region src/update-transport.ts
/** Installer transport: Chromium `net.request` follows redirects one hop at a time. */
/** Redirect hops accepted before the transport reports a loop. */
const MAX_REDIRECTS = 8;
/**
* Non-persistent partition for installer traffic. It starts with an empty
* cookie jar, stores nothing, and therefore carries the `credentials: 'omit'`
* guarantee the previous `net.fetch` request expressed directly.
*/
const UPDATE_PARTITION = "dsh-next-update";
/** HTTP statuses whose Response must be constructed without a body stream. */
const NULL_BODY_STATUSES = /* @__PURE__ */ new Set([
	204,
	205,
	304
]);
/**
* Build the artifact transport for installer downloads.
*
* `net.fetch` cannot follow redirects manually: with `redirect: 'manual'` it
* rejects with `Redirect was cancelled` instead of returning the 3xx response,
* so a release service that redirects to storage can never be downloaded.
* `net.request` emits a `redirect` event and waits for `followRedirect()` or
* `abort()`, which supports the per-hop HTTPS check.
*
* @returns A request adapter that resolves with the settled response and URL.
*/
function createArtifactRequest() {
	return (url, init) => requestArtifact(url, init);
}
function requestArtifact(url, init) {
	return new Promise((resolve, reject) => {
		const signal = init.signal ?? void 0;
		let current;
		let hops = 0;
		let settled = false;
		const release = () => {
			signal?.removeEventListener("abort", onAbort);
		};
		const finish = (value) => {
			if (settled) return;
			settled = true;
			release();
			resolve(value);
		};
		const fail = (error) => {
			if (settled) return;
			settled = true;
			release();
			reject(error instanceof Error ? error : new Error(String(error)));
		};
		function onAbort() {
			const request = current;
			current = void 0;
			fail(Object.assign(/* @__PURE__ */ new Error("The update download was cancelled."), { name: "AbortError" }));
			try {
				request?.abort();
			} catch {}
		}
		if (signal?.aborted === true) {
			onAbort();
			return;
		}
		signal?.addEventListener("abort", onAbort, { once: true });
		const open = (target) => {
			if (settled) return;
			let secure;
			try {
				secure = assertSecureDownloadUrl(target);
			} catch (error) {
				fail(error);
				return;
			}
			if (hops >= MAX_REDIRECTS) {
				fail(/* @__PURE__ */ new Error("Too many update redirects"));
				return;
			}
			hops += 1;
			const headers = new Headers(hops === 1 ? init.headers : { Accept: "application/octet-stream" });
			headers.set("cache-control", "no-cache");
			const request = net.request({
				url: secure.href,
				method: "GET",
				redirect: "manual",
				session: session.fromPartition(UPDATE_PARTITION)
			});
			current = request;
			headers.forEach((value, key) => request.setHeader(key, value));
			let closing = false;
			request.on("redirect", (_status, _method, redirectUrl) => {
				closing = true;
				try {
					request.abort();
				} catch {}
				let next;
				try {
					next = new URL(redirectUrl, secure.href).href;
				} catch {
					fail(/* @__PURE__ */ new Error("Update redirect has no usable location"));
					return;
				}
				open(next);
			});
			request.on("response", (incoming) => {
				if (settled) return;
				const status = incoming.statusCode;
				if (status === void 0) {
					fail(/* @__PURE__ */ new Error("The update download response carried no HTTP status."));
					return;
				}
				const responseHeaders = new Headers();
				for (const [key, value] of Object.entries(incoming.headers)) for (const item of Array.isArray(value) ? value : [value]) responseHeaders.append(key, item);
				try {
					finish({
						response: new Response(NULL_BODY_STATUSES.has(status) ? null : Readable.toWeb(incoming), {
							status,
							headers: responseHeaders
						}),
						finalUrl: secure.href
					});
				} catch (error) {
					fail(error);
				}
			});
			request.on("abort", () => {
				if (!closing && !settled) fail(/* @__PURE__ */ new Error("The update download request was aborted."));
			});
			request.on("error", (error) => fail(error));
			request.end();
		};
		open(url);
	});
}
//#endregion
//#region ../dsh-plugin-desktop/src/shutdown.ts
/** Application-level quit sources that must remain active before any window mounts. */
/** Maximum grace allowed for the Cordis tree to dispose before native exit. */
const DESKTOP_SHUTDOWN_TIMEOUT_MS = 5e3;
//#endregion
//#region src/renderer-recovery.ts
const RETRY_DELAYS_MS = [
	0,
	1e3,
	3e3
];
const HEALTH_TIMEOUT_MS = 3e4;
const STABLE_PERIOD_MS = 6e4;
var NextRendererRecovery = class {
	options;
	phase = "idle";
	attempts = 0;
	documentLoaded = false;
	clientHealthy = false;
	timer;
	stableTimer;
	navigation = 0;
	bootExpected = false;
	cause = "open";
	constructor(options) {
		this.options = options;
	}
	/**
	* Invalidate both page readiness and pending completions from an older navigation.
	* @param cause - Who started the new document; its mount counts as a recovery only when recovery started it.
	*/
	navigating(cause) {
		if (!this.available()) return;
		this.navigation++;
		this.cause = cause;
		this.documentLoaded = false;
		this.clientHealthy = false;
		this.bootExpected = false;
		this.clearStableTimer();
	}
	/** Start the readiness deadline only after the Host has supplied this document's boot data. */
	booted() {
		if (this.bootExpected) return;
		this.bootExpected = true;
		this.waitForHealth();
	}
	loaded() {
		if (!this.available()) return;
		this.documentLoaded = true;
		this.acceptHealth();
	}
	report(_status) {
		if (!this.available()) return;
		this.clientHealthy = true;
		this.acceptHealth();
	}
	fail(detail) {
		if (!this.available() || this.phase === "scheduled") return;
		this.clearTimer();
		this.clearStableTimer();
		this.clientHealthy = false;
		const delay = RETRY_DELAYS_MS[this.attempts];
		if (delay === void 0) {
			this.phase = "exhausted";
			this.options.record("renderer.recovery.exhausted", {
				attempt: this.attempts,
				detail
			});
			this.options.exhausted(detail);
			return;
		}
		this.phase = "scheduled";
		this.options.record("renderer.recovery.scheduled", {
			attempt: this.attempts + 1,
			delayMs: delay,
			detail
		});
		this.timer = setTimeout(() => {
			this.timer = void 0;
			if (!this.available()) return;
			this.phase = "waiting";
			this.documentLoaded = false;
			this.attempts++;
			this.options.record("renderer.recovery.reload", { attempt: this.attempts });
			this.armDeadline();
			const loading = this.options.reload();
			const navigation = this.navigation;
			loading.catch((error) => {
				if (navigation === this.navigation) this.fail(error instanceof Error ? error.message : String(error));
			});
		}, delay);
		this.timer.unref();
	}
	stop() {
		this.phase = "stopped";
		this.navigation++;
		this.clearTimer();
		this.clearStableTimer();
	}
	available() {
		return this.phase !== "stopped" && this.phase !== "exhausted" && this.options.available();
	}
	waitForHealth() {
		if (!this.available() || this.phase === "scheduled" || this.phase === "waiting") return;
		this.phase = "waiting";
		this.armDeadline();
	}
	armDeadline() {
		this.clearTimer();
		this.timer = setTimeout(() => {
			this.timer = void 0;
			this.fail("Renderer recovery timed out waiting for page load and UI mount");
		}, HEALTH_TIMEOUT_MS);
		this.timer.unref();
	}
	acceptHealth() {
		if (!this.documentLoaded || !this.clientHealthy || this.phase === "scheduled") return;
		if (this.phase === "idle" && this.stableTimer !== void 0) return;
		this.clearTimer();
		this.phase = "idle";
		if (this.cause === "recovery") this.options.record("renderer.recovery.healthy", { attempt: this.attempts });
		else this.options.record("renderer.ready", { cause: this.cause });
		this.options.healthy();
		this.clearStableTimer();
		this.stableTimer = setTimeout(() => {
			this.stableTimer = void 0;
			if (this.available()) this.attempts = 0;
		}, STABLE_PERIOD_MS);
		this.stableTimer.unref();
	}
	clearTimer() {
		clearTimeout(this.timer);
		this.timer = void 0;
	}
	clearStableTimer() {
		clearTimeout(this.stableTimer);
		this.stableTimer = void 0;
	}
};
function isDesktopRendererStatus(value) {
	return value === "healthy";
}
//#endregion
//#region src/windows-elevation.ts
/**
* Windows administrator detection and the de-elevated restart that precedes every child process.
*
* Chromium's sandbox broker cannot always create its children from an elevated token: on those machines
* the GPU process fails to launch nine times and Chromium ends the browser process (#1487,
* electron/electron#49167). Chrome restarts itself de-elevated before launching any child. This module
* follows Chromium's `base::win::RunDeElevated`: the desktop shell's process token is the same user's
* normal token, so a process created with it runs without administrator rights.
*/
/** Keeps an intentionally elevated launch elevated. */
const KEEP_ELEVATED_ARGUMENT = "--next-keep-elevated";
/** Win32 call failure with its exact error code. */
var Win32CallError = class extends Error {
	api;
	code;
	constructor(api, code) {
		super(`${api} failed (Win32 ${code})`);
		this.api = api;
		this.code = code;
		this.name = "Win32CallError";
	}
};
const TOKEN_QUERY = 8;
const PROCESS_QUERY_LIMITED_INFORMATION = 4096;
const TOKEN_USER_CLASS = 1;
const TOKEN_ELEVATION_TYPE_CLASS = 18;
const TOKEN_ELEVATION_CLASS = 20;
const SECURITY_IMPERSONATION = 2;
const TOKEN_PRIMARY = 1;
const SE_PRIVILEGE_ENABLED = 2;
/** TOKEN_USER plus the SID it points to: at most 16 + 68 bytes on 64-bit Windows. */
const TOKEN_USER_BYTES = 256;
/**
* Win32 types and functions this module binds, by library.
* @param koffi - loaded Koffi module.
* @returns anonymous struct layouts and `[result, parameters]` per function, all `__stdcall`.
*/
function win32Signatures(koffi) {
	const HANDLE = koffi.pointer("void");
	const LUID = koffi.struct({
		LowPart: "uint32",
		HighPart: "int32"
	});
	const TOKEN_PRIVILEGES = koffi.struct({
		PrivilegeCount: "uint32",
		Luid: LUID,
		Attributes: "uint32"
	});
	const STARTUPINFOW = koffi.struct({
		cb: "uint32",
		lpReserved: "str16",
		lpDesktop: "str16",
		lpTitle: "str16",
		dwX: "uint32",
		dwY: "uint32",
		dwXSize: "uint32",
		dwYSize: "uint32",
		dwXCountChars: "uint32",
		dwYCountChars: "uint32",
		dwFillAttribute: "uint32",
		dwFlags: "uint32",
		wShowWindow: "uint16",
		cbReserved2: "uint16",
		lpReserved2: koffi.pointer("uint8"),
		hStdInput: HANDLE,
		hStdOutput: HANDLE,
		hStdError: HANDLE
	});
	const PROCESS_INFORMATION = koffi.struct({
		hProcess: HANDLE,
		hThread: HANDLE,
		dwProcessId: "uint32",
		dwThreadId: "uint32"
	});
	const handleOut = koffi.out(koffi.pointer(HANDLE));
	const uint32Out = koffi.out(koffi.pointer("uint32"));
	return {
		types: {
			LUID,
			TOKEN_PRIVILEGES,
			STARTUPINFOW,
			PROCESS_INFORMATION
		},
		libraries: {
			"kernel32.dll": {
				GetCurrentProcess: [HANDLE, []],
				OpenProcess: [HANDLE, [
					"uint32",
					"int",
					"uint32"
				]],
				CloseHandle: ["int", [HANDLE]],
				GetLastError: ["uint32", []]
			},
			"advapi32.dll": {
				OpenProcessToken: ["int", [
					HANDLE,
					"uint32",
					handleOut
				]],
				GetTokenInformation: ["int", [
					HANDLE,
					"int",
					HANDLE,
					"uint32",
					uint32Out
				]],
				DuplicateTokenEx: ["int", [
					HANDLE,
					"uint32",
					HANDLE,
					"int",
					"int",
					handleOut
				]],
				LookupPrivilegeValueW: ["int", [
					"str16",
					"str16",
					koffi.out(koffi.pointer(LUID))
				]],
				AdjustTokenPrivileges: ["int", [
					HANDLE,
					"int",
					koffi.pointer(TOKEN_PRIVILEGES),
					"uint32",
					HANDLE,
					HANDLE
				]],
				EqualSid: ["int", [HANDLE, HANDLE]],
				CreateProcessWithTokenW: ["int", [
					HANDLE,
					"uint32",
					"str16",
					"str16",
					"uint32",
					HANDLE,
					"str16",
					koffi.pointer(STARTUPINFOW),
					koffi.out(koffi.pointer(PROCESS_INFORMATION))
				]]
			},
			"user32.dll": {
				GetShellWindow: [HANDLE, []],
				GetWindowThreadProcessId: ["uint32", [HANDLE, uint32Out]],
				AllowSetForegroundWindow: ["int", ["uint32"]]
			}
		}
	};
}
let cached;
/** Load Koffi and bind the Win32 functions on first use, which happens only on Windows. */
function win32$1() {
	if (cached) return cached;
	const koffi = createRequire(import.meta.url)("koffi");
	const signatures = win32Signatures(koffi);
	const api = {};
	for (const [library, functions] of Object.entries(signatures.libraries)) {
		const loaded = koffi.load(library);
		for (const [name, [result, parameters]] of Object.entries(functions)) api[name] = loaded.func("__stdcall", name, result, [...parameters]);
	}
	return cached = {
		koffi,
		startupInfoBytes: koffi.sizeof(signatures.types.STARTUPINFOW),
		api
	};
}
function lastError({ api }, name) {
	return new Win32CallError(name, api.GetLastError());
}
function openToken(win, process, access) {
	const token = [null];
	if (!win.api.OpenProcessToken(process, access, token) || token[0] === null) throw lastError(win, "OpenProcessToken");
	return token[0];
}
function tokenUint32(win, token, informationClass) {
	const information = Buffer.alloc(4);
	if (!win.api.GetTokenInformation(token, informationClass, information, information.length, [0])) throw lastError(win, "GetTokenInformation");
	return information.readUInt32LE(0);
}
function tokenElevation(win, token) {
	const type = tokenUint32(win, token, TOKEN_ELEVATION_TYPE_CLASS);
	return {
		elevated: tokenUint32(win, token, TOKEN_ELEVATION_CLASS) !== 0,
		type: type === 2 ? "full" : type === 3 ? "limited" : "default"
	};
}
/** Whether two tokens belong to one user. TOKEN_USER points into its own buffer, so both live in native memory. */
function sameUser(win, first, second) {
	const buffers = [];
	try {
		const sids = [first, second].map((token) => {
			const information = win.koffi.alloc("uint8", TOKEN_USER_BYTES);
			buffers.push(information);
			if (!win.api.GetTokenInformation(token, TOKEN_USER_CLASS, information, TOKEN_USER_BYTES, [0])) throw lastError(win, "GetTokenInformation");
			const sid = win.koffi.decode(information, "void *");
			if (sid === null) throw new Win32CallError("GetTokenInformation", 0);
			return sid;
		});
		return win.api.EqualSid(sids[0], sids[1]) !== 0;
	} finally {
		for (const buffer of buffers) win.koffi.free(buffer);
	}
}
/** Best effort, as in Chromium: elevated administrators normally hold the privilege enabled already. */
function enableImpersonatePrivilege(win, token) {
	const luid = {};
	if (!win.api.LookupPrivilegeValueW(null, "SeImpersonatePrivilege", luid)) return;
	win.api.AdjustTokenPrivileges(token, 0, {
		PrivilegeCount: 1,
		Luid: luid,
		Attributes: SE_PRIVILEGE_ENABLED
	}, 0, null, null);
}
/**
* Read this process's token elevation.
* @returns elevation of the current process token.
* @throws when Koffi cannot load or the token cannot be queried.
*/
function windowsElevation() {
	const win = win32$1();
	const token = openToken(win, win.api.GetCurrentProcess(), TOKEN_QUERY);
	try {
		return tokenElevation(win, token);
	} finally {
		win.api.CloseHandle(token);
	}
}
/**
* Start a program as the same user without administrator rights, with the desktop shell's token
* (Chromium's `base::win::RunDeElevated`). The new process inherits this process's working directory
* and receives a fresh environment from the user's profile, as a process the shell started would.
* @param file - program path.
* @param commandLine - complete command line, the quoted program first.
* @returns the new process id, or why the shell offers no normal token of this user.
* @throws Win32CallError when a Win32 step fails, e.g. ERROR_ELEVATION_REQUIRED when Windows forces elevation.
*/
function launchWithShellToken(file, commandLine) {
	const win = win32$1();
	const { api } = win;
	const window = api.GetShellWindow();
	const shellPid = [0];
	if (window === null || !api.GetWindowThreadProcessId(window, shellPid) || !shellPid[0]) return {
		launched: false,
		reason: "no-shell"
	};
	const shellProcess = api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, shellPid[0]);
	if (shellProcess === null) throw lastError(win, "OpenProcess");
	const handles = [shellProcess];
	try {
		const shellToken = openToken(win, shellProcess, 10);
		handles.push(shellToken);
		if (tokenElevation(win, shellToken).elevated) return {
			launched: false,
			reason: "shell-elevated"
		};
		const ownToken = openToken(win, api.GetCurrentProcess(), 40);
		handles.push(ownToken);
		if (!sameUser(win, ownToken, shellToken)) return {
			launched: false,
			reason: "shell-other-user"
		};
		enableImpersonatePrivilege(win, ownToken);
		const primary = [null];
		if (!api.DuplicateTokenEx(shellToken, 395, null, SECURITY_IMPERSONATION, TOKEN_PRIMARY, primary) || primary[0] === null) throw lastError(win, "DuplicateTokenEx");
		handles.push(primary[0]);
		const started = {};
		if (!api.CreateProcessWithTokenW(primary[0], 0, file, commandLine, 0, null, null, { cb: win.startupInfoBytes }, started)) throw lastError(win, "CreateProcessWithTokenW");
		for (const handle of [started.hProcess, started.hThread]) if (handle) handles.push(handle);
		const pid = started.dwProcessId ?? 0;
		api.AllowSetForegroundWindow(pid);
		return {
			launched: true,
			pid
		};
	} finally {
		for (const handle of handles.reverse()) api.CloseHandle(handle);
	}
}
/**
* Quote one argument for `CommandLineToArgvW`, which Chromium and the C runtime both follow.
* @param value - raw argument.
* @returns the argument unchanged when it needs no quoting, otherwise quoted with its quotes and trailing backslashes escaped.
*/
function quoteWindowsArgument(value) {
	if (value !== "" && !/[\s"]/u.test(value)) return value;
	let quoted = "\"";
	let backslashes = 0;
	for (const character of value) {
		if (character === "\\") {
			backslashes++;
			continue;
		}
		quoted += "\\".repeat(character === "\"" ? backslashes * 2 + 1 : backslashes) + character;
		backslashes = 0;
	}
	return `${quoted}${"\\".repeat(backslashes * 2)}"`;
}
const AUTOMATION_ARGUMENT = /^--(?:remote-debugging-(?:port|pipe)|enable-automation)(?:=|$)/u;
/**
* Restart a packaged Windows launch that holds the elevated half of a split token with the user's normal token,
* before this process starts any child. A failed restart continues the launch elevated.
* @param options - process facts and, in tests, Win32 replacements.
* @returns `relaunched` when the caller must exit now, otherwise what to record about this process.
*/
function deElevateAtStartup(options) {
	if (options.platform !== "win32") return {
		relaunched: false,
		state: {}
	};
	let elevation;
	try {
		elevation = (options.elevation ?? windowsElevation)();
	} catch (error) {
		return {
			relaunched: false,
			state: { error: String(error) }
		};
	}
	if (elevation.type !== "full") return {
		relaunched: false,
		state: { elevation }
	};
	const args = options.argv.slice(1);
	const kept = !options.packaged ? "development" : args.includes("--next-keep-elevated") ? "requested" : args.includes("--next-de-elevated") ? "restarted" : isDesktopInstallerQuitRequest(args, options.platform) ? "installer" : args.some((argument) => AUTOMATION_ARGUMENT.test(argument)) ? "automation" : void 0;
	if (kept) return {
		relaunched: false,
		state: {
			elevation,
			kept
		}
	};
	try {
		const commandLine = [
			options.executable,
			...args,
			DE_ELEVATED_ARGUMENT
		].map(quoteWindowsArgument).join(" ");
		const result = (options.launch ?? launchWithShellToken)(options.executable, commandLine);
		return result.launched ? { relaunched: true } : {
			relaunched: false,
			state: {
				elevation,
				kept: result.reason
			}
		};
	} catch (error) {
		return {
			relaunched: false,
			state: {
				elevation,
				error: String(error),
				...error instanceof Win32CallError ? { win32Code: error.code } : {}
			}
		};
	}
}
/** Startup outcomes in which a restart without administrator rights was attempted and the launch stayed elevated. */
const RESTART_FAILURES = /* @__PURE__ */ new Set([
	"no-shell",
	"shell-elevated",
	"shell-other-user",
	"restarted"
]);
/**
* Recognize a failed GPU process launch in Electron's `child-process-gone` details.
* @param platform - Node platform.
* @param details - Electron child process details.
* @returns the failure on Windows, where it ends in Chromium's fatal exit.
*/
function gpuLaunchFailure(platform, details) {
	return platform === "win32" && details.type === "GPU" && details.reason === "launch-failed" ? {
		process: "gpu",
		code: details.exitCode
	} : void 0;
}
/**
* Recognize a failed renderer launch in Electron's `render-process-gone` details.
* @param platform - Node platform.
* @param details - Electron render process details.
* @returns the failure on Windows, where the window it belongs to can never paint.
*/
function rendererLaunchFailure(platform, details) {
	return platform === "win32" && details.reason === "launch-failed" ? {
		process: "renderer",
		code: details.exitCode
	} : void 0;
}
/**
* Write the explanation: the likely cause for this elevation state, the error code, and the temporary
* `--no-sandbox` workaround with its security cost.
* @param context - failure, elevation and launch facts.
* @returns message box text in the requested language.
*/
function sandboxLaunchDialog(context) {
	const zh = context.language === "zh";
	const t = (chinese, english) => zh ? chinese : english;
	const program = win32.basename(context.executable);
	const { elevation, startup, failure } = context;
	const keptByArgument = context.argv.includes(KEEP_ELEVATED_ARGUMENT);
	const cause = [];
	if (elevation?.elevated && elevation.type === "full") {
		cause.push(t("DSH NEXT 当前以管理员身份运行。以管理员身份运行时，Chromium 沙箱在部分 Windows 环境下无法创建子进程。", "DSH NEXT is running as administrator. On some Windows systems the Chromium sandbox cannot create child processes from an administrator process."));
		if (keptByArgument) cause.push(t(`启动参数中有 ${KEEP_ELEVATED_ARGUMENT}，因此没有自动以普通权限重新启动。`, `The ${KEEP_ELEVATED_ARGUMENT} argument turned off the automatic restart without administrator rights.`));
		else if (startup.win32Code === 740) cause.push(t("Windows 拒绝了以普通权限自动重新启动（错误 740）：这个程序被设置为始终以管理员身份运行。", "Windows refused the automatic restart without administrator rights (error 740): this program is set to always run as administrator."));
		else if (startup.elevation?.type === "full" && (startup.error !== void 0 || RESTART_FAILURES.has(startup.kept ?? ""))) cause.push(t("以普通权限自动重新启动没有成功。", "The automatic restart without administrator rights did not succeed."));
		cause.push(t("请以普通权限启动：", "Start it without administrator rights:"), t(`• 右键 ${program} 或它的快捷方式 →「属性」→「兼容性」，取消勾选「以管理员身份运行此程序」；如果用过「更改所有用户的设置」，那里也要取消。`, `• Right-click ${program} or its shortcut → Properties → Compatibility, and clear “Run this program as an administrator”. If you used “Change settings for all users”, clear it there too.`), t("• 快捷方式「属性」→「快捷方式」→「高级」，取消勾选「用管理员身份运行」。", "• In the shortcut’s Properties → Shortcut → Advanced, clear “Run as administrator”."), t("• 不要从管理员终端，或设置了「使用最高权限运行」的计划任务启动。", "• Do not start it from an administrator terminal or from a scheduled task set to “Run with highest privileges”."));
		if (keptByArgument) cause.push(t(`• 去掉启动参数 ${KEEP_ELEVATED_ARGUMENT}。`, `• Remove the ${KEEP_ELEVATED_ARGUMENT} argument.`));
	} else if (elevation?.elevated) cause.push(t("DSH NEXT 当前带管理员权限运行：这个账户启动的所有程序都带管理员权限（UAC 已关闭，或正在使用内置 Administrator 账户），因此无法自动以普通权限重新启动。以管理员身份运行时，Chromium 沙箱在部分 Windows 环境下无法创建子进程。请开启 UAC，或用普通账户登录后再启动。", "DSH NEXT is running with administrator rights because every program this account starts has them (UAC is off, or this is the built-in Administrator account), so it cannot restart itself without them. On some Windows systems the Chromium sandbox cannot create child processes from an administrator process. Turn UAC on, or sign in with a standard account, and start it again."));
	else if (elevation) cause.push(t("DSH NEXT 没有以管理员身份运行。其他已知原因：AppLocker 或软件限制策略、安全软件拦截、程序位于网络共享或重定向的文件夹中。", "DSH NEXT is not running as administrator. Other known causes are AppLocker or Software Restriction Policies, security software blocking the launch, and a program folder on a network share or in a redirected folder."));
	else cause.push(t("无法确认 DSH NEXT 是否以管理员身份运行。已知原因：以管理员身份运行（包括兼容性设置里的「以管理员身份运行此程序」）、AppLocker 或软件限制策略、安全软件拦截、程序位于网络共享或重定向的文件夹中。", "Could not check whether DSH NEXT runs as administrator. Known causes are running as administrator (including the compatibility setting “Run this program as an administrator”), AppLocker or Software Restriction Policies, security software blocking the launch, and a program folder on a network share or in a redirected folder."));
	const code = failure.code === 18 ? t(`错误码：${failure.code}（SBOX_ERROR_CREATE_PROCESS，Windows 拒绝创建沙箱进程）`, `Error code: ${failure.code} (SBOX_ERROR_CREATE_PROCESS: Windows refused to create the sandboxed process)`) : t(`错误码：${failure.code}（Chromium 沙箱启动结果）`, `Error code: ${failure.code} (Chromium sandbox launch result)`);
	const workaround = t("临时绕过：在快捷方式「目标」末尾加上 --no-sandbox 后启动。代价：这会关闭 Chromium 对所有页面的沙箱隔离，包括侧边栏浏览器打开的网页，任何网页里的漏洞都可以直接以你的身份读写文件、运行程序。只在排查期间使用，问题解决后请去掉。", "Temporary workaround: add --no-sandbox to the end of the shortcut’s Target and start again. This turns off the Chromium sandbox for every page, including web pages opened in the sidebar browser, so a flaw in any page can read and write your files and run programs as you. Use it only while troubleshooting and remove it afterwards.");
	return {
		title: t("DSH NEXT 无法启动", "DSH NEXT cannot start"),
		message: failure.process === "gpu" ? t("Chromium 沙箱未能启动 GPU 进程，DSH NEXT 无法显示窗口，即将退出。", "The Chromium sandbox could not start the GPU process, so DSH NEXT cannot show a window and will quit.") : t("Chromium 沙箱未能启动渲染进程，DSH NEXT 无法显示窗口，即将退出。", "The Chromium sandbox could not start the renderer process, so DSH NEXT cannot show a window and will quit."),
		detail: [
			cause.join("\n"),
			t(`程序位置：${context.executable}`, `Program: ${context.executable}`),
			code,
			workaround
		].join("\n\n"),
		button: t("退出", "Quit")
	};
}
/**
* Explain the first sandbox launch failure of this process, then exit. The message box blocks the UI thread,
* so Chromium cannot reach its fatal exit while the user reads it.
* @param options - Electron and Desktop operations.
* @returns report function; later failures are ignored.
*/
function createSandboxLaunchReporter(options) {
	let reported = false;
	return (failure) => {
		if (reported) return;
		reported = true;
		let elevation;
		try {
			elevation = options.elevation();
		} catch {
			elevation = void 0;
		}
		options.record(failure, elevation);
		try {
			options.show(sandboxLaunchDialog({
				failure,
				elevation,
				...options.context()
			}));
		} finally {
			options.exit();
		}
	};
}
//#endregion
//#region src/main.ts
/** Official Desktop transport with a Host-independent native shell. */
const startupElevation = deElevateAtStartup({
	platform: process.platform,
	packaged: app.isPackaged,
	argv: process.argv,
	executable: process.execPath
});
if (startupElevation.relaunched) app.exit(0);
const startupElevationState = startupElevation.relaunched ? {} : startupElevation.state;
applyDesktopPackageManagerPolicy(process.env);
const root = dirname(NEXT_PACKAGE);
const environmentHome = process.env["DSH_DESKTOP_NEXT_HOME"] || void 0;
const locationRoot = dataDirectoryLocationRoot(app.isPackaged, () => app.getPath("appData"), root);
const locationFile = dataDirectoryLocationFile(locationRoot);
const dataLocation = readDataDirectory(locationRoot, environmentHome);
const home = dataLocation.home;
let dataSource = dataLocation.source;
const normalElectronData = join(home, "electron-user-data");
privateDirectory(normalElectronData);
app.setName("DSH NEXT");
app.setPath("userData", normalElectronData);
const ownsInstance = !startupElevation.relaunched && claimDesktopSingleInstance(app, openMain);
const safeModeRequested = process.argv.includes(SAFE_ARGUMENT);
const safeElectronData = join(normalElectronData, "safe-mode");
if (ownsInstance) if (safeModeRequested) {
	cleanupDisposableTree(safeElectronData);
	privateDirectory(safeElectronData);
} else try {
	cleanupDisposableTree(safeElectronData);
} catch (error) {
	console.error("Next Safe Mode state cleanup failed", error);
}
const electronData = ownsInstance && safeModeRequested ? safeElectronData : normalElectronData;
const nativeLocale = new NativeLocaleStore(safeModeRequested ? electronData : home);
const mainWindowState = new FileMainWindowStateStore(safeModeRequested ? electronData : home);
app.setPath("userData", electronData);
app.setPath("sessionData", electronData);
protocol.registerSchemesAsPrivileged([{
	scheme: "dsh-app",
	privileges: {
		standard: true,
		secure: true,
		supportFetchAPI: true,
		corsEnabled: true,
		stream: true,
		codeCache: true
	}
}]);
let mainWindow;
let rendererRecovery;
let rendererDocumentId = "";
/** The main-window load the Desktop started, until its navigation begins or the load settles; any other main-frame navigation came from the page. */
let pendingNavigation;
/** The main window's interface has mounted at least once, so a later renderer failure stops a running Desktop. */
let rendererHealthy = false;
let desktopShortcuts;
const browserGuests = new DesktopBrowserGuests(() => runtime.auth ? [new URL(runtime.auth.url).origin] : []);
let shellWindow;
let recoveryRunner;
let replacingWindow = false;
let diagnosticsFile;
let recoveryNotice;
let recoveryStopping;
let recoveryRequest;
let pendingSettings;
let quitting = false;
let onboarding = false;
let onboardingSurfaceActive = false;
let onboardingComputerUse = false;
let relaunch;
let installingUpdate = false;
/** A later launch must not open a window on the data directory the startup prompt may reject. */
let confirmingDataDirectory = false;
let systemProxy = {};
let hostEnvironmentReady;
let windowsLanguage = "en";
const webRoot = dirname(createRequire(NEXT_PACKAGE).resolve("@deepseek-ai/dsh-web-frontend/dist/index.html"));
const version = JSON.parse(readFileSync(NEXT_PACKAGE, "utf8")).version;
/** The dsh runtime beside this shell; a development tree may hoist it elsewhere, and the packaged check then reports it. */
let dshVersion;
try {
	dshVersion = readInstalledPackageVersion(root, "@deepseek-ai/dsh");
} catch {}
const crashDumps = join(normalElectronData, "Crashpad");
if (ownsInstance) try {
	app.setPath("crashDumps", crashDumps);
	startCrashReporting(crashReporter, {
		productName: "DSH NEXT",
		version,
		dsh: dshVersion
	});
} catch (error) {
	console.error("Local crash reporting is unavailable", error);
}
const shellEnvironment = ownsInstance ? readShellEnvironment() : void 0;
const t = (zh, en) => windowsLanguage.toLowerCase().startsWith("zh") ? zh : en;
const runtime = new NextDesktopRuntime({
	home,
	root,
	primaryRuntime: join(app.isPackaged ? join(process.resourcesPath, "runtime") : join(root, ".desktop-build", "runtime"), process.arch, "primary-runtime"),
	executable: process.execPath,
	addresses: () => [...desktopLanAddresses()],
	systemProxy: () => systemProxy,
	prepareEnvironment: () => prepareHostEnvironment(),
	memoryProbe: {
		appMetrics: () => app.getAppMetrics(),
		system: () => {
			const memory = process.platform === "win32" ? process.getSystemMemoryInfo() : void 0;
			return {
				total: totalmem(),
				free: freemem(),
				...memory === void 0 ? {} : {
					commitLimit: memory.swapTotal * 1024,
					commitFree: memory.swapFree * 1024
				}
			};
		}
	},
	...safeModeRequested ? { stateHome: electronData } : {},
	certificate: async (addresses) => {
		try {
			return await createLanHttpsCertificate(electronData, addresses, {
				available: () => safeStorage.isEncryptionAvailable() && (process.platform !== "linux" || safeStorage.getSelectedStorageBackend() !== "basic_text"),
				seal: (bytes) => safeStorage.encryptString(Buffer.from(bytes).toString("utf8")),
				open: (bytes) => Buffer.from(safeStorage.decryptString(Buffer.from(bytes)), "utf8")
			});
		} catch (error) {
			runtime.diagnostics.append(lanHttpsCertificateDiagnostic(error), "warn");
			throw error;
		}
	},
	onFailure: () => {
		if (app.isReady()) openControls("recovery");
	},
	onChange: () => {
		if (!app.isReady()) return;
		if (runtime.backend.state.phase === "ready") rendererRecovery?.booted();
		native.refresh();
	},
	onRestart: () => run({ type: "restart" }),
	onTerminal: () => run({ type: "terminal" }),
	onNotification: (notification) => native.notify(notification),
	onPlatformLogin: (request) => {
		if (quitting || !app.isReady()) return;
		if (request.action === "close") {
			platformLogin.close();
			if (request.focus) openMain();
			return;
		}
		const url = platformLoginUrl(request.url);
		if (runtime.state().browserUrl !== null) shell.openExternal(url).catch((error) => runtime.diagnostics.append(String(error), "warn"));
		else platformLogin.open(url);
	},
	onPermission: async (action, permission) => {
		if (quitting) throw new Error("Desktop is shutting down");
		const snapshot = permissions.query(permission);
		if (action === "open-settings" || action === "request" && snapshot.status !== "granted") openSettings("permissions");
		return snapshot;
	}
});
if (ownsInstance) runtime.diagnostics.crashDumps = crashDumps;
const platformLogin = new PlatformLoginWindow({
	BrowserWindow,
	session: (partition) => session.fromPartition(partition),
	host: () => runtime.auth,
	parent: () => mainWindow,
	title: () => t("登录 DeepSeek", "Sign in to DeepSeek"),
	dark: () => nativeTheme.shouldUseDarkColors,
	warn: (error) => runtime.diagnostics.append(String(error), "warn")
});
const native = new NativeDesktop({
	root,
	language: () => windowsLanguage,
	state,
	window: () => mainWindow,
	show: openMain,
	run,
	warn: (error) => runtime.diagnostics.append(String(error), "warn")
});
const permissions = createNativePermissions();
const updateInstaller = new NextUpdateInstaller({
	platform: process.platform,
	executable: process.execPath,
	language: () => windowsLanguage,
	log: (error) => runtime.diagnostics.append(String(error), "warn")
});
const updates = new NextUpdates({
	version,
	platform: process.platform,
	packaged: app.isPackaged,
	userData: electronData,
	request: (url, init) => net.fetch(url, {
		...init,
		credentials: "omit"
	}),
	artifactRequest: createArtifactRequest(),
	changed: () => {
		if (app.isReady() && !quitting) native.refresh();
	},
	available: (nextVersion) => {
		if (app.isReady() && !quitting) native.notifyUpdate(nextVersion, () => {
			promptAvailableUpdate().catch((error) => runtime.diagnostics.append(String(error), "warn"));
		});
	},
	log: (error) => runtime.diagnostics.append(String(error), "warn"),
	prepare: (path, nextVersion, directory, signal) => updateInstaller.prepare(path, nextVersion, directory, signal),
	install: async () => {
		runtime.busy = true;
		native.refresh();
		try {
			await updateInstaller.stage();
			if (!quitting) {
				installingUpdate = true;
				app.quit();
			}
		} finally {
			runtime.busy = false;
			if (!quitting) native.refresh();
		}
	}
});
function state() {
	const usingDefaultDirectory = dataSource !== "desktop" && !dataLocation.error;
	let recovery;
	try {
		const repair = runtime.recovery.repairBackup(runtime.selected);
		recovery = {
			bundles: [],
			checkpoints: runtime.recovery.checkpoints(runtime.selected),
			...repair === null ? {} : { repairBackup: {
				id: repair.id,
				created: repair.created,
				fileCount: repair.fileCount,
				totalBytes: repair.totalBytes
			} },
			profileDirectory: runtime.profiles.directory(runtime.selected),
			usingDefaultDirectory,
			diagnosticsFile,
			notice: recoveryNotice
		};
		try {
			recovery.bundles = runtime.recovery.bundles(runtime.selected);
		} catch (error) {
			recovery.error = String(error);
		}
	} catch (error) {
		recovery = {
			bundles: [],
			checkpoints: [],
			profileDirectory: join(home, "profiles", runtime.selected),
			usingDefaultDirectory,
			error: String(error),
			diagnosticsFile,
			notice: recoveryNotice
		};
	}
	return {
		...runtime.state(),
		recovery,
		dataDirectory: {
			source: dataSource,
			environmentHome: environmentHome === void 0 ? null : resolve(environmentHome)
		},
		onboarding,
		...onboarding ? { onboardingComputerUse } : {},
		platform: process.platform,
		version,
		...["darwin", "win32"].includes(process.platform) ? { updates: updates.snapshot() } : {},
		trayAvailable: native.available,
		notificationsAvailable: Notification.isSupported()
	};
}
function run(value) {
	command(value, "native").catch((error) => runtime.report(error));
}
function assertSender(event, owner, origin) {
	if (!owner || owner.isDestroyed() || event.sender !== owner.webContents || event.senderFrame !== owner.webContents.mainFrame || !event.senderFrame.url.startsWith(origin)) throw new Error("Rejected Next IPC sender");
}
function assertDesktopSender(event) {
	if (event.sender === mainWindow?.webContents) assertSender(event, mainWindow, APP_URL);
	else assertSender(event, shellWindow, "dsh-app://shell/");
}
/**
* Carry the effective palette into the Platform login page, as upstream Desktop does.
* `system` resolves through `nativeTheme.shouldUseDarkColors`, which follows the theme
* source preload-theme.ts publishes.
* @param authorizeUrl - authorization URL already validated by host-process.ts.
* @returns the URL carrying `theme=light` or `theme=dark`.
*/
function platformLoginUrl(authorizeUrl) {
	const url = new URL(authorizeUrl);
	url.searchParams.set("theme", nativeTheme.shouldUseDarkColors ? "dark" : "light");
	return url.href;
}
function show(window) {
	if (quitting || window.isDestroyed()) return;
	if (window.isMinimized()) window.restore();
	window.show();
	window.focus();
}
/**
* Windows caption buttons never paint a fill of their own. Upstream fills them with the sidebar
* color, which matches only the official caption band: full-window surfaces such as the official
* onboarding and Platform sign-in pages paint that strip in the base background, leaving the
* buttons a different shade. Transparent buttons show whatever the page paints beneath them, and
* Electron derives their hover and press tint from the native theme rather than from this fill.
*/
const WINDOWS_CAPTION_FILL = "#00000000";
const MAIN_WINDOW_WIDTH = 1280;
const MAIN_WINDOW_HEIGHT = 840;
const MAIN_WINDOW_MIN_WIDTH = 800;
const MAIN_WINDOW_MIN_HEIGHT = 580;
/** Moves, resizes and zoom animations settle for this long before the main window is captured. */
const MAIN_WINDOW_STATE_DELAY_MS = 250;
let settledMainWindowState;
let storedMainWindowState;
let mainWindowStateTimer;
function restoreMainWindowState() {
	try {
		storedMainWindowState = mainWindowState.read();
		if (storedMainWindowState === void 0) return void 0;
		const { bounds, maximized } = storedMainWindowState;
		const workArea = screen.getDisplayMatching(bounds).workArea;
		return {
			bounds: fitMainWindowBounds(bounds, workArea, {
				width: MAIN_WINDOW_MIN_WIDTH,
				height: MAIN_WINDOW_MIN_HEIGHT
			}),
			maximized
		};
	} catch (error) {
		runtime.diagnostics.append(`failed to restore main-window state: ${error instanceof Error ? error.message : String(error)}`, "warn");
		return;
	}
}
function persistMainWindowState(window) {
	if (mainWindowStateTimer !== void 0) {
		clearTimeout(mainWindowStateTimer);
		mainWindowStateTimer = void 0;
	}
	const state = captureMainWindowState(window, settledMainWindowState, process.platform);
	settledMainWindowState = state;
	if (state === void 0 || storedMainWindowState !== void 0 && sameMainWindowState(state, storedMainWindowState)) return;
	try {
		mainWindowState.write(state);
		storedMainWindowState = state;
	} catch (error) {
		runtime.diagnostics.append(`failed to save main-window state: ${error instanceof Error ? error.message : String(error)}`, "warn");
	}
}
function scheduleMainWindowState(window) {
	if (mainWindowStateTimer !== void 0) clearTimeout(mainWindowStateTimer);
	mainWindowStateTimer = setTimeout(() => persistMainWindowState(window), MAIN_WINDOW_STATE_DELAY_MS);
	mainWindowStateTimer.unref();
}
function createWindow(preload, primary = false) {
	const restored = primary ? restoreMainWindowState() : void 0;
	if (primary) settledMainWindowState = restored;
	const window = new BrowserWindow({
		width: MAIN_WINDOW_WIDTH,
		height: MAIN_WINDOW_HEIGHT,
		minWidth: MAIN_WINDOW_MIN_WIDTH,
		minHeight: MAIN_WINDOW_MIN_HEIGHT,
		...restored?.bounds ?? {},
		show: false,
		title: "DSH NEXT",
		...process.platform !== "darwin" ? { icon: unpackedPath(join(root, "build", process.platform === "win32" ? "app-icon.ico" : "app-icon.png")) } : {},
		...!primary ? auxiliaryWindowChromeOptions() : {},
		...process.platform === "win32" && primary ? {
			titleBarStyle: "hidden",
			titleBarOverlay: {
				height: 40,
				color: WINDOWS_CAPTION_FILL,
				symbolColor: nativeTheme.shouldUseDarkColors ? "#f9fafb" : "#0f1115"
			}
		} : {},
		...process.platform === "darwin" ? {
			...primary ? {
				titleBarStyle: "hiddenInset",
				trafficLightPosition: {
					x: 16,
					y: 18
				}
			} : {},
			vibrancy: runtime.preferences.macosMaterial === "transparent" ? "sidebar" : void 0,
			visualEffectState: "active",
			backgroundColor: "#00000000"
		} : {},
		webPreferences: {
			preload: join(root, "lib", preload),
			contextIsolation: true,
			sandbox: true,
			nodeIntegration: false,
			webviewTag: primary
		}
	});
	let intervalStart = Date.now();
	let count = 0;
	let failureCount = 0;
	window.webContents.on("console-message", (event, _level, legacyMessage) => {
		const message = typeof legacyMessage === "string" ? legacyMessage : event?.message;
		if (typeof message !== "string") return;
		const level = typeof event?.level === "string" ? event.level : _level;
		const failure = level === "error" || level === 3 || message.includes("[next-ui-error]") || message.includes("slot entry crashed") || message.includes("slot factory occurrence crashed");
		if (!failure && !runtime.preferences.developerLogging) return;
		if (Date.now() - intervalStart >= 1e3) {
			intervalStart = Date.now();
			count = 0;
			failureCount = 0;
		}
		const currentCount = failure ? ++failureCount : ++count;
		if (currentCount > 100) {
			if (currentCount === 101) runtime.diagnostics.record({
				source: "renderer",
				event: "console.rate-limited",
				level: "warn"
			});
			return;
		}
		runtime.diagnostics.record({
			source: "renderer",
			event: "console",
			level: failure ? "error" : level === "warning" || level === 2 ? "warn" : "info",
			message: message.slice(0, 8192),
			developer: !failure,
			fields: { webContentsId: window.webContents.id }
		});
	});
	window.once("ready-to-show", () => {
		const maximize = restored?.maximized === true && !quitting && !window.isDestroyed();
		if (maximize && process.platform !== "darwin") window.maximize();
		show(window);
		if (maximize && process.platform === "darwin") window.maximize();
	});
	applyWindowMaterial(window, runtime.preferences);
	if (primary) {
		window.webContents.on("before-input-event", (event, input) => {
			if (input.type === "keyDown" && input.key === "," && (input.control || input.meta) && !input.alt) {
				event.preventDefault();
				openControls();
			}
		});
		window.on("close", (event) => {
			persistMainWindowState(window);
			if (!quitting && runtime.preferences.closeToTray && native.available) {
				event.preventDefault();
				window.hide();
			} else if (!quitting) {
				event.preventDefault();
				app.quit();
			}
		});
		const schedule = () => scheduleMainWindowState(window);
		window.on("move", schedule).on("resize", schedule).on("maximize", schedule).on("unmaximize", schedule);
	}
	const openExternal = (url) => {
		try {
			if ([
				"https:",
				"http:",
				"mailto:"
			].includes(new URL(url).protocol)) shell.openExternal(url).catch((error) => runtime.report(error));
		} catch {}
	};
	window.webContents.setWindowOpenHandler(({ url }) => {
		openExternal(url);
		return { action: "deny" };
	});
	window.webContents.on("will-navigate", (event, url) => {
		if (!url.startsWith(primary ? "dsh-app://app/" : "dsh-app://shell/index.html")) {
			event.preventDefault();
			openExternal(url);
		}
	});
	window.webContents.on("will-redirect", (event, url) => {
		if (!url.startsWith(primary ? "dsh-app://app/" : "dsh-app://shell/index.html")) event.preventDefault();
	});
	installEditingContextMenu(window.webContents, window, {
		platform: process.platform,
		labels: () => resolveDesktopLocale(windowsLanguage).messages,
		menu: () => Menu
	});
	return window;
}
function openSettings(page = "general") {
	if (quitting) return;
	if (onboarding) {
		openControls("onboarding");
		return;
	}
	if (runtime.recoveryMode || runtime.state().phase === "error") {
		openControls("recovery");
		return;
	}
	pendingSettings = page;
	openMain();
	mainWindow?.webContents.send(IPC.settingsOpen);
}
function openControls(page = "general") {
	if (quitting) return;
	if (page === "general" || page === "tools" || page === "permissions") {
		openSettings(page === "permissions" ? "permissions" : "general");
		return;
	}
	if (page === "recovery" && !runtime.safeMode && !runtime.recoveryMode) {
		rendererRecovery?.stop();
		runtime.recoveryMode = true;
		onboarding = false;
		const previousMain = mainWindow;
		mainWindow = void 0;
		replacingWindow = true;
		try {
			previousMain?.destroy();
		} finally {
			replacingWindow = false;
		}
		const stopping = runtime.backend.stop().finally(() => {
			if (recoveryStopping === stopping) recoveryStopping = void 0;
		});
		recoveryStopping = stopping;
		stopping.catch((error) => runtime.diagnostics.append(String(error), "error"));
		native.refresh();
	}
	const locale = nativeLocale.resolve(runtime.selected, windowsLanguage);
	windowsLanguage = locale;
	const url = `${SHELL_URL}?locale=${locale}&platform=${process.platform}&frame=${auxiliaryWindowHasCustomFrame()}#${page}`;
	const resize = (window) => {
		const creating = page === "create-profile";
		window.setResizable(!creating);
		window.setMinimumSize(creating ? 420 : 680, creating ? 330 : 560);
		window.setSize(creating ? 480 : page === "onboarding" ? 1040 : 850, creating ? 360 : page === "onboarding" ? 720 : 800);
		if (process.platform === "darwin") window.setWindowButtonPosition?.({
			x: 16,
			y: page === "onboarding" ? 18 : 12
		});
		applyWindowMaterial(window, runtime.preferences);
	};
	if (shellWindow && !shellWindow.isDestroyed()) {
		if (page === "onboarding" && shellWindow.webContents.getURL() === url) {
			show(shellWindow);
			return;
		}
		resize(shellWindow);
		shellWindow.loadURL(url).catch((error) => runtime.diagnostics.append(String(error), "error"));
		show(shellWindow);
		return;
	}
	shellWindow = createWindow("preload-shell.cjs");
	resize(shellWindow);
	shellWindow.on("closed", () => {
		shellWindow = void 0;
	});
	shellWindow.loadURL(url).catch((error) => runtime.diagnostics.append(String(error), "error"));
}
function openMain() {
	if (quitting || confirmingDataDirectory) return;
	if (runtime.recoveryMode || runtime.state().phase === "error") {
		openControls("recovery");
		return;
	}
	if (onboarding) {
		openControls("onboarding");
		return;
	}
	if (mainWindow && !mainWindow.isDestroyed()) {
		show(mainWindow);
		return;
	}
	mainWindow = createWindow("preload-app.cjs", true);
	const owner = mainWindow;
	rendererHealthy = false;
	browserGuests.bind(owner, (guest, name) => desktopShortcuts.attachGuest(owner, guest, name));
	desktopShortcuts.attach(owner);
	resetRendererRecovery(owner);
	mainWindow.on("closed", () => {
		if (mainWindow !== owner) return;
		rendererRecovery?.stop();
		mainWindow = void 0;
		onboardingSurfaceActive = false;
	});
	mainWindow.webContents.on("did-start-navigation", (details, _url, inPlace, isMain) => {
		if (!isMain || inPlace || mainWindow !== owner) return;
		const pending = pendingNavigation?.owner === owner ? pendingNavigation : void 0;
		if (pending) pendingNavigation = void 0;
		const cause = pending?.cause ?? "page";
		rendererDocumentId = randomUUID();
		runtime.diagnostics.record({
			source: "renderer",
			event: "renderer.navigation",
			fields: {
				cause,
				initiator: details.initiator ? "frame" : "none"
			}
		});
		rendererRecovery?.navigating(cause);
	});
	mainWindow.webContents.on("did-finish-load", () => {
		if (mainWindow !== owner) return;
		rendererRecovery?.loaded();
		if (runtime.backend.state.phase === "ready") rendererRecovery?.booted();
	});
	mainWindow.webContents.on("render-process-gone", (_event, details) => {
		if (quitting || mainWindow !== owner || owner.isDestroyed() || runtime.recoveryMode) return;
		runtime.diagnostics.record({
			source: "renderer",
			event: "process-gone",
			level: "error",
			fields: {
				reason: details.reason,
				exitCode: details.exitCode
			}
		});
		if (details.reason === "clean-exit") return;
		runtime.memory.incident({
			process: "renderer",
			reason: details.reason,
			exitCode: details.exitCode
		});
		failRenderer(owner, /* @__PURE__ */ new Error(`Renderer: ${details.reason}`));
	});
	mainWindow.webContents.on("preload-error", (_event, _path, error) => failRenderer(owner, error));
	mainWindow.webContents.on("did-fail-load", (_event, code, message, _url, isMain) => {
		if (isMain && code !== -3) failRenderer(owner, new Error(message));
	});
	loadMainDocument(owner, "open").catch((error) => failRenderer(owner, error));
}
function resetRendererRecovery(owner) {
	rendererRecovery?.stop();
	rendererDocumentId = randomUUID();
	rendererRecovery = new NextRendererRecovery({
		available: () => !quitting && !runtime.recoveryMode && mainWindow === owner && !owner.isDestroyed() && runtime.backend.state.phase !== "error",
		reload: () => loadMainDocument(owner, "recovery"),
		exhausted: (detail) => runtime.report(/* @__PURE__ */ new Error(`Renderer recovery exhausted: ${detail}`), rendererHealthy ? "renderer-runtime" : "renderer-startup"),
		healthy: () => {
			rendererHealthy = true;
		},
		record: (event, fields) => runtime.diagnostics.record({
			source: "renderer",
			event,
			fields
		})
	});
}
function failRenderer(owner, error) {
	if (quitting || runtime.recoveryMode || mainWindow !== owner || owner.isDestroyed()) return;
	rendererRecovery?.fail(error instanceof Error ? error.message : String(error));
}
/** Cancelled or retired window navigations are not Host failures. */
async function loadMainDocument(owner, cause) {
	const pending = {
		owner,
		cause
	};
	pendingNavigation = pending;
	try {
		await owner.loadURL(APP_URL);
	} catch (error) {
		if (quitting || owner.isDestroyed() || mainWindow !== owner) return;
		const failure = error;
		if (failure?.code === "ERR_ABORTED" || failure?.errno === -3) return;
		throw error;
	} finally {
		if (pendingNavigation === pending) pendingNavigation = void 0;
	}
}
async function reloadMain() {
	onboardingSurfaceActive = false;
	const existing = mainWindow;
	openMain();
	if (existing && existing === mainWindow && !existing.isDestroyed()) {
		resetRendererRecovery(existing);
		await loadMainDocument(existing, "reload").catch((error) => failRenderer(existing, error));
	}
}
/**
* Raise the window a modal dialog must belong to, and return it as its owner.
*
* Electron's `dialog.*` overloads that take no `BrowserWindow` open an unowned
* top-level window. On Windows that window disables nothing and is ordered
* against every other top-level window, so one click on the app sends the
* prompt behind it leaving no taskbar hint and no visual trace. Every recovery
* action waits on `confirmed()` before it touches a single file, so an occluded
* prompt is indistinguishable from an action that hung forever: no file change,
* no diagnostic line, no error, and no timeout to end it. Owning the dialog
* makes it window-modal, which is what the recovery UI's own busy state already
* promises the user.
*
* Recovery, safe mode and onboarding all run in `shellWindow` while
* `mainWindow` is destroyed, and `shellWindow` is only open while the user is
* looking at it, so preferring it puts the prompt on the surface that raised it.
*
* @returns the owning window, or `undefined` when no window is alive and an
*   unowned dialog is the only thing left.
*/
function raiseDialogOwner() {
	for (const window of [shellWindow, mainWindow]) {
		if (window === void 0 || window.isDestroyed()) continue;
		show(window);
		return window;
	}
}
async function confirmed(message, detail = t("将停止当前 Host，正在运行的任务会被中断。", "This stops the current Host and interrupts running tasks.")) {
	const owner = raiseDialogOwner();
	const options = {
		type: "question",
		title: "DSH NEXT",
		message,
		detail,
		buttons: [t("继续", "Continue"), t("取消", "Cancel")],
		defaultId: 1,
		cancelId: 1
	};
	return (await (owner === void 0 ? dialog.showMessageBox(options) : dialog.showMessageBox(owner, options))).response === 0 && !quitting;
}
/** Say where Profile repair saved the previous configuration before the relaunch opens Desktop setup. */
async function announceRepair(backup) {
	const owner = raiseDialogOwner();
	const options = {
		type: "info",
		title: "DSH NEXT",
		message: t("Profile 已修复", "Profile repaired"),
		detail: t(`修复前的配置已备份到：\n${backup}\n\n应用将重启并打开设置向导，请重新选择插件市场、远程控制等功能。如需撤销修复，可在恢复助手的“快速恢复”页恢复修复前的配置。`, `The previous configuration was backed up to:\n${backup}\n\nThe app will restart and open the setup wizard, where you can choose Market, remote control and other features again. To undo the repair, restore the previous configuration from Quick recovery in the recovery assistant.`),
		buttons: [t("重启", "Restart"), t("在文件夹中显示", "Show in Folder")],
		defaultId: 0,
		cancelId: 0
	};
	if ((await (owner === void 0 ? dialog.showMessageBox(options) : dialog.showMessageBox(owner, options))).response === 1) shell.showItemInFolder(backup);
}
function confirmLanAccess() {
	return confirmed(t("允许局域网 HTTPS 访问？", "Allow LAN access over HTTPS?"), t("同一网络中的设备可以连接。请仅向可信设备分享登录链接，并在设备上核对和信任 CA 证书。", "Devices on your local network can connect. Share login links only with trusted devices, and verify and trust the CA certificate on each device."));
}
async function promptAvailableUpdate() {
	if (quitting || runtime.busy) return;
	const snapshot = updates.snapshot();
	if (snapshot.phase !== "available" || !snapshot.installable) return;
	const owner = raiseDialogOwner();
	const options = {
		type: "info",
		title: "DSH NEXT",
		message: updateLabel(snapshot, windowsLanguage),
		buttons: [t("下载更新", "Download update"), t("稍后", "Later")],
		defaultId: 0,
		cancelId: 1,
		detail: t("下载完成后可一键安装并重启。", "When the download finishes, choose Install and restart.")
	};
	if ((await (owner === void 0 ? dialog.showMessageBox(options) : dialog.showMessageBox(owner, options))).response === 0 && !quitting && !runtime.busy) updates.download();
}
async function openPath(path) {
	const error = await shell.openPath(path);
	if (error) throw new Error(error);
}
async function command(value, source = "app") {
	if (!value || typeof value !== "object" || !("type" in value)) throw new Error("Invalid Next command");
	const input = value;
	const type = input.type;
	if (typeof type !== "string") throw new Error("Invalid Next command");
	if ([
		"safe-mode",
		"normal-mode",
		"recover",
		"restart",
		"rollback",
		"repair-global",
		"restart-app",
		"restart-recovery"
	].includes(type)) {
		if (recoveryRequest !== void 0) return recoveryRequest;
		const request = loggedCommand(input, type, source).finally(() => {
			if (recoveryRequest === request) recoveryRequest = void 0;
		});
		recoveryRequest = request;
		return request;
	}
	return loggedCommand(input, type, source);
}
async function loggedCommand(input, type, source) {
	runtime.actionFailure = "";
	const end = runtime.diagnostics.operation("electron.commands", type, { caller: source }, true);
	try {
		const result = await performCommand(input, type, source);
		end();
		return result;
	} catch (error) {
		end(error);
		throw error;
	}
}
async function performCommand(input, type, source) {
	if (type === "confirm-lan") return confirmLanAccess();
	if (type === "controls") {
		if (input.page !== void 0 && (typeof input.page !== "string" || ![
			"general",
			"profiles",
			"create-profile",
			"tools",
			"recovery",
			"permissions"
		].includes(input.page))) throw new Error("Invalid controls page");
		openControls(input.page);
		return;
	}
	if (type === "close-controls") {
		shellWindow?.close();
		return;
	}
	if (type === "quit") {
		app.quit();
		return;
	}
	if ([
		"check-updates",
		"download-update",
		"install-update"
	].includes(type)) {
		if (!["darwin", "win32"].includes(process.platform) || quitting || runtime.busy) return;
		if (type === "check-updates") updates.check().then(async () => {
			if (source !== "native" || quitting) return;
			const snapshot = updates.snapshot();
			if (snapshot.phase === "available" && snapshot.installable) await promptAvailableUpdate();
			else {
				const owner = raiseDialogOwner();
				const options = {
					type: "info",
					title: "DSH NEXT",
					message: updateLabel(snapshot, windowsLanguage)
				};
				await (owner === void 0 ? dialog.showMessageBox(options) : dialog.showMessageBox(owner, options));
			}
		}).catch((error) => runtime.diagnostics.append(String(error), "warn"));
		else if (type === "download-update") updates.download();
		else {
			if (updates.snapshot().phase !== "ready") return;
			updates.install();
		}
		return;
	}
	if (runtime.busy || quitting) throw new Error(t("另一项操作正在进行，请稍候。", "Another operation is in progress."));
	runtime.busy = true;
	native.refresh();
	try {
		if (type === "onboarding-complete" || type === "onboarding-skip") {
			if (!onboarding || runtime.safeMode || runtime.recoveryMode || input.profile !== runtime.selected) throw new Error("Onboarding is unavailable for this Profile");
			if (type === "onboarding-complete" && (input.browserAccess !== void 0 && typeof input.browserAccess !== "boolean" || input.networkExposure !== void 0 && input.networkExposure !== "loopback" && input.networkExposure !== "lan")) throw new Error("Invalid setup choices");
			runtime.profiles.finishOnboarding(runtime.selected, type === "onboarding-complete" ? {
				features: input.features,
				computerUse: input.computerUse
			} : void 0);
			if (type === "onboarding-complete" && typeof input.browserAccess === "boolean") runtime.writePreferences({
				...runtime.preferences,
				browserAccess: input.browserAccess,
				networkExposure: input.browserAccess ? input.networkExposure ?? runtime.preferences.networkExposure : "loopback"
			});
			onboarding = false;
			shellWindow?.hide();
			runtime.start().catch(() => {});
			openMain();
			shellWindow?.close();
			return;
		}
		if (type === "restart-onboarding") {
			if (runtime.safeMode || runtime.recoveryMode) throw new Error("Onboarding is unavailable in safe or recovery mode");
			if (onboarding) {
				openControls("onboarding");
				return;
			}
			if (!await confirmed(t("重新打开设置向导？", "Reopen the setup wizard?"), t("应用将重启，并带入当前 Profile 的设置。正在运行的任务会中断。", "The app will restart with your current Profile settings selected. Running tasks will be interrupted."))) return;
			relaunch = relaunchArguments(process.argv.slice(1), false, false, true);
			app.quit();
			return;
		}
		if (type === "restart-app" || type === "restart-recovery") {
			if (!await confirmed(type === "restart-recovery" ? t("重启应用并进入恢复模式？", "Restart the application in recovery mode?") : t("现在重启 DSH NEXT？", "Restart DSH NEXT now?"), type === "restart-recovery" ? t("应用将先打开恢复助手，暂不加载当前 Profile 和插件。正在运行的任务会中断。", "The recovery assistant will open before loading the current Profile and plugins. Running tasks will be interrupted.") : void 0)) return;
			relaunch = relaunchArguments(process.argv.slice(1), type === "restart-recovery", runtime.safeMode);
			app.quit();
			return;
		}
		if (type === "create") {
			runtime.profiles.create(profileName(input.name));
			return;
		}
		if (type === "delete") {
			const name = profileName(input.name);
			if (name === runtime.selected || name === "desktop") throw new Error(t("不能移除当前或默认 Profile。", "Cannot remove the active or default Profile."));
			if (await confirmed(t(`移除 Profile「${name}」？`, `Remove Profile “${name}”?`), t("其文件将移入恢复备份目录。共享的会话和设置会保留。", "Its files move to recovery backups. Shared sessions and settings are retained."))) runtime.recovery.removeProfile(name, runtime.selected);
			return;
		}
		if (type === "reload") {
			if (runtime.recoveryMode || onboarding) {
				openMain();
				return;
			}
			await reloadMain();
			return;
		}
		if (type === "devtools") {
			openMain();
			(runtime.recoveryMode || onboarding ? shellWindow : mainWindow).webContents.toggleDevTools();
			return;
		}
		if (type === "recovery-action") {
			await recoveryAction(input);
			return;
		}
		if (type === "terminal") {
			await prepareHostEnvironment();
			const target = runtime.terminalTarget(source === "shell");
			openDesktopTerminal({
				platform: process.platform,
				appExecutable: process.execPath,
				dshBootstrapPath: join(root, "lib", "desktop-cli.js"),
				pnpmBinPath: bundledPnpmEntry(NEXT_PACKAGE),
				electronVersion: process.versions.electron,
				...target,
				productVersion: version,
				stateDir: desktopTerminalStateDirectory(join(target.homeDir, "electron-user-data"), target.profileName),
				spawn,
				onLaunchError: (error) => runtime.report(error)
			});
			return;
		}
		if (type === "open-home") {
			await openPath(home);
			return;
		}
		if (type === "open-profile") {
			await openPath(runtime.profiles.directory(runtime.selected));
			return;
		}
		if (type === "open-logs") {
			runtime.diagnostics.flush();
			await openPath(dirname(runtime.diagnostics.file));
			return;
		}
		if (type === "open-backups") {
			privateDirectory(runtime.recovery.directory);
			await openPath(runtime.recovery.directory);
			return;
		}
		if (type === "change-data-directory" || type === "backup-data-directory") {
			if (runtime.safeMode || runtime.recoveryMode) throw new Error(t("安全模式和恢复模式下请使用恢复助手。", "In Safe Mode or recovery mode, use the recovery assistant."));
			if (type === "change-data-directory") await changeDataDirectory(false);
			else await backupDataDirectory();
			return;
		}
		if (type === "open-browser" || type === "open-lan") {
			await shell.openExternal(runtime.browserLink(type === "open-lan"));
			return;
		}
		if (type === "copy-browser" || type === "copy-lan") {
			clipboard.writeText(runtime.browserLink(type === "copy-lan"));
			return;
		}
		if (type === "open-browser-url" || type === "copy-browser-url") {
			const url = runtime.resolveBrowserLink(input.url);
			if (type === "copy-browser-url") clipboard.writeText(url);
			else await shell.openExternal(url);
			return;
		}
		if (type === "export-ca" || type === "diagnostics") {
			const certificate = runtime.lan?.caCertificate;
			if (type === "export-ca" && !certificate) throw new Error("LAN certificate is unavailable");
			const owner = raiseDialogOwner();
			const options = {
				title: type === "export-ca" ? t("导出局域网 CA 证书", "Export LAN CA certificate") : t("导出诊断（分享前请检查内容）", "Export diagnostics (review before sharing)"),
				defaultPath: type === "export-ca" ? "dsh-desktop-next-ca.crt" : `dsh-desktop-next-diagnostics-${Date.now()}.json`,
				filters: [{
					name: type === "export-ca" ? "CA certificate" : "Diagnostics",
					extensions: [type === "export-ca" ? "crt" : "json"]
				}]
			};
			const result = await (owner === void 0 ? dialog.showSaveDialog(options) : dialog.showSaveDialog(owner, options));
			if (!result.canceled && result.filePath && !quitting) {
				if (type === "export-ca") await writeFile(result.filePath, certificate, { mode: 384 });
				else await runtime.diagnostics.exportTo(result.filePath, state());
				if (type === "diagnostics") diagnosticsFile = result.filePath;
			}
			return;
		}
		if (type === "preferences") {
			if (runtime.safeMode) throw new Error(t("安全模式使用固定的桌面设置。", "Safe Mode uses fixed desktop settings."));
			const preferences = parsePreferences(input.preferences);
			if (portsChanged(runtime.preferences, preferences)) {
				if (!await confirmed(t("应用访问设置并重启 Host？", "Apply access settings and restart the Host?"), preferences.browserAccess && preferences.networkExposure === "lan" ? t("开启后，同一网络中的设备可通过 HTTPS 访问。登录链接可授予访问权限，请仅与可信设备共享。正在运行的任务会被中断。", "Devices on your network can connect over HTTPS. Login links grant access; share only with trusted devices. Running tasks will be interrupted.") : void 0)) return;
				rendererRecovery?.stop();
				await runtime.restart(() => runtime.writePreferences(preferences));
				if (mainWindow) await reloadMain();
			} else {
				if (preferences.browserAccess && preferences.networkExposure === "lan" && (!runtime.preferences.browserAccess || runtime.preferences.networkExposure !== "lan") && !await confirmLanAccess()) return;
				await runtime.applyPreferences(preferences);
			}
			for (const window of [mainWindow, shellWindow]) if (window && !window.isDestroyed()) applyWindowMaterial(window, preferences);
			return;
		}
		if (![
			"switch",
			"features",
			"restart",
			"recover",
			"safe-mode",
			"normal-mode",
			"rollback",
			"repair-global"
		].includes(String(type))) throw new Error("Invalid Next command");
		const next = type === "switch" ? profileName(input.name) : runtime.selected;
		if (type === "switch" && next === runtime.selected && !runtime.safeMode && !runtime.recoveryMode && runtime.backend.state.phase === "ready") return;
		if (type === "switch" && !runtime.profiles.selectable(next)) throw new Error("Profile is unavailable for Desktop Next");
		const features = type === "features" ? parseFeatures(input.features) : void 0;
		if (type === "rollback" && !runtime.recovery.latest(next)) throw new Error(t("尚无成功启动的配置备份。", "No successful-start configuration is available."));
		if (!await confirmed({
			switch: t(`切换到 Profile「${next}」并重启应用？`, `Switch to Profile “${next}” and restart the application?`),
			recover: t("备份并修复当前 Profile？只保留内置插件，其他插件（包括官方可选插件）、远控和市场都会停用，Profile 补丁中的设置会恢复默认。完成后应用将重启并打开设置向导。", "Back up and repair this Profile? Only built-in plugins stay enabled: other plugins, official optional ones included, remote control and Market are turned off, and settings in the Profile patch return to their defaults. The app then restarts and opens the setup wizard."),
			"repair-global": t("备份并停用全局补丁？这会影响所有 Next Profile。", "Back up and disable the global patch? This affects every Next Profile."),
			rollback: t("恢复最近成功启动的 Profile 配置？当前配置会先备份。", "Restore the last successful-start Profile configuration? The current configuration will be backed up first."),
			"safe-mode": t("在独立的临时环境中进入安全模式？原有数据和配置会保留。", "Enter safe mode in a separate temporary environment? Existing data and configuration are preserved."),
			"normal-mode": t("退出安全模式并重启原 Profile？", "Exit Safe Mode and restart the original Profile?")
		}[String(type)] ?? t("重启工作环境以应用更改？", "Restart the environment to apply this change?"))) return;
		if (type === "switch") {
			runtime.profiles.select(next);
			relaunch = relaunchArguments(process.argv.slice(1), false, false);
			app.quit();
			return;
		}
		if (type === "safe-mode" || type === "normal-mode") {
			if (type === "safe-mode" && runtime.safeMode) return;
			rendererRecovery?.stop();
			await recoveryStopping;
			await runtime.backend.stop();
			relaunch = relaunchArguments(process.argv.slice(1), false, type === "safe-mode");
			app.quit();
			return;
		}
		rendererRecovery?.stop();
		onboarding = false;
		await recoveryStopping;
		if (type === "recover") {
			await runtime.backend.stop();
			const backup = await runtime.profiles.recover(next);
			runtime.diagnostics.append(`Repaired Profile ${next}; its previous configuration is in ${backup}`);
			await announceRepair(backup);
			relaunch = relaunchArguments(process.argv.slice(1), false, false);
			app.quit();
			return;
		}
		const change = async () => {
			if (type === "rollback") await restoreCheckpoint();
			if (type === "repair-global") runtime.recovery.repairGlobalPatch();
			if (features) runtime.profiles.setFeatures(next, features);
		};
		if (runtime.safeMode) {
			await runtime.backend.stop();
			await change();
			relaunch = relaunchArguments(process.argv.slice(1), false, type === "restart");
			app.quit();
			return;
		}
		await runtime.restart(change);
		await reloadMain();
		if (!runtime.safeMode && mainWindow) shellWindow?.close();
	} catch (error) {
		if ([
			"recovery-action",
			"change-data-directory",
			"backup-data-directory"
		].includes(type) || onboarding && (type === "onboarding-complete" || type === "onboarding-skip")) runtime.diagnostics.append(String(error), "error");
		else runtime.report(error);
		throw error;
	} finally {
		runtime.busy = false;
		native.refresh();
	}
}
async function restoreCheckpoint(id) {
	await runtime.recovery.restore(runtime.selected, id);
	try {
		await runRecoveryPlugin(["install", "--no-frozen-lockfile"]);
	} catch (error) {
		throw new Error(t("配置已恢复，但插件依赖安装失败。请检查以下错误并重试恢复：", "Configuration was restored, but plugin dependencies could not be installed. Check the error and retry recovery:") + "\n" + String(error));
	}
	recoveryNotice = {
		tone: "success",
		title: t("检查点已恢复", "Checkpoint restored"),
		body: runtime.safeMode ? t("配置和所需插件依赖已恢复。请点击“退出安全模式并重启”使恢复生效。", "Configuration and required plugin dependencies have been restored. Choose “Exit Safe Mode and Restart” to apply them.") : t("配置和所需插件依赖已恢复。请点击“退出并重启”使恢复生效。", "Configuration and required plugin dependencies have been restored. Choose “Quit and restart” to apply them.")
	};
	runtime.diagnostics.append(`Recovered checkpoint ${id} for ${runtime.selected}`);
}
/** Reconcile dependencies through the same official CLI for recovery install and removal. */
async function runRecoveryPlugin(args) {
	await prepareHostEnvironment();
	const directory = runtime.profiles.directory(runtime.selected);
	const runner = recoveryRunner = createPackageRunner({
		command: process.execPath,
		args: [],
		env: { ELECTRON_RUN_AS_NODE: "1" }
	}, directory);
	let output = "";
	try {
		const operation = runner.runPlugin(args, directory, AbortSignal.timeout(12e4));
		const append = (chunk) => {
			output = (output + String(chunk)).slice(-16384);
			runtime.diagnostics.hostChunk(String(chunk));
		};
		operation.stdout.on("data", append);
		operation.stderr.on("data", append);
		const result = await operation.done;
		if (result.exitCode !== 0) throw new Error(maskSecrets(`Plugin ${args[0]} failed (exit ${result.exitCode}): ${output}`));
	} finally {
		await runner.dispose();
		if (recoveryRunner === runner) recoveryRunner = void 0;
	}
}
async function recoveryAction(input) {
	if (!runtime.recoveryMode && !runtime.safeMode) throw new Error("Open recovery before changing its configuration");
	const action = input.action;
	recoveryNotice = void 0;
	if (action === "restart") {
		if (!await confirmed(runtime.safeMode ? t("退出安全模式并重启？", "Exit Safe Mode and restart?") : t("现在重启 DSH NEXT？", "Restart DSH NEXT now?"), runtime.safeMode ? t("应用将返回原 Profile，并移除临时环境。临时数据不会保留，正在运行的任务会中断。", "The app will return to the original Profile and remove the temporary environment. Temporary data will not be kept, and running tasks will be interrupted.") : t("应用将退出恢复助手，重新启动原 Profile。", "The app will leave the recovery assistant and restart the original Profile."))) return;
		relaunch = relaunchArguments(process.argv.slice(1), false, false);
		app.quit();
		return;
	}
	const directory = runtime.profiles.directory(runtime.selected);
	const files = {
		"open-settings-document": join(home, "settings.yaml"),
		"open-profile-patch": join(directory, "cordis.patch.yml"),
		"open-profile-manifest": join(directory, "package.json")
	};
	if (typeof action !== "string") throw new Error("Invalid recovery action");
	if (Object.hasOwn(files, action)) {
		await openPath(files[action]);
		return;
	}
	if (action === "show-diagnostics") {
		if (!diagnosticsFile) throw new Error("No exported diagnostics");
		shell.showItemInFolder(diagnosticsFile);
		return;
	}
	if (action === "show-failure-report") {
		const file = await runtime.failureReportFile();
		if (file === void 0) throw new Error(t("诊断报告未能保存，请改为导出诊断信息。", "The diagnostic report could not be saved. Export diagnostics instead."));
		try {
			await access(file);
		} catch {
			throw new Error(t(`找不到诊断报告：${file}`, `The diagnostic report is no longer available: ${file}`));
		}
		shell.showItemInFolder(file);
		return;
	}
	if (action === "open-checkpoint" || action === "preview-checkpoint") {
		const checkpoint = typeof input.id === "string" ? runtime.recovery.find(runtime.selected, input.id) : void 0;
		if (!checkpoint) throw new Error("Recovery checkpoint is no longer available");
		if (action === "open-checkpoint") {
			await openPath(checkpoint.directory);
			return;
		}
		const undo = runtime.recovery.repairBackup(runtime.selected)?.id === checkpoint.id;
		if (!await confirmed(undo ? t("撤销修复，恢复修复前的配置？", "Undo the repair and restore the previous configuration?") : t("还原所选配置备份？", "Restore the selected configuration backup?"), undo ? t(`修复时间：${checkpoint.created}。当前配置会先备份，然后恢复修复前的配置并安装所需插件依赖；导致故障的插件可能随之恢复。共享数据不会回滚。`, `Repaired: ${checkpoint.created}. Current configuration will be backed up, then the configuration from before the repair and its required plugin dependencies will be restored; a plugin that caused the failure may return with it. Shared data is not rolled back.`) : t(`备份时间：${checkpoint.created}。当前配置会先备份，然后恢复配置并安装所需插件依赖。共享数据不会回滚。`, `Saved: ${checkpoint.created}. Current configuration will be backed up, then the saved configuration and required plugin dependencies will be restored. Shared data is not rolled back.`))) return;
		await recoveryStopping;
		if (!runtime.safeMode) await runtime.backend.stop();
		await restoreCheckpoint(checkpoint.id);
		return;
	}
	if (action === "preview-disable" || action === "preview-enable") {
		const enable = action === "preview-enable";
		const bundle = runtime.recovery.bundles(runtime.selected).find((item) => item.bundleId === input.id);
		if (!bundle || bundle.toggle !== (enable ? "enable" : "disable") || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(bundle.packageName)) throw new Error("This plugin cannot be changed");
		await recoveryStopping;
		if (!runtime.safeMode) await runtime.backend.stop();
		await runtime.recovery.setBundleSelected(runtime.selected, bundle.packageName, enable);
		recoveryNotice = {
			tone: "success",
			title: bundle.packageName,
			body: enable ? t("插件已重新启用。请点击“退出并重启”使其生效。", "The plugin is enabled again. Choose “Quit and restart” to apply it.") : t("插件已禁用，安装内容仍然保留。请点击“退出并重启”使其生效。", "The plugin is disabled and still installed. Choose “Quit and restart” to apply it.")
		};
		runtime.diagnostics.append(`${enable ? "Enabled" : "Disabled"} bundle for ${runtime.selected}`);
		return;
	}
	if (action === "preview-uninstall") {
		const bundle = runtime.recovery.bundles(runtime.selected).find((item) => item.bundleId === input.id);
		if (!bundle || bundle.action !== "uninstall" || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(bundle.packageName)) throw new Error("This bundle cannot be uninstalled");
		if (!await confirmed(t(`卸载插件「${bundle.packageName}」？`, `Uninstall “${bundle.packageName}”?`), t("先备份当前 Profile 配置，然后卸载所选插件。", "Back up the Profile configuration, then uninstall the selected plugin."))) return;
		await recoveryStopping;
		if (!runtime.safeMode) await runtime.backend.stop();
		runtime.recovery.backup(runtime.selected, "before-plugin-uninstall");
		await runRecoveryPlugin(["remove", bundle.packageName]);
		return;
	}
	if (action === "begin-change-data-directory" || action === "restore-default-data-directory") {
		await changeDataDirectory(action === "restore-default-data-directory");
		return;
	}
	if (action === "factory-reset") {
		if (!await confirmed(t("重置当前数据目录并重启？", "Reset the current data directory and restart?"), t("Profile、会话、设置和凭据将移入 recovery 备份目录，应用将重新初始化。", "Profiles, sessions, settings and credentials will move to a recovery backup. The app will initialize again."))) return;
		await recoveryStopping;
		await runtime.backend.stop();
		runtime.diagnostics.flush();
		runtime.recovery.factoryReset();
		relaunch = relaunchArguments(process.argv.slice(1), false, false);
		app.quit();
		return;
	}
	throw new Error("Unknown recovery action");
}
function rememberLaunchDirectory(directory) {
	try {
		rememberDataDirectory(locationRoot, directory);
	} catch (error) {
		runtime.diagnostics.append(`Data directory record: ${String(error)}`, "warn");
	}
}
/**
* Ask before a launch sets up another data directory than the last one used. An in-app relaunch
* inherits the environment of the process that started it, and a removed choice falls back to the
* variable or the default, so either could otherwise start over in a new directory silently.
* @returns false when this process ends to reopen the last directory or to quit.
*/
async function confirmDataDirectory() {
	if (safeModeRequested || dataLocation.error) return true;
	const change = dataDirectoryChange(locationRoot, home, environmentHome);
	if (change === void 0) {
		rememberLaunchDirectory(home);
		return true;
	}
	const { previous, reachable } = change;
	const source = {
		desktop: t("应用内选择", "chosen in the app"),
		environment: DATA_DIRECTORY_VARIABLE,
		default: t("默认目录", "default")
	}[dataSource];
	if (process.platform === "darwin") app.focus({ steal: true });
	confirmingDataDirectory = true;
	const { response } = await dialog.showMessageBox({
		type: "warning",
		title: "DSH NEXT",
		noLink: true,
		message: t("数据目录与上次不同", "The data directory differs from the last launch"),
		detail: [
			t(`本次：${home}（${source}）`, `This launch: ${home} (${source})`),
			t(`上次：${previous}${reachable ? "" : "（当前无法访问）"}`, `Last launch: ${previous}${reachable ? "" : " (unavailable now)"}`),
			"",
			t("继续使用本次目录不会移动或删除上次目录中的数据。", "Continuing does not move or delete data in the last directory."),
			...reachable ? [] : [t("上次的目录如在移动硬盘或网络位置上，请先连接，再选择“改用上次的目录”。", "If the last directory is on a removable or network drive, connect it before choosing “Use the last directory”.")],
			t(`如果刚修改了 ${DATA_DIRECTORY_VARIABLE}：应用内重启会沿用修改前的环境变量，请完全退出后再重新打开。`, `If you just changed ${DATA_DIRECTORY_VARIABLE}: an in-app restart keeps the previous environment, so quit completely and open the app again.`)
		].join("\n"),
		buttons: [
			t("改用上次的目录", "Use the last directory"),
			t("继续使用本次目录", "Continue with this directory"),
			t("退出", "Quit")
		],
		defaultId: 0,
		cancelId: 2
	}).finally(() => {
		confirmingDataDirectory = false;
	});
	if (response === 1) {
		rememberLaunchDirectory(home);
		return true;
	}
	if (response === 0) {
		atomicJson(locationFile, { home: previous });
		rememberLaunchDirectory(previous);
		relaunchApp(app, process.argv.slice(1));
	}
	runtime.diagnostics.end(true);
	app.exit(0);
	return false;
}
/** Choose another data directory, or forget the in-app choice, for the next launch. No data moves. */
async function changeDataDirectory(restoreDefault) {
	let target = dataLocation.fallback;
	if (!restoreDefault) {
		const owner = raiseDialogOwner();
		const options = { properties: ["openDirectory", "createDirectory"] };
		const choice = await (owner === void 0 ? dialog.showOpenDialog(options) : dialog.showOpenDialog(owner, options));
		const selected = choice.canceled ? void 0 : choice.filePaths[0];
		if (!selected || !isAbsolute(selected)) return;
		target = selected;
	}
	const destination = validateDataDirectory(target, home, dataLocation.fallback);
	if (sameDirectory(destination, home) && !dataLocation.error) {
		if (restoreDefault && dataSource === "desktop") {
			rmSync(locationFile, { force: true });
			dataSource = environmentHome ? "environment" : "default";
		}
		return;
	}
	if (!await confirmed(t("切换数据目录并重启？", "Change data directory and restart?"), t(`新目录：${destination}。原目录的数据会保留，不会自动迁移。`, `New directory: ${destination}. Existing data remains in its original directory and is not moved.`))) return;
	if (restoreDefault) rmSync(locationFile, { force: true });
	else atomicJson(locationFile, { home: destination });
	rememberLaunchDirectory(destination);
	relaunch = relaunchArguments(process.argv.slice(1), false, false);
	app.quit();
}
/** Copy the data directory while the Host is stopped; the Host starts again even when copying fails. */
async function backupDataDirectory() {
	const owner = raiseDialogOwner();
	const options = {
		title: t("选择备份保存位置", "Choose where to save the backup"),
		properties: ["openDirectory", "createDirectory"]
	};
	const choice = await (owner === void 0 ? dialog.showOpenDialog(options) : dialog.showOpenDialog(owner, options));
	const parent = choice.canceled ? void 0 : choice.filePaths[0];
	if (!parent || !isAbsolute(parent)) return;
	const destination = join(parent, backupDirectoryName(home));
	try {
		assertBackupLocation(home, destination);
	} catch {
		throw new Error(t("请选择当前数据目录以外的位置。", "Choose a location outside the current data directory."));
	}
	if (!await confirmed(t("备份当前数据目录？", "Back up the current data directory?"), t(`备份位置：${destination}\n复制期间工作环境会暂停，正在运行的任务会中断，完成后自动恢复。electron-user-data 中的窗口和浏览器缓存不会备份。`, `Backup location: ${destination}\nThe environment pauses while copying, interrupting running tasks, and resumes afterwards. Window and browser caches in electron-user-data are not included.`))) return;
	rendererRecovery?.stop();
	await recoveryStopping;
	let failure;
	const progress = (value) => {
		if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setProgressBar(value);
	};
	progress(2);
	try {
		await runtime.restart(async () => {
			try {
				await copyDataDirectory(home, destination);
			} catch (error) {
				failure = error instanceof Error ? error : new Error(String(error));
			}
		});
	} finally {
		progress(-1);
	}
	await reloadMain();
	if (failure) throw new Error(t("备份未完成：", "Backup failed: ") + failure.message);
	runtime.diagnostics.append(`Backed up the data directory to ${destination}`);
	const done = raiseDialogOwner();
	const notice = {
		type: "info",
		title: "DSH NEXT",
		message: t("数据目录已备份", "Data directory backed up"),
		detail: destination,
		buttons: [t("在文件夹中显示", "Show in folder"), t("完成", "Done")],
		defaultId: 1,
		cancelId: 1,
		noLink: true
	};
	(done === void 0 ? dialog.showMessageBox(notice) : dialog.showMessageBox(done, notice)).then((result) => {
		if (result.response === 0) shell.showItemInFolder(destination);
	}).catch((error) => runtime.diagnostics.append(String(error), "warn"));
}
/**
* Finder and Dock launches carry no login-shell exports, so the Host, its terminals and tool subprocesses
* would run with the minimal system PATH and no locale. Recover the exports the Desktop variants
* recover, then make sure a UTF-8 locale is set, as Terminal.app does for the shells it opens.
* Probe the system proxy in parallel: a proxy client's "system proxy" switch sets no environment
* variable, and only Chromium can evaluate it (PAC/WPAD included). The Host starts only after both,
* so the startup record carries how long each took.
*/
function prepareHostEnvironment() {
	return hostEnvironmentReady ??= (async () => {
		const configuration = readSystemProxyConfiguration(process.platform);
		const [shell, proxy, proxyConfiguration] = await Promise.all([
			shellEnvironment ?? readShellEnvironment(),
			timed(probeSystemProxy(session.defaultSession, void 0, configuration)),
			configuration
		]);
		for (const [name, value] of Object.entries(shell.value.updates)) process.env[name] = value;
		const fallbackLocale = ensureUtf8Locale(process.env, process.platform, app.getPreferredSystemLanguages());
		systemProxy = proxy.value;
		runtime.diagnostics.record({
			source: "desktop",
			event: "shell-environment.resolved",
			fields: {
				source: shell.value.source,
				fallbackReason: shell.value.fallbackReason ?? null,
				recovered: Object.keys(shell.value.updates).join(" ") || null,
				fallbackLocale: fallbackLocale ?? null,
				shellMs: shell.ms,
				systemProxyMs: proxy.ms,
				systemProxyConfiguration: proxyConfiguration
			}
		});
	})();
}
function readShellEnvironment() {
	return timed(resolveDesktopShellEnvironment({
		environment: process.env,
		home: app.getPath("home"),
		isPackaged: app.isPackaged,
		platform: process.platform
	}));
}
function timed(operation) {
	const started = performance.now();
	return operation.then((value) => ({
		value,
		ms: Math.round(performance.now() - started)
	}));
}
async function main() {
	await app.whenReady();
	if (quitting) return;
	let inputRevision = 0;
	let inputBlocked = false;
	desktopShortcuts = installDesktopShortcuts(() => mainWindow, app.getPath("userData"), process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux", () => {}, () => {
		const blocked = runtime.recoveryMode || onboarding || onboardingSurfaceActive;
		if (blocked !== inputBlocked) {
			inputBlocked = blocked;
			inputRevision++;
		}
		return {
			revision: inputRevision,
			blocked
		};
	});
	app.once("will-quit", () => {
		desktopShortcuts?.dispose();
	});
	if (process.platform === "darwin" && !app.isPackaged) app.dock?.setIcon(join(root, "build", "app-icon-mac.png"));
	windowsLanguage = preferredDesktopLocale([...app.getPreferredSystemLanguages(), app.getLocale()]);
	if (!await confirmDataDirectory()) return;
	protocol.handle("dsh-app", async (request) => {
		const url = new URL(request.url);
		if (url.hostname === "shell") {
			const response = await serveWebDocument(request, join(root, "lib/native-ui"), false);
			response.headers.set("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-src 'none'; base-uri 'none'");
			return response;
		}
		if (url.hostname !== "app") return new Response(null, { status: 404 });
		if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname.startsWith("/assets/") || ["/favicon.svg", "/manifest.webmanifest"].includes(url.pathname)) return serveWebDocument(request, webRoot, true, { home, profile: runtime.selected, safeMode: runtime.safeMode, recoveryMode: runtime.recoveryMode });
		const auth = runtime.auth;
		if (!runtime.backend.host || !auth) return new Response(null, { status: 503 });
		return forwardWebRequest(request, auth.url, auth.cookie, auth.token);
	});
	ipcMain.handle(IPC.boot, async (event) => {
		assertSender(event, mainWindow, APP_URL);
		const documentId = rendererDocumentId;
		await runtime.startup;
		if (!runtime.backend.host || !runtime.auth) throw new Error("Next Host is unavailable");
		const injections = await runtime.injections();
		assertSender(event, mainWindow, APP_URL);
		if (documentId !== rendererDocumentId || quitting || runtime.recoveryMode) throw new Error("Next document was superseded");
		rendererRecovery?.booted();
		return {
			injections,
			streamBaseUrl: new URL(runtime.auth.url).origin,
			documentId,
			profile: runtime.selected
		};
	});
	ipcMain.handle(IPC.rendererStatus, (event, documentId, status) => {
		assertSender(event, mainWindow, APP_URL);
		if (!isDesktopRendererStatus(status)) throw new Error("Invalid renderer status");
		if (documentId !== rendererDocumentId || !documentId) return;
		rendererRecovery?.report(status);
	});
	ipcMain.handle(IPC.failed, (event, message, documentId) => {
		assertSender(event, mainWindow, APP_URL);
		if (typeof message !== "string") throw new Error("Invalid boot error");
		if (documentId !== void 0 && documentId !== rendererDocumentId) return;
		failRenderer(mainWindow, new Error(message.slice(0, 4096)));
	});
	ipcMain.handle(IPC.state, (event) => {
		assertDesktopSender(event);
		return state();
	});
	ipcMain.handle("dsh-desktop:setup-onboarding", async (event, request) => {
		assertSender(event, mainWindow, APP_URL);
		if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("Invalid setup request");
		const value = request;
		if (value.action === "active") {
			if (typeof value.active !== "boolean") throw new Error("Invalid onboarding state");
			onboardingSurfaceActive = value.active;
			return;
		}
		if (value.action === "read") {
			if (runtime.safeMode || runtime.recoveryMode) return null;
			const features = runtime.profiles.features(runtime.selected);
			return {
				required: onboarding,
				edition: "next",
				profile: runtime.selected,
				accountPending: !onboarding && runtime.profiles.accountSetupPending(runtime.selected),
				computerUse: runtime.profiles.computerUseEnabled(runtime.selected),
				...features.officialMarket ? { officialMarket: true } : {},
				input: {
					appVersion: version,
					profileName: runtime.selected,
					platform: process.platform,
					mode: "compatibility",
					macosMaterial: "off",
					windowsMaterial: "off",
					openBrowser: runtime.preferences.browserAccess,
					networkExposure: runtime.preferences.browserAccess ? runtime.preferences.networkExposure : "loopback",
					market: features.market ? "community-market" : features.dshMarket ? "dsh-market" : features.officialMarket ? "official-market" : "disabled",
					aaEnabled: features.remoteControl,
					notifications: {
						enabled: true,
						notifyOnTurnCompletion: true,
						notifyOnTurnFailure: true,
						notifyOnJobCompletion: false,
						notifyOnJobFailure: false,
						notifyOnScheduleCompletion: true,
						notifyOnScheduleFailure: true
					}
				}
			};
		}
		if (value.action === "dismiss-account") {
			if (onboarding || value.profile !== runtime.selected || runtime.safeMode || runtime.recoveryMode) throw new Error("Account setup is unavailable");
			runtime.profiles.dismissAccountSetup(runtime.selected);
			return;
		}
		throw new Error("Setup is unavailable");
	});
	ipcMain.handle(IPC.settingsTake, (event) => {
		assertSender(event, mainWindow, APP_URL);
		const page = pendingSettings;
		pendingSettings = void 0;
		return page;
	});
	ipcMain.handle(IPC.browserLinks, (event) => {
		assertDesktopSender(event);
		return runtime.browserLinks();
	});
	ipcMain.handle(IPC.browserAcquire, (event, workspace) => {
		assertSender(event, mainWindow, APP_URL);
		if (quitting) throw new Error("Desktop browser is unavailable");
		return browserGuests.acquire(event.sender, workspace);
	});
	ipcMain.handle(IPC.browserRelease, (event, lease) => {
		assertSender(event, mainWindow, APP_URL);
		return browserGuests.release(event.sender, lease);
	});
	ipcMain.handle(IPC.permissionQuery, (event, permission) => {
		assertDesktopSender(event);
		return permissions.query(permission);
	});
	const permissionGesture = async (event) => {
		assertDesktopSender(event);
		if (!event.sender.isFocused() || !await event.sender.executeJavaScript("navigator.userActivation.isActive")) throw new Error("Desktop permission requests require a focused window and user gesture");
		assertDesktopSender(event);
	};
	ipcMain.handle(IPC.permissionRequest, async (event, permission) => {
		await permissionGesture(event);
		return permissions.request(permission);
	});
	ipcMain.handle(IPC.permissionSettings, async (event, permission) => {
		await permissionGesture(event);
		await permissions.openSettings(permission);
	});
	installMediaPermissions(session.defaultSession, {
		window: () => mainWindow,
		language: () => windowsLanguage,
		warn: (error) => runtime.diagnostics.append(String(error), "warn")
	});
	installAppDownloads(session.defaultSession, {
		window: () => mainWindow,
		language: () => windowsLanguage,
		downloads: () => app.getPath("downloads"),
		warn: (error) => runtime.diagnostics.append(String(error), "warn"),
		forward: async (url) => {
			const auth = runtime.auth;
			if (!runtime.backend.host || !auth) return new Response(null, { status: 503 });
			return forwardWebRequest(new Request(url, { headers: { [NATIVE_ACCESS_HEADER]: auth.token } }), auth.url, auth.cookie, auth.token);
		}
	});
	ipcMain.handle(IPC.material, (event) => {
		assertSender(event, mainWindow, APP_URL);
		return windowMaterial(runtime.preferences);
	});
	ipcMain.handle(IPC.command, (event, value) => {
		assertDesktopSender(event);
		return command(value, event.sender === shellWindow?.webContents ? "shell" : "app");
	});
	let picking;
	ipcMain.handle(IPC.directory, (event) => {
		assertSender(event, mainWindow, APP_URL);
		const window = mainWindow;
		show(window);
		picking ??= dialog.showOpenDialog(window, { properties: ["openDirectory", "createDirectory"] }).then((result) => result.canceled ? null : result.filePaths[0] ?? null).finally(() => {
			picking = void 0;
		});
		return picking;
	});
	session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ["<all_urls>"] }, (details, callback) => {
		const auth = runtime.auth;
		const owner = mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : void 0;
		const requestHeaders = appRequestHeaders(details, owner, auth?.token);
		const target = new URL(details.url);
		if (target.protocol !== "ws:" || target.hostname !== "127.0.0.1" || !auth || details.webContentsId !== owner?.id) return callback({ requestHeaders });
		const host = new URL(auth.url);
		if (target.host !== host.host) return callback({ requestHeaders });
		const headers = Object.fromEntries(Object.entries(requestHeaders).map(([key, value]) => [key.toLowerCase(), value]));
		if (headers.origin !== "dsh-app://app") return callback({ cancel: true });
		callback({ requestHeaders: {
			...headers,
			origin: host.origin,
			cookie: auth.cookie,
			[NATIVE_ACCESS_HEADER]: auth.token,
			"sec-fetch-site": "same-origin"
		} });
	});
	ipcMain.on(IPC.nativeThemeSet, (event, source) => {
		try {
			assertSender(event, mainWindow, APP_URL);
		} catch {
			return;
		}
		if (source === "light" || source === "dark" || source === "system") nativeTheme.themeSource = source;
	});
	ipcMain.on(IPC.locale, (event, language) => {
		try {
			assertSender(event, mainWindow, APP_URL);
		} catch {
			return;
		}
		if (typeof language !== "string" || !/^[a-zA-Z]+(?:-[a-zA-Z0-9]+)*$/u.test(language)) return;
		if (!runtime.safeMode) try {
			nativeLocale.remember(runtime.selected, language);
		} catch (error) {
			runtime.diagnostics.append(String(error), "warn");
		}
		if (language === windowsLanguage) return;
		windowsLanguage = language;
		native.refresh();
	});
	ipcMain.handle(IPC.localeRead, (event) => {
		assertSender(event, mainWindow, APP_URL);
		return {
			languages: [...app.getPreferredSystemLanguages(), app.getLocale()],
			preference: null
		};
	});
	nativeTheme.on("updated", () => {
		for (const window of [mainWindow, shellWindow]) if (window && !window.isDestroyed()) applyWindowMaterial(window, runtime.preferences);
	});
	runtime.safeMode = safeModeRequested;
	runtime.recoveryMode = process.argv.includes(RECOVERY_ARGUMENT);
	runtime.initialize();
	runtime.memory.start();
	prepareHostEnvironment();
	if (dataLocation.error && !runtime.safeMode) {
		runtime.recoveryMode = true;
		runtime.report(dataLocation.error, "runtime-bootstrap");
	}
	if (app.isPackaged) try {
		verifyPackagedRuntimeIdentity(join(root, DESKTOP_RUNTIME_FILE), {
			version,
			dshVersion: readInstalledPackageVersion(root, "@deepseek-ai/dsh"),
			platform: process.platform,
			arch: process.arch
		});
	} catch (error) {
		runtime.recoveryMode = true;
		runtime.report(error, "runtime-bootstrap");
	}
	if (!runtime.safeMode && !runtime.recoveryMode) try {
		runtime.profiles.ensure(runtime.selected);
		onboarding = process.argv.includes("--next-onboarding") || runtime.profiles.onboardingRequired(runtime.selected);
		if (onboarding) onboardingComputerUse = runtime.profiles.computerUseEnabled(runtime.selected);
	} catch (error) {
		onboarding = false;
		runtime.recoveryMode = true;
		runtime.report(error, "profile-composition");
	}
	native.createTray();
	updates.start();
	Menu.setApplicationMenu(process.platform === "win32" ? null : Menu.buildFromTemplate([
		{
			label: "DSH NEXT",
			submenu: native.items()
		},
		{ role: "editMenu" },
		{ role: "viewMenu" },
		{ role: "windowMenu" }
	]));
	if (process.platform === "win32") {
		ipcMain.handle(IPC.windowsMenu, (event, name, x, y) => {
			assertSender(event, mainWindow, APP_URL);
			if (name !== "application" && name !== "edit" || typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 1e5 || y > 1e5) throw new Error("Invalid native menu request");
			const window = mainWindow;
			const messages = resolveDesktopLocale(windowsLanguage).messages;
			const editItem = (label, keyCode, modifiers, accelerator) => ({
				label,
				accelerator,
				click: () => {
					window.webContents.focus();
					desktopShortcuts.sendEditingKey(keyCode, modifiers);
				}
			});
			const items = name === "application" ? native.items() : [
				editItem(messages.undo, "Z", ["control"], "Ctrl+Z"),
				editItem(messages.redo, "Y", ["control"], "Ctrl+Y"),
				{ type: "separator" },
				editItem(messages.cut, "X", ["control"], "Ctrl+X"),
				editItem(messages.copy, "C", ["control"], "Ctrl+C"),
				editItem(messages.paste, "V", ["control"], "Ctrl+V"),
				editItem(messages.delete, "Delete", []),
				{ type: "separator" },
				editItem(messages.selectAll, "A", ["control"], "Ctrl+A")
			];
			const zoom = window.webContents.getZoomFactor();
			return new Promise((resolvePopup) => {
				Menu.buildFromTemplate(items).popup({
					window,
					x: Math.round(x * zoom),
					y: Math.round(y * zoom),
					callback: resolvePopup
				});
			});
		});
		ipcMain.on(IPC.windowsAppearance, (event, language, sidebarFill, symbolColor) => {
			try {
				assertSender(event, mainWindow, APP_URL);
			} catch {
				return;
			}
			const validColor = (value) => typeof value === "string" && /^(?:#[\da-f]{3,8}|rgba?\([\d.,%\s]+\))$/iu.test(value);
			if (validColor(symbolColor)) mainWindow.setTitleBarOverlay({
				color: WINDOWS_CAPTION_FILL,
				symbolColor
			});
		});
	}
	if (runtime.recoveryMode) openControls("recovery");
	else if (onboarding) openControls("onboarding");
	else {
		runtime.start().catch(() => {});
		openMain();
	}
	app.on("activate", openMain);
	app.on("window-all-closed", () => {
		if (process.platform !== "darwin" && !native.available && !replacingWindow) app.quit();
	});
}
app.on("before-quit", (event) => {
	if (quitting || !ownsInstance) return;
	event.preventDefault();
	quitting = true;
	rendererRecovery?.stop();
	runtime.memory.stop();
	runtime.diagnostics.record({
		source: "electron",
		event: "shutdown.start"
	});
	runtime.diagnostics.flush();
	let finished = false;
	const timeout = setTimeout(() => {
		if (finish()) {
			runtime.diagnostics.record({
				source: "electron",
				event: "shutdown.timeout",
				level: "error",
				message: "Shutdown exceeded five seconds",
				fields: { pending: JSON.stringify(runtime.diagnostics.pendingOperations()) }
			});
			completeShutdown(false);
		}
	}, DESKTOP_SHUTDOWN_TIMEOUT_MS);
	timeout.unref();
	function finish() {
		if (finished) return false;
		finished = true;
		clearTimeout(timeout);
		return true;
	}
	async function completeShutdown(clean) {
		if (installingUpdate) {
			const installerDone = runtime.diagnostics.operation("electron", "installer.launch");
			try {
				await updateInstaller.launch();
				installerDone();
			} catch (error) {
				installerDone(error);
				runtime.diagnostics.record({
					source: "electron",
					event: "installer.failed",
					level: "error",
					error
				});
				runtime.diagnostics.end(clean);
				dialog.showErrorBox(t("更新未能安装", "Update could not be installed"), t("应用将重新打开，请在设置中重试更新。", "The application will reopen. Retry the update in Settings."));
				relaunchApp(app, relaunchArguments(process.argv.slice(1), false, false));
				if (clean) app.quit();
				else app.exit(1);
				return;
			}
		}
		runtime.diagnostics.end(clean);
		if (!clean) {
			app.exit(1);
			return;
		}
		if (relaunch) relaunchApp(app, relaunch);
		app.quit();
	}
	if (mainWindow && !mainWindow.isDestroyed()) persistMainWindowState(mainWindow);
	for (const window of [mainWindow, shellWindow]) if (window && !window.isDestroyed()) window.hide();
	native.close();
	platformLogin.close();
	const updatesDone = runtime.diagnostics.operation("electron", "updates.dispose");
	const recoveryDone = runtime.diagnostics.operation("electron", "recovery.dispose");
	Promise.all([updates.dispose(installingUpdate).then(() => updatesDone(), (error) => {
		updatesDone(error);
		throw error;
	}), (async () => {
		try {
			await recoveryRunner?.dispose();
			recoveryDone();
		} catch (error) {
			recoveryDone(error);
			throw error;
		}
		await runtime.close();
	})()]).then(async () => {
		if (!finish()) return;
		if (safeModeRequested && !installingUpdate) try {
			cleanupDisposableTree(safeElectronData);
		} catch (error) {
			runtime.diagnostics.append(`Safe Mode desktop state cleanup failed: ${String(error)}`, "warn");
			runtime.diagnostics.flush();
		}
		await completeShutdown(true);
	}).catch((error) => {
		if (finish()) {
			runtime.diagnostics.record({
				source: "electron",
				event: "shutdown.failed",
				level: "error",
				error
			});
			completeShutdown(false);
		}
	});
});
if (ownsInstance) {
	process.on("uncaughtExceptionMonitor", (error, origin) => {
		runtime.diagnostics.record({
			source: "electron",
			event: "uncaught-exception",
			level: "error",
			error,
			fields: { origin }
		});
		runtime.memory.settle();
		runtime.diagnostics.end(false);
	});
	const reportSandboxLaunchFailure = createSandboxLaunchReporter({
		elevation: windowsElevation,
		context: () => ({
			startup: startupElevationState,
			argv: process.argv,
			executable: process.execPath,
			language: preferredDesktopLocale([...app.getPreferredSystemLanguages(), app.getLocale()])
		}),
		record: (failure, elevation) => runtime.diagnostics.record({
			source: "electron",
			event: "sandbox.launch-failed",
			level: "error",
			fields: {
				process: failure.process,
				code: failure.code,
				elevated: elevation?.elevated ?? null,
				elevationType: elevation?.type ?? null
			}
		}),
		show: (text) => {
			dialog.showMessageBoxSync({
				type: "error",
				title: text.title,
				message: text.message,
				detail: text.detail,
				buttons: [text.button],
				defaultId: 0,
				noLink: true
			});
		},
		exit: () => {
			runtime.memory.stop();
			runtime.diagnostics.end(false);
			app.exit(1);
		}
	});
	app.on("child-process-gone", (_event, details) => {
		runtime.diagnostics.record({
			source: "electron",
			event: "child-process-gone",
			level: "error",
			fields: {
				type: details.type,
				reason: details.reason,
				exitCode: details.exitCode,
				service: details.serviceName ?? null
			}
		});
		if (details.reason !== "clean-exit" && !quitting) runtime.memory.incident({
			process: "child",
			type: details.type,
			reason: details.reason,
			exitCode: details.exitCode
		});
		const failure = gpuLaunchFailure(process.platform, details);
		if (failure && !quitting) reportSandboxLaunchFailure(failure);
	});
	app.on("render-process-gone", (_event, contents, details) => {
		const failure = rendererLaunchFailure(process.platform, details);
		if (failure && !quitting && [mainWindow, shellWindow].some((window) => window !== void 0 && !window.isDestroyed() && window.webContents === contents)) reportSandboxLaunchFailure(failure);
	});
	app.once("will-quit", () => runtime.diagnostics.flush());
	const { elevation, kept, error, win32Code } = startupElevationState;
	runtime.diagnostics.begin({
		version,
		platform: process.platform,
		electron: process.versions.electron ?? "",
		node: process.version,
		safeMode: safeModeRequested,
		...dshVersion === void 0 ? {} : { dsh: dshVersion },
		...elevation === void 0 ? {} : {
			elevated: elevation.elevated,
			elevationType: elevation.type
		},
		...process.argv.includes("--next-de-elevated") ? { deElevated: true } : {}
	});
	if (kept !== void 0 || error !== void 0) runtime.diagnostics.record({
		source: "electron",
		event: elevation === void 0 ? "elevation.unknown" : "elevation.kept",
		level: "warn",
		...error === void 0 ? {} : { message: error },
		fields: {
			reason: kept ?? null,
			win32Code: win32Code ?? null
		}
	});
	main().catch((error) => runtime.report(error, "electron-ready"));
}
//#endregion
export {};
