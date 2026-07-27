"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateEvent } from "@/lib/api";
import { Event } from "@/types";

export default function EventEditModal({
  event,
  scenarioId,
  onClose,
}: {
  event: Event;
  scenarioId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [eventType, setEventType] = useState(event.eventType || "text");
  const [param1, setParam1] = useState(event.param1 || "");
  const [param2, setParam2] = useState(event.param2 || "");
  const [param3, setParam3] = useState(event.param3 || "");
  const [param4, setParam4] = useState(event.param4 || "");
  const [param5, setParam5] = useState(event.param5 || "");
  const [param6, setParam6] = useState(event.param6 || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) => updateEvent(event.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", scenarioId] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "更新に失敗しました。");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      eventType,
      param1: param1.trim() || null,
      param2: param2.trim() || null,
      param3: param3.trim() || null,
      param4: param4.trim() || null,
      param5: param5.trim() || null,
      param6: param6.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-100">
            イベント編集 (ID: #{event.id})
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              イベント種別
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="text">💬 会話・セリフ (text)</option>
              <option value="bg_change">🖼️ 背景変更 (bg_change)</option>
              <option value="bgm_play">🎵 BGM再生 (bgm_play)</option>
              <option value="sound_effect">🔊 効果音 (sound_effect)</option>
              <option value="selection">🔀 分岐・選択肢 (selection)</option>
              <option value="custom">⚙️ カスタムコマンド (custom)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">param1</label>
              <input
                type="text"
                value={param1}
                onChange={(e) => setParam1(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">param2</label>
              <input
                type="text"
                value={param2}
                onChange={(e) => setParam2(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">param3</label>
              <input
                type="text"
                value={param3}
                onChange={(e) => setParam3(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">param4</label>
              <input
                type="text"
                value={param4}
                onChange={(e) => setParam4(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">param5</label>
              <input
                type="text"
                value={param5}
                onChange={(e) => setParam5(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">param6</label>
              <input
                type="text"
                value={param6}
                onChange={(e) => setParam6(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              {mutation.isPending ? "保存中..." : "変更を保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
