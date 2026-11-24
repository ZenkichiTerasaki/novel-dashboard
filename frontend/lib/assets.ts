export type AssetCategory = "characters" | "bg" | "bgm" | "se";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"];

/**
 * アセット配信のベースURL
 * - ローカル開発時（デフォルト）: "/assets" (frontend/public/assets 配下を参照)
 * - AWS移行時: NEXT_PUBLIC_ASSET_BASE_URL="https://xxxx.cloudfront.net" 等を設定
 */
export function getAssetBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL || "/assets";
  return base.replace(/\/+$/, "");
}

/**
 * 文字列が画像拡張子を持っているか判定
 * （将来のプルダウン選択では拡張子付きファイル名がそのまま格納される想定）
 */
export function hasImageExtension(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * 外部URLまたはルート相対パスかどうかを判定
 */
export function isDirectUrl(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("data:") ||
    lower.startsWith("/")
  );
}

/**
 * DB（Event.data）に保存されたファイル名から表示用URLを解決する
 *
 * ディレクトリ構成（案B: プロジェクト別管理）:
 *   {ASSET_BASE_URL}/projects/{projectId}/{category}/{filename}
 *   例: /assets/projects/1/characters/heroine_smile.png
 */
export function resolveAssetUrl(
  projectId: number | undefined,
  category: AssetCategory,
  rawValue?: string | null
): string | null {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return null;

  // 既にフルURLや "/" 始まりのパスが指定されている場合はそのまま返す
  if (isDirectUrl(trimmed)) {
    return trimmed;
  }

  // 背景(bg)で拡張子がない場合（"classroom", "sunset" 等のキーワード）は
  // 既存のグラデーション推定を使うため null を返す
  if (category === "bg" && !hasImageExtension(trimmed)) {
    return null;
  }

  // 立ち絵(characters)で拡張子が省略されている場合は標準の ".png" を補完
  // （プルダウン実装後は最初から拡張子付きのファイル名が渡されるためそのまま使用される）
  const filename =
    category === "characters" && !hasImageExtension(trimmed)
      ? `${trimmed}.png`
      : trimmed;

  const pid = projectId ?? "default";
  const cleanFilename = filename.replace(/^\/+/, "");

  return `${getAssetBaseUrl()}/projects/${pid}/${category}/${cleanFilename}`;
}
