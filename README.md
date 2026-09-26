# まなびば（purinto）

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

学習指導要領を基準にした、小学生から高校生向けのプリント生成・Web演習の静的Webアプリです。算数、国語（漢字）、理科、中学・高校数学、漢検対策に対応しています。

## 公開サイト

現在の公開版は次のURLで利用できます。

- **本番サイト:** <https://study.ta26.top/>
- **リポジトリ:** <https://github.com/taitai2661/study>

本番サイトでは、トップページ、プリント生成、Web演習、学習履歴、電卓、単位変換、科学電卓などを提供しています。`https://study.ta26.top/de` のようなパスでもアプリのエントリポイントが返る構成になっています。

## 主な機能

- 小学生・中学生・高校生向けの算数・数学プリント生成
- 国語の学年別漢字、読み書き、漢検対策
- 小学校理科の固定問題と選択問題
- ブラウザ上で取り組めるWeb演習と直近問題の復習
- 印刷・PDF保存に対応した問題・解答ページ
- 四則計算、科学計算、長さ・温度・データ容量などの単位変換
- Service Workerによる、HTTPSまたはlocalhost環境での復習用オフライン対応
- 学習履歴の端末内保存（外部サーバーへのアカウント登録は不要）

## セットアップ

Node.js以外の依存関係はありません。リポジトリのルートで次を実行します。

```sh
node scripts/build-kanken-data.mjs
node --test tests/curriculum.mjs
```

動作確認用の静的サーバーを起動します。

```sh
python3 -m http.server 8000
```

ブラウザで <http://localhost:8000/> を開いてください。`file://` で直接開くと、Service WorkerやES Modulesの制約により一部機能を利用できません。

## テスト

現在のテストスイートはNode.js標準のテストランナーを使っています。

```sh
node --test tests/*.mjs
```

単元一覧の生成を含むCI相当の確認は次のコマンドです。

```sh
node scripts/build-kanken-data.mjs
node --test tests/*.mjs
```

## ディレクトリ構成

- `index.html`: ホーム
- `about/`: 教材の基準と出典
- `web/`: 学習領域選択、単元選択、Web演習、履歴、復習
- `print/`: 問題・解答の印刷画面
- `calculator/`, `scientific-calculator/`: 計算機能
- `converter/`: 単位変換
- `assets/pages/`: ページごとの画面ロジック
- `assets/shared/`: 共通UI・問題生成ロジック
- `assets/data/`: 教材データの読み込み
- `assets/styles/`: スタイルシート
- `data/`: 単元・漢字・問題データ
- `scripts/`: 派生データの生成スクリプト
- `tests/`: 回帰テスト
- `_headers`: 静的ホスト向けのセキュリティヘッダー

## 公開方法

ビルド不要の静的サイトです。HTTPS対応の静的ホストにリポジトリのファイルを配置できます。Cloudflare Pagesで公開する場合の設定例は次のとおりです。

- Production branch: `main`
- Framework preset: `None`
- Build command: `node scripts/build-kanken-data.mjs && node --test tests/*.mjs`
- Build output directory: `.`

`main`へのプッシュ後にテストとデプロイを行うCI設定を `.github/workflows/ci.yml` に含めています。別の静的ホストを利用する場合は、同じビルドコマンドを実行してから、リポジトリルートを公開してください。

## 教材と出典

教材は独自の文章・問題生成ロジックで作成し、基礎単元の一覧を `data/units-index.base.json`、問題生成に必要な詳細情報を `data/units/` に保持しています。

- 学年別漢字配当、音訓・例の基礎データは [mimneko/kanji-data](https://github.com/mimneko/kanji-data) を参照・加工しています。元データは [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/deed.ja) です。
- 学年配当は文部科学省の学習指導要領を参照しています。
- 音訓・例は文化庁の常用漢字表を参照しています。
- `data/kanji-facts.json` の画数・部首番号は [KANJIDIC2](https://www.edrdg.org/kanjidic/kanjd2index_legacy.html) を教育漢字に限定して抽出・加工しています。

詳細なURL、対象ファイル、ライセンスは [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) を確認してください。第三者データのライセンスと、本プロジェクト独自のコード・教材の権利は別に扱われます。

教材の検証方針と過去の修正内容は [`CONTENT_AUDIT.md`](CONTENT_AUDIT.md) に記録しています。

## ライセンス

本リポジトリの独自のコード、画面、スタイル、問題生成ロジック、独自教材は、特段の記載がない限り **Apache License 2.0** の下で公開します。全文は [`LICENSE`](LICENSE) を参照してください。

第三者のデータ・資料はApache-2.0の対象ではありません。再配布・改変する場合は、必ず [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) に記載された各データのライセンスと出典に従ってください。

## コントリビューション

バグ報告、教材の改善提案、アクセシビリティや表示環境に関する報告を歓迎します。変更を加える場合は、既存のテストを実行し、教材データを変更したときは出典とライセンス情報も更新してください。

## 注意事項

本アプリは教育用途の補助を目的としています。学習指導要領や各種資料を参考にしていますが、学校・自治体・教科書によって扱う範囲や表現が異なる場合があります。内容の正確性・完全性を保証するものではありません。
