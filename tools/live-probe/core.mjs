// Read-only discovery of Euler Stream's documented JSON event format.
// No inventory changes, coin calculations, or production writes happen here.
export function normalizeCreator(value) {
  const creator = String(value ?? '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9_.]{1,24}$/.test(creator)) {
    throw new Error('TikTokの @ID を指定してください（表示名やURLは使えません）。');
  }
  return creator;
}

export function connectionUrl(creator, apiKey) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('EULER_API_KEY を実行環境に設定してください。');
  }
  const url = new URL('wss://ws.eulerstream.com');
  url.searchParams.set('uniqueId', normalizeCreator(creator));
  url.searchParams.set('apiKey', apiKey.trim());
  url.searchParams.set('features.rawMessages', 'false');
  url.searchParams.set('features.bundleEvents', 'true');
  url.searchParams.set('features.schemaVersion', 'v2');
  url.searchParams.set('features.includeRawBytes', 'false');
  url.searchParams.set('features.useEnterpriseApi', 'false');
  return url.toString();
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function unpackFrame(frame) {
  const value = typeof frame === 'string' ? JSON.parse(frame) : frame;
  const messages = object(value) && Array.isArray(value.messages) ? value.messages : [value];
  if (!messages.every(message => object(message) && typeof message.type === 'string'
    && message.type.length > 0 && message.type.length < 160 && object(message.data))) {
    throw new Error('未対応のメッセージ形式です。受信形式を再確認してください。');
  }
  return messages;
}

// TikTok identifiers can exceed Number.MAX_SAFE_INTEGER. Never deduplicate or
// identify people using already-rounded numeric IDs or display names.
function exactId(value) {
  if (typeof value === 'string' && /^\d+$/.test(value) && /[1-9]/.test(value)) return value;
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  return null;
}

const TERMINAL = new Map([
  [1000, 'closed'], [4005, 'ended'], [4400, 'invalid_options'],
  [4401, 'invalid_auth'], [4403, 'no_permission'], [4404, 'offline'],
  [4429, 'connection_limit'],
]);
export function closeState(code) {
  return { state: TERMINAL.get(code) ?? 'unknown', retryable: !TERMINAL.has(code) };
}

// Defense in depth for optional local payload files. Never log connection URLs,
// exception objects, or close-reason strings, which could echo credentials.
export function redact(value, secrets = []) {
  const hidden = /^(api.?key|jwt.?key|token|access.?token|refresh.?token|authorization|cookie|session.?id|password|secret)$/i;
  if (Array.isArray(value)) return value.map(item => redact(item, secrets));
  if (object(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key, hidden.test(key) ? '[REDACTED]' : redact(item, secrets),
  ]));
  if (typeof value === 'string') {
    let clean = value.replace(/([?&](?:apiKey|jwtKey|token|sessionId)=)[^&#\s]+/gi, '$1[REDACTED]');
    for (const secret of secrets.filter(Boolean)) {
      clean = clean.split(secret).join('[REDACTED]');
      clean = clean.split(encodeURIComponent(secret)).join('[REDACTED]');
    }
    return clean;
  }
  return value;
}

export class ProbeSummary {
  constructor() {
    this.roomId = null;
    this.seen = new Set();
    this.users = new Set();
    this.byType = new Map();
    this.samples = new Map();
    this.itemCandidates = new Map();
    this.duplicates = 0;
    this.eventsWithoutExactId = 0;
    this.framesRejected = 0;
    this.connectionEvents = [];
  }

  observe(message) {
    const { type, data } = message;
    if (type === 'roomInfo' || type === 'room.status') {
      this.roomId = exactId(data.roomId) ?? exactId(data.id) ?? exactId(data.room_id) ?? this.roomId;
    }
    const roomId = exactId(data.common?.roomId) ?? this.roomId;
    const msgId = exactId(data.common?.msgId);
    if (msgId && roomId) {
      const key = `${roomId}:${type}:${msgId}`;
      if (this.seen.has(key)) { this.duplicates++; return false; }
      this.seen.add(key);
    } else if (type.startsWith('Webcast')) {
      this.eventsWithoutExactId++;
    }
    this.byType.set(type, (this.byType.get(type) ?? 0) + 1);
    const fields = this.samples.get(type) ?? new Set();
    for (const field of Object.keys(data)) fields.add(field);
    this.samples.set(type, fields);
    // Count observed real events only. Synthetic presence is an estimate.
    if (type.startsWith('Webcast')) {
      const userId = exactId(data.user?.idStr) ?? exactId(data.user?.userId)
        ?? exactId(data.user?.id);
      if (userId) this.users.add(userId);
    }
    if (/(boost|card|battle|linkmic|barrage|notify|roommessage)/i.test(type)) {
      this.itemCandidates.set(type, (this.itemCandidates.get(type) ?? 0) + 1);
    }
    return true;
  }

  snapshot() {
    return {
      schema: 'kazz-live-probe/v1',
      observedEvents: Object.fromEntries(this.byType),
      observedUserCount: this.users.size,
      duplicateEventsSkipped: this.duplicates,
      eventsWithoutExactMessageAndRoomId: this.eventsWithoutExactId,
      framesRejected: this.framesRejected,
      fieldsByEventType: Object.fromEntries([...this.samples].map(([key, values]) => [key, [...values].sort()])),
      itemCandidateEventTypes: Object.fromEntries(this.itemCandidates),
      verifiedInventoryOperations: 0,
      connectionEvents: this.connectionEvents,
      limitations: [
        '観測した通知の記録です。全視聴者・全履歴を取得したことを意味しません。',
        'ギフト通知件数は、ギフト個数・コイン数・バトル点数ではありません。連打の途中通知も含みます。',
        '関連メッセージ候補は、グローブの獲得・使用が確認できたことを意味しません。',
        '切断中・開始前の通知は補完しません。切断は配信終了と区別します。',
      ],
    };
  }
}
