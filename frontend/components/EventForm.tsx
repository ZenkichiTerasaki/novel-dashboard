"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEvent } from "@/lib/api";

const EVENT_TYPES = [
  { value: "text", label: "💬 会話・セリフ", color: "indigo" },
  { value: "bg_change", label: "🖼️ 背景変更", color: "violet" },
  { value: "bgm_play", label: "🎵 BGM再生", color: "amber" },
  { value: "sound_effect", label: "🔊 効果音 (SE)", color: "emerald" },
  { value: "selection", label: "🔀 分岐・選択肢", color: "rose" },
  { value: "custom", label: "⚙️ カスタムコマンド", color: "slate" },
];

export default function EventForm({ scenarioId }: { scenarioId: number }) {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState("text");

  const [param1, setParam1] = useState("");
  const [param2, setParam2] = useState("");
  const [param3, setParam3] = useState("");
  const [param4, setParam4] = useState("");
  const [param5, setParam5] = useState("");
  const [param6, setParam6] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) => createEvent(scenarioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", scenarioId] });
      // パラメータをリセット
      setParam1("");
      setParam2("");
      setParam3("");
      setParam4("");
      setParam5("");
      setParam6("");
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "イベントの追加に失敗しました。");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      eventType,
      param1: param1.trim() || undefined,
      param2: param2.trim() || undefined,
      param3: param3.trim() || undefined,
      param4: param4.trim() || undefined,
      param5: param5.trim() || undefined,
      param6: param6.trim() || undefined,
    });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md mb-8">
      <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        新しい演出イベントを追加
      </h3>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* イベントタイプ選択ボタン */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            イベント種別
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setEventType(type.value)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border text-left flex items-center justify-between ${
                  eventType === type.value
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* タイプ別パラメータ入力項目 */}
        <div className="pt-2">
          {eventType === "text" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">話者・キャラクター名 (param1)</label>
                <input
                  type="text"
                  value={param1}
                  onChange={(e) => setParam1(e.target.value)}
                  placeholder="例: 主人公"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">セリフ・本文 (param2)</label>
                <input
                  type="text"
                  value={param2}
                  onChange={(e) => setParam2(e.target.value)}
                  placeholder="例: 「今日から新しい学期が始まる。」"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
          )}

          {eventType === "bg_change" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">背景画像 ID / パス (param1)</label>
                <input
                  type="text"
                  value={param1}
                  onChange={(e) => setParam1(e.target.value)}
                  placeholder="例: bg_classroom_day.png"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">切替効果 (param2)</label>
                <input
                  type="text"
                  value={param2}
                  onChange={(e) => setParam2(e.target.value)}
                  placeholder="例: fade / instant"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 text-sm"
                />
              </div>
            </div>
          )}

          {eventType === "bgm_play" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">BGM名 / 音源ID (param1)</label>
                <input
                  type="text"
                  value={param1}
                  onChange={(e) => setParam1(e.target.value)}
                  placeholder="例: bgm_daily_theme.mp3"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">再生オプション (param2)</label>
                <input
                  type="text"
                  value={param2}
                  onChange={(e) => setParam2(e.target.value)}
                  placeholder="例: loop / volume:80"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>
          )}

          {eventType === "sound_effect" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">SE 音源名 (param1)</label>
              <input
                type="text"
                value={param1}
                onChange={(e) => setParam1(e.target.value)}
                placeholder="例: se_chime.wav"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          )}

          {eventType === "selection" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">選択肢 1 (param1)</label>
                <input
                  type="text"
                  value={param1}
                  onChange={(e) => setParam1(e.target.value)}
                  placeholder="例: 教室に残る"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">選択肢 2 (param2)</label>
                <input
                  type="text"
                  value={param2}
                  onChange={(e) => setParam2(e.target.value)}
                  placeholder="例: 屋上へ向かう"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">選択肢 3 (param3)</label>
                <input
                  type="text"
                  value={param3}
                  onChange={(e) => setParam3(e.target.value)}
                  placeholder="例: 帰宅する"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 text-sm"
                />
              </div>
            </div>
          )}

          {eventType === "custom" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { val: param1, set: setParam1, name: "param1" },
                { val: param2, set: setParam2, name: "param2" },
                { val: param3, set: setParam3, name: "param3" },
                { val: param4, set: setParam4, name: "param4" },
                { val: param5, set: setParam5, name: "param5" },
                { val: param6, set: setParam6, name: "param6" },
              ].map((p, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{p.name}</label>
                  <input
                    type="text"
                    value={p.val}
                    onChange={(e) => p.set(e.target.value)}
                    placeholder={`値 ${idx + 1}`}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-500 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {mutation.isPending ? "追加中..." : "イベントを追加"}
          </button>
        </div>
      </form>
    </div>
  );
}
