from pathlib import Path
import re

p = Path("index.html")
text = p.read_text(encoding="utf-8")

new_help = '''      <ul class="help-list">
        <li><strong>名前を追加：</strong>入力欄に名前を入れると「＋ 人を追加」が押せます。</li>
        <li><strong>表示順：</strong>🥊グローブを持っている人は、一番短い残り時間が近い順に上から表示します。グローブを持っていない人はその下に表示します。</li>
        <li><strong>トップ画面：</strong>名前の下に各アイテムの所持数と、そのアイテムで一番短い残り時間を表示します。</li>
        <li><strong>アイテム編集：</strong>名前またはトップ画面のアイテムをタップすると、中央ポップアップで＋/−できます。</li>
        <li><strong>残り時間確認：</strong>編集ポップアップ内のアイテム部分をタップすると、同じアイテムを複数持っている場合も1個ずつの残り時間を確認できます。</li>
        <li><strong>「枠内」チェック：</strong>今この配信枠にいる人の名前横にある「枠内」にチェックします。チェックはこの端末だけの一時情報で、再読み込みすると解除されます。</li>
        <li><strong>🥊在席者をコピー：</strong>「枠内」にチェックした人のうち🥊グローブを持っている人だけを抽出し、残り時間が短い順にTikTok LIVEコメント用の短文としてコピーします。</li>
        <li><strong>共有：</strong>上部の「共有」から紹介文をコピー・共有できます。推し枠向け／リスナー仲間／配信者向けを選べ、管理中の名前や所持数を含めずに9:16の紹介画像も作成できます。</li>
        <li><strong>自動期限・削除：</strong>＋で増やしたアイテムは5日後に自動で減り、全アイテムが0になった名前は自動で削除されます。</li>
        <li><strong>データ保存：</strong>「💾 データ保存」を押すと、名前・個数・残り時間を含む保存用データをコピーできます。有料版への引き継ぎにも使えます。</li>
      </ul>'''

pattern = r'      <ul class="help-list">.*?</ul>(?=\n      <button class="transfer-btn" id="exportTransferBtn")'
updated, count = re.subn(pattern, new_help, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f"help list replacement count={count}")

p.write_text(updated, encoding="utf-8")
print("Updated free usage guide")
