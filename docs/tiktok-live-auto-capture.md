# LIVE BOOST調査とKazzCompanyへの導入候補

確認日：2026年10月4日（日本時間）。公開情報に基づく調査で、LIVE BOOSTのログイン後の画面や実配信での精度は未検証です。

## 調査結果

ユーザーのGoogle共有リンクは [LIVE BOOST](https://boost.kiseki-livelabo.com/) に転送されました。公開ページでは、貢献履歴、コメント、新規・再来・定着、バトル分析を案内しています。公開料金は税込49,800円/月、14日間無料試用です。料金は利用サービスの表示であり、KazzCompanyへの連携API料金ではありません。

外部提供用API、Webhook、データ出力の仕様は今回確認できませんでした。内部の取得方式がEuler Streamなのか、別の方式なのかも特定していません。紹介ページの機能説明は提供元の説明であり、全データを欠落なく取得できる証明ではありません。

[KISEKI利用規約](https://kiseki-livelabo.com/terms)はLIVE BOOSTも対象に含め、第6条にサービス内コンテンツ・データの自動収集禁止を記載しています。直接連携は、運営元が許可・提供する経路が確認できてから判断します。KazzCompany側に同社サイトからの収集処理は実装しません。

同規約のTikTokログイン説明は本人確認用の識別子・表示情報の取得です。TikTokログインを設置しただけでLIVEの全情報が取れると判断する根拠にはなりません。TikTokの[公開スコープ一覧](https://developers.tiktok.com/docs/en/tiktok-api-scopes)でも、今回必要なLIVE通知・所持アイテムを取得する一般公開のスコープは確認できませんでした。限定的なパートナー向け提供の有無まで否定するものではありません。

## 実装候補

[Euler Stream](https://www.eulerstream.com/)は第三者提供のTikTok LIVE APIです。同社の[WebSocket仕様](https://www.eulerstream.com/docs/api/websockets)・[イベント説明](https://www.eulerstream.com/docs/api/client-sdks/websocket-sdk/events)に、コメント、ギフト、入室、フォロー、視聴者数等の受信機能が記載されています。[LIVE Alerts](https://www.eulerstream.com/docs/sign-server/live-alerts)には配信ルームの状態通知とWebhookが記載されています。これらはKazzCompanyへの導入候補であり、LIVE BOOSTの採用方式を示すものではありません。

| KazzCompanyでの用途 | 現時点での判断 |
| --- | --- |
| 貢献者・ギフトの記録 | APIに必要な通知の説明あり。連続ギフトの扱いと実配信での精度を検証する |
| コメント・再来訪 | 観測できたユーザーIDの履歴から実装候補。全視聴者の網羅や滞在時間は保証しない |
| 配信者ホームのLIVE表示 | ルーム状態通知で実装候補。切断を配信終了と区別し、重複通知を防ぐ |
| 🥊等の獲得・使用 | 通常ギフトとは別の検証が必要。所持者ID・種類・増減の実データを確認する |
| 連携開始前の残数・履歴 | 取得できることは未確認。取得後の通知だけでは復元できない |

技術構成の候補は「公開LIVEの通知 → 受信処理 → 記録・重複除外 → 既存の共有用保存先 → 管理・閲覧ページ」です。スマホを閉じても取り続ける場合、受信処理を常時動かす環境が必要です。配信開始の通知だけなら、提供元のWebhook方式も検討できます。無料版のブラウザ内保存だけで常時自動取得が完成するわけではありません。

## 費用・提供条件

- [Euler Stream料金](https://www.eulerstream.com/pricing)：確認時点でCommunity $0、Business $50/月の表示あり。Communityには2,500 requests/day、25 Cloud WebSockets、5 TikTok LIVE Alertsと表示。枠の実効条件、対象経路、追加機能はアカウント画面で確認する。
- 受信サーバー・保存先・監視の費用は別。接続人数・配信時間・保存範囲が未確定なので、合計月額は未算出。
- [Euler Stream利用規約](https://www.eulerstream.com/terms)第7条は、自社製品の機能としての利用と、生API・データの再提供を区別している。KazzCompanyでの契約・利用形態が条件に合うかを本番公開前に確認する。契約しただけでTikTok公式連携になるわけではない。
- 検証プログラムは登録・課金・プラン変更を行わない。実行には利用者自身のAPIキーが必要。

## 今回の実装範囲

[tools/live-probe](../tools/live-probe/README.md) に、1枠の受信プログラムと架空データの再生を追加しました。通信先はEuler Streamに固定し、APIキーは環境変数から読み、ブラウザやリポジトリには配置しません。JSONモードの指定とイベント形式は、提供元の[SDKソース](https://github.com/EulerStream/Euler-WebSocket-SDK)を参照しています。

実装したのは受信・観測の段階です。公開ページ、既存の在庫、データベース、フォロワーへの通知への反映は未実装です。対象の公開配信とAPI設定が整った段階で実配信テストを行い、その結果に基づいて反映処理を追加します。

確認済み：単体テスト7件成功、架空データの再生成功（ギフト通知2件、重複除外1件、観測ユーザー1人、在庫操作0件）。実配信の接続成功や取得精度を示すテストではありません。
