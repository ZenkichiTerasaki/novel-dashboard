"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateEvent } from "@/lib/api";
import {
  CHARACTER_SLOTS,
  CharacterSlot,
  DraftEvent,
  Event,
  EventType,
  ProjectPresets,
} from "@/types";

function sanitizePositions(
  positions: Partial<Record<CharacterSlot, string>>
): Partial<Record<CharacterSlot, string>> | undefined {
  const cleaned: Partial<Record<CharacterSlot, string>> = {};
  for (const { key } of CHARACTER_SLOTS) {
    const val = positions[key]?.trim();
    if (val) {
      cleaned[key] = val;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export default function EventEditModal({
  projectId,
  event,
  scenarioId,
  presets,
  onClose,
}: {
  projectId?: number;
  event: Event;
  scenarioId: number;
  presets?: ProjectPresets;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [eventType, setEventType] = useState<EventType>(event.eventType || "text");

  // 初期値を event.data から用途別に復元
  const [speaker, setSpeaker] = useState(
    event.eventType === "text" ? event.data?.speaker || "" : ""
  );
  const [text, setText] = useState(
    event.eventType === "text" ? event.data?.text || "" : ""
  );
  const [positions, setPositions] = useState<Partial<Record<CharacterSlot, string>>>(
    event.eventType === "text" && event.data?.positions ? { ...event.data.positions } : {}
  );
  const [selectedSlot, setSelectedSlot] = useState<CharacterSlot>("pos4");

  const [bgImage, setBgImage] = useState(
    event.eventType === "bg_change" ? event.data?.image || "" : ""
  );
  const [bgEffect, setBgEffect] = useState(
    event.eventType === "bg_change" ? event.data?.effect || "" : ""
  );

  const [bgmId, setBgmId] = useState(
    event.eventType === "bgm_play" ? event.data?.bgmId || "" : ""
  );
  const [bgmOption, setBgmOption] = useState(
    event.eventType === "bgm_play" ? event.data?.option || "" : ""
  );

  const [seId, setSeId] = useState(
    event.eventType === "sound_effect" ? event.data?.seId || "" : ""
  );

  const [choices, setChoices] = useState<string[]>(() => {
    const existing = event.eventType === "selection" ? event.data?.choices || [] : [];
    return [existing[0] || "", existing[1] || "", existing[2] || ""];
  });

  const [customParams, setCustomParams] = useState<string[]>(() => {
    const existing = event.eventType === "custom" ? event.data?.params || [] : [];
    return Array.from({ length: 6 }, (_, i) => existing[i] || "");
  });

  // プルダウン / 直接入力の切替ステート
  const [speakerCustomMode, setSpeakerCustomMode] = useState(false);
  const [slotCustomMode, setSlotCustomMode] = useState(false);
  const [bgCustomMode, setBgCustomMode] = useState(false);
  const [bgmCustomMode, setBgmCustomMode] = useState(false);
  const [seCustomMode, setSeCustomMode] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const speakerOptions = presets?.speakers || [];
  const characterOptions = presets?.characters || [];
  const bgOptions = presets?.backgrounds || [];
  const bgmOptions = presets?.bgm || [];
  const seOptions = presets?.se || [];

  const activeSpriteCount = CHARACTER_SLOTS.filter(({ key }) => {
    const val = positions[key]?.trim();
    return Boolean(val && val !== "none");
  }).length;

  const updateSlotValue = (slot: CharacterSlot, value: string) => {
    const trimmed = value.trim();
    const currentVal = positions[slot]?.trim();
    const isCurrentlySprite = Boolean(currentVal && currentVal !== "none");
    const willBeSprite = Boolean(trimmed && trimmed !== "none");

    if (!isCurrentlySprite && willBeSprite && activeSpriteCount >= 4) {
      setErrorMsg("キャラクター立ち絵の同時指定は最大4キャラまでです。他のポジションをクリアまたは退場(none)にしてください。");
      return;
    }
    setErrorMsg(null);
    setPositions((prev) => {
      const next = { ...prev };
      if (value === "") {
        delete next[slot];
      } else {
        next[slot] = value;
      }
      return next;
    });
  };

  const setAllSlotsNone = () => {
    setErrorMsg(null);
    setPositions({
      pos1: "none",
      pos2: "none",
      pos3: "none",
      pos4: "none",
      pos5: "none",
      pos6: "none",
      pos7: "none",
    });
  };

  const mutation = useMutation({
    mutationFn: (payload: DraftEvent) => updateEvent(event.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", scenarioId] });
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "更新に失敗しました。");
    },
  });

  const buildPayload = (): DraftEvent => {
    switch (eventType) {
      case "text":
        return {
          eventType: "text",
          data: {
            speaker: speaker.trim() || undefined,
            text: text.replace(/\r\n/g, "\n").trimEnd(),
            positions: sanitizePositions(positions),
          },
        };
      case "bg_change":
        return {
          eventType: "bg_change",
          data: {
            image: bgImage.trim(),
            effect: bgEffect.trim() || undefined,
          },
        };
      case "bgm_play":
        return {
          eventType: "bgm_play",
          data: {
            bgmId: bgmId.trim(),
            option: bgmOption.trim() || undefined,
          },
        };
      case "sound_effect":
        return {
          eventType: "sound_effect",
          data: {
            seId: seId.trim(),
          },
        };
      case "selection":
        return {
          eventType: "selection",
          data: {
            choices: choices.map((c) => c.trim()).filter(Boolean),
          },
        };
      case "custom":
        return {
          eventType: "custom",
          data: {
            params: customParams.map((p) => p.trim()).filter(Boolean),
          },
        };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(buildPayload());
  };

  const currentSlotMeta = CHARACTER_SLOTS.find((s) => s.key === selectedSlot)!;
  const currentSlotVal = positions[selectedSlot] || "";
  const textLines = text ? text.replace(/\r\n/g, "\n").split("\n") : [];
  const textLineCount = textLines.length;
  const textMaxLineLength = textLines.reduce((max, line) => Math.max(max, line.length), 0);
  const isTextOverGuideline = textLineCount > 3 || textMaxLineLength > 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-100">
              イベント編集 (ID: #{event.id})
            </h3>
            {projectId && (
              <Link
                href={`/projects/${projectId}/assets`}
                className="text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-medium transition-colors"
              >
                🎨 アセット・キャラ名追加
              </Link>
            )}
          </div>
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
              onChange={(e) => setEventType(e.target.value as EventType)}
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

          {eventType === "text" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">
                    話者・キャラクター名 (speaker)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSpeakerCustomMode((prev) => !prev)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {speakerCustomMode ? "📋 プルダウン選択" : "✏️ 直接入力"}
                  </button>
                </div>
                {!speakerCustomMode ? (
                  <select
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">(話者なし / ナレーション)</option>
                    {speakerOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    {speaker && !speakerOptions.includes(speaker) && (
                      <option value={speaker}>{speaker} (直接入力値)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    placeholder="例: 主人公"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="text-xs font-medium text-slate-400">
                    セリフ・本文 (text) <span className="text-[10px] text-slate-500">※Enterで改行 / Ctrl+Enterで保存</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      isTextOverGuideline ? "text-amber-400 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {textLineCount}行 / 最長{textMaxLineLength}文字（目安: 30文字×3行）
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      if (text.trim() && !mutation.isPending) {
                        mutation.mutate(buildPayload());
                      }
                    }
                  }}
                  required
                  placeholder={"例: 「今日から新しい学期が始まる。\nどんな出会いが待っているんだろう。」"}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>

              {/* 案A: 7ポジション横並びスロット選択UI */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      🎭 キャラクター立ち絵配置 (7スロット)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                      指定中: {activeSpriteCount} / 4 キャラ
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSlotCustomMode((prev) => !prev)}
                      className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-medium"
                    >
                      {slotCustomMode ? "📋 プルダウン" : "✏️ 手入力"}
                    </button>
                    <button
                      type="button"
                      onClick={setAllSlotsNone}
                      className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-medium"
                    >
                      🚫 全員退場
                    </button>
                    {Object.keys(positions).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setPositions({});
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium"
                      >
                        ↺ リセット
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {CHARACTER_SLOTS.map((slot) => {
                    const val = positions[slot.key]?.trim();
                    const isSelected = selectedSlot === slot.key;
                    const isNone = val === "none";
                    const hasImage = Boolean(val && !isNone);

                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => setSelectedSlot(slot.key)}
                        className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-between min-h-[52px] ${
                          isSelected
                            ? "bg-indigo-600/25 border-indigo-400 ring-1 ring-indigo-400/50"
                            : hasImage
                            ? "bg-emerald-500/10 border-emerald-500/40"
                            : isNone
                            ? "bg-rose-500/10 border-rose-500/40"
                            : "bg-slate-900 border-slate-800"
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                          [{slot.shortLabel}]
                        </span>
                        <span
                          className={`text-[9px] font-mono truncate max-w-full ${
                            hasImage
                              ? "text-emerald-300 font-semibold"
                              : isNone
                              ? "text-rose-300 font-semibold"
                              : "text-slate-600"
                          }`}
                        >
                          {hasImage ? val : isNone ? "退場" : "維持"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-300 shrink-0">
                    {currentSlotMeta.label}:
                  </span>
                  {!slotCustomMode ? (
                    <select
                      value={currentSlotVal}
                      onChange={(e) => updateSlotValue(selectedSlot, e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">── 変更なし (前の状態を維持) ──</option>
                      <option value="none">🚫 退場 (none)</option>
                      {characterOptions.map((img) => (
                        <option key={img} value={img}>
                          🎭 {img}
                        </option>
                      ))}
                      {currentSlotVal &&
                        currentSlotVal !== "none" &&
                        !characterOptions.includes(currentSlotVal) && (
                          <option value={currentSlotVal}>
                            🎭 {currentSlotVal} (直接入力値)
                          </option>
                        )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={currentSlotVal}
                      onChange={(e) => updateSlotValue(selectedSlot, e.target.value)}
                      placeholder="画像ID / パス (例: heroine_smile.png)"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateSlotValue(selectedSlot, "none")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${
                        currentSlotVal.trim() === "none"
                          ? "bg-rose-600 text-white border-rose-500"
                          : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      🚫 退場
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSlotValue(selectedSlot, "")}
                      disabled={!currentSlotVal}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 disabled:opacity-30"
                    >
                      維持
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {eventType === "bg_change" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">
                    背景画像 ID / パス (image)
                  </label>
                  <button
                    type="button"
                    onClick={() => setBgCustomMode((prev) => !prev)}
                    className="text-[11px] text-violet-400 hover:text-violet-300 font-medium"
                  >
                    {bgCustomMode ? "📋 プルダウン選択" : "✏️ 直接入力"}
                  </button>
                </div>
                {!bgCustomMode ? (
                  <select
                    value={bgImage}
                    onChange={(e) => setBgImage(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">── 背景画像を選択してください ──</option>
                    {bgOptions.map((img) => (
                      <option key={img} value={img}>
                        🖼️ {img}
                      </option>
                    ))}
                    {bgImage && !bgOptions.includes(bgImage) && (
                      <option value={bgImage}>🖼️ {bgImage} (直接入力値)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={bgImage}
                    onChange={(e) => setBgImage(e.target.value)}
                    required
                    placeholder="例: bg_classroom_day.png"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  切替効果 (effect)
                </label>
                <input
                  type="text"
                  value={bgEffect}
                  onChange={(e) => setBgEffect(e.target.value)}
                  placeholder="例: fade / instant"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {eventType === "bgm_play" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">
                    BGM名 / 音源ID (bgmId)
                  </label>
                  <button
                    type="button"
                    onClick={() => setBgmCustomMode((prev) => !prev)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                  >
                    {bgmCustomMode ? "📋 プルダウン選択" : "✏️ 直接入力"}
                  </button>
                </div>
                {!bgmCustomMode ? (
                  <select
                    value={bgmId}
                    onChange={(e) => setBgmId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">── BGM音源を選択してください ──</option>
                    {bgmOptions.map((item) => (
                      <option key={item} value={item}>
                        🎵 {item}
                      </option>
                    ))}
                    {bgmId && !bgmOptions.includes(bgmId) && (
                      <option value={bgmId}>🎵 {bgmId} (直接入力値)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={bgmId}
                    onChange={(e) => setBgmId(e.target.value)}
                    required
                    placeholder="例: bgm_daily_theme.mp3"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  再生オプション (option)
                </label>
                <input
                  type="text"
                  value={bgmOption}
                  onChange={(e) => setBgmOption(e.target.value)}
                  placeholder="例: loop / volume:80"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {eventType === "sound_effect" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-400">
                  SE 音源名 (seId)
                </label>
                <button
                  type="button"
                  onClick={() => setSeCustomMode((prev) => !prev)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  {seCustomMode ? "📋 プルダウン選択" : "✏️ 直接入力"}
                </button>
              </div>
              {!seCustomMode ? (
                <select
                  value={seId}
                  onChange={(e) => setSeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">── 効果音(SE)を選択してください ──</option>
                  {seOptions.map((item) => (
                    <option key={item} value={item}>
                      🔊 {item}
                    </option>
                  ))}
                  {seId && !seOptions.includes(seId) && (
                    <option value={seId}>🔊 {seId} (直接入力値)</option>
                  )}
                </select>
              ) : (
                <input
                  type="text"
                  value={seId}
                  onChange={(e) => setSeId(e.target.value)}
                  required
                  placeholder="例: se_chime.wav"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>
          )}

          {eventType === "selection" && (
            <div className="space-y-3">
              {choices.map((c, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    選択肢 {idx + 1} (choices[{idx}])
                  </label>
                  <input
                    type="text"
                    value={c}
                    onChange={(e) =>
                      setChoices((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                    }
                    required={idx === 0}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          )}

          {eventType === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customParams.map((val, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    params[{idx}]
                  </label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) =>
                      setCustomParams((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          )}

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
