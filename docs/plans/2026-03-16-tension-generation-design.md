# DRF Tension Generation 設計文件

**日期：** 2026-03-16  
**狀態：** Draft  
**語言：** 以繁體中文為主，保留必要英文欄位名稱  
**定位：** 規則導向、可實作、可逐步升級為 production logic

---

## 1. 背景

目前 DRF 左側的 `Possible Tension / Gap` 主要來自一個 placeholder 邏輯：

- 讀取 active keywords
- 取前幾個 keyword
- 直接套用 `X vs default assumptions`

這個做法的問題是：

- 看起來像 tension，但其實沒有真正建立研究上的對立關係
- 比較像 keyword label，不像 design research framing
- 無法反映 constellation 中較深的 epistemic stance
- 對學生而言，容易選到「詞」，但不容易理解「研究張力」

因此需要一個新的 tension generation 邏輯，讓系統生成的內容更接近：

- 研究問題中的 conceptual tension
- design research 常見的 epistemic conflict
- 可作為 framing gap 的陳述起點

---

## 2. 目標

新的 tension generation 應該達成以下目標：

1. 不再把 tension 視為單一 keyword 的改寫，而是「兩種研究邏輯、假設、制度、經驗或設計取向之間的張力」。
2. 盡量優先使用 deterministic 規則，讓結果可預期、可調整、可除錯。
3. 在規則產生 candidate 之後，允許使用少量 LLM 將 tension 重寫成更像 design research framing 的語句。
4. tension 必須與使用者的 `idea seed`、已啟用 constellation keyword、以及主要 epistemic orientation 有連動。
5. tension 不只是「好看」的句子，而是能夠向下游轉成：
   - framing directions
   - research gap
   - research question

---

## 3. 核心原則

### 3.1 Tension 不等於 keyword

tension 應該是至少兩個元素之間的關係，而不是單一詞彙。

較差的例子：

- `design fiction vs default assumptions`

較好的例子：

- `speculative imagination vs normative daily routines`
- `personal temporal experience vs standardized clock time`
- `interpretive ethnography vs optimization-driven system logic`

### 3.2 Tension 要能被學生理解

雖然邏輯以系統規則為主，但最後輸出的句子必須保有教學可讀性。  
學生看到後應能直覺理解：

- 這個研究到底卡在哪裡
- 它在挑戰什麼
- 它不是單純做一個功能，而是回應某種研究上的矛盾

### 3.3 先規則、後語言潤飾

第一步先由規則產生結構化的 tension candidate。  
第二步再視需要用 LLM 把它重寫成較自然的 research wording。

這樣能保留：

- 可控性
- 除錯能力
- 與 constellation 的一致性

---

## 4. 建議的系統架構

建議將 tension generation 拆成三層：

### Layer A: Constellation Signal Extraction

從目前 active constellation 中抽出可用訊號：

- active keywords
- keyword orientation
- artifact role
- pipeline role
- keyword notes
- keyword weight

同時加入 user input：

- idea seed
- selected lens
- selected context
- selected steering note

### Layer B: Deterministic Tension Candidate Builder

用規則把訊號組成 `structured tension candidates`。

每一個 candidate 不應該只有字串，而應該至少有以下欄位：

```ts
interface StructuredTensionCandidate {
  id: string;
  leftPole: string;
  rightPole: string;
  patternType: string;
  sourceKeywords: string[];
  sourceOrientation?: Orientation;
  score: number;
  rationale: string;
  draftLabel: string;
}
```

### Layer C: LLM Rewriter

將分數最高的 candidate 丟給 LLM 重寫成學生可讀的 tension 文句。

LLM 的任務不是「創造 tension」，而是：

- 保留原有結構
- 重寫成研究語言
- 避免太 solutionist
- 避免過度空泛

---

## 5. Deterministic 規則設計

## 5.1 輸入資料

第一版建議使用以下輸入：

- `ideaSeed`
- `activeKeywords`
- `selectedLens`
- `selectedContexts`
- `selectedSteeringNote`

active keyword 至少包含：

- `term`
- `orientation`
- `artifact_role`
- `pipeline_role`
- `weight`
- `notes`

---

## 5.2 Candidate Pattern Types

建議 tension candidate 不只一種模板，而是由多種 pattern 組合。

### Pattern A: Normative System vs Lived Experience

適用於：

- time
- routine
- coordination
- efficiency
- platform
- education
- work

典型 tension：

- standardized systems vs lived experience
- institutional routines vs subjective rhythms
- optimization logic vs situated practice

這類 tension 很適合：

- HCI
- temporal studies
- ethnography
- design research

### Pattern B: Functional Logic vs Interpretive / Critical Inquiry

適用於：

- solution_system
- problem_solving orientation
- AI tools
- productivity
- system design

典型 tension：

- intervention logic vs interpretive understanding
- problem-solving framing vs critical reflection
- system efficiency vs socio-cultural ambiguity

這類 tension 很適合避免學生一路走向功能導向。

### Pattern C: Dominant Assumptions vs Alternative Imagination

適用於：

- design fiction
- speculative design
- participatory speculation
- critique_device
- generative_construct

典型 tension：

- dominant assumptions vs speculative alternatives
- taken-for-granted routines vs possible futures
- normative infrastructures vs imaginative reconfiguration

### Pattern D: Representation vs Experience

適用於：

- visualization
- mapping
- data representation
- physicalization
- interface

典型 tension：

- measurable representation vs lived complexity
- visible data vs invisible experience
- formal mapping vs embodied perception

### Pattern E: Collective Structures vs Personal Temporal / Situated Difference

適用於：

- global collaboration
- timezone
- daily routine
- chronobiology
- subjective time

典型 tension：

- collective synchronization vs personal rhythms
- shared temporal systems vs local lived timing
- standardized coordination vs biological difference

---

## 5.3 Pattern Trigger Rules

每個 keyword 不應直接產生一張 tension，而是先判斷它較可能觸發哪種 pattern。

### 規則來源

可使用三種訊號：

1. `orientation`
2. `artifact_role`
3. `term / notes` 中的 domain cue

### 建議邏輯

#### 若 orientation = `critical`

優先 pattern：

- Pattern A
- Pattern B
- Pattern C

因為 critical orientation 比較適合生成：

- questioning assumptions
- institutional critique
- dominant norm vs alternative position

#### 若 orientation = `exploratory`

優先 pattern：

- Pattern D
- Pattern E
- Pattern A

因為 exploratory 比較適合生成：

- ambiguity
- mismatch
- experiential difference

#### 若 orientation = `problem_solving`

優先 pattern：

- Pattern B
- Pattern D

但需要加入懲罰機制，避免結果只剩 solution framing。

#### 若 artifact_role = `critique_device`

加強：

- Pattern C
- Pattern B

#### 若 artifact_role = `epistemic_mediator`

加強：

- Pattern D
- Pattern A

#### 若 artifact_role = `solution_system`

加強：

- Pattern B

但應偏向：

- system logic vs lived complexity

而不是直接強化 intervention 本身。

---

## 5.4 Term Cue Dictionary

第一版建議建立一個小型 deterministic cue dictionary。

例如：

```ts
const TERM_CUES = {
  time: ["PatternA", "PatternE"],
  routine: ["PatternA", "PatternE"],
  ethnography: ["PatternA", "PatternB"],
  design_fiction: ["PatternC"],
  speculative: ["PatternC"],
  map: ["PatternD"],
  data: ["PatternD"],
  interface: ["PatternD"],
  ai: ["PatternB"],
  education: ["PatternA", "PatternB"],
};
```

此 dictionary 的目的不是做完整 ontology，而是讓系統有一個可維護的「研究語意入口」。

---

## 5.5 Candidate 組成邏輯

每一個 candidate 必須有兩端：

- `leftPole`
- `rightPole`

建議先由 pattern 決定 pole 結構，再用 keyword / idea seed 填充。

例如：

### Pattern A

```ts
leftPole = "standardized temporal systems"
rightPole = "lived and subjective rhythms"
```

若使用者輸入與 `wake up at 8:00`、`time guilt` 有關，可被重寫成：

- `normative waking schedules vs lived temporal variation`

### Pattern B

```ts
leftPole = "solution-driven system logic"
rightPole = "interpretive understanding of everyday practice"
```

### Pattern C

```ts
leftPole = "taken-for-granted assumptions"
rightPole = "speculative alternatives"
```

### Pattern D

```ts
leftPole = "formal representation"
rightPole = "embodied and situated experience"
```

### Pattern E

```ts
leftPole = "collective synchronization"
rightPole = "personal temporal difference"
```

---

## 5.6 Candidate Scoring

每個 candidate 建議打分，最後只取前 3 到 6 個。

### 建議分數來源

#### 1. Keyword match score

candidate 所使用的 source keyword 與 active keyword 的對應度

#### 2. Idea seed relevance score

candidate 的 pole 是否與 idea seed 的語意接近

#### 3. Orientation alignment score

candidate pattern 是否符合 dominant orientation

#### 4. Anti-solutionism bonus

如果 candidate 能有效把結果往研究性拉回，而不是強化功能導向，給加分

#### 5. Redundancy penalty

太接近的 candidate 要扣分，避免畫面出現一堆同義 tension

### 建議公式

```ts
score =
  keywordMatch * 0.30 +
  ideaSeedRelevance * 0.25 +
  orientationAlignment * 0.20 +
  antiSolutionismBonus * 0.15 +
  contextFit * 0.10 -
  redundancyPenalty
```

---

## 6. LLM 重寫層

LLM 不應負責「從零想出 tension」，而應只負責：

1. 將 top candidates 重寫成較自然的 design research wording
2. 控制語氣不要太功能導向
3. 把過於抽象的 pole 轉成學生較容易理解的 framing language

### 建議輸入

- idea seed
- selected lens
- selected context
- steering note
- top structured tension candidates

### 建議輸出

```ts
interface RewrittenTension {
  id: string;
  label: string;
  rationale: string;
  basedOnCandidateId: string;
}
```

### Prompt 原則

- 不要發明完全新的 tension
- 只能重寫提供的 candidates
- 保持兩端關係明確
- 語氣偏 research framing，不偏 product pitch
- 避免 `innovation`, `optimize`, `improve user experience` 這類過度功能導向語言

---

## 7. 建議輸出格式

前端顯示用的 tension option 建議包含：

```ts
interface GuidedOption {
  id: string;
  label: string;
  rationale: string;
  metadata?: {
    patternType: string;
    sourceKeywords: string[];
    score: number;
  };
}
```

學生主要看到：

- `label`
- `rationale`

系統內部保留：

- `patternType`
- `sourceKeywords`
- `score`

未來可用於：

- debug
- curator mode
- quality tuning

---

## 8. 例子

## 8.1 使用者輸入

`我做了一台每次按下按鈕都會看到早上八點的甦醒地圖，想讓使用者每天都醒在不同的位置，也可以透過地理位置的改變看見自己的起床變化軌跡`

active keywords 假設包含：

- design fiction
- participatory speculation
- ethnography
- everyday objects
- techno-centrism

### 目前 placeholder 結果

- design fiction vs default assumptions
- ethnography vs default assumptions
- everyday objects vs default assumptions

### 新規則較合理的 candidate

- normative waking schedules vs lived temporal variation
- speculative representations of waking vs habitual understandings of routine
- systematized timekeeping vs personal and situated temporal experience
- everyday routines as neutral habits vs routines as culturally loaded temporal structures

### 經 LLM 重寫後可顯示版本

- **standardized waking norms vs situated temporal experience**  
  用來 framing 個人起床經驗如何偏離社會預設的時間規訓。

- **habitual routines vs speculative re-imagining of daily time**  
  用來 framing 此研究如何透過 speculative artefacts 挑戰習以為常的日常節律。

- **mapped representations of time vs lived ambiguity of waking**  
  用來 framing 視覺化與實際時間感受之間的落差。

---

## 9. 與現有程式的對應

### 目前檔案

- `backend/src/utils/guidedFraming.ts`
- `backend/src/skills/guidedExpansionGenerator.ts`

### 建議重構方式

#### `guidedFraming.ts`

從目前的簡單 helper，升級成：

- keyword cue extraction
- pattern matching
- structured tension candidate building
- scoring
- dedupe

#### `guidedExpansionGenerator.ts`

負責 orchestration：

- 收集 active keyword
- 取得 selected lens / context / note
- 呼叫 candidate builder
- 選 top candidates
- 視需要呼叫 LLM rewrite
- 回傳前端用的 guided options

---

## 10. 第一版實作建議

建議分兩階段：

### Phase 1: 全 deterministic

先完成：

- pattern types
- cue dictionary
- candidate scoring
- dedupe

先不要加 LLM。

目的：

- 先建立可控的 tension quality baseline
- 比較容易 debug
- 比較容易看出 constellation 對 tension 的真實影響

### Phase 2: 小型 LLM rewrite

等 deterministic candidate 穩定後，再加入：

- top 3 candidate rewrite
- language polishing
- anti-solutionist phrasing control

---

## 11. 驗證標準

新的 tension generation 應至少符合以下驗證標準：

1. tension 必須包含可辨識的兩端，而不是單一 keyword
2. tension 要能對應使用者 idea seed，而不是只對應 active keyword
3. tension 的語言應接近 design research framing，而不是 generic AI text
4. 若 active keyword 偏向 solution_system，結果仍需能保留研究性與批判性
5. 同一組輸入不應產生大量語意重複的 card

---

## 12. 推薦結論

我推薦的方向是：

- **以 deterministic pattern system 為主**
- **以 constellation signal + idea seed relevance 為核心**
- **再用少量 LLM 做語言重寫**

這樣最符合 DRF 的定位：

- 不只是生成文字
- 而是把你的研究知識結構轉成可教學、可選擇、可被系統追蹤的 framing guidance

如果後續要進入 implementation，下一份文件應該是：

- `Tension Generation Implementation Plan`

內容包含：

- data structure
- function boundary
- scoring rule
- test cases
- migration path from current placeholder logic
