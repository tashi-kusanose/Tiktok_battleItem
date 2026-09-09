from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")
marker = "LIVE_GLOVE_COPY_V1"
if marker in text:
    print("Already patched")
    raise SystemExit(0)

css = '''
    /* LIVE_GLOVE_COPY_V1 */
    .live-copy-panel{display:grid;gap:8px;margin:0 0 14px;padding:11px 12px;border:1px solid rgba(39,245,255,.30);border-radius:18px;background:linear-gradient(135deg,rgba(255,79,216,.11),rgba(39,245,255,.09))}
    .live-copy-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
    .live-copy-title{font-size:13px;font-weight:950;line-height:1.35}.live-copy-help,.live-copy-status{color:var(--muted);font-size:11px;font-weight:800;line-height:1.45}
    .live-copy-btn{min-height:42px;padding:0 13px;border:1px solid rgba(39,245,255,.32);background:linear-gradient(135deg,rgba(255,79,216,.25),rgba(39,245,255,.18));white-space:nowrap;font-size:12px}
    .presence-toggle{width:55px;min-width:55px;min-height:52px;display:grid;place-items:center;align-content:center;gap:2px;border:1px solid rgba(39,245,255,.28);border-radius:14px;background:rgba(39,245,255,.08);color:rgba(255,255,255,.86);cursor:pointer;user-select:none;font-size:10px;font-weight:950}
    .presence-toggle input{width:20px;height:20px;margin:0;accent-color:#27f5ff;cursor:pointer}
    .person-top{grid-template-columns:minmax(0,1fr) auto auto auto}
    @media(max-width:560px){.presence-toggle{width:48px;min-width:48px;min-height:46px;font-size:9px}.presence-toggle input{width:18px;height:18px}.live-copy-row{grid-template-columns:1fr}.live-copy-btn{width:100%}}
'''
if "    .panel {" not in text:
    raise SystemExit("CSS anchor not found")
text = text.replace("    .panel {", css + "\n    .panel {", 1)

panel = '''
    <section class="live-copy-panel" aria-label="配信中コメント用">
      <div class="live-copy-row"><div><div class="live-copy-title">🥊 配信中「誰が持ってる？」</div><div class="live-copy-help">名前横の「枠内」にチェック → 🥊残り時間が短い順でコメント用短文をコピーします。</div></div><button class="live-copy-btn" type="button" id="copyPresentGlovesBtn" disabled>📋 🥊在席者をコピー</button></div>
      <div class="live-copy-status" id="presentCopyStatus" aria-live="polite">在席チェックは再読み込みで解除されます。</div>
    </section>'''
pattern = re.compile(r'(<section class="panel" aria-label="操作パネル">.*?</section>)', re.S)
text, n = pattern.subn(lambda m: m.group(1) + "\n" + panel, text, count=1)
if n != 1:
    raise SystemExit("Panel anchor not found")

anchor = "    let state = loadState();\n"
if anchor not in text:
    raise SystemExit("State anchor not found")
text = text.replace(anchor, anchor + "    const presentPersonIds = new Set();\n", 1)

presence = '''            <label class="presence-toggle" title="今この枠にいる">
              <input type="checkbox" data-presence-id="${person.id}" ${presentPersonIds.has(String(person.id)) ? "checked" : ""} aria-label="${escapeHtml(person.name || "名前未入力")}が今この枠にいる" />
              <span>枠内</span>
            </label>
'''
render_anchor = '            </button>\n            <button class="rename-btn" type="button" data-action="rename" aria-label="名前を編集">✎</button>'
if render_anchor not in text:
    raise SystemExit("Person anchor not found")
text = text.replace(render_anchor, '            </button>\n' + presence + '            <button class="rename-btn" type="button" data-action="rename" aria-label="名前を編集">✎</button>', 1)

js = '''
    // LIVE_GLOVE_COPY_V1
    function getPresentGloveEntries() {
      const validIds = new Set(state.map(person => String(person.id)));
      for (const id of Array.from(presentPersonIds)) if (!validIds.has(id)) presentPersonIds.delete(id);
      return state.filter(person => presentPersonIds.has(String(person.id)) && Number(person.counts?.glove || 0) > 0).map(person => {
        const expirations = getActiveExpirations(person, "glove");
        return { person, expiresAt: expirations.length ? expirations[0] : Number.POSITIVE_INFINITY };
      }).sort((a,b) => a.expiresAt - b.expiresAt);
    }
    function formatLiveGloveRemaining(expiresAt) {
      if (!Number.isFinite(expiresAt)) return "";
      const totalMinutes = Math.max(0, Math.ceil((expiresAt - Date.now()) / 60000));
      const days = Math.floor(totalMinutes / 1440), hours = Math.floor((totalMinutes % 1440) / 60), minutes = totalMinutes % 60;
      if (days > 0) return `${days}日${hours}h`;
      if (hours > 0) return `${hours}h${minutes ? `${minutes}m` : ""}`;
      return `${minutes}m`;
    }
    function buildPresentGloveComment() {
      const entries = getPresentGloveEntries();
      if (!entries.length) return "";
      return `🥊 ${entries.map(({person,expiresAt}) => { const t=formatLiveGloveRemaining(expiresAt); return `${String(person.name || "名前未入力").trim()}${t ? ` ${t}` : ""}`; }).join("｜")}`;
    }
    function updatePresenceCopyButton(message="") {
      const button=document.getElementById("copyPresentGlovesBtn"), status=document.getElementById("presentCopyStatus");
      if (!button || !status) return;
      const entries=getPresentGloveEntries(); button.disabled=!entries.length;
      if (message) status.textContent=message;
      else if (entries.length) status.textContent=`🥊所持＋枠内チェック：${entries.length}人（短い時間順）`;
      else if (presentPersonIds.size) status.textContent="枠内チェック中の人に🥊所持者はいません。";
      else status.textContent="名前横の「枠内」にチェックしてください。在席状態は再読み込みで解除されます。";
    }
    async function copyLiveCommentText(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      const ta=document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); const ok=document.execCommand("copy"); ta.remove(); if(!ok) throw new Error("copy failed");
    }
    els.people.addEventListener("change", event => {
      const cb=event.target.closest("[data-presence-id]"); if(!cb || !els.people.contains(cb)) return;
      const id=String(cb.dataset.presenceId || ""); if(!id) return;
      if(cb.checked) presentPersonIds.add(id); else presentPersonIds.delete(id); updatePresenceCopyButton();
    });
    document.getElementById("copyPresentGlovesBtn")?.addEventListener("click", async () => {
      const text=buildPresentGloveComment(); if(!text) return updatePresenceCopyButton();
      try { await copyLiveCommentText(text); const n=getPresentGloveEntries().length; updatePresenceCopyButton(`✅ ${n}人分の🥊情報をコピーしました。コメント欄に貼り付けできます。`); if(typeof trackShareEvent === "function") trackShareEvent("live_glove_comment_copy",{holder_count:n}); }
      catch(error){ console.error(error); updatePresenceCopyButton("コピーできませんでした。もう一度お試しください。"); }
    });
    new MutationObserver(() => updatePresenceCopyButton()).observe(els.people,{childList:true});
    updatePresenceCopyButton();
'''
event_anchor = '    els.modalItems.addEventListener("click", event => {'
if event_anchor not in text:
    raise SystemExit("Event anchor not found")
text = text.replace(event_anchor, js + "\n" + event_anchor, 1)
path.write_text(text, encoding="utf-8")
print("Patched index.html")
