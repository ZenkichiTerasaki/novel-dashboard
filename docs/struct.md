# ノベルゲームシナリオデータ構造仕様書 (Unity連携用)

本ドキュメントは、`novel-dashboard` で編集・作成し、将来的に **Unity ゲームエンジン** で読み込んで再生するためのシナリオデータ構造 (JSON / CSV) の設計仕様書です。

---

## 1. 概要とフォーマット比較

Unityでの再現性と拡張性を考慮し、データ出力フォーマットとして **JSON (推奨)** と **CSV (補助)** の両方を定義します。

| 項目 | JSON フォーマット (推奨) | CSV フォーマット (補助) |
| :--- | :--- | :--- |
| **特徴** | 選択肢分岐やネスト構造、型安全性を柔軟に表現可能 | Excel/スプレッドシートで手軽に編集可能・ローカライズ対応が容易 |
| **適用範囲** | フル機能（分岐・立ち絵演出・音響制御・フラグ分岐含む） | 単線シナリオ（セリフ・立ち絵・背景・効果音の基本再生） |
| **Unity実装** | `JsonUtility` または `Newtonsoft.Json` で即座にオブジェクト化可能 | CSVパース処理が必要 |

---

## 2. JSON データ構造仕様 (推奨)

### 2.1 スキーマ概要 (JSON サンプル)

```json
{
  "scenarioId": 101,
  "scenarioName": "第一章_出会い",
  "version": "1.0.0",
  "metadata": {
    "author": "シナリオライター名",
    "description": "主人公とヒロインの出会いのシーン",
    "createdAt": "2026-07-25T01:15:00Z"
  },
  "events": [
    {
      "id": 1,
      "orderIndex": 0,
      "eventType": "BACKGROUND_CHANGE",
      "params": {
        "image": "bg_classroom_day.png",
        "fadeDuration": 1.0
      }
    },
    {
      "id": 2,
      "orderIndex": 1,
      "eventType": "BGM_PLAY",
      "params": {
        "audio": "bgm_daily01.mp3",
        "volume": 0.8,
        "loop": true,
        "fadeDuration": 0.5
      }
    },
    {
      "id": 3,
      "orderIndex": 2,
      "eventType": "CHARACTER_SHOW",
      "params": {
        "characterId": "chara_alice",
        "name": "アリス",
        "pose": "uniform_smile",
        "position": "CENTER",
        "fadeDuration": 0.3
      }
    },
    {
      "id": 4,
      "orderIndex": 3,
      "eventType": "CHARACTER_ACTION",
      "params": {
        "characterId": "chara_alice",
        "actionType": "BOUNCE",
        "duration": 0.5,
        "power": 1.0,
        "repeatCount": 2
      }
    },
    {
      "id": 5,
      "orderIndex": 4,
      "eventType": "CHARACTER_MOVE",
      "params": {
        "characterId": "chara_alice",
        "fromPosition": "CENTER",
        "toPosition": "RIGHT",
        "duration": 0.8,
        "easing": "EASE_IN_OUT"
      }
    },
    {
      "id": 6,
      "orderIndex": 5,
      "eventType": "DIALOGUE",
      "params": {
        "speaker": "アリス",
        "characterId": "chara_alice",
        "text": "「おはよう！今日もいい天気だね。」",
        "voice": "voice_alice_001.mp3",
        "speed": 0.05
      }
    },
    {
      "id": 7,
      "orderIndex": 6,
      "eventType": "CHOICE",
      "params": {
        "prompt": "返事をどうする？",
        "options": [
          {
            "label": "元気に挨拶を返す",
            "targetScenarioId": 102,
            "targetOrderIndex": 0,
            "setFlag": { "name": "alice_affection", "value": 1, "op": "ADD" }
          },
          {
            "label": "少し恥ずかしそうにする",
            "targetScenarioId": 103,
            "targetOrderIndex": 0,
            "setFlag": { "name": "alice_affection", "value": 0, "op": "ADD" }
          }
        ]
      }
    }
  ]
}
```

### 2.2 サポートする `eventType` (演出命令) 一覧

| `eventType` | 説明 | 主要パラメータ (`params`) |
| :--- | :--- | :--- |
| **`DIALOGUE`** | セリフ・地の文の表示 | `speaker` (発話者名), `text` (本文), `voice` (ボイスファイル), `characterId` |
| **`CHARACTER_SHOW`** | 立ち絵の表示・表情変更 | `characterId`, `pose` (表情/ポーズ), `position` (`LEFT`/`CENTER`/`RIGHT`), `fadeDuration` |
| **`CHARACTER_HIDE`** | 立ち絵の退場 | `characterId`, `fadeDuration` |
| **`CHARACTER_ACTION`** | キャラクターのアクション演出 | `characterId`, `actionType` (`BOUNCE`/`SHAKE_HORIZONTAL`/`NOD`/`SHAKE_VERTICAL`), `duration`, `power`, `repeatCount` |
| **`CHARACTER_MOVE`** | キャラクターの移動・平行移動 | `characterId`, `fromPosition`, `toPosition`, `duration`, `easing` |
| **`BACKGROUND_CHANGE`** | 背景画像の変更 | `image` (画像ファイル名), `fadeDuration` |
| **`CG_SHOW` / `CG_HIDE`** | イベントスチル(1枚絵)の表示・消去 | `image`, `fadeDuration` |
| **`SCREEN_EFFECT`** | 画面揺れ・フラッシュ・色調変化 | `effectType` (`SHAKE`/`FLASH`/`SEPIA`/`MONO`), `duration`, `power`, `color` |
| **`CAMERA_WORK`** | カメラズーム・画面パン | `zoomRatio`, `targetPosition`, `duration` |
| **`WINDOW_CONTROL`** | メッセージウィンドウの表示・非表示 | `visible` (true/false), `fadeDuration` |
| **`BGM_PLAY` / `BGM_STOP`** | BGM再生・停止 | `audio` (音声ファイル名), `volume`, `loop`, `fadeDuration` |
| **`BGS_PLAY` / `BGS_STOP`** | 環境音 (雨・波・雑踏等) 再生・停止 | `audio`, `volume`, `loop`, `fadeDuration` |
| **`SE_PLAY`** | 効果音再生 | `audio` (音声ファイル名), `volume` |
| **`MOVIE_PLAY`** | ムービー再生 | `movieFile`, `skippable` (true/false) |
| **`CHOICE`** | 選択肢の表示と分岐 | `prompt`, `options` (選択肢配列: `label`, `targetScenarioId`, `setFlag`) |
| **`BRANCH_IF`** | フラグ値による自動条件分岐 | `flagName`, `condition` (`EQUAL`/`GREATER`/`LESS`), `compareValue`, `targetScenarioId` |
| **`FLAG_SET`** | 変数・フラグの操作 | `name`, `op` (`ASSIGN` / `ADD`), `value` |
| **`PRELOAD`** | アセットの事前読み込み (Unity用) | `assets` (画像/音声ファイル名一覧) |
| **`WAIT`** | 時間経過待ち | `duration` (秒数) |
| **`SCENE_CHANGE`** | 別のシナリオファイルへの遷移 | `targetScenarioId`, `targetOrderIndex` |

---

## 3. CSV データ構造仕様 (補助)

選択肢分岐を含まない単線ストーリーや、翻訳（ローカライズ）管理用に適したフラット構造です。

### 3.1 ヘッダーと行構成 (`scenario_events.csv`)

```csv
orderIndex,eventType,speaker,text,voice,image,position,audio,volume,fadeDuration,paramExtra
0,BACKGROUND_CHANGE,,,bg_classroom_day.png,,,,1.0,
1,BGM_PLAY,,,,,,bgm_daily01.mp3,0.8,0.5,loop=true
2,CHARACTER_SHOW,アリス,,,chara_alice,CENTER,,,0.3,pose=uniform_smile
3,DIALOGUE,アリス,"「おはよう！今日もいい天気だね。」",voice_alice_001.mp3,,,,,,
4,CHOICE,アリス,"返事をどうする？",,,,,,,options=元気に挨拶:102|恥ずかしがる:103
```

> **補足 (CSVの限界):**
> 選択肢 (`CHOICE`) や複雑なフラグ操作は CSV 単体だと文字列のパース (`paramExtra`) が必要になるため、**複雑なシナリオ演出には JSON 出力を推奨**します。

---

## 4. Unity (C#) での受取実装例

Unity側で上記JSONをロードして扱うための C# データ構造サンプルクラスです。

```csharp
using System;
using System.Collections.Generic;

[Serializable]
public class ScenarioData
{
    public int scenarioId;
    public string scenarioName;
    public string version;
    public ScenarioMetadata metadata;
    public List<ScenarioEvent> events;
}

[Serializable]
public class ScenarioMetadata
{
    public string author;
    public string description;
    public string createdAt;
}

[Serializable]
public class ScenarioEvent
{
    public int id;
    public int orderIndex;
    public string eventType; // DIALOGUE, CHARACTER_SHOW, BGM_PLAY, CHOICE 等
    public EventParams paramsData;
}

[Serializable]
public class EventParams
{
    // DIALOGUE
    public string speaker;
    public string text;
    public string voice;
    public string characterId;

    // CHARACTER & BACKGROUND
    public string pose;
    public string position; // LEFT, CENTER, RIGHT
    public string image;
    public float fadeDuration;

    // CHARACTER ACTION & MOVE
    public string actionType; // BOUNCE, SHAKE_HORIZONTAL, NOD, SHAKE_VERTICAL
    public float power;       // アクションの強度・高さ
    public int repeatCount;   // 繰り返し回数
    public string fromPosition; // LEFT, CENTER, RIGHT
    public string toPosition;   // LEFT, CENTER, RIGHT
    public string easing;       // LINEAR, EASE_IN_OUT, BOUNCE

    // SCREEN EFFECT & CAMERA & WINDOW
    public string effectType; // SHAKE, FLASH, SEPIA, MONO
    public string color;      // #FFFFFF, #FF0000 etc.
    public float zoomRatio;   // 1.5, 2.0 etc.
    public string targetPosition; // CENTER, LEFT, RIGHT
    public bool visible;      // メッセージウィンドウ表示状態 (true/false)

    // AUDIO & MOVIE
    public string audio;
    public float volume;
    public bool loop;
    public string movieFile;
    public bool skippable;

    // CHOICE & BRANCH & PRELOAD
    public string prompt;
    public List<ChoiceOption> options;
    public string flagName;
    public string condition;    // EQUAL, GREATER, LESS
    public int compareValue;
    public List<string> assets; // 事前ロード対象のアセット名一覧
}

[Serializable]
public class ChoiceOption
{
    public string label;
    public int targetScenarioId;
    public int targetOrderIndex;
    public FlagOperation setFlag;
}

[Serializable]
public class FlagOperation
{
    public string name;
    public string op; // ASSIGN, ADD
    public int value;
}
```

---

## 5. Webダッシュボード DB (Prisma) との対応関係

現在 `novel-dashboard` で使用されている Prisma DBスキーマの `Event` テーブル (`param1` 〜 `param6`) と JSON の相互変換ルールです。

| JSON フィールド | DB (`Event` テーブル) マッピング |
| :--- | :--- |
| `orderIndex` | `Event.orderIndex` |
| `eventType` | `Event.eventType` |
| `params.speaker` | `param1` |
| `params.text` | `param2` |
| `params.voice` / `params.image` / `params.audio` | `param3` |
| `params.characterId` / `params.pose` / `params.actionType` | `param4` |
| `params.position` / `params.fromPosition` / `params.toPosition` / `params.volume` | `param5` |
| `params.fadeDuration` / `params.power` / `params.options (JSON文字列)` | `param6` |

> 💡 **今後のバックエンド拡張案**:
> 将来的には `Event` テーブルに `paramsJson Json?` 列（PrismaのJson型）を追加することで、DB層とJSON出力の変換を直感的かつ型安全に拡張できます。

