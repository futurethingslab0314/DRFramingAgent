# Idea Seed 與 Constellation 在 Tension Generation 中的平衡原則

**日期：** 2026-03-16  
**狀態：** Draft  
**語言：** 繁體中文為主  
**目的：** 補充 tension generation 中 `idea seed` 與 `constellation` 的權重與 guardrails，避免 tension 建議與使用者原始題目脫鉤

---

## 1. 核心決策

在 tension generation 中，`idea seed` 與 `constellation` 的權重採用：

- **idea seed：50%**
- **constellation：50%**

但系統預設行為必須偏向：

- **先維持與原始題目的直接相關**
- **再透過 constellation 開拓相鄰研究方向**

換句話說：

- 系統可以開出新的 idea direction
- 但第一層建議應優先是「看得出和原題直接相關的 research tension」
- 只有在後面的候選 tension 中，才逐步增加較 exploratory 的偏移

---

## 2. 這個決策想解決什麼問題

若過度依賴 constellation，系統容易出現：

- 使用者輸入的是 `design pitch conversational agent`
- 但 tension 卻跑去 `subjective rhythms`, `standardized temporal systems`

這種情況下，雖然 tension 本身可能有研究味，但：

- 跟使用者的原題沒有明顯連結
- 學生會覺得工具在「換題」
- 失去引導而變成錯位

因此 tension generation 應該同時做到：

1. 保留使用者題目的可辨識主軸
2. 透過 constellation 引入研究張力與 alternative framing directions

---

## 3. 系統心智模型

可用一句話描述：

> tension generation 不是用 constellation 取代 topic，而是用 constellation 重新折射 topic。

也就是：

- `idea seed` 提供 topic anchor
- `constellation` 提供 epistemic lens
- `tension` 是兩者交會後產生的 researchable conflict

---

## 4. 排序原則

當系統生成多個 tension candidates 時，不應該只看「研究味夠不夠」，也必須看：

- 與原始 idea seed 的距離
- 與 constellation 的對應程度

建議排序分成兩層：

### Layer 1: Relevance Gate

先過濾掉與 `idea seed` 幾乎無關的 candidate。

意思是：

- 如果 candidate 的主要概念完全不在 idea seed 的語意範圍內
- 即使它很符合 constellation，也不應排到最前面

### Layer 2: Expansion Ranking

在「仍與原題有關」的 candidate 裡，再依 constellation 的研究價值排序。

也就是：

- 候選 tension 先要 relevant
- 再來才看哪個更有 research opening potential

---

## 5. 建議的候選分層策略

建議 tension cards 顯示時，不只是單一排序，而是內部邏輯分成兩群：

### Group A: Closely Related Tensions

這一組應該排在最前面。

特徵：

- 與 idea seed 高度相關
- 仍保留原本 topic 的語意核心
- 只是透過 constellation 把 topic research-ify

例如：

使用者輸入：

`我想要做讓設計系學生可以練習 design pitch 的 conversational agent`

Group A 可能是：

- persuasive fluency vs critical design reflection
- conversational rehearsal vs authentic articulation of design intent
- AI-supported pitch practice vs dependence on scripted responses

### Group B: Adjacent Exploratory Tensions

這一組可以排在後面。

特徵：

- 與 idea seed 還有關聯
- 但開始往 constellation 的 epistemic worldview 延伸
- 目的是幫學生看到 alternative directions

Group B 可能是：

- performance of pitch vs situated studio judgment
- techno-centric coaching vs pedagogical ambiguity in critique
- persuasive communication norms vs alternative modes of design articulation

這樣就能同時滿足：

- 不脫離原題
- 又能開出新方向

---

## 6. 50/50 的實作含義

這個 50/50 不是指「所有 candidate 都剛好一半一半」，而是指總體排序與產出策略上：

- 不能只由 idea seed 決定
- 也不能只由 constellation 決定

建議更精確地拆成：

### 6.1 Candidate Generation

候選 tension 的來源：

- 50% 來自 `idea seed term / phrase / domain cue`
- 50% 來自 `constellation signal / orientation / artifact role / active keyword`

### 6.2 Candidate Filtering

在 filter 階段，應偏向 `idea seed relevance`。

也就是：

- 如果 tension 與原題幾乎無關，就算 constellation 很強，也先不要進 top list

### 6.3 Candidate Ranking

在 filter 之後，再讓 constellation 的 research orientation 明顯影響排序。

這樣最後的效果會是：

- top 1-2：明顯貼近原題
- top 3-5：逐漸打開相鄰的研究方向

---

## 7. Guardrails

為避免系統過度跑題，建議加入以下 guardrails。

### Guardrail 1: Topic Anchor Preservation

每個 top candidate 至少要與 idea seed 共享一個核心 topic cluster。

例如：

- design education
- design pitch
- conversational agent
- temporal systems
- routines

如果 shared cluster 為 0，則不應進 top 3。

### Guardrail 2: Constellation Cannot Replace Topic

constellation 只能改變「怎麼看」這個題目，不能直接把題目換成別的研究主題。

允許：

- design pitch agent -> performance vs reflection
- design pitch agent -> coaching vs dependency

不允許：

- design pitch agent -> subjective biological rhythms

除非使用者的 idea seed 本身也有時間、節律、日常作息等明確 cue。

### Guardrail 3: Expansion Should Be Progressive

候選 tension 的偏移量應漸進，而不是全部都很遠。

建議：

- Top 1-2：高相關
- Top 3-4：中等開拓
- Top 5：可較 exploratory

---

## 8. 建議的 scoring 調整

原本的 scoring 不能只看：

- pattern fit
- orientation alignment
- anti-solutionism bonus

還需要明確加入：

- topic-anchor similarity
- topic drift penalty

### 建議新增欄位

```ts
score =
  topicAnchorSimilarity * 0.30 +
  constellationAlignment * 0.25 +
  researchValue * 0.20 +
  antiSolutionismBonus * 0.15 +
  expansionPotential * 0.10 -
  topicDriftPenalty
```

### 欄位解釋

#### topicAnchorSimilarity

candidate 和 idea seed 的主題相似度。

#### constellationAlignment

candidate 與 active constellation worldview 的一致性。

#### researchValue

candidate 是否能形成真正 researchable tension，而不是單純功能對立。

#### antiSolutionismBonus

candidate 是否有把題目拉離過度 solution-driven framing。

#### expansionPotential

candidate 是否有幫學生看到相鄰但合理的新方向。

#### topicDriftPenalty

candidate 若偏離原題太遠則扣分。

---

## 9. 系統輸出策略

為了讓學生感受到「有拓展」但不覺得「被換題」，建議前端可考慮以下策略：

### Option A: 單一列表，但內部排序有分層

最簡單，不改 UI。

做法：

- top 1-2 顯示最貼題 tension
- 後面逐步變得更 exploratory

### Option B: 分兩組顯示

- `Closer to your idea`
- `Alternative framing directions`

這很符合你現在的產品目標，但會需要改前端 UI。

第一版若不想動 UI，可先做 Option A。

---

## 10. 例子模擬

## 10.1 使用者題目

`我想要做讓設計系學生可以練習 design pitch 的 conversational agent`

若 constellation 偏強的 active keywords 為：

- design fiction
- participatory speculation
- ethnography
- techno-centrism

### 合理的 top candidates

#### Top 1-2: 直接相關

- persuasive pitch fluency vs critical design reasoning
- conversational rehearsal vs authentic articulation of design intent

#### Top 3-4: 相鄰開拓

- AI-supported coaching vs dependency on scripted responses
- performative presentation norms vs situated studio reflection

#### Top 5: 較 exploratory

- techno-centric support tools vs ambiguity in learning to critique

### 不應進 top 3 的例子

- standardized temporal systems vs lived and subjective rhythms

因為它雖然可能符合 constellation 的某些 pattern，但與 idea seed topic anchor 明顯不足。

---

## 11. 建議結論

這次已確認的產品方向是：

- **idea seed 與 constellation 採 50/50**
- **但預設排序要先偏向與原題直接相關**
- **再逐步打開相鄰方向**

因此 tension generation 的正確目標不是：

- 完全忠於原題
- 或完全服從 constellation

而是：

- **先維持題目辨識度**
- **再利用 constellation 做研究性偏折**

這樣才最符合 DRF 的定位：

- 不是 generic ChatGPT
- 也不是把學生題目完全改寫成老師的題目
- 而是提供可教學、可研究化、但仍保有學生原始出發點的 framing guidance
