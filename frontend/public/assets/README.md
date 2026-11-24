# アセット配置ディレクトリ (案B: プロジェクト別管理)

このディレクトリは、ローカル開発時 (`NEXT_PUBLIC_ASSET_BASE_URL=/assets` デフォルト) にプレビュー画面が参照する画像・音声アセットのルートディレクトリです。

## ディレクトリ構成（S3バケット構造と共通）

```text
frontend/public/assets/
└── projects/
    └── {projectId}/          # プロジェクトID (例: 1, 2, ...)
        ├── characters/       # 立ち絵画像 (例: heroine_smile.png)
        ├── bg/               # 背景画像 (例: classroom_day.png)
        ├── bgm/              # BGM音源 (例: daily_theme.mp3)
        └── se/               # 効果音 (例: chime.wav)
```

## DBへの保存形式と将来のプルダウン選択について
- DB (`Event.data`) には **`heroine_smile.png` のような拡張子付きのファイル名のみ** を保存します。
- 将来、各ディレクトリ（またはS3のプレフィックス `projects/{projectId}/characters/`）のファイル一覧を取得してプルダウン選択UIを実装する際も、取得したファイル名をそのまま保存・表示できるため、データ移行や修正は不要です。
- AWS (S3 + CloudFront) へ移行する際は、`frontend/.env.local` 等で `NEXT_PUBLIC_ASSET_BASE_URL=https://xxxx.cloudfront.net` を設定するだけで切り替わります。
