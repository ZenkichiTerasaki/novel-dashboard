"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Event, DraftEvent } from "@/types";

interface GamePreviewProps {
  events: Event[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  draftEvent: DraftEvent | null;
  previewMode: "timeline" | "draft";
  onModeChange: (mode: "timeline" | "draft") => void;
  scenarioName?: string;
}

// キーワードに応じた背景スタイルの自動推定
function getBackgroundStyle(bgName?: string | null): { background: string; label: string } {
  if (!bgName || bgName.trim() === "") {
    return {
      background: "radial-gradient(ellipse at bottom, #1e1b4b 0%, #0f172a 60%, #020617 100%)",
      label: "デフォルト背景",
    };
  }

  const name = bgName.toLowerCase();

  // URL指定の場合
  if (name.startsWith("http://") || name.startsWith("https://") || name.startsWith("data:")) {
    return {
      background: `url("${bgName}") center/cover no-repeat`,
      label: bgName,
    };
  }

  // キーワード推定
  if (name.includes("sunset") || name.includes("evening") || name.includes("夕方") || name.includes("夕焼け")) {
    return {
      background: "linear-gradient(to bottom, #4c0519, #831843, #c2410c, #ea580c, #fbbf24)",
      label: bgName,
    };
  }
  if (name.includes("night") || name.includes("star") || name.includes("夜") || name.includes("星空")) {
    return {
      background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 70%, #000000 100%)",
      label: bgName,
    };
  }
  if (name.includes("class") || name.includes("school") || name.includes("教室") || name.includes("学校")) {
    return {
      background: "linear-gradient(135deg, #1e293b 0%, #334155 40%, #475569 80%, #64748b 100%)",
      label: bgName,
    };
  }
  if (name.includes("forest") || name.includes("nature") || name.includes("森") || name.includes("公園")) {
    return {
      background: "linear-gradient(to bottom, #064e3b 0%, #065f46 40%, #047857 70%, #059669 100%)",
      label: bgName,
    };
  }
  if (name.includes("sea") || name.includes("ocean") || name.includes("beach") || name.includes("海")) {
    return {
      background: "linear-gradient(to bottom, #0369a1 0%, #0284c7 40%, #06b6d4 70%, #67e8f9 100%)",
      label: bgName,
    };
  }
  if (name.includes("snow") || name.includes("winter") || name.includes("雪") || name.includes("冬")) {
    return {
      background: "linear-gradient(to bottom, #1e293b 0%, #334155 40%, #64748b 70%, #cbd5e1 100%)",
      label: bgName,
    };
  }
  if (name.includes("room") || name.includes("indoor") || name.includes("部屋")) {
    return {
      background: "linear-gradient(145deg, #27272a 0%, #3f3f46 50%, #52525b 100%)",
      label: bgName,
    };
  }
  if (name.includes("rain") || name.includes("雨")) {
    return {
      background: "linear-gradient(to bottom, #1e293b 0%, #0f172a 50%, #1e1b4b 100%)",
      label: bgName,
    };
  }

  // 一般的なフォールバック（ハッシュカラーグラデーション）
  return {
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #6366f1 100%)",
    label: bgName,
  };
}

export default function GamePreview({
  events,
  currentIndex,
  onIndexChange,
  draftEvent,
  previewMode,
  onModeChange,
  scenarioName,
}: GamePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalEvents = events.length;
  const safeIndex = Math.max(0, Math.min(currentIndex, Math.max(0, totalEvents - 1)));

  // タイムライン再生時: 0番目から現在位置までのイベントを遡って、現在の背景やBGM等のコンテキストを計算
  const currentContext = useMemo(() => {
    let activeBg: { image?: string; effect?: string } | null = null;
    let activeBgm: { name?: string; option?: string } | null = null;
    let activeSe: { name?: string } | null = null;
    let latestText: { speaker?: string; text?: string } | null = null;
    let activeSelection: { options: string[] } | null = null;
    let activeCustom: { params: string[] } | null = null;

    if (previewMode === "timeline") {
      for (let i = 0; i <= safeIndex && i < events.length; i++) {
        const ev = events[i];
        if (ev.eventType === "bg_change") {
          activeBg = { image: ev.param1 || undefined, effect: ev.param2 || undefined };
        } else if (ev.eventType === "bgm_play") {
          activeBgm = { name: ev.param1 || undefined, option: ev.param2 || undefined };
        } else if (ev.eventType === "sound_effect") {
          activeSe = i === safeIndex ? { name: ev.param1 || undefined } : null;
        } else if (ev.eventType === "text") {
          if (i === safeIndex) {
            latestText = { speaker: ev.param1 || undefined, text: ev.param2 || undefined };
          }
        } else if (ev.eventType === "selection") {
          if (i === safeIndex) {
            const opts = [ev.param1, ev.param2, ev.param3].filter(Boolean) as string[];
            activeSelection = { options: opts };
          }
        } else if (ev.eventType === "custom") {
          if (i === safeIndex) {
            const params = [ev.param1, ev.param2, ev.param3, ev.param4, ev.param5, ev.param6].filter(Boolean) as string[];
            activeCustom = { params };
          }
        }
      }
      return {
        type: events[safeIndex]?.eventType || "none",
        bg: activeBg,
        bgm: activeBgm,
        se: activeSe,
        text: latestText,
        selection: activeSelection,
        custom: activeCustom,
        rawEvent: events[safeIndex],
      };
    } else {
      // draftモード
      const d = draftEvent;
      return {
        type: d?.eventType || "text",
        bg: d?.eventType === "bg_change" ? { image: d.param1, effect: d.param2 } : null,
        bgm: d?.eventType === "bgm_play" ? { name: d.param1, option: d.param2 } : null,
        se: d?.eventType === "sound_effect" ? { name: d.param1 } : null,
        text: d?.eventType === "text" ? { speaker: d.param1, text: d.param2 } : null,
        selection: d?.eventType === "selection" ? { options: [d.param1, d.param2, d.param3].filter(Boolean) as string[] } : null,
        custom: d?.eventType === "custom" ? { params: [d.param1, d.param2, d.param3, d.param4, d.param5, d.param6].filter(Boolean) as string[] } : null,
        rawEvent: null,
      };
    }
  }, [events, safeIndex, previewMode, draftEvent]);

  // オートプレイ（自動再生）処理
  useEffect(() => {
    if (isPlaying && previewMode === "timeline") {
      timerRef.current = setTimeout(() => {
        if (safeIndex < totalEvents - 1) {
          onIndexChange(safeIndex + 1);
        } else {
          setIsPlaying(false); // 最後まで到達したら停止
        }
      }, 2500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, safeIndex, totalEvents, previewMode, onIndexChange]);

  const handleNext = () => {
    if (previewMode === "timeline" && safeIndex < totalEvents - 1) {
      onIndexChange(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (previewMode === "timeline" && safeIndex > 0) {
      onIndexChange(safeIndex - 1);
    }
  };

  const handleReset = () => {
    if (previewMode === "timeline") {
      onIndexChange(0);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (previewMode !== "timeline") {
      onModeChange("timeline");
    }
    setIsPlaying(!isPlaying);
  };

  // 画面クリックで次へ進む（選択肢などのインタラクションを除く）
  const handleScreenClick = (e: React.MouseEvent) => {
    // ボタンクリックイベント等の場合は除外
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) {
      return;
    }
    if (previewMode === "timeline" && safeIndex < totalEvents - 1) {
      handleNext();
    }
  };

  const bgStyle = getBackgroundStyle(currentContext.bg?.image);

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-4 z-50 bg-slate-950/95 backdrop-blur-xl border-indigo-500/50 shadow-2xl flex flex-col justify-between"
          : "w-full"
      }`}
    >
      {/* プレビューヘッダー */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span>🎮 ゲーム画面プレビュー</span>
          </span>
          {scenarioName && (
            <span className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-[200px]">
              - {scenarioName}
            </span>
          )}
        </div>

        {/* モード切替タブ & 拡大ボタン */}
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-900 border border-slate-800 p-0.5 rounded-xl flex items-center">
            <button
              type="button"
              onClick={() => {
                onModeChange("timeline");
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                previewMode === "timeline"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🎬 タイムライン
            </button>
            <button
              type="button"
              onClick={() => {
                onModeChange("draft");
                setIsPlaying(false);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                previewMode === "draft"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>✏️ 入力中</span>
              {draftEvent && (draftEvent.param1 || draftEvent.param2) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "ウィンドウを元に戻す" : "フルスクリーン拡大"}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition-colors"
          >
            {isFullscreen ? "✕" : "⛶"}
          </button>
        </div>
      </div>

      {/* ノベルゲーム表示領域 (16:9 アスペクト比フレーム) */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-950 select-none group">
        {/* 背景レイヤー */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out flex items-center justify-center"
          style={{
            background: bgStyle.background,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* 背景画像がない時の微細なグリッドパターン */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* 背景ラベル情報 (右上に小さく表示) */}
          {currentContext.bg?.image && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-slate-950/70 backdrop-blur-md border border-slate-700/50 text-[10px] text-slate-400 flex items-center gap-1.5 pointer-events-none">
              <span>🖼️</span>
              <span className="font-mono truncate max-w-[150px]">{currentContext.bg.image}</span>
            </div>
          )}
        </div>

        {/* 音響・演出ステータスインジケーター (左上) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
          {currentContext.bgm?.name && (
            <div className="px-2 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-amber-500/40 text-[11px] font-medium text-amber-300 flex items-center gap-1.5 shadow-lg">
              <span className="animate-pulse">🎵</span>
              <span className="truncate max-w-[140px] font-mono">{currentContext.bgm.name}</span>
            </div>
          )}
          {currentContext.se?.name && (
            <div className="px-2 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-emerald-500/40 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5 shadow-lg animate-bounce">
              <span>🔊</span>
              <span className="truncate max-w-[140px] font-mono">{currentContext.se.name}</span>
            </div>
          )}
        </div>

        {/* キャラクタープレースホルダー (立ち絵シルエット・アバター) */}
        {currentContext.text?.speaker && (
          <div className="absolute inset-x-0 bottom-24 flex justify-center pointer-events-none transition-all duration-500">
            <div className="w-32 h-44 sm:w-44 sm:h-60 rounded-t-full bg-gradient-to-t from-slate-950/90 via-indigo-950/30 to-transparent border-t border-indigo-400/20 flex flex-col items-center justify-end pb-3 opacity-80 backdrop-blur-[2px]">
              <span className="text-3xl sm:text-4xl opacity-75">👤</span>
              <span className="text-[11px] font-bold text-indigo-300/80 tracking-wide mt-1">
                {currentContext.text.speaker}
              </span>
            </div>
          </div>
        )}

        {/* 選択肢分岐 UI (選択肢イベント発生時) */}
        {currentContext.selection && currentContext.selection.options.length > 0 && (
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs flex flex-col items-center justify-center p-6 gap-3 z-20">
            <p className="text-xs font-bold text-rose-300 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <span>🔀</span>
              <span>選択肢を選んでください</span>
            </p>
            <div className="w-full max-w-sm flex flex-col gap-2">
              {currentContext.selection.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (previewMode === "timeline" && safeIndex < totalEvents - 1) {
                      handleNext();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-rose-600/30 border border-slate-700/80 hover:border-rose-400/80 text-slate-100 hover:text-white font-medium text-xs sm:text-sm text-left transition-all duration-150 shadow-xl flex items-center justify-between group/opt active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span>{opt}</span>
                  </span>
                  <span className="text-slate-500 group-hover/opt:text-rose-300 transition-colors">
                    ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* カスタムコマンド発生時の演出 HUD */}
        {currentContext.custom && currentContext.custom.params.length > 0 && (
          <div className="absolute top-3 right-3 z-20 max-w-[200px] p-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 shadow-xl text-left pointer-events-none">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span>⚙️</span>
              <span>カスタムコマンド実行</span>
            </div>
            <div className="text-[10px] text-slate-300 font-mono space-y-0.5 truncate">
              {currentContext.custom.params.map((p, idx) => (
                <div key={idx} className="truncate">
                  p{idx + 1}: {p}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* クリック送りオーバーレイ (画面全体クリックで次へ進む) */}
        <div
          onClick={handleScreenClick}
          className="absolute inset-0 cursor-pointer"
          title="クリックで次のイベントへ"
        />

        {/* メッセージウィンドウ (画面下部) */}
        <div className="absolute inset-x-3 sm:inset-x-6 bottom-3 z-20 pointer-events-none">
          <div className="relative bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl transition-all duration-200">
            {/* 話者ネームプレート */}
            {currentContext.text?.speaker && (
              <div className="absolute -top-3.5 left-4 px-3.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-md border border-indigo-400/30 flex items-center gap-1">
                <span>{currentContext.text.speaker}</span>
              </div>
            )}

            {/* セリフ本文 */}
            <div className="pt-1 min-h-[44px] flex items-center">
              {currentContext.text?.text ? (
                <p className="text-slate-100 text-xs sm:text-sm md:text-base leading-relaxed tracking-wide font-medium whitespace-pre-wrap">
                  {currentContext.text.text}
                </p>
              ) : currentContext.type === "bg_change" ? (
                <p className="text-violet-300 text-xs sm:text-sm italic">
                  [背景変更]: {currentContext.bg?.image || "指定なし"} {currentContext.bg?.effect ? `(${currentContext.bg.effect})` : ""}
                </p>
              ) : currentContext.type === "bgm_play" ? (
                <p className="text-amber-300 text-xs sm:text-sm italic">
                  [BGM再生]: {currentContext.bgm?.name} {currentContext.bgm?.option ? `(${currentContext.bgm.option})` : ""}
                </p>
              ) : currentContext.type === "sound_effect" ? (
                <p className="text-emerald-300 text-xs sm:text-sm italic">
                  [効果音再生]: {currentContext.se?.name}
                </p>
              ) : currentContext.type === "selection" ? (
                <p className="text-rose-300 text-xs sm:text-sm italic">
                  [分岐選択肢の表示中]
                </p>
              ) : currentContext.type === "custom" ? (
                <p className="text-slate-400 text-xs sm:text-sm italic">
                  [カスタムコマンド実行中]
                </p>
              ) : (
                <p className="text-slate-500 text-xs italic">
                  {previewMode === "timeline"
                    ? "(セリフまたは演出イベントがありません)"
                    : "(フォームにセリフやパラメータを入力するとリアルタイムにプレビューされます)"}
                </p>
              )}
            </div>

            {/* ページ送りカーソル (点滅) */}
            {previewMode === "timeline" && safeIndex < totalEvents - 1 && (
              <div className="absolute bottom-2.5 right-4 text-indigo-400 text-xs animate-bounce font-bold">
                ▼
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 再生コントロールバー & ステータス */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-2 shrink-0">
        {/* 進捗シークバー (タイムラインモード時) */}
        {previewMode === "timeline" && totalEvents > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 font-semibold w-8 text-right">
              {safeIndex + 1}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalEvents - 1)}
              value={safeIndex}
              onChange={(e) => onIndexChange(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[11px] font-mono text-slate-500 w-8">
              / {totalEvents}
            </span>
          </div>
        )}

        {/* ボタン群 */}
        <div className="flex items-center justify-between gap-2">
          {previewMode === "timeline" ? (
            <>
              {/* 左側: リセット & ナビゲーション */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={safeIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
                  title="最初に戻る"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={safeIndex === 0}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors flex items-center gap-1"
                >
                  ◀ 前へ
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                    isPlaying
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-sm"
                  }`}
                >
                  <span>{isPlaying ? "⏸ 停止" : "▶ 再生"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={safeIndex >= totalEvents - 1}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors flex items-center gap-1"
                >
                  次へ ▶
                </button>
              </div>

              {/* 右側: 現在のイベント種別タグ */}
              <div className="text-right">
                {currentContext.rawEvent ? (
                  <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                    イベント #{currentContext.rawEvent.orderIndex + 1} ({currentContext.rawEvent.eventType})
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">イベントなし</span>
                )}
              </div>
            </>
          ) : (
            // Draftモード時のコントロール表示
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-300 font-medium">
                  入力フォームの内容をリアルタイム反映中
                </span>
              </div>
              <button
                type="button"
                onClick={() => onModeChange("timeline")}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                タイムライン再生へ戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
