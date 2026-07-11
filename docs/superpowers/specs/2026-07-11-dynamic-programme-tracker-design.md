# Dynamic Programme Tracker — 設計文件

**目標：** 建築工程 Programme 動態追蹤器 — 瀏覽器即開即用的 CPM 排程 + Gantt + Dashboard 工具

**範圍：** MVP 包含 CPM 排程引擎、Gantt Chart 視圖、Dashboard KPI、CSV 匯入匯出。不包含資源管理、變更管理、協作功能、MS Project 匯入匯出（Phase 2+）

**成功標準：**
1. 可從 CSV 匯入活動清單（含 WBS、日期、依賴），CPM 引擎自動計算 Critical Path 和 Float
2. Gantt Chart 顯示活動 bar、依賴線、Critical Path 高亮、Today Line、進度條
3. Dashboard 顯示 Overall %、SPI、CP 滑移、里程碑達成率、活動狀態分布、即將到期里程碑
4. 可匯出 CSV
5. 所有 CPM 引擎測試通過（已知答案的 Schedule 驗算正確）
6. 純前端運行，不需後端，打開即用

## 架構

Dynamic Programme Tracker 是一個純前端 React SPA，所有邏輯在 browser 內執行。CPM 排程引擎以 TypeScript 撰寫，資料存於 IndexedDB（透過 Dexie.js）。Gantt Chart 由 Frappe Gantt 渲染，Dashboard 由 Recharts 渲染。

核心架構決策是 Repository Pattern：所有資料操作通過 `IProgrammeRepository` interface，MVP 實作為 `IndexedDBRepository`。日後加後端只需新增 `ApiRepository` 實作，UI 層完全不動。這保證了從 local-only 到 full-stack 的平滑升級路徑。

Frappe Gantt 作為渲染層，但 CPM 引擎和 data model 是自建的，不依賴 Frappe 的排程邏輯。日後可替換 Gantt renderer（換成 Canvas 自建或 Bryntum）而不影響 engine 和 data layer。

## 元件

### 1. CPM Engine（`src/engine/`）

排程引擎的核心，純 TypeScript class，無 framework 依賴。

**CPMEngine class：**

```typescript
class CPMEngine {
  constructor(activities: Activity[], dependencies: Dependency[])

  // Forward Pass — 計算 Early Start / Early Finish
  // 遍歷拓撲排序的活動，根據依賴關係推算最早開始/完成
  forwardPass(): void

  // Backward Pass — 計算 Late Start / Late Finish
  // 從專案最晚完成日逆向遍歷，推算最晚開始/完成
  backwardPass(): void

  // 計算 Total Float = LS - ES = LF - EF
  // Float = 0 → Critical Path
  calculateFloat(): void

  // 識別 Critical Path — 串聯所有 Float = 0 的活動
  identifyCriticalPath(): Activity[]

  // 一鍵執行完整排程
  schedule(): ScheduleResult
}
```

**支援的依賴關係：**
- FS (Finish-to-Start)：前置完成後，後繼才能開始
- SS (Start-to-Start)：前置開始後，後繼才能開始
- FF (Finish-to-Finish)：前置完成後，後繼才能完成
- SF (Start-to-Finish)：前置開始後，後繼才能完成（少用）
- 全部支援 Lag/Lead（正數 = 延遲天數，負數 = 提前）

**支援的約束類型：**
- ASAP (As Soon As Possible) — 預設，由依賴推算
- ALAP (As Late As Possible) — 在不延誤專案的前提下最晚開始
- SNET (Start No Earlier Than) — 不早於指定日期開始
- FNET (Finish No Earlier Than) — 不早於指定日期完成

**拓撲排序：**
- Engine 使用 Kahn's algorithm 進行拓撲排序，確保計算順序正確
- 若偵測到循環依賴（circular dependency），拋出 `CircularDependencyError`

### 2. Data Layer（`src/data/`）

```typescript
interface IProgrammeRepository {
  getProject(id: string): Promise<Project>
  getActivities(projectId: string): Promise<Activity[]>
  createActivity(data: Partial<Activity>): Promise<Activity>
  updateActivity(id: string, data: Partial<Activity>): Promise<Activity>
  deleteActivity(id: string): Promise<void>
  getDependencies(projectId: string): Promise<Dependency[]>
  createDependency(data: Partial<Dependency>): Promise<Dependency>
  deleteDependency(id: string): Promise<void>
  getBaselines(projectId: string): Promise<Baseline[]>
  createBaseline(data: Partial<Baseline>): Promise<Baseline>
  deleteBaseline(id: string): Promise<void>
}
```

**IndexedDBRepository** — MVP 實作，使用 Dexie.js。
**ApiRepository** — Phase 2 保留接口，不實作。

### 3. Gantt View（`src/components/Gantt/`）

包裝 Frappe Gantt library，提供以下功能：
- 活動 bar 渲染（含 % Complete 填色）
- Critical Path 紅色高亮
- 依賴連接線（FS/SS/FF/SF 箭頭）
- 今日線（Today Line）
- 時間軸縮放（日/週/月）
- 活動名稱 + WBS Code 左側凍結欄位

**注意：** Frappe Gantt 的拖曳和編輯功能有限。MVP 階段以唯讀 Gantt 為主，編輯透過 WBS Tree 或 CSV 重新匯入。拖曳編輯列為 Phase 2 功能。

### 4. Dashboard（`src/components/Dashboard/`）

KPI 卡片 + 圖表區：

**KPI 卡片（4 個）：**

| KPI | 計算方式 | 警戒閾值 |
|-----|---------|---------|
| Overall % Complete | Σ(已完工期) / Σ(總工期) × 100 | — |
| SPI (Schedule Performance Index) | EV / PV | < 0.95 = 警戒，< 0.90 = 嚴重 |
| Critical Path 滑移 | Current Finish − Baseline Finish（天） | > 0 天 = 需關注 |
| 里程碑達成率 | 按期完成 / 已到期總數 × 100 | < 80% = 警戒 |

- EV (Earned Value) = Σ(%Complete × Baseline Duration) — 實際賺得的價值
- PV (Planned Value) = Σ(到期日前應完成的 Baseline Duration) — 計劃應完成的價值
- 如無 Baseline（純 CPM 模式），SPI = N/A 顯示為灰色

**圖表區（2 個）：**
1. 活動狀態分布（Stacked Bar 或 Donut）— Done / In Progress / Not Started / Delayed
2. Critical Path 路徑列表（紅色標記的活動鏈）

**即將到期里程碑（列表）：**
- 未來 4 週內到期的里程碑
- 顯示日期、里程碑名稱、狀態（待開始/落後 X 天）

### 5. CSV Import/Export（`src/components/CSV/` + `src/utils/csv-parser.ts`）

**CSV 格式：**

```
WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1,Design Phase,30,2026-08-01,2026-08-31,,,,,,N
1.1,Schematic Design,10,2026-08-01,2026-08-15,,,,,,Y
1.2,Design Development,15,2026-08-01,,1.1,FS,0,,,,N
1.3,Construction Documents,20,,,1.2,FS,0,,,,N
2,Construction,180,,2026-10-15,1.3,FS,0,,,,N
```

**欄位說明：**
- WBS Code: 必填，如 "1.2.3"，用於建立 WBS 層級
- Activity Name: 必填
- Duration: 工作日數，正整數
- Start Date: YYYY-MM-DD，可選
- Finish Date: YYYY-MM-DD，可選
- Predecessors: 前置活動的 WBS Code，多個用 `;` 分隔
- Relation: FS|SS|FF|SF，預設為 FS
- Lag: 正整數（延遲）或負整數（提前），預設 0
- Constraint: ASAP|ALAP|SNET|FNET，預設 ASAP
- Constraint Date: YYYY-MM-DD，當 Constraint 為 SNET/FNET 時使用
- Milestone: Y|N，預設 N

**CSV 匯入日期處理邏輯：**
1. 有 Start/Finish + 無依賴 → 尊重用戶日期（手動排程模式）
2. 有 Start/Finish + 有依賴 → 匯入後自動建立第一個 Baseline（名為 "Imported Baseline"），CPM 重新計算 Current Plan
3. 無 Start/Finish + 有依賴 → CPM 從最早活動順推
4. Start Date 空白但有 Finish Date → CPM 用 Finish Date 當 FNET 約束，反推 Start
5. Start Date 有但 Finish Date 空白 → 用 Start + Duration 計算 Finish

### 6. WBS Tree View（`src/components/WBSTree/`）

活動的樹狀結構顯示，按 WBS Code 排列。MVP 階段提供：
- 展開/摺疊 WBS 節點
- 顯示每個活動的基本資訊（名稱、日期、% Complete、Critical 標記）
- 點擊活動可展開詳情面板

## 資料模型

### TypeScript Types

```typescript
// Activity — 排程活動
interface Activity {
  id: string;                    // UUID
  projectId: string;             // 所屬專案
  wbsCode: string;               // WBS Code, e.g. "1.2.3"
  name: string;
  parentId: string | null;       // WBS 父節點（從 wbsCode 推導）
  duration: number;              // 工作日
  startDate: string | null;      // YYYY-MM-DD（CPM 計算後填入）
  finishDate: string | null;     // YYYY-MM-DD
  actualStart: string | null;
  actualFinish: string | null;
  percentComplete: number;       // 0-100
  earlyStart: string | null;     // CPM Forward Pass
  earlyFinish: string | null;
  lateStart: string | null;      // CPM Backward Pass
  lateFinish: string | null;
  totalFloat: number;            // CPM 計算，工作日
  isCritical: boolean;           // totalFloat === 0
  isMilestone: boolean;
  constraintType: ConstraintType; // ASAP|ALAP|SNET|FNET
  constraintDate: string | null;
  status: ActivityStatus;        // not_started|in_progress|completed|delayed
  wbsLevel: number;              // 從 wbsCode 推導（"1.2.3" = level 3）
  bimRef: string | null;         // Phase 2+ — 3D/BIM 組件關聯
  createdAt: string;
  updatedAt: string;
}

// Dependency — 依賴關係
interface Dependency {
  id: string;
  projectId: string;
  predecessorId: string;        // Activity UUID
  successorId: string;           // Activity UUID
  relationType: RelationType;    // FS|SS|FF|SF
  lagDays: number;               // 正 = 延遲，負 = 提前
}

// Baseline — 基準版本
interface Baseline {
  id: string;
  projectId: string;
  name: string;                  // e.g. "Imported Baseline", "Contract Baseline"
  type: 'contract' | 'revised' | 'working' | 'imported';
  createdAt: string;
  // snapshot — JSON 格式的完整 activities 副本（含 dates）
  snapshot: {
    activities: Array<{
      id: string;
      wbsCode: string;
      name: string;
      duration: number;
      startDate: string;
      finishDate: string;
      isCritical: boolean;
    }>;
  };
}

// Project — 專案
interface Project {
  id: string;
  name: string;
  dataDate: string;              // 資料截止日（YYYY-MM-DD）
  description: string;
  createdAt: string;
  updatedAt: string;
}
```

### IndexedDB Schema（Dexie.js）

```typescript
db.version(1).stores({
  projects: 'id, name',
  activities: 'id, projectId, wbsCode, parentId, status, isCritical, [projectId+wbsCode]',
  dependencies: 'id, projectId, predecessorId, successorId, [projectId+successorId], [projectId+predecessorId]',
  baselines: 'id, projectId, type, createdAt',
});
```

## 資料流

```
CSV File
  ↓
csv-parser.ts (parse + validate)
  ↓
Activity[] + Dependency[]
  ↓
CPMEngine.schedule() (forward pass → backward pass → float → critical path)
  ↓
IndexedDBRepository (save activities with computed dates + save dependencies)
  ↓ [if dates were in CSV]
  → Auto-create Baseline snapshot before CPM overwrite
  ↓
React State Update
  ↓
Gantt View renders bars + dependency lines + critical path highlight
Dashboard renders KPIs from computed data
```

**進度更新流程：**
```
User updates %Complete / Actual dates (via WBS Tree or CSV re-import)
  ↓
Repository.updateActivity()
  ↓
CPMEngine.schedule() (re-run full schedule)
  ↓
Repository.updateActivity() (save recalculated dates)
  ↓
React State Update → Gantt + Dashboard refresh
```

## 錯誤處理

| 錯誤情況 | 處理策略 |
|---------|---------|
| CSV 格式錯誤（缺 WBS Code、無效日期） | 顯示行號 + 欄位名 + 錯誤描述的 validation report，不匯入 |
| 循環依賴 | CPM Engine 拋出 `CircularDependencyError`，列出涉及的 WBS Codes |
| 活動 Duration = 0 但非里程碑 | 警告但允許（CPM 視為零工期活動） |
| 活動 Duration = 0 且是里程碑 | 正常處理（里程碑工期恆為 0） |
| 依賴的前置活動不存在 | 錯誤報告：列出缺失的 WBS Code，不匯入該行 |
| 日期矛盾（Finish < Start） | 錯誤報告，不匯入該行 |
| IndexedDB 儲存失敗 | 顯示錯誤訊息 + 暫存於記憶體（ransient fallback） |
| 大量活動（> 2,000）| 警告效能可能下降，建議分批匯入 |

## 測試策略

### Unit Tests（Vitest）

**CPM Engine（優先級最高 — 排程邏輯必須完全正確）：**
1. 簡單線性鏈：A→B→C，驗算 ES/EF/LS/LF/Float/Critical Path
2. 分支合併：A→B, A→C, B→D, C→D，驗算 Critical Path 為較長分支
3. FS / SS / FF / SF 四種關係各自驗算
4. Lag/Lead 驗算
5. 約束類型（SNET/FNET）驗算
6. 里程碑（Duration=0）驗算
7. 循環依賴偵測
8. 空活動列表（邊界）

**CSV Parser：**
1. 正確格式解析
2. 缺欄位錯誤處理
3. 日期格式驗證
4. WBS Code 層級推導
5. 多前置活動解析（`;` 分隔）

**Date Utils：**
1. 加減天數（跨月跨年）
2. 工作日計算（跳過週末 — 進階可加假日曆）

### Component Tests（React Testing Library）

1. Gantt 渲染活動 bar（正確位置和寬度）
2. Dashboard KPI 卡片正確顯示數值
3. WBS Tree 展開/摺疊
4. CSV Import 按鈕和文件選擇
5. CSV Export 生成正確格式

### E2E Tests（Playwright）

1. 完整流程：匯入 CSV → CPM 排程 → Gantt 顯示 → Dashboard 更新
2. 匯出 CSV 驗證
3. 進度更新 → Dashboard SPI 變化

## Deploy 升級路徑（設計預留，MVP 不實作）

```
Phase 1 (MVP, this spec):
  React SPA → 靜態 hosting (Vercel/Netlify/任何 static server)
  Data: IndexedDB (browser local)

Phase 2 (協作):
  + FastAPI 後端 + PostgreSQL
  + 新增 ApiRepository implements IProgrammeRepository
  + Data Layer 切換：IndexedDB → REST API
  + 認證 (NextAuth/Auth0)

Phase 3 (Full):
  + WebSocket (Socket.io) + Yjs (CRDT)
  + 多人即時編輯 + 離線合併
  + 拖曳 Gantt 編輯
  + MS Project XML 匯入匯出
  + 3D/BIM 進度圖示（activity.bimRef → IFC component mapping）
```

## 技術棧總覽

| 層級 | 選擇 | 版本 |
|------|------|------|
| Framework | React + TypeScript | React 19, TS 5.x |
| Build Tool | Vite | 7.x |
| Gantt | Frappe Gantt | 最新稳定版 |
| Dashboard | Recharts | 2.x |
| State | Zustand | 5.x |
| Storage | Dexie.js (IndexedDB wrapper) | 4.x |
| Testing | Vitest + React Testing Library + Playwright | 最新 |
| UI | Tailwind CSS + shadcn/ui | 最新 |
| Package Manager | npm | 10.x |

## 已記錄的用戶決策

1. MVP 範圍：CPM 排程引擎 + Gantt Chart + Dashboard（迭代加入其他功能）
2. 技術技術棧：純前端 React SPA + IndexedDB（零後端，即開即用）
3. Gantt 渲染：混合方案 — Frappe Gantt 渲染 + 自建 CPM 引擎（data layer 可換）
4. CSV 為 WBS 主要入口（非 UI tree editor 手動編輯）
5. CSV 支援 Start Date 和 Finish Date 欄位
6. CSV 日期邏輯：有日期 + 有依賴 → 自動建 Baseline + CPM 重算
7. 保留日後新增 3D 圖示進度的可能（activity.bimRef field）
8. Deploy 路徑：Phase 2 加 FastAPI + PostgreSQL，Phase 3 加 WebSocket + Yjs

## 不做的事（YAGNI）

- 資源管理（Phase 2）
- 變更管理 / Compensation Events（Phase 2）
- 多人協作 / 即時編輯（Phase 3）
- MS Project XML / Primavera XER 匯入匯出（Phase 2）
- 手機 App（Phase 2+）
- AI 排程助手（Phase 3+）
- 天氣整合（不考慮）
- 拖曳 Gantt 編輯（Phase 2 — Frappe 互動有限）
- 自訂日曆 / 假日（Phase 2 — MVP 用週六日為非工作日的簡單邏輯）