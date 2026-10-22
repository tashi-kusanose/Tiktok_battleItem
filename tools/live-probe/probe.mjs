import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { closeState, connectionUrl, normalizeCreator, ProbeSummary, redact, unpackFrame } from './core.mjs';

const HELP = `KazzCompany TikTok LIVE 受信検証（Node.js 22以上）

  node tools/live-probe/probe.mjs --replay tools/live-probe/fixture.jsonl
  node --env-file=/安全な場所/live-probe.env tools/live-probe/probe.mjs --creator @ID

  --creator @ID       同意を得た検証対象の公開配信
  --minutes 15        1〜30分。既定15分で自動停止
  --capture-payloads  検証用データを端末内だけに記録（氏名やコメントを含む場合あり）
  --replay PATH       保存済みJSONLを再生。外部接続なし
  --help             この説明を表示

APIキーは EULER_API_KEY に設定します。チャットやGitHubに貼らないでください。
これは検証用です。既存の残数・配信中表示・公開ページは更新しません。`;

function options(args) {
  const result = { minutes: 15, capture: false };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--help') result.help = true;
    else if (flag === '--capture-payloads') result.capture = true;
    else if (['--creator', '--minutes', '--replay'].includes(flag)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${flag} の値がありません。`);
      result[flag.slice(2)] = flag === '--minutes' ? Number(value) : value;
    } else throw new Error('未対応の引数です。--help を確認してください。');
  }
  if (result.help) return result;
  if (!Number.isFinite(result.minutes) || result.minutes < 1 || result.minutes > 30) {
    throw new Error('--minutes は1〜30にしてください。');
  }
  if (Boolean(result.creator) === Boolean(result.replay)) {
    throw new Error('--creator または --replay のどちらか一方を指定してください。');
  }
  if (result.creator) result.creator = normalizeCreator(result.creator);
  return result;
}

async function run() {
  const opts = options(process.argv.slice(2));
  if (opts.help) { console.log(HELP); return; }
  const summary = new ProbeSummary();
  const startedAt = new Date().toISOString();
  const apiKey = process.env.EULER_API_KEY?.trim();
  // Validate configuration before creating files or making any connection.
  const url = opts.replay ? null : connectionUrl(opts.creator, apiKey);
  if (url && typeof WebSocket !== 'function') throw new Error('Node.js 22以上が必要です。');
  const directory = resolve(fileURLToPath(new URL('./captures/', import.meta.url)), randomUUID());
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const payloadPath = resolve(directory, 'events.jsonl');
  let recordedBytes = 0;
  let captureLimitReached = false;
  let stop;
  const MAX_FRAME_BYTES = 2 * 1024 * 1024;
  const MAX_CAPTURE_BYTES = 20 * 1024 * 1024;
  const MAX_EVENTS = 100_000;
  let eventsReceived = 0;

  function processFrame(text) {
    if (Buffer.byteLength(text) > MAX_FRAME_BYTES) throw new Error('frame_size');
    const messages = unpackFrame(text);
    for (const message of messages) {
      if (++eventsReceived > MAX_EVENTS) { stop?.('event_limit'); return; }
      const accepted = summary.observe(message);
      if (accepted && opts.capture && !captureLimitReached) {
        const line = JSON.stringify({ receivedAt: new Date().toISOString(), message: redact(message, [apiKey]) }) + '\n';
        const bytes = Buffer.byteLength(line);
        if (recordedBytes + bytes > MAX_CAPTURE_BYTES) captureLimitReached = true;
        else { appendFileSync(payloadPath, line, { mode: 0o600 }); recordedBytes += bytes; }
      }
    }
  }

  let finishReason = 'replay_completed';
  if (opts.replay) {
    const text = readFileSync(resolve(opts.replay), 'utf8');
    if (Buffer.byteLength(text) > MAX_CAPTURE_BYTES) throw new Error('再生ファイルが20MiBを超えています。');
    for (const line of text.split(/\r?\n/).filter(line => line.trim())) {
      try {
        const parsed = JSON.parse(line);
        processFrame(JSON.stringify(parsed.message ?? parsed));
      } catch { summary.framesRejected++; }
      if (eventsReceived > MAX_EVENTS) { finishReason = 'event_limit'; break; }
    }
    console.log('保存データを再生しました。実配信への接続テストではありません。');
  } else {
    console.log(`@${opts.creator} の公開配信を最大${opts.minutes}分検証します。Ctrl+Cで終了できます。`);
    console.log('通知の受信のみ。グローブ残数・公開ページ・通知送信は更新しません。');
    finishReason = await new Promise(resolveDone => {
      let socket;
      let done = false;
      let retries = 0;
      let retryTimer;
      let handshakeTimer;
      const deadline = setTimeout(() => stop('time_limit'), opts.minutes * 60_000);
      const onInterrupt = () => stop('user_stopped');
      const recordStatus = (state, code) => {
        summary.connectionEvents.push({ at: new Date().toISOString(), state, ...(code === undefined ? {} : { code }) });
        console.log(`接続状態: ${state}${code === undefined ? '' : ` (${code})`}`);
      };
      stop = reason => {
        if (done) return;
        done = true;
        clearTimeout(deadline);
        clearTimeout(retryTimer);
        clearTimeout(handshakeTimer);
        process.off('SIGINT', onInterrupt);
        process.off('SIGTERM', onInterrupt);
        if (socket && socket.readyState < 2) socket.close();
        resolveDone(reason);
      };
      process.on('SIGINT', onInterrupt);
      process.on('SIGTERM', onInterrupt);
      function connect() {
        if (done) return;
        recordStatus('connecting');
        // The destination is fixed; no credential-bearing URL is printed.
        socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        handshakeTimer = setTimeout(() => stop('connection_timeout'), 20_000);
        socket.addEventListener('open', () => {
          if (done) return;
          clearTimeout(handshakeTimer);
          recordStatus('transport_connected');
        });
        socket.addEventListener('message', event => {
          if (done) return;
          try {
            const text = typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8');
            processFrame(text);
          } catch {
            summary.framesRejected++;
            if (summary.framesRejected >= 3) stop('unsupported_frames');
          }
        });
        socket.addEventListener('error', () => { if (!done) recordStatus('transport_error'); });
        socket.addEventListener('close', event => {
          clearTimeout(handshakeTimer);
          if (done) return;
          const state = closeState(event.code);
          recordStatus(state.state, event.code);
          if (state.retryable && retries < 3) {
            const delay = [5_000, 15_000, 30_000][retries++];
            retryTimer = setTimeout(connect, delay);
          } else stop(state.retryable ? 'retries_exhausted' : state.state);
        });
      }
      connect();
    });
  }
  const report = {
    ...summary.snapshot(),
    mode: opts.replay ? 'replay' : 'live_probe',
    creator: opts.creator ?? null,
    startedAt,
    endedAt: new Date().toISOString(),
    finishReason,
    payloadCaptureEnabled: opts.capture,
    payloadBytes: recordedBytes,
    captureLimitReached,
  };
  writeFileSync(resolve(directory, 'summary.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ mode: report.mode, observedEvents: report.observedEvents,
    observedUserCount: report.observedUserCount, framesRejected: report.framesRejected,
    verifiedInventoryOperations: 0, finishReason, reportDirectory: directory }, null, 2));
  if (report.framesRejected || ['invalid_auth', 'invalid_options', 'no_permission', 'connection_limit',
    'connection_timeout', 'unsupported_frames', 'retries_exhausted'].includes(finishReason)) process.exitCode = 1;
}

run().catch(error => {
  // Known configuration messages contain no secrets. Do not print network or I/O
  // exception details, because these can include paths or authentication URLs.
  const safe = /^(TikTok|EULER_API_KEY|--|未対応の引数|Node\.js|再生ファイル)/.test(error.message);
  console.error(safe ? error.message : '受信検証を開始・保存できませんでした。設定と書き込み先を確認してください。');
  process.exitCode = 1;
});
