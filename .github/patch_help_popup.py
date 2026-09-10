from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8')

if 'className = "help-topic"' in text:
    print('Usage guide popup UI already applied')
    raise SystemExit(0)

old_sheet = '''    .help-sheet {
      position: relative;
      width: min(460px, 100%);
      max-height: min(72vh, 620px);
      overflow: auto;'''
new_sheet = '''    .help-sheet {
      position: relative;
      width: min(520px, 100%);
      max-height: none;
      overflow: hidden;'''
if old_sheet not in text:
    raise SystemExit('help-sheet anchor not found')
text = text.replace(old_sheet, new_sheet, 1)

old_list = '''    .help-list {
      display: grid;
      gap: 9px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .help-list li {
      padding: 10px 11px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.07);
      color: rgba(255, 255, 255, 0.82);
      font-size: 13px;
      font-weight: 850;
      line-height: 1.55;
    }

    .help-list strong {
      color: #ffffff;
    }'''
new_list = '''    .help-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .help-list li {
      min-width: 0;
      padding: 0;
      border: 0;
      border-radius: 14px;
      background: transparent;
    }

    .help-topic {
      width: 100%;
      min-height: 42px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 6px;
      padding: 7px 9px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.07);
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
      line-height: 1.25;
      text-align: left;
    }

    .help-topic-label {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .help-topic-arrow {
      color: rgba(39, 245, 255, 0.82);
      font-size: 18px;
      line-height: 1;
    }

    .help-detail-overlay {
      position: fixed;
      inset: 0;
      z-index: 115;
      display: grid;
      place-items: center;
      padding: max(16px, env(safe-area-inset-top)) 14px max(16px, env(safe-area-inset-bottom));
    }

    .help-detail-overlay[hidden] { display: none; }

    .help-detail-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(3, 1, 12, 0.74);
      backdrop-filter: blur(7px);
    }

    .help-detail-card {
      position: relative;
      width: min(420px, 100%);
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 22px;
      background:
        radial-gradient(circle at 0% 0%, rgba(255, 79, 216, 0.20), transparent 32%),
        radial-gradient(circle at 100% 0%, rgba(39, 245, 255, 0.16), transparent 32%),
        rgba(18, 8, 32, 0.99);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.66);
      padding: 14px;
    }

    .help-detail-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .help-detail-title {
      margin: 0;
      font-size: 18px;
      font-weight: 950;
      line-height: 1.3;
    }

    .help-detail-close {
      width: 40px;
      min-width: 40px;
      min-height: 40px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.11);
      font-size: 19px;
    }

    .help-detail-body {
      margin: 0;
      color: rgba(255, 255, 255, 0.82);
      font-size: 13px;
      font-weight: 800;
      line-height: 1.65;
    }'''
if old_list not in text:
    raise SystemExit('help-list CSS anchor not found')
text = text.replace(old_list, new_list, 1)

text = text.replace('      .help-list li { padding: 9px 10px; font-size: 12px; }', '      .help-topic { min-height: 38px; padding: 6px 7px; font-size: 11px; }', 1)

js = r'''    function closeHelpDetail() {
      const overlay = document.getElementById("helpDetailOverlay");
      if (overlay) overlay.hidden = true;
    }

    function openHelpDetail(title, body) {
      let overlay = document.getElementById("helpDetailOverlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "helpDetailOverlay";
        overlay.className = "help-detail-overlay";
        overlay.hidden = true;

        const backdrop = document.createElement("div");
        backdrop.className = "help-detail-backdrop";

        const card = document.createElement("section");
        card.className = "help-detail-card";
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-modal", "true");

        const head = document.createElement("div");
        head.className = "help-detail-head";

        const titleEl = document.createElement("p");
        titleEl.id = "helpDetailTitle";
        titleEl.className = "help-detail-title";

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "help-detail-close";
        closeBtn.setAttribute("aria-label", "説明を閉じる");
        closeBtn.textContent = "×";

        const bodyEl = document.createElement("p");
        bodyEl.id = "helpDetailBody";
        bodyEl.className = "help-detail-body";

        head.append(titleEl, closeBtn);
        card.append(head, bodyEl);
        overlay.append(backdrop, card);
        els.helpModal.appendChild(overlay);

        backdrop.addEventListener("click", closeHelpDetail);
        closeBtn.addEventListener("click", closeHelpDetail);
      }

      document.getElementById("helpDetailTitle").textContent = title;
      document.getElementById("helpDetailBody").textContent = body;
      overlay.hidden = false;
      setTimeout(() => overlay.querySelector(".help-detail-close")?.focus(), 0);
    }

    function prepareHelpTopics() {
      els.helpModal.querySelectorAll(".help-list li").forEach(li => {
        const strong = li.querySelector("strong");
        if (!strong) return;

        const strongText = strong.textContent.trim();
        const title = strongText.replace(/：$/, "");
        const body = li.textContent.trim().slice(strongText.length).trim();

        const button = document.createElement("button");
        button.type = "button";
        button.className = "help-topic";
        button.setAttribute("aria-label", `${title}の説明を開く`);

        const label = document.createElement("span");
        label.className = "help-topic-label";
        label.textContent = title;

        const arrow = document.createElement("span");
        arrow.className = "help-topic-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";

        button.append(label, arrow);
        button.addEventListener("click", () => openHelpDetail(title, body));
        li.replaceChildren(button);
      });
    }

'''
anchor = '    function openHelpModal() {'
if anchor not in text:
    raise SystemExit('openHelpModal anchor not found')
text = text.replace(anchor, js + anchor, 1)

free_open = '''    function openHelpModal() {
      trackGaEvent("help_open");
      els.helpModal.hidden = false;'''
if free_open in text:
    text = text.replace(free_open, '''    function openHelpModal() {
      trackGaEvent("help_open");
      prepareHelpTopics();
      els.helpModal.hidden = false;''', 1)
else:
    paid_open = '''    function openHelpModal() {
      updateHelpContent();
      els.helpModal.hidden = false;'''
    if paid_open not in text:
        raise SystemExit('version-specific openHelpModal anchor not found')
    text = text.replace(paid_open, '''    function openHelpModal() {
      updateHelpContent();
      prepareHelpTopics();
      els.helpModal.hidden = false;''', 1)

old_close = '''    function closeHelpModal() {
      els.helpModal.hidden = true;'''
if old_close not in text:
    raise SystemExit('closeHelpModal anchor not found')
text = text.replace(old_close, '''    function closeHelpModal() {
      closeHelpDetail();
      els.helpModal.hidden = true;''', 1)

p.write_text(text, encoding='utf-8')
print('Applied no-scroll title popup usage guide UI')
