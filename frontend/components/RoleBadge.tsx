"use client";

import React from "react";
import { ProjectRole } from "@/types";

export const ROLE_META: Record<
  ProjectRole,
  {
    label: string;
    shortLabel: string;
    icon: string;
    description: string;
    badgeClass: string;
  }
> = {
  OWNER: {
    label: "OWNER (管理者)",
    shortLabel: "OWNER",
    icon: "👑",
    description: "全操作・メンバー管理・シナリオ削除・プロジェクト削除",
    badgeClass:
      "bg-amber-500/15 border-amber-500/40 text-amber-300",
  },
  EDITOR: {
    label: "EDITOR (編集者)",
    shortLabel: "EDITOR",
    icon: "✏️",
    description: "シナリオ作成/編集・イベント追加/編集/並替え/削除・アセット管理",
    badgeClass:
      "bg-indigo-500/15 border-indigo-500/40 text-indigo-300",
  },
  VIEWER: {
    label: "VIEWER (閲覧者)",
    shortLabel: "VIEWER",
    icon: "👁️",
    description: "シナリオ閲覧・ゲームプレビュー再生・CSV書き出し（編集不可）",
    badgeClass:
      "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  },
};

export function canEditProject(role?: ProjectRole): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export function isProjectOwner(role?: ProjectRole): boolean {
  return role === "OWNER";
}

export default function RoleBadge({
  role,
  compact = false,
}: {
  role?: ProjectRole;
  compact?: boolean;
}) {
  if (!role) return null;
  const meta = ROLE_META[role];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide shrink-0 ${meta.badgeClass}`}
      title={meta.description}
    >
      <span>{meta.icon}</span>
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}
