# イベントページの一般公開

公開URL: https://tashi-kusanose.github.io/Tiktok_battleItem/events/

## 構成

- `events/index.html`: バナー4枚のイベント一覧。
- `events/masters/`: MASTERS。スマホの文字切れ修正を含む。
- `events/community-boost/`: COMMUNITY BOOST。
- `events/king-of-stage/`: THE KING OF STAGE。
- `events/music-stage/`: MUSIC STAGE（2026/10/19〜25）。チーム別ミッション・1日分の計算・特典・提供画像原本。
- 各イベント上部の「イベント一覧」からまとめページへ戻る。

GitHub Pagesは既存のmainブランチのルート公開を使用する。
ページ、画像、計算処理はGitHub内に保持し、閲覧者にログインを求めない。

## Supabase

既存プロジェクト内の `public.kazz_event_pages` がリンク、表示順、一覧での表示可否を管理する。
`anon` と `authenticated` は `published = true` の行のSELECTだけを許可する。
INSERT・UPDATE・DELETEは一般利用者に許可しない。管理はSupabaseのTable Editorから行う。
`events/config.mjs` はブラウザ公開用のpublishable keyだけを含む。

`sort_order` を変えるとバナーの並び順が変わる。`published` は一覧での表示制御であり、
公開済みHTMLそのもののアクセス制御ではない。API障害・通信失敗時は、HTMLに保存した
4件のリンクを引き続き表示する。取得失敗時にローディング画面やエラーで閲覧を妨げない。

新イベントを増やすときは、ページとバナーを追加し、`catalog.mjs` の許可済みリンク一覧、
HTMLの `data-event`、DBの `slug` / `page_path` をそろえる。

## 確認

```sh
node --test tests/event-catalog.test.mjs tests/music-stage.test.mjs
```

公開前にローカル参照ファイルと戻るリンクを確認し、公開後に一覧と全イベントが
ログインなしでHTTP 200になること、Supabaseが4件を返し書き込み権限がないことを確認する。

移植元のChatGPT Sitesは別のURLとして維持する。公開用ページはGitHubで管理する。

## Music Stageの資料差異

- 限定ギフト資料は1コイン=10pt、特典表は1ダイヤ=10pt。このガイドは限定ギフトのコイン基準を採用し、通常ギフトには実獲得ダイヤの入力を使用する。
- デイリー最大63万ptの記載と個別表が不一致。訪問を除く個別報酬合計は暁・雅670,000pt、華435,000pt。計算は各ミッションの回数上限を適用し、全体上限は未確定として参考値を表示する。
- ランキングページ確認の上限は「—」。1回分だけを選択式で加算し、毎日必ず付与されるとは断定しない。
- 成長ボーナス最大3,550,000pt/日は確認済みptの手入力。段階別の条件は補完しない。
- PR動画は紹介画像のTOP3表記と詳細の出演決定者表記が異なるため、両方を注記する。
