'use strict';

const MastersMissionProgress = (() => {
  const STORAGE_KEY = 'masters-2026-10-mission-progress-v2';
  const LEGACY_STORAGE_KEY = 'masters-2026-10-mission-progress-v1';
  const LIMIT = 141;
  const isDaily = gift => gift.type === 'デイリー';
  const dayKey = (now = Date.now()) => new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const totalTarget = gift => gift.target * (isDaily(gift) ? 3 : 1);
  const countUnit = gift => gift.unit === '名' ? '名分' : gift.unit;
  const validCount = (count, maximum) => Number.isInteger(count) && count >= 0 && count <= maximum;

  function restore(gifts, raw, now = Date.now()) {
    let saved;
    try { saved = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { saved = null; }
    const day = dayKey(now);
    const state = { version: 2, day, missions: {} };
    for (const gift of gifts) {
      const rounds = isDaily(gift) ? 3 : 1;
      const prior = (!isDaily(gift) || saved?.day === day) ? saved?.missions?.[gift.id] : null;
      let count = 0;
      if (saved?.version === 2 && validCount(prior?.count, totalTarget(gift))) count = prior.count;
      if (saved?.version === 1) {
        // Migrate the explicitly entered counts, without inventing unrecorded progress.
        count = Array.from({ length: rounds }, (_, i) => validCount(prior?.counts?.[i], gift.target) ? prior.counts[i] : 0).reduce((sum, value) => sum + value, 0);
      }
      state.missions[gift.id] = { count };
    }
    return state;
  }

  function remaining(gift, entry) {
    const count = entry?.count;
    if (!validCount(count, totalTarget(gift))) throw new Error('進捗の入力値が不正です。');
    return totalTarget(gift) - count;
  }

  function comment(gifts, state, individual = false) {
    const pending = gifts.filter(gift => remaining(gift, state.missions[gift.id]) > 0);
    if (!pending.length) {
      const scope = gifts.every(isDaily) ? 'デイリーミッション' : gifts.every(gift => !isDaily(gift)) ? '期間限定ギフトミッション' : 'ギフトミッション';
      return individual && gifts.length === 1
        ? `【マスターズ】${gifts[0].name} 全達成！ありがとうございます！`
        : `【マスターズ】${scope}全達成！応援ありがとうございます！`;
    }
    return '【マスターズ】全達成まで ' + pending.map(gift => `${gift.name} あと${remaining(gift, state.missions[gift.id])}${countUnit(gift)}`).join('／') + ' 応援お願いします！';
  }

  async function copyText(text, navigatorObject, documentObject, textarea) {
    if (!text || text.length > LIMIT) return false;
    try {
      if (navigatorObject.clipboard?.writeText) {
        await navigatorObject.clipboard.writeText(text);
        return true;
      }
    } catch { /* Some in-app browsers require the selection fallback. */ }
    try {
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      return documentObject.execCommand?.('copy') === true;
    } catch { return false; }
  }

  function mount(root, gifts) {
    let storage;
    let raw = null;
    try { storage = window.localStorage; raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY); } catch { storage = null; }
    let state = restore(gifts, raw);
    let group = 'daily';
    const invalid = new Set();
    root.innerHTML = `
      <div class="progress-filters" role="group" aria-label="進捗を表示するギフト">
        <button type="button" data-progress-group="daily" aria-pressed="true">デイリー</button>
        <button type="button" data-progress-group="period" aria-pressed="false">期間限定</button>
        <button type="button" data-progress-group="all" aria-pressed="false">全6種</button>
      </div>
      <p class="progress-help">デイリーは1日3回分、期間限定は期間中の合計を入力。<br>ポーンは各回の達成人数を足した延べ人数です。</p>
      <div class="progress-rows" id="progress-rows"></div>
      <div class="progress-copy-panel">
        <label for="progress-comment">コピーするコメント <span id="progress-length"></span></label>
        <textarea id="progress-comment" rows="2" readonly spellcheck="false" aria-describedby="progress-status"></textarea>
        <button type="button" class="progress-copy-all" id="progress-copy-all">残りをまとめてコピー</button>
        <p id="progress-status" class="progress-status" role="status" aria-live="polite"></p>
        <p id="progress-storage" class="progress-storage"></p>
      </div>`;
    const rows = root.querySelector('#progress-rows');
    const preview = root.querySelector('#progress-comment');
    const status = root.querySelector('#progress-status');
    const copyAll = root.querySelector('#progress-copy-all');
    const currentGifts = () => gifts.filter(gift => group === 'all' || isDaily(gift) === (group === 'daily'));

    function save() {
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { storage = null; }
      root.querySelector('#progress-storage').textContent = storage
        ? 'この端末に保存・デイリーは日本時間0時にリセット'
        : 'この画面内でのみ保持・再読み込みすると入力は消えます';
    }

    function setPreview(text) {
      preview.value = text;
      root.querySelector('#progress-length').textContent = `${text.length} / ${LIMIT}文字`;
    }

    function updatePreview() {
      const scope = currentGifts();
      const hasError = scope.some(gift => invalid.has(gift.id));
      const text = hasError ? '' : comment(scope, state);
      setPreview(text);
      copyAll.disabled = hasError || text.length > LIMIT;
      status.textContent = hasError ? '赤く表示された入力欄を確認してください。' : '';
    }

    function updateRow(gift) {
      const row = rows.querySelector(`[data-progress-row="${gift.id}"]`);
      if (!row) return;
      const error = invalid.has(gift.id);
      const count = error ? null : remaining(gift, state.missions[gift.id]);
      row.querySelector('output').textContent = error ? '入力を確認' : count === 0 ? '全達成！' : `あと${count}${countUnit(gift)}`;
      row.querySelector('output').classList.toggle('is-complete', count === 0);
      row.querySelector('[data-progress-copy]').disabled = error;
      row.querySelector('[data-progress-count]').setAttribute('aria-invalid', String(error));
      row.querySelector('.progress-error').textContent = error ? `0〜${totalTarget(gift)}の整数で入力してください。` : '';
    }

    function renderRows() {
      rows.innerHTML = currentGifts().map(gift => {
        const entry = state.missions[gift.id];
        return `<article class="progress-row" data-progress-row="${gift.id}">
          <div class="progress-row-heading"><h2>${gift.name}</h2><span class="progress-period-label">${isDaily(gift) ? 'デイリー合計' : '期間中合計'}</span></div>
          <div class="progress-row-controls">
            <label class="progress-count-label" for="progress-count-${gift.id}"><span>合計の達成数</span><span class="progress-number"><input id="progress-count-${gift.id}" data-progress-count="${gift.id}" type="number" inputmode="numeric" min="0" max="${totalTarget(gift)}" step="1" value="${entry.count}" aria-label="${gift.name}の合計達成数（${countUnit(gift)}）" aria-describedby="progress-error-${gift.id}"><span>/ ${totalTarget(gift)}${countUnit(gift)}</span></span></label>
            <output for="progress-count-${gift.id}" aria-live="off"></output>
            <button type="button" data-progress-copy="${gift.id}" aria-label="${gift.name}の残数をコピー">コピー</button>
          </div><p id="progress-error-${gift.id}" class="progress-error"></p>
        </article>`;
      }).join('');
      currentGifts().forEach(updateRow);
      root.querySelectorAll('[data-progress-group]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.progressGroup === group)));
      updatePreview();
    }

    function refresh() {
      if (state.day === dayKey()) return false;
      state = restore(gifts, state);
      gifts.filter(isDaily).forEach(gift => invalid.delete(gift.id));
      save();
      renderRows();
      status.textContent = '日付が変わったため、デイリーの入力をリセットしました。';
      return true;
    }

    async function copy(scope, individual = false) {
      if (refresh()) return;
      if (scope.some(gift => invalid.has(gift.id))) return;
      const text = comment(scope, state, individual);
      setPreview(text);
      const success = await copyText(text, navigator, document, preview);
      status.textContent = success
        ? 'コピーしました。コメント欄に貼り付けてください。'
        : '自動コピーできませんでした。上の文面を長押ししてコピーしてください。';
    }

    rows.addEventListener('input', event => {
      const input = event.target.closest('[data-progress-count]');
      if (!input || refresh()) return;
      const gift = gifts.find(item => item.id === input.dataset.progressCount);
      const value = input.value.trim();
      if (/^\d+$/.test(value) && validCount(Number(value), totalTarget(gift))) {
        invalid.delete(gift.id);
        state.missions[gift.id].count = Number(value);
        save();
      } else invalid.add(gift.id);
      updateRow(gift);
      updatePreview();
    });
    root.addEventListener('click', event => {
      const filter = event.target.closest('[data-progress-group]');
      if (filter) {
        group = filter.dataset.progressGroup;
        invalid.clear();
        refresh();
        renderRows();
        rows.scrollTop = 0;
      }
      const button = event.target.closest('[data-progress-copy]');
      if (button && !button.disabled) copy([gifts.find(gift => gift.id === button.dataset.progressCopy)], true);
    });
    copyAll.addEventListener('click', () => copy(currentGifts()));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('focus', refresh);
    setInterval(refresh, 30000);
    save();
    renderRows();
    return {
      refresh,
      focusGift(id) {
        const gift = gifts.find(item => item.id === id);
        if (!gift) return;
        group = isDaily(gift) ? 'daily' : 'period';
        invalid.clear();
        refresh();
        renderRows();
        rows.querySelector(`[data-progress-count="${id}"]`).focus();
      }
    };
  }

  return { restore, remaining, comment, dayKey, totalTarget, copyText, mount, LIMIT };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MastersMissionProgress;
