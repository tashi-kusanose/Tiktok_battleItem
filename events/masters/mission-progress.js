'use strict';

const MastersMissionProgress = (() => {
  const STORAGE_KEY = 'masters-2026-10-mission-progress-v1';
  const LIMIT = 141;
  const isDaily = gift => gift.type === 'デイリー';
  const dayKey = (now = Date.now()) => new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const validCount = (count, gift) => Number.isInteger(count) && count >= 0 && count <= gift.target;

  function restore(gifts, raw, now = Date.now()) {
    let saved;
    try { saved = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { saved = null; }
    const day = dayKey(now);
    const state = { version: 1, day, missions: {} };
    for (const gift of gifts) {
      const rounds = isDaily(gift) ? 3 : 1;
      const prior = saved?.version === 1 && (!isDaily(gift) || saved.day === day) ? saved.missions?.[gift.id] : null;
      state.missions[gift.id] = {
        round: Number.isInteger(prior?.round) && prior.round >= 1 && prior.round <= rounds ? prior.round : 1,
        counts: Array.from({ length: rounds }, (_, i) => validCount(prior?.counts?.[i], gift) ? prior.counts[i] : 0)
      };
    }
    return state;
  }

  function remaining(gift, entry) {
    const count = entry?.counts?.[entry.round - 1];
    if (!validCount(count, gift)) throw new Error('進捗の入力値が不正です。');
    return gift.target - count;
  }

  function comment(gifts, state, individual = false) {
    const pending = gifts.filter(gift => remaining(gift, state.missions[gift.id]) > 0);
    const roundLabel = gift => isDaily(gift) ? `（${state.missions[gift.id].round}回目）` : '';
    if (!pending.length) {
      return individual && gifts.length === 1
        ? `【マスターズ】${gifts[0].name}${roundLabel(gifts[0])}達成！ありがとうございます！`
        : '【マスターズ】今回のミッション達成！応援ありがとうございます！';
    }
    return '【マスターズ】' + pending.map(gift => `${gift.name} あと${remaining(gift, state.missions[gift.id])}${gift.unit}${roundLabel(gift)}`).join('／') + ' 応援お願いします！';
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
    try { storage = window.localStorage; raw = storage.getItem(STORAGE_KEY); } catch { storage = null; }
    let state = restore(gifts, raw);
    let group = 'daily';
    const invalid = new Set();
    root.innerHTML = `
      <div class="progress-filters" role="group" aria-label="進捗を表示するギフト">
        <button type="button" data-progress-group="daily" aria-pressed="true">デイリー</button>
        <button type="button" data-progress-group="period" aria-pressed="false">期間限定</button>
        <button type="button" data-progress-group="all" aria-pressed="false">全6種</button>
      </div>
      <p class="progress-help">今回の達成数を入力。ポーンは人数（名）です。<br>達成後は「何回目」を切り替えて、次の回を入力できます。</p>
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
      row.querySelector('output').textContent = error ? '入力を確認' : count === 0 ? '達成！' : `あと${count}${gift.unit}`;
      row.querySelector('output').classList.toggle('is-complete', count === 0);
      row.querySelector('[data-progress-copy]').disabled = error;
      row.querySelector('[data-progress-count]').setAttribute('aria-invalid', String(error));
      row.querySelector('.progress-error').textContent = error ? `0〜${gift.target}の整数で入力してください。` : '';
    }

    function renderRows() {
      rows.innerHTML = currentGifts().map(gift => {
        const entry = state.missions[gift.id];
        return `<article class="progress-row" data-progress-row="${gift.id}">
          <div class="progress-row-heading"><h2>${gift.name}</h2>${isDaily(gift) ? `<label class="progress-round-label">何回目<select data-progress-round="${gift.id}" aria-label="${gift.name}の挑戦回数">${[1, 2, 3].map(round => `<option value="${round}"${round === entry.round ? ' selected' : ''}>${round}回目</option>`).join('')}</select></label>` : '<span class="progress-period-label">期間中1回</span>'}</div>
          <div class="progress-row-controls">
            <label class="progress-count-label" for="progress-count-${gift.id}"><span>今回の達成数</span><span class="progress-number"><input id="progress-count-${gift.id}" data-progress-count="${gift.id}" type="number" inputmode="numeric" min="0" max="${gift.target}" step="1" value="${entry.counts[entry.round - 1]}" aria-label="${gift.name}の今回の達成数（${gift.unit}）" aria-describedby="progress-error-${gift.id}"><span>/ ${gift.target}${gift.unit}</span></span></label>
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
      if (/^\d+$/.test(value) && validCount(Number(value), gift)) {
        invalid.delete(gift.id);
        const entry = state.missions[gift.id];
        entry.counts[entry.round - 1] = Number(value);
        save();
      } else invalid.add(gift.id);
      updateRow(gift);
      updatePreview();
    });
    rows.addEventListener('change', event => {
      const select = event.target.closest('[data-progress-round]');
      if (!select || refresh()) return;
      const id = select.dataset.progressRound;
      const round = Number(select.value);
      if (![1, 2, 3].includes(round)) return;
      state.missions[id].round = round;
      invalid.delete(id);
      save();
      renderRows();
      rows.querySelector(`[data-progress-round="${id}"]`).focus({ preventScroll: true });
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

  return { restore, remaining, comment, dayKey, copyText, mount, LIMIT };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MastersMissionProgress;
