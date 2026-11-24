import type { CharacterSlot, Event } from "@/types";

export const SCENARIO_CSV_HEADERS = [
  "orderIndex",
  "eventType",
  "speaker",
  "text",
  "pos1",
  "pos2",
  "pos3",
  "pos4",
  "pos5",
  "pos6",
  "pos7",
  "bgImage",
  "bgEffect",
  "bgmId",
  "bgmOption",
  "seId",
  "choices",
  "customParams",
] as const;

/**
 * CSVインジェクション対策 + RFC 4180 エスケープ
 */
export function escapeCsvCell(value: unknown, isNumeric = false): string {
  if (value === null || value === undefined) return "";
  let str = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // CSVインジェクション対策（数式として解釈され得る先頭記号を無害化）
  if (!isNumeric && /^[=+\-@\t]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Event配列をUTF-8 (BOM付き) CSV文字列へ変換
 */
export function eventsToCsv(events: Event[]): string {
  const sorted = [...events].sort((a, b) => a.orderIndex - b.orderIndex);
  const rows: string[] = [SCENARIO_CSV_HEADERS.join(",")];

  for (const ev of sorted) {
    let speaker = "";
    let text = "";
    let positions: Partial<Record<CharacterSlot, string>> = {};
    let bgImage = "";
    let bgEffect = "";
    let bgmId = "";
    let bgmOption = "";
    let seId = "";
    let choices = "";
    let customParams = "";

    switch (ev.eventType) {
      case "text":
        speaker = ev.data?.speaker ?? "";
        text = ev.data?.text ?? "";
        positions = ev.data?.positions ?? {};
        break;
      case "bg_change":
        bgImage = ev.data?.image ?? "";
        bgEffect = ev.data?.effect ?? "";
        break;
      case "bgm_play":
        bgmId = ev.data?.bgmId ?? "";
        bgmOption = ev.data?.option ?? "";
        break;
      case "sound_effect":
        seId = ev.data?.seId ?? "";
        break;
      case "selection":
        if (Array.isArray(ev.data?.choices) && ev.data.choices.length > 0) {
          choices = JSON.stringify(ev.data.choices);
        }
        break;
      case "custom":
        if (Array.isArray(ev.data?.params) && ev.data.params.length > 0) {
          customParams = JSON.stringify(ev.data.params);
        }
        break;
    }

    const row = [
      escapeCsvCell(ev.orderIndex, true),
      escapeCsvCell(ev.eventType),
      escapeCsvCell(speaker),
      escapeCsvCell(text),
      escapeCsvCell(positions.pos1 ?? ""),
      escapeCsvCell(positions.pos2 ?? ""),
      escapeCsvCell(positions.pos3 ?? ""),
      escapeCsvCell(positions.pos4 ?? ""),
      escapeCsvCell(positions.pos5 ?? ""),
      escapeCsvCell(positions.pos6 ?? ""),
      escapeCsvCell(positions.pos7 ?? ""),
      escapeCsvCell(bgImage),
      escapeCsvCell(bgEffect),
      escapeCsvCell(bgmId),
      escapeCsvCell(bgmOption),
      escapeCsvCell(seId),
      escapeCsvCell(choices),
      escapeCsvCell(customParams),
    ];
    rows.push(row.join(","));
  }

  // ExcelでUTF-8日本語が文字化けしないようBOMを付与
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

/**
 * シナリオCSVをブラウザからダウンロードする
 */
export function downloadScenarioCsv(scenarioName: string, events: Event[]): void {
  const csv = eventsToCsv(events);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const safeName =
    (scenarioName || "scenario")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_")
      .slice(0, 80) || "scenario";

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
