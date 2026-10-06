"use client";

import React, { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { getScenario, getEvents, getProject } from "@/lib/api";
import { Scenario, Event, Project, DraftEvent } from "@/types";

import Navbar from "@/components/Navbar";
import EventForm from "@/components/EventForm";
import EventTimeline from "@/components/EventTimeline";
import GamePreview from "@/components/GamePreview";

export default function ScenarioEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; scenarioId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = parseInt(resolvedParams.projectId, 10);
  const scenarioId = parseInt(resolvedParams.scenarioId, 10);

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // プレビュー関連のステート
  const [showPreview, setShowPreview] = React.useState(true);
  const [previewIndex, setPreviewIndex] = React.useState(0);
  const [previewMode, setPreviewMode] = React.useState<"timeline" | "draft">("timeline");
  const [draftEvent, setDraftEvent] = React.useState<DraftEvent | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // プロジェクト情報取得
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId && isAuthenticated,
  });

  // シナリオ情報取得
  const {
    data: scenario,
    isLoading: scenarioLoading,
    isError: scenarioError,
  } = useQuery<Scenario>({
    queryKey: ["scenario", scenarioId],
    queryFn: () => getScenario(scenarioId),
    enabled: !!scenarioId && isAuthenticated,
  });

  // イベント一覧取得
  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useQuery<Event[]>({
    queryKey: ["events", scenarioId],
    queryFn: () => getEvents(scenarioId),
    enabled: !!scenarioId && isAuthenticated,
  });

  // タイムラインから特定のイベントをプレビュー選択
  const handleSelectPreviewIndex = (index: number) => {
    setPreviewIndex(index);
    setPreviewMode("timeline");
    if (!showPreview) setShowPreview(true);
  };

  // 下書き入力時のコールバック
  const handleDraftChange = (draft: DraftEvent) => {
    setDraftEvent(draft);
  };

  // 下書き追加成功時
  const handleDraftSubmit = () => {
    setDraftEvent(null);
    setPreviewMode("timeline");
    // 新しく追加された最新イベントにプレビューをフォーカス
    setPreviewIndex(events.length);
  };

  if (authLoading || scenarioLoading || eventsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs">シナリオエディタを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (scenarioError || !scenario) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12">
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center">
            <h2 className="text-lg font-bold mb-2">エラーが発生しました</h2>
            <p className="text-sm text-rose-400/80 mb-4">シナリオデータが見つかりません</p>
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              プロジェクトへ戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* パンくずナビゲーション */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
          <Link href="/" className="hover:text-indigo-400 transition-colors">
            ダッシュボード
          </Link>
          <span>/</span>
          <Link href={`/projects/${projectId}`} className="hover:text-indigo-400 transition-colors">
            {project ? project.name : `プロジェクト #${projectId}`}
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-medium">{scenario.name}</span>
        </nav>

        {/* シナリオヘッダー */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-2xl">
              🎬
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                {scenario.name}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                イベント件数: <span className="font-semibold text-slate-200">{events.length}</span> 件
              </p>
            </div>
          </div>

          {/* 右側アクションボタングループ */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                showPreview
                  ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
              }`}
            >
              <span>{showPreview ? "🎮 プレビューを隠す" : "🎮 プレビューを表示"}</span>
            </button>

            {events.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPreviewIndex(0);
                  setPreviewMode("timeline");
                  if (!showPreview) setShowPreview(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>▶ 最初から再生</span>
              </button>
            )}

            <Link
              href={`/projects/${projectId}`}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              ← シナリオ一覧へ戻る
            </Link>
          </div>
        </div>

        {/* メインコンテンツ (2カラム分割レイアウト) */}
        <div className={`grid grid-cols-1 gap-8 items-start ${showPreview ? "lg:grid-cols-12" : ""}`}>
          {/* 左カラム: イベント作成フォーム & タイムライン */}
          <div className={showPreview ? "lg:col-span-7 xl:col-span-7 space-y-6" : "space-y-6"}>
            {/* イベント追加フォーム */}
            <EventForm
              scenarioId={scenarioId}
              onDraftChange={handleDraftChange}
              onDraftSubmit={handleDraftSubmit}
            />

            {/* イベントタイムライン (並べ替え DnD) */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <span>演出タイムライン</span>
                <span className="text-xs font-normal text-slate-400">
                  (カードをドラッグまたは矢印で並べ替え可能)
                </span>
              </h2>
            </div>

            <EventTimeline
              scenarioId={scenarioId}
              events={events}
              previewIndex={previewMode === "timeline" ? previewIndex : undefined}
              onSelectPreviewIndex={handleSelectPreviewIndex}
            />
          </div>

          {/* 右カラム: スティッキーノベルゲームプレビュー画面 */}
          {showPreview && (
            <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6 space-y-4">
              <GamePreview
                events={events}
                currentIndex={previewIndex}
                onIndexChange={setPreviewIndex}
                draftEvent={draftEvent}
                previewMode={previewMode}
                onModeChange={setPreviewMode}
                scenarioName={scenario.name}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
