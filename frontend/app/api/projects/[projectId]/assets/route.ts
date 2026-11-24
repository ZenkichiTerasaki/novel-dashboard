import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ProjectAssetsResponse, ProjectPresets, ProjectRole } from "@/types";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000";

const ALLOWED_CATEGORIES = ["characters", "bg", "bgm", "se"] as const;
type AssetCategory = (typeof ALLOWED_CATEGORIES)[number];

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm"]);

const IMAGE_MIME_PREFIXES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const AUDIO_MIME_PREFIXES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
  "audio/x-m4a",
];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20MB

function isAllowedCategory(val: string): val is AssetCategory {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(val);
}

function sanitizeFilename(filename: string): string {
  // パストラバーサル防止のため basename を取得し、危険な文字を除去
  const base = path.basename(filename).trim();
  return base.replace(/[\\/:*?"<>|]/g, "_");
}

function getProjectAssetRoot(projectId: string): string {
  const safeId = projectId.replace(/[^0-9]/g, "");
  return path.join(process.cwd(), "public", "assets", "projects", safeId);
}

async function authorizeProjectRequest(
  req: NextRequest,
  projectId: string,
  requiredLevel: "VIEWER" | "EDITOR"
): Promise<
  | { ok: true; role: ProjectRole }
  | { ok: false; response: NextResponse }
> {
  if (!/^\d+$/.test(projectId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "無効なプロジェクトIDです" },
        { status: 400 }
      ),
    };
  }

  const cookieHeader = req.headers.get("cookie") || "";
  if (!cookieHeader) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "ログインが必要です" },
        { status: 401 }
      ),
    };
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_URL}/projects/${projectId}`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "認証サーバーへの接続に失敗しました" },
        { status: 502 }
      ),
    };
  }

  if (backendRes.status === 401) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "セッションが無効または期限切れです" },
        { status: 401 }
      ),
    };
  }

  if (!backendRes.ok) {
    const errBody = await backendRes.json().catch(() => ({}));
    return {
      ok: false,
      response: NextResponse.json(
        { message: errBody.message || "このプロジェクトへのアクセス権限がありません" },
        { status: backendRes.status }
      ),
    };
  }

  const projectData = (await backendRes.json()) as { myRole?: ProjectRole };
  const role: ProjectRole = projectData.myRole ?? "VIEWER";

  if (requiredLevel === "EDITOR" && role !== "OWNER" && role !== "EDITOR") {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "アセット・プリセットの変更には EDITOR 以上の権限が必要です" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, role };
}

function validateUploadedFile(
  category: AssetCategory,
  filename: string,
  file: File,
  buffer: Buffer
): string | null {
  const ext = path.extname(filename).toLowerCase();
  const isImage = category === "characters" || category === "bg";

  if (isImage) {
    if (!IMAGE_EXTENSIONS.has(ext)) {
      return `画像カテゴリ (${category}) では PNG / JPG / WEBP / GIF / SVG のみアップロード可能です`;
    }
    if (file.type && !IMAGE_MIME_PREFIXES.includes(file.type)) {
      return `許可されていないMIMEタイプです (${file.type})`;
    }
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return "画像ファイルは 10MB 以下にしてください";
    }
    if (ext === ".svg") {
      const content = buffer.toString("utf-8");
      if (/<script[\s>]/i.test(content) || /\bon\w+\s*=/i.test(content) || /javascript:/i.test(content)) {
        return "セキュリティ上の理由により、スクリプトを含むSVGファイルはアップロードできません";
      }
    }
  } else {
    if (!AUDIO_EXTENSIONS.has(ext)) {
      return `音声カテゴリ (${category}) では MP3 / WAV / OGG / M4A / AAC / WEBM のみアップロード可能です`;
    }
    if (file.type && !AUDIO_MIME_PREFIXES.includes(file.type)) {
      return `許可されていないMIMEタイプです (${file.type})`;
    }
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
      return "音声ファイルは 20MB 以下にしてください";
    }
  }

  return null;
}

async function readCategoryFiles(projectRoot: string, category: AssetCategory): Promise<string[]> {
  const dir = path.join(projectRoot, category);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, "ja"));
  } catch {
    return [];
  }
}

async function readLocalPresets(projectRoot: string): Promise<ProjectPresets> {
  const filePath = path.join(projectRoot, "presets.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function writeLocalPresets(projectRoot: string, presets: ProjectPresets): Promise<void> {
  await fs.mkdir(projectRoot, { recursive: true });
  const filePath = path.join(projectRoot, "presets.json");
  await fs.writeFile(filePath, JSON.stringify(presets, null, 2), "utf-8");
}

async function buildAssetsResponse(projectRoot: string): Promise<ProjectAssetsResponse> {
  const [characters, bg, bgm, se, presets] = await Promise.all([
    readCategoryFiles(projectRoot, "characters"),
    readCategoryFiles(projectRoot, "bg"),
    readCategoryFiles(projectRoot, "bgm"),
    readCategoryFiles(projectRoot, "se"),
    readLocalPresets(projectRoot),
  ]);

  return {
    files: { characters, bg, bgm, se },
    presets,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const auth = await authorizeProjectRequest(req, projectId, "VIEWER");
  if (!auth.ok) return auth.response;

  const projectRoot = getProjectAssetRoot(projectId);
  const data = await buildAssetsResponse(projectRoot);
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const auth = await authorizeProjectRequest(req, projectId, "EDITOR");
    if (!auth.ok) return auth.response;

    const projectRoot = getProjectAssetRoot(projectId);
    const body = await req.json();
    const presets: ProjectPresets = body?.presets || {};

    await writeLocalPresets(projectRoot, presets);
    const data = await buildAssetsResponse(projectRoot);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "プリセットの保存に失敗しました" },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const auth = await authorizeProjectRequest(req, projectId, "EDITOR");
    if (!auth.ok) return auth.response;

    const projectRoot = getProjectAssetRoot(projectId);

    const formData = await req.formData();
    const categoryRaw = String(formData.get("category") || "");
    const file = formData.get("file");

    if (!isAllowedCategory(categoryRaw)) {
      return NextResponse.json(
        { message: "無効なアセットカテゴリです" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: "アップロードするファイルが指定されていません" },
        { status: 400 }
      );
    }

    const safeFilename = sanitizeFilename(file.name);
    if (!safeFilename || safeFilename.startsWith(".")) {
      return NextResponse.json(
        { message: "無効なファイル名です" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validationError = validateUploadedFile(
      categoryRaw,
      safeFilename,
      file,
      buffer
    );
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const targetDir = path.join(projectRoot, categoryRaw);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, safeFilename), buffer);

    const data = await buildAssetsResponse(projectRoot);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "ファイルアップロードに失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const auth = await authorizeProjectRequest(req, projectId, "EDITOR");
    if (!auth.ok) return auth.response;

    const projectRoot = getProjectAssetRoot(projectId);

    const { searchParams } = new URL(req.url);
    const categoryRaw = searchParams.get("category") || "";
    const filenameRaw = searchParams.get("filename") || "";

    if (!isAllowedCategory(categoryRaw)) {
      return NextResponse.json(
        { message: "無効なアセットカテゴリです" },
        { status: 400 }
      );
    }

    const safeFilename = sanitizeFilename(filenameRaw);
    if (!safeFilename) {
      return NextResponse.json(
        { message: "無効なファイル名です" },
        { status: 400 }
      );
    }

    const targetFile = path.join(projectRoot, categoryRaw, safeFilename);
    try {
      await fs.unlink(targetFile);
    } catch {
      // ファイルが既に存在しない場合は無視
    }

    const data = await buildAssetsResponse(projectRoot);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "ファイルの削除に失敗しました" },
      { status: 500 }
    );
  }
}
