"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProjectMembers,
  inviteProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
} from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { ProjectMember, ProjectRole } from "@/types";
import RoleBadge, { isProjectOwner, ROLE_META } from "./RoleBadge";

export default function ProjectMembersPanel({
  projectId,
  myRole,
}: {
  projectId: number;
  myRole?: ProjectRole;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isOwner = isProjectOwner(myRole);

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    data: members = [],
    isLoading,
    isError,
    error,
  } = useQuery<ProjectMember[]>({
    queryKey: ["projectMembers", projectId],
    queryFn: () => getProjectMembers(projectId),
  });

  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  const inviteMutation = useMutation({
    mutationFn: () => inviteProjectMember(projectId, email.trim(), inviteRole),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["projectMembers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEmail("");
      setFeedback({
        type: "success",
        text: `${created.user?.name || created.user?.email || "メンバー"} を ${created.role} として招待しました。`,
      });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", text: err.message });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: number; role: ProjectRole }) =>
      updateProjectMemberRole(projectId, memberId, role),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["projectMembers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setFeedback({
        type: "success",
        text: `${updated.user?.name || "メンバー"} のロールを ${updated.role} に変更しました。`,
      });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", text: err.message });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ memberId }: { memberId: number; isSelf: boolean }) =>
      removeProjectMember(projectId, memberId),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (variables.isSelf) {
        router.push("/");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["projectMembers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setFeedback({
        type: "success",
        text: res.message || "メンバーを除名しました。",
      });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", text: err.message });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setFeedback(null);
    inviteMutation.mutate();
  };

  const handleRoleChange = (member: ProjectMember, nextRole: ProjectRole) => {
    if (member.role === nextRole) return;
    if (
      member.userId === currentUser?.id &&
      nextRole !== "OWNER" &&
      !confirm(
        `自分自身のロールを ${nextRole} に変更すると、このプロジェクトの管理権限（メンバー管理等）を失います。続行しますか？`
      )
    ) {
      return;
    }
    setFeedback(null);
    updateRoleMutation.mutate({ memberId: member.id, role: nextRole });
  };

  const handleRemove = (member: ProjectMember) => {
    const isSelf = member.userId === currentUser?.id;
    const label = member.user?.name || member.user?.email || `User #${member.userId}`;
    const msg = isSelf
      ? "このプロジェクトから退出しますか？（再参加にはOWNERからの招待が必要です）"
      : `「${label}」をこのプロジェクトから除名しますか？`;
    if (!confirm(msg)) return;
    setFeedback(null);
    removeMutation.mutate({ memberId: member.id, isSelf });
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-200 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* OWNER専用: メンバー招待フォーム */}
      {isOwner && (
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
            <span>➕ メンバーを招待</span>
            <RoleBadge role="OWNER" compact />
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            アカウント登録済みユーザーのメールアドレスとロールを指定して、プロジェクトに招待できます。
          </p>

          <form
            onSubmit={handleInvite}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="invitee@example.com"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "EDITOR" | "VIEWER")
              }
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="EDITOR">✏️ EDITOR (編集者)</option>
              <option value="VIEWER">👁️ VIEWER (閲覧者)</option>
            </select>
            <button
              type="submit"
              disabled={inviteMutation.isPending || !email.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition-all"
            >
              {inviteMutation.isPending ? "招待中..." : "メンバーを追加"}
            </button>
          </form>
        </section>
      )}

      {/* メンバー一覧 */}
      <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100">
            👥 参加メンバー ({members.length}名)
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-16 rounded-xl bg-slate-950/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            メンバー一覧の取得に失敗しました: {String(error)}
          </div>
        ) : (
          <div className="space-y-2.5">
            {members.map((member) => {
              const isSelf = member.userId === currentUser?.id;
              const isLastOwner = member.role === "OWNER" && ownerCount <= 1;

              return (
                <div
                  key={member.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm shrink-0">
                      {(member.user?.name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-100 truncate">
                          {member.user?.name || `User #${member.userId}`}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            あなた
                          </span>
                        )}
                        <RoleBadge role={member.role} compact />
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && (
                      <select
                        value={member.role}
                        disabled={isLastOwner || updateRoleMutation.isPending}
                        onChange={(e) =>
                          handleRoleChange(
                            member,
                            e.target.value as ProjectRole
                          )
                        }
                        title={
                          isLastOwner
                            ? "最後のOWNERはロール変更できません"
                            : "ロールを変更"
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                      >
                        <option value="OWNER">👑 OWNER</option>
                        <option value="EDITOR">✏️ EDITOR</option>
                        <option value="VIEWER">👁️ VIEWER</option>
                      </select>
                    )}

                    {(isOwner || isSelf) && !isLastOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        disabled={removeMutation.isPending}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                      >
                        {isSelf ? "退出" : "除名"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ロール権限一覧（参照用） */}
      <section className="bg-slate-900/40 border border-slate-800/70 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-3">
          🛡️ ロール別権限一覧
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["OWNER", "EDITOR", "VIEWER"] as ProjectRole[]).map((role) => (
            <div
              key={role}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
            >
              <RoleBadge role={role} />
              <p className="text-xs text-slate-400 leading-relaxed">
                {ROLE_META[role].description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
