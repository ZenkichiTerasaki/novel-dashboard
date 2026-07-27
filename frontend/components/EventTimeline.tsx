"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEvent, reorderEvents } from "@/lib/api";
import { Event } from "@/types";
import EventEditModal from "./EventEditModal";

const TYPE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; icon: string }> = {
  text: { label: "会話", bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400", icon: "💬" },
  bg_change: { label: "背景変更", bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", icon: "🖼️" },
  bgm_play: { label: "BGM再生", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", icon: "🎵" },
  sound_effect: { label: "効果音", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: "🔊" },
  selection: { label: "分岐選択肢", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", icon: "🔀" },
  custom: { label: "カスタム", bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-400", icon: "⚙️" },
};

export default function EventTimeline({
  scenarioId,
  events: initialEvents,
}: {
  scenarioId: number;
  events: Event[];
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Event[]>(initialEvents);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    setItems(initialEvents);
  }, [initialEvents]);

  // 並べ替え mutation
  const reorderMutation = useMutation({
    mutationFn: (newEventIds: number[]) => reorderEvents(scenarioId, newEventIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", scenarioId] });
    },
    onError: (err: any) => {
      alert("順序の保存に失敗しました: " + err.message);
      setItems(initialEvents); // ロールバック
    },
  });

  // 削除 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", scenarioId] });
      setDeletingId(null);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("このイベントを削除してもよろしいですか？")) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setItems(updated);

    const eventIds = updated.map((e) => e.id);
    reorderMutation.mutate(eventIds);
  };

  // Drag and Drop ハンドラ
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    moveItem(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-900/30 border border-slate-800/60 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 text-xl">
          🎬
        </div>
        <h3 className="text-base font-semibold text-slate-200">イベントが登録されていません</h3>
        <p className="text-slate-400 text-xs mt-1">
          上のフォームからセリフや背景変更などのイベントを追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 relative">
      {reorderMutation.isPending && (
        <div className="absolute top-2 right-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30 flex items-center gap-2 z-10 animate-pulse">
          <span>順序を保存中...</span>
        </div>
      )}

      {items.map((event, index) => {
        const config = TYPE_CONFIG[event.eventType] || TYPE_CONFIG.custom;

        return (
          <div
            key={event.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={`group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-4 backdrop-blur-md transition-all duration-150 flex items-center justify-between gap-4 cursor-grab active:cursor-grabbing ${
              draggedIndex === index ? "opacity-40 border-dashed border-indigo-500" : ""
            }`}
          >
            {/* ドラッグハンドル & インデックス */}
            <div className="flex items-center gap-3">
              <span className="text-slate-600 group-hover:text-slate-400 text-sm select-none">
                ⋮⋮
              </span>
              <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono text-xs flex items-center justify-center font-semibold">
                {index + 1}
              </span>
              <div
                className={`px-2.5 py-1 rounded-lg border ${config.bg} ${config.border} ${config.text} text-xs font-semibold flex items-center gap-1.5 shrink-0`}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </div>
            </div>

            {/* イベントコンテンツ概要 */}
            <div className="flex-1 min-w-0 px-2">
              {event.eventType === "text" && (
                <div className="flex items-baseline gap-2 truncate">
                  {event.param1 && (
                    <span className="font-bold text-slate-200 text-sm shrink-0">
                      【{event.param1}】
                    </span>
                  )}
                  <span className="text-slate-300 text-sm truncate">
                    {event.param2 || "(テキストなし)"}
                  </span>
                </div>
              )}

              {event.eventType === "bg_change" && (
                <div className="text-sm text-slate-300 flex items-center gap-2 truncate">
                  <span className="font-semibold text-violet-300">{event.param1}</span>
                  {event.param2 && <span className="text-xs text-slate-500">({event.param2})</span>}
                </div>
              )}

              {event.eventType === "bgm_play" && (
                <div className="text-sm text-amber-300 font-semibold truncate">
                  🎵 {event.param1}
                </div>
              )}

              {event.eventType === "sound_effect" && (
                <div className="text-sm text-emerald-300 font-semibold truncate">
                  🔊 {event.param1}
                </div>
              )}

              {event.eventType === "selection" && (
                <div className="flex items-center gap-2 text-xs text-rose-300 font-medium truncate">
                  <span>[1] {event.param1}</span>
                  {event.param2 && <span>| [2] {event.param2}</span>}
                  {event.param3 && <span>| [3] {event.param3}</span>}
                </div>
              )}

              {event.eventType === "custom" && (
                <div className="text-xs text-slate-400 truncate">
                  {[event.param1, event.param2, event.param3].filter(Boolean).join(" , ")}
                </div>
              )}
            </div>

            {/* 並べ替えボタン & 操作ボタン */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => moveItem(index, index - 1)}
                disabled={index === 0}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 transition-colors"
                title="上へ移動"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, index + 1)}
                disabled={index === items.length - 1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 transition-colors"
                title="下へ移動"
              >
                ▼
              </button>

              <div className="w-px h-4 bg-slate-800 mx-1" />

              <button
                type="button"
                onClick={() => setEditingEvent(event)}
                className="p-1.5 text-xs text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                title="編集"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => handleDelete(event.id)}
                disabled={deletingId === event.id}
                className="p-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="削除"
              >
                {deletingId === event.id ? "..." : "🗑️"}
              </button>
            </div>
          </div>
        );
      })}

      {/* 編集モーダル */}
      {editingEvent && (
        <EventEditModal
          event={editingEvent}
          scenarioId={scenarioId}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}
