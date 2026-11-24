"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { CHARACTER_SLOTS, CharacterSlot, Event, DraftEvent } from "@/types";
import { resolveAssetUrl } from "@/lib/assets";

interface GamePreviewProps {
  projectId?: number;
  events: Event[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  draftEvent: DraftEvent | null;
  previewMode: "timeline" | "draft";
  onModeChange: (mode: "timeline" | "draft") => void;
  scenarioName?: string;
}

type FontSizeMode = "small" | "normal" | "large";

// プレビュー幅に対する相対フォントサイズ (cqw)
// normal (2.6cqw) でメッセージ枠内幅(約85cqw)に全角約30文字×3行が収まる設計
const FONT_SIZE_CQW: Record<FontSizeMode, string> = {
  small: "2.15cqw",
  normal: "2.6cqw",
  large: "3.05cqw",
};

const FONT_SIZE_LABELS: Record<FontSizeMode, string> = {
  small: "小",
  normal: "標準",
  large: "大",
};

function parseBgmOption(option?: string): { loop: boolean; volumeFactor: number } {
  if (!option) return { loop: true, volumeFactor: 1 };
  const lower = option.toLowerCase();
  const loop = !(lower.includes("noloop") || lower.includes("once"));
  let volumeFactor = 1;
  const volMatch = lower.match(/(?:volume|vol)\s*[:=]\s*(\d{1,3})/);
  if (volMatch) {
    const parsed = Math.max(0, Math.min(100, parseInt(volMatch[1], 10)));
    volumeFactor = parsed / 100;
  }
  return { loop, volumeFactor };
}

function isStopKeyword(value?: string | null): boolean {
  if (!value) return true;
  const lower = value.trim().toLowerCase();
  return lower === "" || lower === "none" || lower === "stop";
}

function applyPositionDiff(
  target: Partial<Record<CharacterSlot, string>>,
  diff?: Partial<Record<CharacterSlot, string>>
) {
  if (!diff) return;
  for (const { key } of CHARACTER_SLOTS) {
    const raw = diff[key];
    if (!raw) continue;
    const val = raw.trim();
    if (!val) continue;
    if (val.toLowerCase() === "none") {
      delete target[key];
    } else {
      target[key] = val;
    }
  }
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
  projectId,
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
  const [fontSizeMode, setFontSizeMode] = useState<FontSizeMode>("normal");
  const [isMounted, setIsMounted] = useState(false);

  // 音声再生ステート
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [failedAudioUrls, setFailedAudioUrls] = useState<Record<string, boolean>>({});

  // 読み込み失敗（未配置ファイル等）の画像URLを記録し、シルエット/グラデーション表示へ自動フォールバックする
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const seAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmUrlRef = useRef<string | null>(null);
  const lastSeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // フルスクリーン時のEscキー解除 & 背景スクロールロック
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // アンマウント時に音声を停止
  useEffect(() => {
    return () => {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.src = "";
      }
      if (seAudioRef.current) {
        seAudioRef.current.pause();
        seAudioRef.current.src = "";
      }
    };
  }, []);

  const markUrlFailed = (url: string) => {
    setFailedUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  const markAudioFailed = useCallback((url: string) => {
    setFailedAudioUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);

  const totalEvents = events.length;
  const safeIndex = Math.max(0, Math.min(currentIndex, Math.max(0, totalEvents - 1)));

  // タイムライン再生時: 0番目から現在位置までのイベントを遡って、現在の背景・BGM・7スロット立ち絵コンテキストを計算
  const currentContext = useMemo(() => {
    let activeBg: { image?: string; effect?: string } | null = null;
    let activeBgm: { name?: string; option?: string } | null = null;
    let activeSe: { name?: string } | null = null;
    let latestText: { speaker?: string; text?: string } | null = null;
    let activeSelection: { options: string[] } | null = null;
    let activeCustom: { params: string[] } | null = null;
    const activePositions: Partial<Record<CharacterSlot, string>> = {};

    if (previewMode === "timeline") {
      for (let i = 0; i <= safeIndex && i < events.length; i++) {
        const ev = events[i];
        if (ev.eventType === "bg_change") {
          activeBg = { image: ev.data?.image || undefined, effect: ev.data?.effect || undefined };
        } else if (ev.eventType === "bgm_play") {
          if (isStopKeyword(ev.data?.bgmId)) {
            activeBgm = null;
          } else {
            activeBgm = { name: ev.data?.bgmId || undefined, option: ev.data?.option || undefined };
          }
        } else if (ev.eventType === "sound_effect") {
          activeSe = i === safeIndex ? { name: ev.data?.seId || undefined } : null;
        } else if (ev.eventType === "text") {
          applyPositionDiff(activePositions, ev.data?.positions);
          if (i === safeIndex) {
            latestText = { speaker: ev.data?.speaker || undefined, text: ev.data?.text || undefined };
          }
        } else if (ev.eventType === "selection") {
          if (i === safeIndex) {
            const opts = (ev.data?.choices || []).filter(Boolean);
            activeSelection = { options: opts };
          }
        } else if (ev.eventType === "custom") {
          if (i === safeIndex) {
            const params = (ev.data?.params || []).filter(Boolean);
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
        positions: activePositions,
        selection: activeSelection,
        custom: activeCustom,
        rawEvent: events[safeIndex],
      };
    } else {
      // draftモード: 既存イベント末尾までの状態を引き継いだ上で、入力中の下書き差分を適用
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.eventType === "bg_change") {
          activeBg = { image: ev.data?.image || undefined, effect: ev.data?.effect || undefined };
        } else if (ev.eventType === "bgm_play") {
          if (isStopKeyword(ev.data?.bgmId)) {
            activeBgm = null;
          } else {
            activeBgm = { name: ev.data?.bgmId || undefined, option: ev.data?.option || undefined };
          }
        } else if (ev.eventType === "text") {
          applyPositionDiff(activePositions, ev.data?.positions);
        }
      }

      const d = draftEvent;
      if (d?.eventType === "bg_change" && (d.data?.image || d.data?.effect)) {
        activeBg = { image: d.data?.image, effect: d.data?.effect };
      }
      if (d?.eventType === "bgm_play" && (d.data?.bgmId || d.data?.option)) {
        if (isStopKeyword(d.data?.bgmId)) {
          activeBgm = null;
        } else {
          activeBgm = { name: d.data?.bgmId, option: d.data?.option };
        }
      }
      if (d?.eventType === "text") {
        applyPositionDiff(activePositions, d.data?.positions);
      }

      return {
        type: d?.eventType || "text",
        bg: activeBg,
        bgm: activeBgm,
        se: d?.eventType === "sound_effect" ? { name: d.data?.seId } : null,
        text: d?.eventType === "text" ? { speaker: d.data?.speaker, text: d.data?.text } : null,
        positions: activePositions,
        selection:
          d?.eventType === "selection"
            ? { options: (d.data?.choices || []).filter(Boolean) }
            : null,
        custom:
          d?.eventType === "custom"
            ? { params: (d.data?.params || []).filter(Boolean) }
            : null,
        rawEvent: null,
      };
    }
  }, [events, safeIndex, previewMode, draftEvent]);

  // BGM / SE URL 解決
  const resolvedBgmUrl = useMemo(() => {
    if (isStopKeyword(currentContext.bgm?.name)) return null;
    return resolveAssetUrl(projectId, "bgm", currentContext.bgm?.name);
  }, [projectId, currentContext.bgm?.name]);

  const bgmOptionParsed = useMemo(
    () => parseBgmOption(currentContext.bgm?.option),
    [currentContext.bgm?.option]
  );

  const resolvedSeUrl = useMemo(() => {
    if (isStopKeyword(currentContext.se?.name)) return null;
    return resolveAssetUrl(projectId, "se", currentContext.se?.name);
  }, [projectId, currentContext.se?.name]);

  const tryPlayBgm = useCallback(() => {
    const audio = bgmAudioRef.current;
    if (!audio || !currentBgmUrlRef.current) return;
    if (isMuted) {
      audio.pause();
      return;
    }
    audio
      .play()
      .then(() => {
        setAutoplayBlocked(false);
      })
      .catch((err) => {
        if (err?.name === "NotAllowedError") {
          setAutoplayBlocked(true);
        }
      });
  }, [isMuted]);

  // BGM 再生・切替制御
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!bgmAudioRef.current) {
      bgmAudioRef.current = new Audio();
    }
    const audio = bgmAudioRef.current;

    if (!resolvedBgmUrl) {
      audio.pause();
      audio.src = "";
      currentBgmUrlRef.current = null;
      setAutoplayBlocked(false);
      return;
    }

    audio.loop = bgmOptionParsed.loop;
    audio.volume = isMuted ? 0 : Math.max(0, Math.min(1, masterVolume * bgmOptionParsed.volumeFactor));

    if (currentBgmUrlRef.current !== resolvedBgmUrl) {
      currentBgmUrlRef.current = resolvedBgmUrl;
      audio.onerror = () => markAudioFailed(resolvedBgmUrl);
      audio.src = resolvedBgmUrl;
      audio.load();
    }

    if (isMuted) {
      audio.pause();
      return;
    }

    audio
      .play()
      .then(() => {
        setAutoplayBlocked(false);
      })
      .catch((err) => {
        if (err?.name === "NotAllowedError") {
          setAutoplayBlocked(true);
        }
      });
  }, [resolvedBgmUrl, bgmOptionParsed.loop, bgmOptionParsed.volumeFactor, isMuted, masterVolume, markAudioFailed]);

  // SE 単発再生ヘルパー
  const playSeOnce = useCallback(
    (url: string) => {
      if (typeof window === "undefined" || isMuted) return;
      if (!seAudioRef.current) {
        seAudioRef.current = new Audio();
      }
      const audio = seAudioRef.current;
      audio.pause();
      audio.onerror = () => markAudioFailed(url);
      audio.src = url;
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, masterVolume));
      audio
        .play()
        .then(() => {
          setAutoplayBlocked(false);
        })
        .catch((err) => {
          if (err?.name === "NotAllowedError") {
            setAutoplayBlocked(true);
          }
        });
    },
    [isMuted, masterVolume, markAudioFailed]
  );

  // イベント切替時に SE を単発再生
  useEffect(() => {
    if (!resolvedSeUrl) {
      lastSeKeyRef.current = null;
      return;
    }
    const triggerKey = `${previewMode}:${safeIndex}:${resolvedSeUrl}`;
    if (lastSeKeyRef.current !== triggerKey) {
      lastSeKeyRef.current = triggerKey;
      playSeOnce(resolvedSeUrl);
    }
  }, [previewMode, safeIndex, resolvedSeUrl, playSeOnce]);

  const hasDraftInput = useMemo(() => {
    if (!draftEvent) return false;
    switch (draftEvent.eventType) {
      case "text":
        return Boolean(
          draftEvent.data?.speaker ||
            draftEvent.data?.text ||
            (draftEvent.data?.positions && Object.keys(draftEvent.data.positions).length > 0)
        );
      case "bg_change":
        return Boolean(draftEvent.data?.image || draftEvent.data?.effect);
      case "bgm_play":
        return Boolean(draftEvent.data?.bgmId || draftEvent.data?.option);
      case "sound_effect":
        return Boolean(draftEvent.data?.seId);
      case "selection":
        return Boolean(draftEvent.data?.choices?.length);
      case "custom":
        return Boolean(draftEvent.data?.params?.length);
    }
  }, [draftEvent]);

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
    if (autoplayBlocked) tryPlayBgm();
    if (previewMode === "timeline" && safeIndex < totalEvents - 1) {
      onIndexChange(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (autoplayBlocked) tryPlayBgm();
    if (previewMode === "timeline" && safeIndex > 0) {
      onIndexChange(safeIndex - 1);
    }
  };

  const handleReset = () => {
    if (autoplayBlocked) tryPlayBgm();
    if (previewMode === "timeline") {
      onIndexChange(0);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (autoplayBlocked) tryPlayBgm();
    if (previewMode !== "timeline") {
      onModeChange("timeline");
    }
    setIsPlaying(!isPlaying);
  };

  // 画面クリックで次へ進む（選択肢などのインタラクションを除く）
  const handleScreenClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) {
      return;
    }
    if (autoplayBlocked) tryPlayBgm();
    if (previewMode === "timeline" && safeIndex < totalEvents - 1) {
      handleNext();
    }
  };

  const bgStyle = getBackgroundStyle(currentContext.bg?.image);
  const resolvedBgUrl = resolveAssetUrl(projectId, "bg", currentContext.bg?.image);
  const showRealBgImage = Boolean(resolvedBgUrl && !failedUrls[resolvedBgUrl]);

  const activeSlotEntries = CHARACTER_SLOTS.filter(({ key }) => Boolean(currentContext.positions[key]));
  const isOverCharacterLimit = activeSlotEntries.length > 4;
  // 最大4キャラまでを描画対象とする
  const visibleSlotKeys = new Set(activeSlotEntries.slice(0, 4).map((s) => s.key));

  const isBgmMissing = Boolean(resolvedBgmUrl && failedAudioUrls[resolvedBgmUrl]);
  const isSeMissing = Boolean(resolvedSeUrl && failedAudioUrls[resolvedSeUrl]);

  const previewCard = (
    <div
      className={`flex flex-col bg-slate-900 border rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 ${
        isFullscreen
          ? "w-full max-w-[1440px] max-h-full border-indigo-500/60"
          : "w-full border-slate-800"
      }`}
    >
      {/* プレビューヘッダー */}
      <div className="px-3 sm:px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 shrink-0">
            <span>🎮 ゲーム画面プレビュー</span>
          </span>
          {scenarioName && (
            <span className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-[220px]">
              - {scenarioName}
            </span>
          )}
        </div>

        {/* モード切替タブ・文字サイズ・拡大/解除ボタン */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 文字サイズ切替 */}
          <div
            className="bg-slate-900 border border-slate-800 p-0.5 rounded-xl flex items-center"
            title="セリフの文字サイズ切替（標準で1行約30文字×3行）"
          >
            {(["small", "normal", "large"] as FontSizeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFontSizeMode(mode)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  fontSizeMode === mode
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {FONT_SIZE_LABELS[mode]}
              </button>
            ))}
          </div>

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
              {hasDraftInput && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? "最大化を解除 (Esc)" : "フルスクリーン拡大"}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1 ${
              isFullscreen
                ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-md"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800"
            }`}
          >
            {isFullscreen ? (
              <>
                <span>✕</span>
                <span>最大化を解除 (Esc)</span>
              </>
            ) : (
              <span>⛶</span>
            )}
          </button>
        </div>
      </div>

      {/* ノベルゲーム表示領域ラッパー (最大化時はビューポート高さ内に16:9で収める) */}
      <div
        className={
          isFullscreen
            ? "flex-1 min-h-0 w-full flex items-center justify-center bg-black/60 p-2 sm:p-3 overflow-hidden"
            : "w-full"
        }
      >
        {/* ノベルゲーム表示領域 (16:9 アスペクト比フレーム + Container Query) */}
        <div
          style={{
            containerType: "inline-size",
            ...(isFullscreen
              ? { width: "min(100%, calc((100dvh - 12rem) * 16 / 9))" }
              : {}),
          }}
          className="relative w-full aspect-[16/9] overflow-hidden bg-slate-950 select-none group"
        >
          {/* 背景レイヤー */}
          <div
            className="absolute inset-0 transition-all duration-700 ease-in-out flex items-center justify-center"
            style={{
              background: bgStyle.background,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* 実背景画像（解決成功かつ未エラー時） */}
            {showRealBgImage && resolvedBgUrl && (
              <img
                src={resolvedBgUrl}
                alt={currentContext.bg?.image || "background"}
                onError={() => markUrlFailed(resolvedBgUrl)}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            )}

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
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-30 pointer-events-none">
            {currentContext.bgm?.name && (
              <div className="px-2 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-amber-500/40 text-[11px] font-medium text-amber-300 flex items-center gap-1.5 shadow-lg">
                <span className={isMuted || isBgmMissing ? "opacity-50" : "animate-pulse"}>🎵</span>
                <span className="truncate max-w-[160px] font-mono">{currentContext.bgm.name}</span>
                {isBgmMissing && <span className="text-[10px] text-rose-300">(未配置)</span>}
              </div>
            )}
            {currentContext.se?.name && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (resolvedSeUrl) playSeOnce(resolvedSeUrl);
                }}
                title="クリックして効果音を再生"
                className="pointer-events-auto px-2 py-1 rounded-md bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md border border-emerald-500/40 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5 shadow-lg"
              >
                <span>🔊</span>
                <span className="truncate max-w-[160px] font-mono">{currentContext.se.name}</span>
                {isSeMissing && <span className="text-[10px] text-rose-300">(未配置)</span>}
              </button>
            )}
            {autoplayBlocked && !isMuted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  tryPlayBgm();
                }}
                className="pointer-events-auto px-2.5 py-1 rounded-md bg-amber-600/90 hover:bg-amber-500 text-white text-[11px] font-semibold shadow-lg flex items-center gap-1"
              >
                <span>🔇</span>
                <span>クリックで音声再生を有効化</span>
              </button>
            )}
            {isOverCharacterLimit && (
              <div className="px-2 py-1 rounded-md bg-rose-950/90 backdrop-blur-md border border-rose-500/50 text-[10px] font-semibold text-rose-300 flex items-center gap-1 shadow-lg">
                <span>⚠️ 立ち絵が5人以上指定されています（先頭4人のみ表示中）</span>
              </div>
            )}
          </div>

          {/* 7ポジション・キャラクター立ち絵ステージ (最大4キャラ同時表示) */}
          <div className="absolute inset-x-2 sm:inset-x-6 bottom-[23%] top-[8%] grid grid-cols-7 items-end pointer-events-none z-10">
            {CHARACTER_SLOTS.map((slot) => {
              const img = currentContext.positions[slot.key];
              const isVisible = Boolean(img && visibleSlotKeys.has(slot.key));
              const resolvedCharUrl = isVisible
                ? resolveAssetUrl(projectId, "characters", img)
                : null;
              const canShowRealCharImage = Boolean(
                resolvedCharUrl && !failedUrls[resolvedCharUrl]
              );

              return (
                <div
                  key={slot.key}
                  className="relative h-full flex flex-col items-center justify-end"
                >
                  {isVisible && img && (
                    <div className="w-[130%] max-w-[150px] h-[88%] flex flex-col items-center justify-end transition-all duration-300">
                      {canShowRealCharImage && resolvedCharUrl ? (
                        <img
                          src={resolvedCharUrl}
                          alt={slot.label}
                          onError={() => markUrlFailed(resolvedCharUrl)}
                          className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]"
                        />
                      ) : (
                        <div className="w-full h-full rounded-t-full bg-gradient-to-t from-slate-950/90 via-indigo-950/40 to-indigo-500/10 border-t border-x border-indigo-400/30 flex flex-col items-center justify-end pb-4 px-1.5 backdrop-blur-[2px] shadow-lg">
                          <span className="text-2xl sm:text-3xl opacity-80 mb-1">👤</span>
                          <span className="text-[10px] font-mono font-bold text-indigo-200 bg-slate-950/80 border border-indigo-500/30 px-1.5 py-0.5 rounded max-w-full truncate">
                            {img}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            [{slot.shortLabel}]
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 立ち絵未指定時かつ話者名がある場合のフォールバックシルエット */}
          {activeSlotEntries.length === 0 && currentContext.text?.speaker && (
            <div className="absolute inset-x-0 bottom-[26%] flex justify-center pointer-events-none transition-all duration-500">
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

          {/* メッセージウィンドウ (画面下部・cqwスケーリングで1行30文字×3行を安定表示) */}
          <div className="absolute inset-x-[4%] bottom-[3.5%] z-20 pointer-events-none">
            <div
              style={{ padding: "2.1cqw 3.5cqw 1.8cqw" }}
              className="relative bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl transition-all duration-200"
            >
              {/* 話者ネームプレート */}
              {currentContext.text?.speaker && (
                <div
                  style={{
                    fontSize: "2.05cqw",
                    top: "-2.2cqw",
                    left: "2.8cqw",
                    padding: "0.4cqw 1.6cqw",
                  }}
                  className="absolute rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-md border border-indigo-400/30 flex items-center gap-1 leading-tight"
                >
                  <span>{currentContext.text.speaker}</span>
                </div>
              )}

              {/* セリフ本文 (3行分の高さを確保し上揃え) */}
              <div
                style={{
                  fontSize: FONT_SIZE_CQW[fontSizeMode],
                  lineHeight: 1.55,
                  letterSpacing: "0.02em",
                  minHeight: "calc(1.55em * 3)",
                }}
                className="flex items-start"
              >
                {currentContext.text?.text ? (
                  <p className="text-slate-100 font-medium whitespace-pre-wrap break-words w-full">
                    {currentContext.text.text}
                  </p>
                ) : currentContext.type === "bg_change" ? (
                  <p className="text-violet-300 italic">
                    [背景変更]: {currentContext.bg?.image || "指定なし"}{" "}
                    {currentContext.bg?.effect ? `(${currentContext.bg.effect})` : ""}
                  </p>
                ) : currentContext.type === "bgm_play" ? (
                  <p className="text-amber-300 italic">
                    [BGM再生]: {currentContext.bgm?.name || "停止"}{" "}
                    {currentContext.bgm?.option ? `(${currentContext.bgm.option})` : ""}
                  </p>
                ) : currentContext.type === "sound_effect" ? (
                  <p className="text-emerald-300 italic">
                    [効果音再生]: {currentContext.se?.name}
                  </p>
                ) : currentContext.type === "selection" ? (
                  <p className="text-rose-300 italic">[分岐選択肢の表示中]</p>
                ) : currentContext.type === "custom" ? (
                  <p className="text-slate-400 italic">[カスタムコマンド実行中]</p>
                ) : (
                  <p className="text-slate-500 italic">
                    {previewMode === "timeline"
                      ? "(セリフまたは演出イベントがありません)"
                      : "(フォームにセリフやパラメータを入力するとリアルタイムにプレビューされます)"}
                  </p>
                )}
              </div>

              {/* ページ送りカーソル (点滅) */}
              {previewMode === "timeline" && safeIndex < totalEvents - 1 && (
                <div
                  style={{ fontSize: "1.9cqw", bottom: "1.2cqw", right: "2.2cqw" }}
                  className="absolute text-indigo-400 animate-bounce font-bold leading-none"
                >
                  ▼
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 再生コントロールバー & 音声コントロール */}
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

        {/* ボタン群 + 音声スライダー */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {previewMode === "timeline" ? (
            <div className="flex items-center gap-1.5 flex-wrap">
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
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">
                入力フォームの内容をリアルタイム反映中
              </span>
              <button
                type="button"
                onClick={() => onModeChange("timeline")}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium ml-1"
              >
                タイムライン再生へ戻る
              </button>
            </div>
          )}

          {/* 右側: 音量コントロール & 現在イベントタグ */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="text-xs text-slate-300 hover:text-white transition-colors"
                title={isMuted ? "ミュート解除" : "ミュート"}
              >
                {isMuted || masterVolume === 0 ? "🔇" : masterVolume < 0.5 ? "🔉" : "🔊"}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : Math.round(masterVolume * 100)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) / 100;
                  setMasterVolume(v);
                  if (v > 0 && isMuted) setIsMuted(false);
                }}
                aria-label="音量"
                className="w-16 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                {isMuted ? 0 : Math.round(masterVolume * 100)}%
              </span>
            </div>

            {previewMode === "timeline" && (
              <div className="text-right">
                {currentContext.rawEvent ? (
                  <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                    #{currentContext.rawEvent.orderIndex + 1} ({currentContext.rawEvent.eventType})
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">イベントなし</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreen && isMounted) {
    return (
      <>
        {/* 元の位置にはレイアウト崩れを防ぐプレースホルダーを表示 */}
        <div className="w-full p-6 rounded-2xl bg-slate-900/50 border border-dashed border-indigo-500/40 text-center text-xs text-slate-400">
          プレビューをフルスクリーン表示中...
        </div>
        {createPortal(
          <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center">
            {previewCard}
          </div>,
          document.body
        )}
      </>
    );
  }

  return previewCard;
}
