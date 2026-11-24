"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEvent, reorderEvents } from "@/lib/api";
import { Event, ProjectPresets } from "@/types";
import EventEditModal from "./EventEditModal";

const TYPE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; icon: string }> = {
  text: { label: "会話", bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400", icon: "💬" },
  bg_change: { label: "背景変更", bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", icon: "🖼️" },
  bgm_play: { label: "BGM再生", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", icon: "🎵" },
  sound_effect: { label: "効果音", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: "🔊" },
  selection: { label: "分岐選択肢", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", icon: "🔀" },
  custom: { label: "カスタム", bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-400", icon: "⚙️" },
};

interface EventTimelineProps {
  projectId?: number;
  scenarioId: number;
  events: Event[];
  presets?: ProjectPresets;
  previewIndex?: number;
  onSelectPreviewIndex?: (index: number) => void;
  readOnly?: boolean;
}

export default function EventTimeline({
  projectId,
  scenarioId,
  events: initialEvents,
  presets,
  previewIndex,
  onSelectPreviewIndex,
  readOnly = false,
}: EventTimelineProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Event[]>(initialEvents);
  const [prevEvents, setPrevEvents] = useState<Event[]>(initialEvents);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (prevEvents !== initialEvents) {
    setPrevEvents(initialEvents);
    setItems(initialEvents);
  }

  // 並べ替え mutation
  const reorderMutation = useMutation({
    mutationFn: (newEventIds: number[]) => reorderEvents(scenarioId, newEventIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", scenarioId] });
    },
    onError: (err: Error) => {
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
          {readOnly
            ? "このシナリオにはまだイベントが登録されていません。"
            : "上のフォームからセリフや背景変更などのイベントを追加してください。"}
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
        const isCurrentPreview = previewIndex === index;

        return (
          <div
            key={event.id}
            draggable={!readOnly}
            onDragStart={readOnly ? undefined : (e) => handleDragStart(e, index)}
            onDragOver={readOnly ? undefined : (e) => handleDragOver(e, index)}
            onDrop={readOnly ? undefined : (e) => handleDrop(e, index)}
            className={`group bg-slate-900/70 hover:bg-slate-900 border rounded-2xl p-4 backdrop-blur-md transition-all duration-150 flex items-center justify-between gap-4 ${
              readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
            } ${
              isCurrentPreview
                ? "border-indigo-500 bg-indigo-950/20 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/40"
                : "border-slate-800/80 hover:border-indigo-500/40"
            } ${draggedIndex === index ? "opacity-40 border-dashed border-indigo-500" : ""}`}
          >
            {/* ドラッグハンドル & インデックス */}
            <div className="flex items-center gap-3">
              {!readOnly && (
                <span className="text-slate-600 group-hover:text-slate-400 text-sm select-none">
                  ⋮⋮
                </span>
              )}
              <span
                className={`w-6 h-6 rounded-lg border font-mono text-xs flex items-center justify-center font-semibold transition-colors ${
                  isCurrentPreview
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
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
            <div
              className="flex-1 min-w-0 px-2 cursor-pointer"
              onClick={() => onSelectPreviewIndex?.(index)}
              title="クリックしてプレビュー再生"
            >
              {event.eventType === "text" && (
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    {event.data?.speaker && (
                      <span className="font-bold text-slate-200 text-sm shrink-0">
                        【{event.data.speaker}】
                      </span>
                    )}
                    <span className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-3 break-words">
                      {event.data?.text || "(テキストなし)"}
                    </span>
                  </div>
                  {event.data?.positions && Object.keys(event.data.positions).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Object.entries(event.data.positions).map(([slot, img]) =>
                        img ? (
                          <span
                            key={slot}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              img === "none"
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            }`}
                          >
                            {slot}: {img === "none" ? "退場(none)" : img}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              )}

              {event.eventType === "bg_change" && (
                <div className="text-sm text-slate-300 flex items-center gap-2 truncate">
                  <span className="font-semibold text-violet-300">{event.data?.image}</span>
                  {event.data?.effect && (
                    <span className="text-xs text-slate-500">({event.data.effect})</span>
                  )}
                </div>
              )}

              {event.eventType === "bgm_play" && (
                <div className="text-sm text-amber-300 font-semibold truncate">
                  🎵 {event.data?.bgmId}
                </div>
              )}

              {event.eventType === "sound_effect" && (
                <div className="text-sm text-emerald-300 font-semibold truncate">
                  🔊 {event.data?.seId}
                </div>
              )}

              {event.eventType === "selection" && (
                <div className="flex items-center gap-2 text-xs text-rose-300 font-medium truncate">
                  {(event.data?.choices || []).map((choice, idx) => (
                    <span key={idx}>
                      {idx > 0 ? "| " : ""}[{idx + 1}] {choice}
                    </span>
                  ))}
                </div>
              )}

              {event.eventType === "custom" && (
                <div className="text-xs text-slate-400 truncate">
                  {(event.data?.params || []).filter(Boolean).join(" , ")}
                </div>
              )}
            </div>

            {/* プレビューボタン & 並べ替え & 操作ボタン */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelectPreviewIndex?.(index)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  isCurrentPreview
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "bg-slate-950/60 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40"
                }`}
                title="このイベントからプレビュー"
              >
                <span>▶</span>
                <span className="hidden sm:inline">{isCurrentPreview ? "プレビュー中" : "プレビュー"}</span>
              </button>

              {!readOnly && (
                <>
                  <div className="w-px h-4 bg-slate-800 mx-0.5" />

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

                  <div className="w-px h-4 bg-slate-800 mx-0.5" />

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
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* 編集モーダル */}
      {editingEvent && (
        <EventEditModal
          projectId={projectId}
          event={editingEvent}
          scenarioId={scenarioId}
          presets={presets}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}
