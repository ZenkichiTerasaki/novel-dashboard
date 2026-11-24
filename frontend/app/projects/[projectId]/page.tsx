"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { getProject } from "@/lib/api";
import { Project } from "@/types";

import Navbar from "@/components/Navbar";
import ProjectHeader from "@/components/ProjectHeader";
import ProjectMembersPanel from "@/components/ProjectMembersPanel";
import ScenarioForm from "@/components/ScenarioForm";
import ScenarioList from "@/components/ScenarioList";
import { canEditProject } from "@/components/RoleBadge";

type ProjectTab = "scenarios" | "members";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = parseInt(resolvedParams.projectId, 10);

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProjectTab>("scenarios");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    data: project,
    isLoading: projectLoading,
    isError,
    error,
  } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId && isAuthenticated,
  });

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs">プロジェクト情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12">
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center">
            <h2 className="text-lg font-bold mb-2">エラーが発生しました</h2>
            <p className="text-sm text-rose-400/80 mb-4">{String(error || "プロジェクトが見つかりません")}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              ダッシュボードへ戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  const canEdit = canEditProject(project.myRole);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectHeader project={project} />

        {/* ロール別ダッシュボード案内 */}
        {project.myRole === "VIEWER" && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <span>👁️</span>
            <span>
              現在 <strong>VIEWER（閲覧者）</strong> として表示しています。シナリオ閲覧・ゲームプレビュー再生・CSV書き出しが利用可能です（編集・削除操作は非表示になっています）。
            </span>
          </div>
        )}

        {/* タブ切替（シナリオ一覧 / メンバー・共有管理） */}
        <div className="mb-6 flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("scenarios")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "scenarios"
                ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <span>📜 シナリオ一覧</span>
            {project._count?.scenarios !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                {project._count.scenarios}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "members"
                ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <span>👥 メンバー・共有管理</span>
            {project._count?.members !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                {project._count.members}
              </span>
            )}
          </button>
        </div>

        {activeTab === "scenarios" ? (
          <>
            {canEdit && <ScenarioForm projectId={projectId} />}
            <ScenarioList projectId={projectId} myRole={project.myRole} />
          </>
        ) : (
          <ProjectMembersPanel projectId={projectId} myRole={project.myRole} />
        )}
      </main>
    </div>
  );
}
