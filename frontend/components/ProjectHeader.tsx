"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProject, deleteProject } from "@/lib/api";
import { Project } from "@/types";

export default function ProjectHeader({ project }: { project: Project }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (newName: string) => updateProject(project.id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsEditing(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "更新に失敗しました");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/");
    },
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateMutation.mutate(name.trim());
  };

  const handleDelete = () => {
    if (confirm(`プロジェクト「${project.name}」および所属するすべてのシナリオを削除しますか？`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="mb-8">
      {/* パンくずリスト */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Link href="/" className="hover:text-indigo-400 transition-colors">
          ダッシュボード
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">#{project.id}</span>
      </nav>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        {isEditing ? (
          <form onSubmit={handleUpdate} className="flex-1 flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-indigo-500 text-slate-100 text-xl font-bold focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setName(project.name);
                setIsEditing(false);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              キャンセル
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-2xl">
              📖
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                  {project.name}
                </h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                  title="名前を変更"
                >
                  ✏️
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                作成日: {project.createdAt ? new Date(project.createdAt).toLocaleDateString('ja-JP') : "不明"}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
          >
            {deleteMutation.isPending ? "削除中..." : "プロジェクト削除"}
          </button>
        </div>
      </div>
    </div>
  );
}
