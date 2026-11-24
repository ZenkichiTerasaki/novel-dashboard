"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import {
  deleteProjectAssetFile,
  getProject,
  getProjectAssets,
  saveProjectPresets,
  uploadProjectAssetFile,
} from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import { Project, ProjectAssetsResponse, ProjectPresets } from "@/types";
import Navbar from "@/components/Navbar";
import RoleBadge, { canEditProject } from "@/components/RoleBadge";

type AssetTab = "characters" | "bg" | "bgm" | "se";

const ASSET_TABS: {
  key: AssetTab;
  presetKey: keyof ProjectPresets;
  label: string;
  icon: string;
  accept: string;
  placeholder: string;
  description: string;
}[] = [
  {
    key: "characters",
    presetKey: "characters",
    label: "立ち絵 (characters)",
    icon: "🎭",
    accept: "image/png,image/webp,image/jpeg,image/svg+xml,image/gif",
    placeholder: "例: heroine_smile.png",
    description: "会話イベントの7ポジション立ち絵スロットで選択できるキャラクター画像です。",
  },
  {
    key: "bg",
    presetKey: "backgrounds",
    label: "背景画像 (bg)",
    icon: "🖼️",
    accept: "image/png,image/webp,image/jpeg,image/svg+xml,image/gif",
    placeholder: "例: bg_classroom_day.svg",
    description: "背景変更 (bg_change) イベントで選択できる背景画像です。",
  },
  {
    key: "bgm",
    presetKey: "bgm",
    label: "BGM (bgm)",
    icon: "🎵",
    accept: "audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/aac",
    placeholder: "例: bgm_daily_theme.mp3",
    description: "BGM再生 (bgm_play) イベントで選択できるBGM音源ファイル名です。",
  },
  {
    key: "se",
    presetKey: "se",
    label: "効果音 (se)",
    icon: "🔊",
    accept: "audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/aac",
    placeholder: "例: se_chime.wav",
    description: "効果音 (sound_effect) イベントで選択できるSE音源ファイル名です。",
  },
];

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}

export default function ProjectAssetsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = parseInt(resolvedParams.projectId, 10);

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AssetTab>("characters");
  const [speakerInput, setSpeakerInput] = useState("");
  const [manualAssetInput, setManualAssetInput] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId && isAuthenticated,
  });

  const { data: assetData, isLoading: assetsLoading } = useQuery<ProjectAssetsResponse>({
    queryKey: ["projectAssets", projectId],
    queryFn: () => getProjectAssets(projectId),
    enabled: !!projectId && isAuthenticated,
  });

  // プロジェクトDB側の presets とローカル presets.json をマージ
  const mergedPresets: Required<ProjectPresets> = useMemo(() => {
    const dbPresets = project?.presets || {};
    const localPresets = assetData?.presets || {};
    return {
      speakers: uniqueStrings([...(dbPresets.speakers || []), ...(localPresets.speakers || [])]),
      characters: uniqueStrings([...(dbPresets.characters || []), ...(localPresets.characters || [])]),
      backgrounds: uniqueStrings([...(dbPresets.backgrounds || []), ...(localPresets.backgrounds || [])]),
      bgm: uniqueStrings([...(dbPresets.bgm || []), ...(localPresets.bgm || [])]),
      se: uniqueStrings([...(dbPresets.se || []), ...(localPresets.se || [])]),
    };
  }, [project?.presets, assetData?.presets]);

  const savePresetsMutation = useMutation({
    mutationFn: (nextPresets: ProjectPresets) =>
      saveProjectPresets(projectId, nextPresets, project?.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectAssets", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (err: Error) => {
      setFeedbackMsg({ type: "error", text: err.message || "プリセットの保存に失敗しました" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ category, file }: { category: AssetTab; file: File }) =>
      uploadProjectAssetFile(projectId, category, file),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectAssets", projectId] });
      setFeedbackMsg({
        type: "success",
        text: `「${variables.file.name}」を ${variables.category} にアップロードしました`,
      });
    },
    onError: (err: Error) => {
      setFeedbackMsg({ type: "error", text: err.message || "アップロードに失敗しました" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: ({ category, filename }: { category: AssetTab; filename: string }) =>
      deleteProjectAssetFile(projectId, category, filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectAssets", projectId] });
    },
    onError: (err: Error) => {
      setFeedbackMsg({ type: "error", text: err.message || "削除に失敗しました" });
    },
  });

  // キャラクター名プリセットの追加
  const handleAddSpeaker = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = speakerInput.trim();
    if (!trimmed) return;
    if (mergedPresets.speakers.includes(trimmed)) {
      setSpeakerInput("");
      return;
    }
    const next: ProjectPresets = {
      ...mergedPresets,
      speakers: [...mergedPresets.speakers, trimmed],
    };
    savePresetsMutation.mutate(next);
    setSpeakerInput("");
    setFeedbackMsg({ type: "success", text: `キャラクター名「${trimmed}」をプリセットに追加しました` });
  };

  // キャラクター名プリセットの削除
  const handleRemoveSpeaker = (name: string) => {
    const next: ProjectPresets = {
      ...mergedPresets,
      speakers: mergedPresets.speakers.filter((s) => s !== name),
    };
    savePresetsMutation.mutate(next);
  };

  const currentTabConfig = ASSET_TABS.find((t) => t.key === activeTab)!;

  // アセットファイル名のプリセット手動追加
  const handleAddManualAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualAssetInput.trim();
    if (!trimmed) return;
    const presetKey = currentTabConfig.presetKey;
    const currentList = mergedPresets[presetKey] || [];
    if (!currentList.includes(trimmed)) {
      const next: ProjectPresets = {
        ...mergedPresets,
        [presetKey]: [...currentList, trimmed],
      };
      savePresetsMutation.mutate(next);
    }
    setManualAssetInput("");
    setFeedbackMsg({
      type: "success",
      text: `「${trimmed}」を ${currentTabConfig.label} の候補リストに追加しました`,
    });
  };

  // ファイル選択アップロード（複数ファイル対応）
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (const file of Array.from(fileList)) {
      await uploadMutation.mutateAsync({ category: activeTab, file });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // アセット削除（実ファイル＋プリセット登録の両方から削除）
  const handleRemoveAsset = async (filename: string, hasPhysicalFile: boolean, isInPreset: boolean) => {
    if (!confirm(`アセット「${filename}」を削除しますか？`)) return;

    if (hasPhysicalFile) {
      await deleteFileMutation.mutateAsync({ category: activeTab, filename });
    }
    if (isInPreset) {
      const presetKey = currentTabConfig.presetKey;
      const next: ProjectPresets = {
        ...mergedPresets,
        [presetKey]: (mergedPresets[presetKey] || []).filter((item) => item !== filename),
      };
      await savePresetsMutation.mutateAsync(next);
    }
    setFeedbackMsg({ type: "success", text: `「${filename}」を削除しました` });
  };

  // 現在のタブにおける「物理ファイル一覧」と「プリセット一覧」の統合リスト
  const currentTabItems = useMemo(() => {
    const physicalSet = new Set(assetData?.files?.[activeTab] || []);
    const presetSet = new Set(mergedPresets[currentTabConfig.presetKey] || []);
    const allNames = Array.from(new Set([...physicalSet, ...presetSet])).sort((a, b) =>
      a.localeCompare(b, "ja")
    );

    return allNames.map((name) => ({
      name,
      hasPhysicalFile: physicalSet.has(name),
      isInPreset: presetSet.has(name),
    }));
  }, [assetData?.files, activeTab, mergedPresets, currentTabConfig.presetKey]);

  if (authLoading || projectLoading || assetsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs">アセット・プリセット管理を読み込み中...</p>
        </div>
      </div>
    );
  }

  const canEdit = canEditProject(project?.myRole);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* パンくずリスト */}
        <nav className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-indigo-400 transition-colors">
            ダッシュボード
          </Link>
          <span>/</span>
          <Link href={`/projects/${projectId}`} className="hover:text-indigo-400 transition-colors">
            {project ? project.name : `プロジェクト #${projectId}`}
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-medium">アセット・プリセット管理</span>
        </nav>

        {/* ヘッダー */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-2xl">
              🎨
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                  アセット・キャラクター名プリセット管理
                </h1>
                <RoleBadge role={project?.myRole} />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                対象プロジェクト:{" "}
                <span className="text-slate-200 font-semibold">
                  {project?.name || `#${projectId}`}
                </span>{" "}
                — ここで登録したアセットやキャラ名はシナリオ編集画面のプルダウンから選択できます
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/projects/${projectId}`}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              ← プロジェクト詳細へ戻る
            </Link>
          </div>
        </div>

        {!canEdit && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <span>👁️</span>
            <span>
              閲覧専用モード（VIEWER）です。アセットの確認・試聴のみ可能です（追加・アップロード・削除には EDITOR 以上の権限が必要です）。
            </span>
          </div>
        )}

        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
              feedbackMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-200 px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* セクション 1: キャラクター名（話者 speaker）プリセット管理 */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>🗣️ キャラクター名（話者）プリセット</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                  {mergedPresets.speakers.length} 名登録済
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                会話イベント（text）の「話者・キャラクター名 (speaker)」でプルダウン選択できる名前一覧です。
              </p>
            </div>
          </div>

          {canEdit && (
            <form onSubmit={handleAddSpeaker} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={speakerInput}
                onChange={(e) => setSpeakerInput(e.target.value)}
                placeholder="キャラクター名を入力 (例: 主人公 / アリス / ナレーション)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!speakerInput.trim() || savePresetsMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors shrink-0"
              >
                ＋ キャラ名を追加
              </button>
            </form>
          )}

          {mergedPresets.speakers.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-800/60 text-center text-xs text-slate-500">
              まだキャラクター名が登録されていません。
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {mergedPresets.speakers.map((speakerName) => (
                <div
                  key={speakerName}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold"
                >
                  <span>👤 {speakerName}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSpeaker(speakerName)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="プリセットから削除"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* セクション 2: アセット管理（立ち絵 / 背景 / BGM / SE） */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              📁 プロジェクトアセット管理 (立ち絵・背景・BGM・効果音)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              保存先ディレクトリ:{" "}
              <code className="text-indigo-300 font-mono">
                public/assets/projects/{projectId}/&#123;characters,bg,bgm,se&#125;/
              </code>
            </p>
          </div>

          {/* カテゴリ切り替えタブ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ASSET_TABS.map((tab) => {
              const count = new Set([
                ...(assetData?.files?.[tab.key] || []),
                ...(mergedPresets[tab.presetKey] || []),
              ]).size;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isActive
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </span>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                      isActive ? "bg-indigo-500/30 text-indigo-100" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-400">{currentTabConfig.description}</p>

          {/* ファイルアップロード & ファイル名プリセット手動登録バー（EDITOR以上のみ） */}
          {canEdit && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 実ファイルアップロード */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-200 mb-1">
                    📤 実ファイルをアップロードして追加
                  </div>
                  <p className="text-[11px] text-slate-400">
                    選択したファイルを{" "}
                    <code className="text-slate-300 font-mono">
                      /assets/projects/{projectId}/{activeTab}/
                    </code>{" "}
                    に保存し、プレビューとプルダウンで即座に利用可能にします。
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={currentTabConfig.accept}
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    {uploadMutation.isPending
                      ? "アップロード中..."
                      : `${currentTabConfig.icon} ファイルを選択してアップロード`}
                  </button>
                </div>
              </div>

              {/* ファイル名のみプリセット登録 */}
              <form
                onSubmit={handleAddManualAsset}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 mb-1">
                    🔖 ファイル名のみをプリセット登録（後から画像/音源を配置する場合）
                  </div>
                  <p className="text-[11px] text-slate-400">
                    実ファイルがまだ手元にない場合でも、予定しているファイル名を登録しておくことでシナリオエディタのプルダウンから選択できます。
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualAssetInput}
                    onChange={(e) => setManualAssetInput(e.target.value)}
                    placeholder={currentTabConfig.placeholder}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!manualAssetInput.trim() || savePresetsMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold shrink-0 transition-colors"
                  >
                    ＋ 候補に追加
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 登録済みアセット一覧グリッド */}
          {currentTabItems.length === 0 ? (
            <div className="p-10 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center space-y-2">
              <div className="text-2xl">{currentTabConfig.icon}</div>
              <div className="text-sm font-semibold text-slate-300">
                {currentTabConfig.label} のアセットがまだありません
              </div>
              <p className="text-xs text-slate-500">
                上のボタンからファイルをアップロードするか、ファイル名を候補に追加してください。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentTabItems.map(({ name, hasPhysicalFile, isInPreset }) => {
                const isImageCategory = activeTab === "characters" || activeTab === "bg";
                const assetUrl = resolveAssetUrl(projectId, activeTab, name);

                return (
                  <div
                    key={name}
                    className="rounded-xl bg-slate-950/80 border border-slate-800/90 overflow-hidden flex flex-col justify-between group hover:border-indigo-500/40 transition-all"
                  >
                    {/* サムネイル or オーディオプレビュー領域 */}
                    {isImageCategory ? (
                      <div className="h-36 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-center p-2 relative overflow-hidden">
                        {hasPhysicalFile && assetUrl ? (
                          <img
                            src={assetUrl}
                            alt={name}
                            className={`max-h-full max-w-full ${
                              activeTab === "bg" ? "w-full h-full object-cover rounded-lg" : "object-contain"
                            }`}
                          />
                        ) : (
                          <div className="text-center px-2">
                            <div className="text-xl mb-1 opacity-50">{currentTabConfig.icon}</div>
                            <span className="text-[10px] text-amber-300/80 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              プリセットのみ (実ファイル未配置)
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                          <span>{currentTabConfig.icon}</span>
                          <span className="truncate font-mono">{name}</span>
                        </div>
                        {hasPhysicalFile && assetUrl ? (
                          <audio controls src={assetUrl} className="w-full h-8" preload="none" />
                        ) : (
                          <span className="text-[10px] text-amber-300/80 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full self-start">
                            プリセットのみ (実ファイル未配置)
                          </span>
                        )}
                      </div>
                    )}

                    {/* フッター: ファイル名・ステータスバッジ・削除ボタン */}
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-semibold text-slate-200 truncate" title={name}>
                          {name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {hasPhysicalFile && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                              実ファイル有
                            </span>
                          )}
                          {isInPreset && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                              プリセット登録
                            </span>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(name, hasPhysicalFile, isInPreset)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          title="削除"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
