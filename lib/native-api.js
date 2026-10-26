import { randomBytes, timingSafeEqual } from 'node:crypto';

const ACTIVE_PHASES = new Set(['preparing', 'worker-ready', 'waiting-exit', 'installing', 'relaunching']);
const PHASES = new Set([...ACTIVE_PHASES, 'complete', 'error', 'timeout', 'cancelled']);
const VARIANTS = new Set(['pristine', 'legacy', 'managed', 'unknown']);
const CODE = /^[a-z][a-z0-9-]{0,63}$/;
const JOB_ID = /^[a-z0-9][a-z0-9_-]{7,100}$/i;
const NATIVE_HEADER = 'x-dsh-desktop-renderer';
const NATIVE_CAPABILITY = /^[A-Za-z0-9_-]{43}$/;
const NATIVE_PROBE_URL = '/dsh-awakening/native/status?dsh-desktop-awakening-action=1';

/** NEXT deliberately removes its renderer secret from process.env before
 * plugins boot. Ask the live WebServer's policy instead of copying that secret.
 * Its desktop URL marker is denied to every ordinary browser,
 * including when Browser access is enabled. The negative control also rejects
 * a plain server whose permissive default has no native policy configured. */
export function createNativeRequestGuard(webServer) {
  const permits = webServer?.permits;
  function diagnose(request) {
    if (typeof permits !== 'function') return { authorized: false, reason: 'native-policy-unavailable' };
    const headers = request?.headers ?? {};
    const nativeHeaders = { ...headers };
    const browserHeaders = Object.fromEntries(Object.entries(headers).filter(([name]) => name.toLowerCase() !== NATIVE_HEADER));
    try {
      if (permits.call(webServer, { headers: browserHeaders, url: NATIVE_PROBE_URL }) !== false) {
        return { authorized: false, reason: 'native-policy-unavailable' };
      }
      if (typeof headers[NATIVE_HEADER] !== 'string' || !NATIVE_CAPABILITY.test(headers[NATIVE_HEADER]) ||
        permits.call(webServer, { headers: nativeHeaders, url: NATIVE_PROBE_URL }) !== true) {
        return { authorized: false, reason: 'native-request-denied' };
      }
      return { authorized: true, reason: 'native-policy-verified' };
    } catch { return { authorized: false, reason: 'native-policy-unavailable' }; }
  };
  const guard = request => diagnose(request).authorized;
  guard.diagnose = diagnose;
  return guard;
}

function sameSecret(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string' || !actual || !expected || actual.length > 256) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function code(value, fallback = 'operation-failed') { return typeof value === 'string' && CODE.test(value) ? value : fallback; }
function json(response, status, value) {
  if (response.destroyed || response.writableEnded) return;
  const payload = Buffer.from(JSON.stringify(value));
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(payload.length), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(payload);
}
function publicStatus(value) {
  const job = value?.job;
  return {
    supported: value?.supported === true,
    installed: value?.installed === true,
    sourceEligible: typeof value?.sourceEligible === 'boolean' ? value.sourceEligible : undefined,
    upToDate: typeof value?.upToDate === 'boolean' ? value.upToDate : undefined,
    canInstall: typeof value?.canInstall === 'boolean' ? value.canInstall : undefined,
    canRollback: typeof value?.canRollback === 'boolean' ? value.canRollback : undefined,
    variant: VARIANTS.has(value?.variant) ? value.variant : 'unknown',
    targetVersion: typeof value?.targetVersion === 'string' && /^[0-9a-z.-]{1,40}$/i.test(value.targetVersion) ? value.targetVersion : '2.0.19-next',
    reason: value?.reason ? code(value.reason, 'unsupported-environment') : undefined,
    job: job && JOB_ID.test(job.id) && PHASES.has(job.phase) ? {
      id: job.id, phase: job.phase, action: ['install', 'rollback'].includes(job.action) ? job.action : undefined,
      errorCode: job.errorCode ? code(job.errorCode) : undefined,
    } : null,
  };
}
function sameOrigin(request) {
  const origin = request.headers?.origin, host = request.headers?.host;
  if (typeof origin !== 'string' || typeof host !== 'string') return false;
  try {
    const source = new URL(origin), target = new URL(`${request.socket?.encrypted ? 'https' : 'http'}://${host}`);
    return !source.username && !source.password && !target.username && !target.password &&
      ['127.0.0.1', '[::1]', 'localhost'].includes(source.hostname) && origin === source.origin && source.origin === target.origin;
  } catch { return false; }
}
async function readBody(request) {
  const length = request.headers?.['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > 256)) {
    request.resume?.(); throw Object.assign(new Error('body-too-large'), { status: 413, code: 'invalid-request' });
  }
  const payload = await new Promise((resolve, reject) => {
    const chunks = []; let bytes = 0, settled = false;
    const invalid = status => Object.assign(new Error('invalid-body'), { status, code: 'invalid-request' });
    const timer = setTimeout(() => finish(invalid(408)), 10000);
    function finish(error) {
      if (settled) return;
      settled = true; clearTimeout(timer);
      request.off('data', data); request.off('end', end); request.off('error', failed); request.off('aborted', aborted);
      if (error) { request.once('error', () => {}); request.resume?.(); reject(error); }
      else resolve(Buffer.concat(chunks));
    }
    function data(chunk) { const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); bytes += part.length; if (bytes > 256) finish(invalid(413)); else chunks.push(part); }
    function end() { finish(); }
    function failed() { finish(invalid(400)); }
    function aborted() { finish(invalid(400)); }
    request.on('data', data); request.once('end', end); request.once('error', failed); request.once('aborted', aborted);
  });
  let value;
  try { value = JSON.parse(payload.toString('utf8')); } catch { throw Object.assign(new Error('invalid-json'), { status: 400, code: 'invalid-request' }); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('invalid-object'), { status: 400, code: 'invalid-request' });
  return value;
}

/** Only a renderer carrying NEXT's private native marker may manage this machine.
 * The marker never enters HTML or responses. POST also requires a separate
 * page action nonce, native loopback Origin and a tiny strict JSON body. */
export function createNativeRoutes({ packageRoot, executable = process.execPath, platform = process.platform, authorizeNative,
  loadInstaller = () => import('../tools/native-install/index.mjs'), nonce = randomBytes(32).toString('base64url') } = {}) {
  let preparing = false, armedJob = null;
  const token = nonce;
  const options = { packageRoot, executable };
  function authorization(request) {
    if (platform !== 'win32') return { authorized: false, reason: 'native-required' };
    if (typeof authorizeNative !== 'function') return { authorized: false, reason: 'native-policy-unavailable' };
    try {
      const result = typeof authorizeNative.diagnose === 'function' ? authorizeNative.diagnose(request) : authorizeNative(request);
      if (result === true || result?.authorized === true) return { authorized: true, reason: 'native-policy-verified' };
      return { authorized: false, reason: result?.reason === 'native-policy-unavailable' ? 'native-policy-unavailable' : 'native-request-denied' };
    } catch { return { authorized: false, reason: 'native-policy-unavailable' }; }
  }
  function native(request, response) {
    const access = authorization(request);
    if (access.reason === 'native-required' || access.reason === 'native-policy-unavailable') {
      json(response, 200, { ok: true, status: { supported: false, installed: false, variant: 'unknown', targetVersion: '2.0.19-next', reason: access.reason, job: null }, authorization: access });
      return false;
    }
    if (!access.authorized) {
      json(response, 403, { ok: false, error: { code: access.reason, message: '当前请求未通过桌面授权。' }, authorization: access }); return false;
    }
    return true;
  }
  function post(request, response) {
    if (request.method !== 'POST') { response.setHeader?.('allow', 'POST'); json(response, 405, { ok: false, error: { code: 'method-not-allowed' } }); return false; }
    const access = authorization(request);
    if (!access.authorized) {
      json(response, 403, { ok: false, error: { code: access.reason, message: '当前请求未通过桌面授权。' }, authorization: access }); return false;
    }
    if (!sameSecret(request.headers?.['x-dsh-awakening-token'], token) || !sameOrigin(request)) {
      json(response, 403, { ok: false, error: { code: 'request-denied', message: '操作验证未通过，请重新打开设置后再试。' } }); return false;
    }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers?.['content-type'] ?? '')) {
      json(response, 415, { ok: false, error: { code: 'invalid-request' } }); return false;
    }
    return true;
  }
  return {
    token,
    async status(request, response) {
      if (request.method !== 'GET') { response.setHeader?.('allow', 'GET'); json(response, 405, { ok: false, error: { code: 'method-not-allowed' } }); return; }
      if (!native(request, response)) return;
      try {
        const installer = await loadInstaller(), status = publicStatus(await installer.inspect(options));
        if (armedJob && (!status.job || !ACTIVE_PHASES.has(status.job.phase))) armedJob = null;
        json(response, 200, { ok: true, status, authorization: authorization(request) });
      } catch (error) { json(response, 500, { ok: false, error: { code: code(error?.code), message: '暂时无法检查首屏兼容状态，请稍后重新检测。' } }); }
    },
    async prepare(request, response) {
      if (!post(request, response)) return;
      try {
        const body = await readBody(request);
        if (Object.keys(body).length !== 1 || !['install', 'rollback'].includes(body.action)) {
          json(response, 400, { ok: false, error: { code: 'invalid-request' } }); return;
        }
        if (preparing || armedJob) { json(response, 409, { ok: false, error: { code: 'job-busy', message: '已有首屏操作正在准备，请稍后重新检测。' } }); return; }
        preparing = true;
        try {
          const installer = await loadInstaller(), result = await installer.prepare({ ...options, action: body.action });
          if (result?.phase !== 'prepared' || !JOB_ID.test(result?.jobId ?? '')) throw Object.assign(new Error('invalid-helper-result'), { code: 'helper-not-ready' });
          // A page reload may tear down the response before its exact job id
          // reaches the client. Disarm that job instead of leaving it waiting
          // for an unrelated later application exit.
          if (request.aborted || response.destroyed || response.writableEnded) {
            await installer.cancel({ ...options, jobId: result.jobId });
            return;
          }
          armedJob = result.jobId;
          response.once?.('close', () => {
            if (!response.writableFinished && armedJob === result.jobId) {
              installer.cancel({ ...options, jobId: result.jobId }).then(() => { if (armedJob === result.jobId) armedJob = null; }).catch(() => {});
            }
          });
          json(response, 200, { ok: true, jobId: result.jobId, phase: 'prepared' });
        } finally { preparing = false; }
      } catch (error) {
        if ([408, 413].includes(error?.status)) response.setHeader?.('connection', 'close');
        json(response, error?.status ?? (error?.code === 'job-busy' ? 409 : 500), { ok: false, error: { code: code(error?.code), message: '准备未完成，DSH 将保持开启。请重新检测后再试。' } });
      }
    },
    async cancel(request, response) {
      if (!post(request, response)) return;
      try {
        const body = await readBody(request);
        if (Object.keys(body).length !== 1 || !JOB_ID.test(body.jobId ?? '') || body.jobId !== armedJob) {
          json(response, 400, { ok: false, error: { code: 'invalid-request' } }); return;
        }
        const installer = await loadInstaller();
        await installer.cancel({ ...options, jobId: body.jobId });
        armedJob = null;
        json(response, 200, { ok: true, phase: 'cancelled' });
      } catch (error) {
        if ([408, 413].includes(error?.status)) response.setHeader?.('connection', 'close');
        json(response, error?.status ?? 500, { ok: false, error: { code: code(error?.code), message: '暂时无法取消，准备任务将在等待超时后自行停止。' } });
      }
    },
  };
}
