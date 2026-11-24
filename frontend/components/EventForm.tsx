"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEvent } from "@/lib/api";

import { CHARACTER_SLOTS, CharacterSlot, DraftEvent, EventType, ProjectPresets } from "@/types";

const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: "text", label: "💬 会話・セリフ", color: "indigo" },
  { value: "bg_change", label: "🖼️ 背景変更", color: "violet" },
  { value: "bgm_play", label: "🎵 BGM再生", color: "amber" },
  { value: "sound_effect", label: "🔊 効果音 (SE)", color: "emerald" },
  { value: "selection", label: "🔀 分岐・選択肢", color: "rose" },
  { value: "custom", label: "⚙️ カスタムコマンド", color: "slate" },
];

interface EventFormProps {
  projectId?: number;
  scenarioId: number;
  presets?: ProjectPresets;
  onDraftChange?: (draft: DraftEvent) => void;
  onDraftSubmit?: () => void;
}

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

export default function EventForm({
  projectId,
  scenarioId,
  presets,
  onDraftChange,
  onDraftSubmit,
}: EventFormProps) {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState<EventType>("text");

  // 用途別パラメータステート
  const [speaker, setSpeaker] = useState("");
  const [text, setText] = useState("");
  const [positions, setPositions] = useState<Partial<Record<CharacterSlot, string>>>({});
  const [selectedSlot, setSelectedSlot] = useState<CharacterSlot>("pos4");

  const [bgImage, setBgImage] = useState("");
  const [bgEffect, setBgEffect] = useState("");

  const [bgmId, setBgmId] = useState("");
  const [bgmOption, setBgmOption] = useState("");

  const [seId, setSeId] = useState("");

  const [choices, setChoices] = useState<string[]>(["", "", ""]);
  const [customParams, setCustomParams] = useState<string[]>(["", "", "", "", "", ""]);

  // プルダウン / 直接入力の切替ステート (false = プルダウン選択, true = テキスト直接入力)
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

  const buildDraft = useCallback((): DraftEvent => {
    switch (eventType) {
      case "text":
        return {
          eventType: "text",
          data: {
            speaker: speaker.trim() || undefined,
            text: text.trim() ? text.replace(/\r\n/g, "\n").trimEnd() : undefined,
            positions: sanitizePositions(positions),
          },
        };
      case "bg_change":
        return {
          eventType: "bg_change",
          data: {
            image: bgImage.trim() || undefined,
            effect: bgEffect.trim() || undefined,
          },
        };
      case "bgm_play":
        return {
          eventType: "bgm_play",
          data: {
            bgmId: bgmId.trim() || undefined,
            option: bgmOption.trim() || undefined,
          },
        };
      case "sound_effect":
        return {
          eventType: "sound_effect",
          data: {
            seId: seId.trim() || undefined,
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
  }, [eventType, speaker, text, positions, bgImage, bgEffect, bgmId, bgmOption, seId, choices, customParams]);

  // onDraftChangeの最新参照を保持
  const onDraftChangeRef = React.useRef(onDraftChange);
  React.useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  // 下書き内容の変更を親（プレビュー画面）に通知
  React.useEffect(() => {
    onDraftChangeRef.current?.(buildDraft());
  }, [buildDraft]);

  const resetCurrentFields = () => {
    setSpeaker("");
    setText("");
    setPositions({});
    setBgImage("");
    setBgEffect("");
    setBgmId("");
    setBgmOption("");
    setSeId("");
    setChoices(["", "", ""]);
    setCustomParams(["", "", "", "", "", ""]);
  };

  const mutation = useMutation({
    mutationFn: (payload: DraftEvent) => createEvent(scenarioId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", scenarioId] });
      resetCurrentFields();
      setErrorMsg(null);
      onDraftSubmit?.();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "イベントの追加に失敗しました。");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(buildDraft());
  };

  const updateChoice = (index: number, value: string) => {
    setChoices((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const updateCustomParam = (index: number, value: string) => {
    setCustomParams((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const currentSlotMeta = CHARACTER_SLOTS.find((s) => s.key === selectedSlot)!;
  const currentSlotVal = positions[selectedSlot] || "";
  const textLines = text ? text.replace(/\r\n/g, "\n").split("\n") : [];
  const textLineCount = textLines.length;
  const textMaxLineLength = textLines.reduce((max, line) => Math.max(max, line.length), 0);
  const isTextOverGuideline = textLineCount > 3 || textMaxLineLength > 30;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          新しい演出イベントを追加
        </h3>
        <div className="flex items-center gap-2">
          {projectId && (
            <Link
              href={`/projects/${projectId}/assets`}
              className="text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-medium transition-colors"
            >
              🎨 アセット・キャラ名追加
            </Link>
          )}
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            プレビュー連動中
          </span>
        </div>
      </div>

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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-400">
                      話者・キャラ名 (speaker)
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <label className="text-xs font-medium text-slate-400">
                      セリフ・本文 (text) <span className="text-[10px] text-slate-500">※Enterで改行 / Ctrl+Enterで追加</span>
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
                          mutation.mutate(buildDraft());
                        }
                      }
                    }}
                    placeholder={"例: 「今日から新しい学期が始まる。\nどんな出会いが待っているんだろう。」"}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm leading-relaxed resize-y"
                  />
                </div>
              </div>

              {/* 案A: 7ポジション横並びスロット選択UI */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      🎭 キャラクター立ち絵配置 (7スロット・状態維持)
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                      指定中: {activeSpriteCount} / 4 キャラ
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSlotCustomMode((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium transition-colors"
                    >
                      {slotCustomMode ? "📋 プルダウン選択へ" : "✏️ ファイル名直接入力"}
                    </button>
                    <button
                      type="button"
                      onClick={setAllSlotsNone}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors"
                      title="全ポジションに none を設定して画面上の立ち絵をすべて退場させます"
                    >
                      🚫 全員退場 (all none)
                    </button>
                    {Object.keys(positions).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setPositions({});
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                      >
                        ↺ 入力リセット
                      </button>
                    )}
                  </div>
                </div>

                {/* 7スロットボタン列 */}
                <div className="grid grid-cols-7 gap-1.5">
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
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[58px] ${
                          isSelected
                            ? "bg-indigo-600/25 border-indigo-400 ring-1 ring-indigo-400/50 shadow-sm"
                            : hasImage
                            ? "bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-400"
                            : isNone
                            ? "bg-rose-500/10 border-rose-500/40 hover:border-rose-400"
                            : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <span
                          className={`text-[11px] font-bold ${
                            isSelected ? "text-indigo-200" : "text-slate-400"
                          }`}
                        >
                          [{slot.shortLabel}]
                        </span>
                        <span
                          className={`text-[10px] font-mono truncate max-w-full px-1 rounded ${
                            hasImage
                              ? "text-emerald-300 font-semibold"
                              : isNone
                              ? "text-rose-300 font-semibold"
                              : "text-slate-600"
                          }`}
                        >
                          {hasImage ? val : isNone ? "退場(none)" : "維持"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 選択中スロットの編集バー */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-indigo-300 shrink-0 min-w-[140px]">
                    {currentSlotMeta.label}:
                  </span>
                  {!slotCustomMode ? (
                    <select
                      value={currentSlotVal}
                      onChange={(e) => updateSlotValue(selectedSlot, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-mono"
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
                      placeholder="画像ID / パス (例: heroine_smile.png) ※未入力で前の状態を維持"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                    />
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateSlotValue(selectedSlot, "none")}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        currentSlotVal.trim() === "none"
                          ? "bg-rose-600 text-white border-rose-500"
                          : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      🚫 退場 (none)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSlotValue(selectedSlot, "")}
                      disabled={!currentSlotVal}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                    >
                      維持に戻す
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  💡 1人表示は <code className="text-slate-400">4:中央</code>、2人表示は <code className="text-slate-400">2・6</code>（または <code className="text-slate-400">3・5</code>）、3人表示は <code className="text-slate-400">2・4・6</code>、4人表示は <code className="text-slate-400">1・3・5・7</code> に配置すると均等になります。
                </p>
              </div>
            </div>
          )}

          {eventType === "bg_change" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-violet-500 text-sm"
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
                    placeholder="例: bg_classroom_day.png"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">切替効果 (effect)</label>
                <input
                  type="text"
                  value={bgEffect}
                  onChange={(e) => setBgEffect(e.target.value)}
                  placeholder="例: fade / instant"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 text-sm"
                />
              </div>
            </div>
          )}

          {eventType === "bgm_play" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
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
                    placeholder="例: bgm_daily_theme.mp3"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">再生オプション (option)</label>
                <input
                  type="text"
                  value={bgmOption}
                  onChange={(e) => setBgmOption(e.target.value)}
                  placeholder="例: loop / volume:80"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
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
                  placeholder="例: se_chime.wav"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                />
              )}
            </div>
          )}

          {eventType === "selection" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {choices.map((choice, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    選択肢 {idx + 1} (choices[{idx}])
                  </label>
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => updateChoice(idx, e.target.value)}
                    placeholder={
                      idx === 0 ? "例: 教室に残る" : idx === 1 ? "例: 屋上へ向かう" : "例: 帰宅する"
                    }
                    required={idx === 0}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {eventType === "custom" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {customParams.map((val, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    params[{idx}]
                  </label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => updateCustomParam(idx, e.target.value)}
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
