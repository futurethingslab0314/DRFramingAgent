# Research Context Generation 設計文件

**日期：** 2026-03-16  
**狀態：** Draft  
**語言：** 以繁體中文為主  
**定位：** 場域優先、研究脈絡輔助、規則導向、可逐步加入少量 LLM

---

## 1. 背景

目前 DRF 左側的 `Possible Contexts` 邏輯仍相對簡單。  
它主要是把 active constellation keywords 直接轉成 context cards，而不是生成真正的研究情境。

這導致幾個問題：

- context card 很像 keyword list，不像研究場域
- 與使用者的 `idea seed` 連動不夠強
- 容易出現抽象概念被當成 context 的情況
- 學生不容易從這些 card 看出「我的研究會發生在哪裡」

例如：

如果使用者輸入：

`我想要做讓設計系學生可以練習 design pitch 的 conversational agent`

目前 context card 可能會出現：

- ethnography
- design fiction
- participatory speculation

這些不是真正的研究情境，而比較像方法、取向、或概念資源。

因此需要一個新的 `Research Context Generation` 邏輯，讓系統生成的內容更接近：

- 實際場域
- 研究脈絡
- 可被學生理解與選擇的情境建議

---

## 2. 目標

新的 context generation 應達成以下目標：

1. `Possible Contexts` 以 **實際場域** 為主，而不是單純 keyword 改寫。
2. 同時保留一部分 **研究脈絡**，讓學生知道題目可被放進什麼研究框架。
3. `idea seed` 必須是主要 anchor，不能讓 constellation 直接取代原始題目。
4. constellation 的角色是提供：
   - epistemic lens
   - conceptual framing
   - alternative contextual directions
5. context card 必須能向下游支援：
   - framing directions
   - research gap
   - research question

---

## 3. 核心決策

這份設計採用：

- **場域優先**
- **研究脈絡輔助**

意思是：

- top context 應該先回答「這個研究可能發生在哪裡」
- 次要 context 再回答「這個研究可放進什麼較高層的研究脈絡」

例如：

若使用者輸入：

`設計系學生練習 design pitch 的 conversational agent`

較好的 context 應該是：

### 場域型

- design studio critique sessions
- classroom pitch rehearsal
- portfolio review preparation
- peer feedback settings in design education

### 研究脈絡型

- AI-mediated design learning
- pedagogies of critique and presentation
- reflective practice in design education

---

## 4. Context 不等於 Keyword

Research context 應該是：

- 一個研究會發生的 setting
- 或一個研究可被理解的 contextual frame

而不是：

- 單一方法詞
- 單一概念詞
- keyword 本身

較差的例子：

- ethnography
- design fiction
- data
- interface

較好的例子：

- design classrooms where students rehearse project pitches
- critique sessions in studio-based design education
- AI-mediated learning environments for presentation practice
- peer review settings where design concepts are verbally articulated

---

## 5. 建議的系統架構

建議將 context generation 拆成三層：

### Layer A: Topic And Setting Signal Extraction

從 `idea seed` 中抽出：

- actors
- setting cues
- activity cues
- artifact / system cues
- institutional cues

同時加入 constellation signal：

- active keywords
- orientation
- artifact role
- pipeline role

### Layer B: Deterministic Context Candidate Builder

用規則生成兩類 context candidates：

1. `Setting-oriented contexts`
2. `Research-frame contexts`

### Layer C: Optional LLM Rewriter

用少量 LLM 將候選 context 重寫成更自然的學生可讀語句。

LLM 的任務是：

- 重寫 wording
- 不創造脫離 topic 的新 context
- 保留 setting-first 原則

---

## 6. 兩類 Context Candidate

## 6.1 Setting-Oriented Contexts

這一類是主要輸出。

它回答：

- 研究可能發生在哪裡？
- 誰在那裡做什麼？

範例：

- classroom settings where design students rehearse project pitches
- studio critique sessions involving verbal presentation and feedback
- peer-to-peer rehearsal environments for articulating design concepts
- portfolio review preparation in design education

## 6.2 Research-Frame Contexts

這一類是次要輸出。

它回答：

- 這個題目可放進什麼研究脈絡？

範例：

- AI-mediated design learning
- critique culture in studio education
- reflective presentation practices in design pedagogy
- conversational scaffolding in design communication

---

## 7. Context Generation 的輸入資料

第一版建議輸入：

- `ideaSeed`
- `selectedLens`
- `activeKeywords`
- `selectedSteeringNote`

從 idea seed 中特別要抽：

- actor
- setting
- activity
- artifact/system
- institution/domain

例如：

`我想要做讓設計系學生可以練習 design pitch 的 conversational agent`

可抽出：

- actor: 設計系學生
- activity: 練習 design pitch
- artifact/system: conversational agent
- institution/domain: design education
- likely setting: studio / classroom / critique / rehearsal

---

## 8. Deterministic 規則設計

## 8.1 Context Pattern Types

建議先定義幾種 pattern：

### Pattern A: Educational Setting

適用於：

- students
- learning
- class
- studio
- education
- pedagogy

輸出偏向：

- classrooms
- studio critiques
- peer review sessions
- teaching and learning settings

### Pattern B: Professional / Practice Setting

適用於：

- workplace
- design teams
- professional communication
- collaboration

輸出偏向：

- design team meetings
- collaborative review settings
- client-facing presentation contexts

### Pattern C: Everyday / Situated Setting

適用於：

- routine
- domestic practice
- everyday life
- personal experience

輸出偏向：

- everyday routines
- domestic settings
- lived situations

### Pattern D: Experimental / Speculative Setting

適用於：

- design fiction
- speculative design
- participatory speculation

輸出偏向：

- speculative workshop settings
- co-imagining sessions
- alternative scenario exploration contexts

### Pattern E: Reflective / Interpretive Research Frame

適用於：

- ethnography
- reflection
- critique
- interpretation

輸出偏向：

- reflective design learning environments
- interpretive settings for critique and articulation
- design pedagogy contexts centered on reflection

---

## 8.2 Pattern Trigger Rules

每個 context 不應直接從 keyword 長出來，而應由：

- idea seed 的 setting cue
- constellation 的 orientation / artifact role
- keyword cue dictionary

共同決定。

### 若 idea seed 含有教育 cue

例如：

- student
- classroom
- studio
- learning
- critique
- pitch practice

優先 Pattern A。

### 若 idea seed 含有 communication / presentation cue

例如：

- pitch
- presentation
- rehearsal
- articulate
- feedback

應優先生成：

- rehearsal settings
- critique sessions
- presentation preparation contexts

### 若 constellation 偏 critical / exploratory

context 可加入：

- reflective
- interpretive
- situated

但不能因此把場域抽象化到只剩理論脈絡。

### 若 constellation 偏 speculative / critique_device

可以在次要 context 中加入：

- speculative workshop settings
- alternative scenario exploration

但這些應排在較後面，除非 idea seed 本身已有 speculative cue。

---

## 9. idea seed 與 constellation 的平衡

這裡建議沿用 tension generation 的原則：

- `idea seed 50%`
- `constellation 50%`

但預設排序偏向：

- **top 1-2 = 場域最貼題**
- **top 3-5 = 逐步打開研究脈絡**

也就是：

- 先回答「研究發生在哪裡」
- 再回答「它在研究上可被放進什麼 context」

---

## 10. Guardrails

### Guardrail 1: Context Must Be A Setting Or Frame

Context card 不應只是：

- keyword
- method name
- concept label

必須至少符合：

- 場域
- 群體
-活動情境
- 研究脈絡

### Guardrail 2: Topic Anchor Preservation

每個 top context 都必須與 idea seed 的 actor、activity 或 domain 至少共享一個核心 anchor。

例如：

- student
- pitch
- classroom
- design
- agent

若完全沒有共享 anchor，就不應進 top 3。

### Guardrail 3: Research Frame Cannot Replace Setting

研究脈絡可以補充 context，但不能完全取代場域型 context。

允許：

- classroom pitch rehearsal in design education
- reflective critique settings in studio learning

不建議：

- ethnography
- speculative design
- AI pedagogy

如果只有這些抽象詞而沒有場域描述，就不夠好。

---

## 11. 建議的輸出格式

```ts
interface StructuredContextCandidate {
  id: string;
  label: string;
  rationale: string;
  contextType: "setting" | "research_frame";
  sourceKeywords: string[];
  sourceAnchors: string[];
  score: number;
}
```

前端學生端主要顯示：

- `label`
- `rationale`

系統內部保留：

- `contextType`
- `sourceKeywords`
- `sourceAnchors`
- `score`

---

## 12. 例子模擬

## 12.1 題目

`我想要做讓設計系學生可以練習 design pitch 的 conversational agent`

### 較好的 top contexts

#### Top 1-2: 場域優先

- design studio settings where students rehearse project pitches
- classroom critique environments for practicing verbal articulation of design concepts

#### Top 3-4: 場域 + 較高層研究脈絡

- peer feedback settings in design education supported by conversational AI
- reflective presentation practice in studio-based learning

#### Top 5: 較 exploratory 的研究脈絡

- AI-mediated design pedagogy focused on communication and critique

### 不理想的 contexts

- ethnography
- design fiction
- participatory speculation

因為它們不是 context，本身比較像方法或 framing lens。

---

## 13. 與現有程式的對應

目前相關檔案：

- `backend/src/utils/guidedFraming.ts`
- `backend/src/skills/guidedExpansionGenerator.ts`

建議新增：

- `backend/src/utils/contextSignals.ts`
- `backend/src/utils/contextCandidates.ts`

### `guidedFraming.ts`

目前應從：

- keyword -> context card

改成：

- idea seed + constellation -> structured context candidates -> guided options

### `guidedExpansionGenerator.ts`

維持 orchestration：

- 收集 idea seed
- 收集 active keywords
- 呼叫 context signal extraction
- 呼叫 candidate builder
- 回傳排序後的 context cards

---

## 14. 第一版實作建議

建議分兩階段：

### Phase 1: 純 deterministic

先完成：

- context pattern types
- anchor extraction
- setting-first ranking
- research-frame fallback

### Phase 2: 少量 LLM rewrite

在 deterministic 結果穩定後，再加入：

- wording improvement
- de-abstracting abstract contexts
- more natural setting phrasing

---

## 15. 推薦結論

Research context generation 應該和 tension generation 一樣：

- 不只是 keyword mapping
- 也不只是概念列表
- 而是把 `idea seed` 放進你的 constellation worldview 後，生成學生可理解、可選擇的研究場域與研究脈絡

但在 context 這一題上，系統應更明確採用：

- **場域優先**
- **研究脈絡輔助**

這樣 DRF 才不會只是給抽象詞，而是能真正幫學生回答：

> 我的研究到底可能發生在哪裡？
