"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createScenario } from "@/lib/api";

export default function ScenarioForm({ projectId }: { projectId: number }) {
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (scenarioName: string) => createScenario(projectId, scenarioName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      setName("");
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "シナリオの作成に失敗しました。");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate(name.trim());
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md mb-8">
      <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-500" />
        新規シナリオを追加
      </h2>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: プロローグ 「運命の出会い」"
          required
          className="flex-1 px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm transition-all"
        />

        <button
          type="submit"
          disabled={mutation.isPending || !name.trim()}
          className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-md shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
        >
          {mutation.isPending ? "作成中..." : "シナリオを作成"}
        </button>
      </form>
    </div>
  );
}
