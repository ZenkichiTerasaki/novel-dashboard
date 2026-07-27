# フロントエンド開発方針書 (Frontend Development Plan)

`backend` のソースコードおよび API 仕様の分析に基づき策定した、`frontend` (Next.js App Router) の開発方針および実装ロードマップです。

---

## 1. バックエンド仕様の分析要約

バックエンドは **NestJS + Prisma + JWT Auth** で構成されており、各コントローラーには `JwtAuthGuard` による保護が組み込まれています。

| モジュール | 主な機能・エンドポイント | リクエスト・レスポンスの特徴 |
|---|---|---|
| **Auth / User** | `POST /users`<br>`POST /auth/login` | ユーザー登録・ログイン処理。ログイン成功時に JWT トークン (`{ access_token }`) を返却。 |
| **Project** | `GET /projects`<br>`POST /projects`<br>`GET /projects/:id`<br>`PATCH /projects/:id`<br>`DELETE /projects/:id` | 全エンドポイント要認証。ログイン中ユーザーが所属するプロジェクト一覧取得や、自動 OWNER 権限付与のプロジェクト作成。 |
| **Scenario** | `GET /projects/:projectId/scenarios`<br>`POST /projects/:projectId/scenarios`<br>`GET /scenarios/:id`<br>`PATCH /scenarios/:id`<br>`DELETE /scenarios/:id` | プロジェクト配下のシナリオのCRUD操作。要認証。 |
| **Event** | `GET /scenarios/:scenarioId/events`<br>`POST /scenarios/:scenarioId/events`<br>`PATCH /scenarios/:scenarioId/events/order`<br>`PATCH /events/:id`<br>`DELETE /events/:id` | シナリオ配下の演出・テキストイベントのCRUDおよびドラッグ＆ドロップ等による一括順序変更機能（`orderIndex`）。 |

---

## 2. フロントエンドの全体アーキテクチャ方針

### 2.1 技術スタック
- **フレームワーク**: Next.js (App Router, React 19)
- **状態管理・データ取得**: TanStack Query (`@tanstack/react-query`)
- **スタイリング**: Tailwind CSS v4 (ダークモード基調、ガラスモルフィズム、洗練されたクリエイター向けダッシュボード UI)
- **インタラクション / DnD**: `@dnd-kit/core`, `@dnd-kit/sortable` (イベント順序入れ替え用)
- **アイコン**: `lucide-react`

### 2.2 認証・API クライアント層
1. **JWT トークン管理 (`lib/auth.ts`, `AuthContext`)**:
   - `localStorage` または `Cookie` に `access_token` を保持。
   - ログイン状態のグローバル管理 (`useAuth` フック)。未認証時は `/login` へ自動リダイレクト。
2. **共通 API クライアント (`lib/api.ts`)**:
   - リクエスト時に自動で `Authorization: Bearer <token>` ヘッダーを付与。
   - 401 Unauthorized エラー発生時の自動ログアウト処理。

---

## 3. 画面構造・ルーティング設計

```
app/
├── (auth)/
│   ├── login/page.tsx         # ログイン画面
│   └── register/page.tsx      # 新規ユーザー登録画面
├── (dashboard)/
│   ├── page.tsx               # ダッシュボード (プロジェクト一覧・作成・削除)
│   └── projects/
│       └── [projectId]/
│           ├── page.tsx       # プロジェクト詳細 兼 シナリオ一覧・管理
│           └── scenarios/
│               └── [scenarioId]/page.tsx  # シナリオ・イベント編集画面 (メインエディタ)
```

### 各画面の詳細役割

1. **ログイン / 新規登録画面 (`/login`, `/register`)**
   - タブ切り替えまたは個別ページでシンプルかつスタイリッシュな認証フォーム。
   - ログイン成功時にトークンを保存し、ダッシュボード `/` へリダイレクト。

2. **プロジェクト一覧ダッシュボード (`/`)**
   - 自分が参加しているプロジェクトカード一覧のグリッド表示。
   - プロジェクト新規作成モーダル/フォーム。
   - プロジェクト編集・削除メニュー。

3. **プロジェクト詳細・シナリオ管理画面 (`/projects/[projectId]`)**
   - プロジェクト情報表示。
   - シナリオ一覧（カード/リスト形式）と新規シナリオ作成。
   - シナリオごとのイベント数や更新日時の表示。

4. **イベントタイムラインエディタ画面 (`/projects/[projectId]/scenarios/[scenarioId]`)**
   - **タイムライン・イベントリスト**:
     - `Event` のリスト（`orderIndex` 順）。
     - ドラッグ＆ドロップによるイベント前後の入れ替え（`PATCH /scenarios/:scenarioId/events/order` 呼び出し）。
   - **イベントパラメータ編集パネル**:
     - `eventType`（例: `text`, `bg_change`, `bgm_play`, `selection` など）の選択。
     - `param1`〜`param6` を `eventType` に応じてフォーム表示（例: `text` 選択時は `param1`＝キャラ名, `param2`＝セリフ本文）。
   - **リアルタイムプレビュー枠 (任意/拡張機能)**:
     - 登録されたイベント（背景＋キャラ名＋セリフ）を簡易的にシミュレーション表示するプレビュー画面。

---

## 4. 段階的実装ロードマップ

### Phase 1: 認証基盤 & 共通 API クライアントの構築
- [ ] `lib/api.ts` の拡張（Bearer トークン自動設定・エラーハンドリング）
- [ ] `AuthProvider` / `useAuth` フックの実装
- [ ] `/login` および `/register` ページの作成

### Phase 2: ダッシュボード & プロジェクト・シナリオ CRUD UI
- [ ] プロジェクト一覧・作成・編集・削除 UI の強化 (`/`)
- [ ] プロジェクト詳細 兼 シナリオ一覧・作成・削除 UI (`/projects/[id]`)
- [ ] レイアウト共通コンポーネント（サイドバー / ヘッダー / ユーザープロファイル表示）

### Phase 3: イベントエディタ & ドラッグ＆ドロップ並べ替え
- [ ] イベント一覧表示・追加・編集・削除フォーム (`/projects/[id]/scenarios/[scenarioId]`)
- [ ] `eventType` ごとのパラメータ構造化フォーム（テキスト、背景、BGM等のタイプ別入力フィールド）
- [ ] `@dnd-kit` を利用したドラッグ＆ドロップによる順序変更（`PATCH /scenarios/:scenarioId/events/order` 連携）

### Phase 4: UI/UX デザインの洗練 & プレビュー機能拡張
- [ ] ノベル開発者に適したモダンなダークテーマ・アニメーション・レスポンシブ対応
- [ ] 簡易イベントプレビューコンポーネント（セリフ枠や背景プレビュー）
