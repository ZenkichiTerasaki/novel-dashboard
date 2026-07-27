"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getScenarios, updateScenario, deleteScenario } from "@/lib/api";
import { Scenario } from "@/types";

export default function ScenarioList({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: scenarios, isLoading, isError, error } = useQuery<Scenario[]>({
    queryKey: ["scenarios", projectId],
    queryFn: () => getScenarios(projectId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateScenario(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      setDeletingId(null);
    },
  });

  const startEdit = (e: React.MouseEvent, scenario: Scenario) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(scenario.id);
    setEditName(scenario.name);
  };

  const handleUpdate = (e: React.FormEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editName.trim()) return;
    updateMutation.mutate({ id, name: editName.trim() });
  };

  const handleDelete = (e: React.MouseEvent, id: number, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`シナリオ「${name}」を削除してもよろしいですか？`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-20 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        シナリオの取得に失敗しました: {String(error)}
      </div>
    );
  }

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-900/30 border border-slate-800/60 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 text-xl">
          📜
        </div>
        <h3 className="text-base font-semibold text-slate-200">シナリオがありません</h3>
        <p className="text-slate-400 text-xs mt-1">「新規シナリオを追加」から新しい章や場面を作成してください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scenarios.map((scenario, index) => (
        <div
          key={scenario.id}
          className="group relative bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-violet-500/50 rounded-2xl p-5 backdrop-blur-md transition-all duration-200 flex items-center justify-between gap-4"
        >
          {editingId === scenario.id ? (
            <form onSubmit={(e) => handleUpdate(e, scenario.id)} className="flex-1 flex items-center gap-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-violet-500 text-slate-100 text-sm focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                キャンセル
              </button>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/projects/${projectId}/scenarios/${scenario.id}`}
                    className="text-base font-bold text-slate-100 hover:text-violet-400 transition-colors truncate block"
                  >
                    {scenario.name}
                  </Link>
                  <span className="text-xs text-slate-400">ID: #{scenario.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => startEdit(e, scenario)}
                  className="p-2 text-xs text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                  title="名前変更"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => handleDelete(e, scenario.id, scenario.name)}
                  disabled={deletingId === scenario.id}
                  className="p-2 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="削除"
                >
                  {deletingId === scenario.id ? "..." : "🗑️"}
                </button>
                <Link
                  href={`/projects/${projectId}/scenarios/${scenario.id}`}
                  className="ml-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-violet-600 transition-all flex items-center gap-1"
                >
                  エディタを開く &rarr;
                </Link>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
