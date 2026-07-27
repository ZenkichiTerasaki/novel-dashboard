"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjects, deleteProject } from "@/lib/api";
import { Project } from "@/types";

export default function ProjectList() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: projects, isLoading, isError, error } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeletingId(null);
    },
  });

  const handleDelete = (e: React.MouseEvent, id: number, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`プロジェクト「${name}」を削除してもよろしいですか？`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-36 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse p-5" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        プロジェクトの読み込みに失敗しました: {String(error)}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-900/30 border border-slate-800/60 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 text-xl">
          📁
        </div>
        <h3 className="text-base font-semibold text-slate-200">プロジェクトがありません</h3>
        <p className="text-slate-400 text-xs mt-1">上のフォームから最初のノベルプロジェクトを作成してください。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="group relative block bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-6 backdrop-blur-md transition-all duration-200 shadow-sm hover:shadow-indigo-500/5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">
              📖
            </div>
            <button
              onClick={(e) => handleDelete(e, project.id, project.name)}
              disabled={deletingId === project.id}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="削除"
            >
              {deletingId === project.id ? "..." : "🗑️"}
            </button>
          </div>

          <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
            {project.name}
          </h3>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>ID: #{project.id}</span>
            <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform font-medium">
              開く &rarr;
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}