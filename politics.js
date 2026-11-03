(function () {
  const data = window.POLITICS_STUDY_DATA;
  if (!data) return;

  const STORAGE_KEY = "liangPoliticsStudyV1";
  const topicMap = new Map(data.topics.map((topic) => [topic.id, topic]));
  const cards = data.cards || [];
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  })();
  const known = new Set(Array.isArray(saved.known) ? saved.known : []);

  let activeTopic = "all";
  let activeKnowledgeSet = "set1";
  let activeAnswerSet = "marx";
  let activeMaterialTab = "knowledge";
  let knowledgeQuery = "";
  let knowledgeVisible = 12;
  let knowledgeRecall = false;
  const revealedKnowledge = new Set();
  let reviewIndex = 0;
  let reviewRevealed = false;
  let quizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;
  let quizStarted = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function assetUrl(path, page = null) {
    if (!path) return "";
    const fileName = String(path).replace(/\\/g, "/").split("/").pop();
    return `assets/politics/${encodeURIComponent(fileName)}${page ? `#page=${page}` : ""}`;
  }

  function sourceLink(label, path, page = null) {
    if (!path) return `<span class="politics-pending">待更新</span>`;
    return `<a href="${assetUrl(path, page)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ known: [...known] }));
    } catch {
      // Keep the current page usable when local storage is unavailable.
    }
    syncStats();
    window.updateProgressUI?.();
  }

  function topicCards(topicId) {
    return cards.filter((card) => card.topic === topicId);
  }

  function topicMastery(topicId) {
    const pool = topicCards(topicId);
    const mastered = pool.filter((card) => known.has(card.id)).length;
    return {
      mastered,
      total: pool.length,
      percent: pool.length ? Math.round((mastered / pool.length) * 100) : 0
    };
  }

  function pageHeading(kicker, title, description, titleId) {
    const percent = cards.length
      ? Math.round((known.size / cards.length) * 100)
      : 0;
    return `
      <div class="view-heading politics-heading">
        <div>
          <p class="section-index">${escapeHtml(kicker)}</p>
          <h1 id="${titleId}">${escapeHtml(title)}</h1>
          <p>${escapeHtml(description)}</p>
        </div>
        <div class="politics-heading-score">
          <span>必考点掌握</span>
          <strong class="politics-overall-percent">${percent}<span>%</span></strong>
        </div>
      </div>
    `;
  }

  function renderTopicCards() {
    return data.topics
      .map((topic) => {
        const progress = topicMastery(topic.id);
        return `
          <button class="politics-topic-card politics-topic-${topic.tone}" type="button" data-view="politics-materials">
            <span class="politics-topic-number">${topic.number}</span>
            <span class="politics-topic-copy">
              <small>${escapeHtml(topic.kicker)}</small>
              <strong>${escapeHtml(topic.title)}</strong>
              <em>${escapeHtml(topic.summary)}</em>
            </span>
            <span class="politics-topic-progress">
              <b>${progress.percent}%</b>
              <i><span style="width:${progress.percent}%"></span></i>
              <small>${progress.mastered} / ${progress.total}</small>
            </span>
          </button>
        `;
      })
      .join("");
  }

  function renderHub() {
    const mount = document.getElementById("politics-content");
    if (!mount || mount.dataset.ready === "true") return;
    mount.innerHTML = `
      <div class="view-heading politics-heading">
        <div>
          <p class="section-index">总工作台 · 05</p>
          <h1 id="politics-title">考研政治</h1>
          <p>两条必考主线、选择题知识点、分析题纯答案和政治自测分布在独立页面中。</p>
        </div>
        <div class="politics-heading-score">
          <span>必考点掌握</span>
          <strong class="politics-overall-percent">0<span>%</span></strong>
        </div>
      </div>
      <section class="politics-brief">
        <div class="politics-brief-copy">
          <p>26 考研 · 肖老师说今年两大考点</p>
          <h2>先把两条主线记牢，再把肖四答案背顺</h2>
          <span>学习、复习和自测已经拆成独立页面，掌握进度与学习档案保持同步。</span>
          <div class="politics-brief-actions">
            <button type="button" data-view="politics-materials">打开学习资料</button>
            <button type="button" data-view="politics-review">开始卡片复习</button>
          </div>
        </div>
        <div class="politics-brief-stamp" aria-hidden="true">
          <strong>2</strong><span>必考主线</span><small>28 POINTS</small>
        </div>
      </section>
      <section class="politics-overview">
        <div><span>必考点卡</span><strong>${cards.length}</strong></div>
        <div><span>选择题知识点</span><strong>99</strong></div>
        <div><span>分析题纯答案</span><strong>25</strong></div>
        <div><span>政治自测题</span><strong>${data.practiceQuestions.length}</strong></div>
      </section>
      <section class="politics-topics">
        <div class="politics-section-head">
          <div><p>两大必考点</p><h2>先认题眼，再记完整表述</h2></div>
          <span>点击专题进入学习资料</span>
        </div>
        <div class="politics-topic-grid">${renderTopicCards()}</div>
      </section>
      <div class="politics-hub-links">
        <button type="button" data-view="politics-materials"><span>学习资料</span><strong>99 个知识点 · 25 道纯答案</strong><b>进入资料库</b></button>
        <button type="button" data-view="politics-review"><span>复习小卡片</span><strong>28 张政治必考点卡</strong><b>开始复习</b></button>
        <button type="button" data-view="politics-practice"><span>历史真题小仓库</span><strong>12 道政治考点自测</strong><b>开始自测</b></button>
      </div>
    `;
    mount.dataset.ready = "true";
  }

  function knowledgeItems() {
    const set = data.knowledgeSets.find((item) => item.id === activeKnowledgeSet);
    if (!set) return [];
    const query = knowledgeQuery.trim().toLowerCase();
    return set.items
      .map((text, index) => ({
        number: index + 1,
        text,
        type: index < 16 ? "单选题" : "多选题",
        page:
          activeKnowledgeSet === "set1"
            ? index < 16 ? 1 : index < 24 ? 2 : 3
            : activeKnowledgeSet === "set2"
              ? index < 14 ? 1 : index < 23 ? 2 : index < 32 ? 3 : 4
              : index < 17 ? 1 : index < 28 ? 2 : 3
      }))
      .filter((item) => !query || item.text.toLowerCase().includes(query));
  }

  function maskedKnowledgeText(text) {
    const terms = [
      "马克思主义",
      "中国共产党",
      "中国特色社会主义",
      "高质量发展",
      "新发展格局",
      "中国式现代化",
      "全过程人民民主",
      "共同富裕",
      "社会主义核心价值观",
      "全面依法治国",
      "高水平对外开放",
      "人类命运共同体",
      "主要矛盾",
      "客观规律",
      "生产力",
      "生产关系",
      "剩余价值"
    ];
    let masked = text;
    let changed = false;
    terms.forEach((term) => {
      if (masked.includes(term)) {
        masked = masked.split(term).join("＿＿＿＿");
        changed = true;
      }
    });
    return changed
      ? masked
      : `${text.slice(0, Math.max(12, Math.floor(text.length * 0.55)))}……`;
  }

  function renderKnowledgeItems() {
    const grid = document.getElementById("politics-knowledge-grid");
    if (!grid) return;
    const items = knowledgeItems();
    const visible = items.slice(0, knowledgeVisible);
    const count = document.getElementById("politics-knowledge-count");
    const more = document.getElementById("politics-knowledge-more");
    if (count) count.textContent = `${items.length} 个知识点`;
    if (more) more.hidden = visible.length >= items.length;
    grid.innerHTML = visible.length
      ? visible
          .map((item) => {
            const key = `${activeKnowledgeSet}-${item.number}`;
            const shown = revealedKnowledge.has(key);
            return `
              <article class="politics-knowledge-card ${knowledgeRecall && !shown ? "is-masked" : ""}" data-politics-knowledge-item="${key}">
                <div class="politics-knowledge-meta">
                  <span>${item.type} · 第 ${item.number} 点</span><b>P.${item.page}</b>
                </div>
                <p>${escapeHtml(knowledgeRecall && !shown ? maskedKnowledgeText(item.text) : item.text)}</p>
              </article>
            `;
          })
          .join("")
      : `<p class="politics-knowledge-empty">没有找到对应知识点。</p>`;
    document.querySelectorAll("[data-politics-knowledge-set]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.politicsKnowledgeSet === activeKnowledgeSet
      );
    });
    const recallToggle = document.querySelector("[data-politics-recall]");
    if (recallToggle) recallToggle.classList.toggle("is-active", knowledgeRecall);
    const set = data.knowledgeSets.find((item) => item.id === activeKnowledgeSet);
    const source = document.getElementById("politics-knowledge-source");
    const blank = document.getElementById("politics-knowledge-blank");
    if (source) {
      source.outerHTML = sourceLink("精简版原 PDF", set?.source, 1).replace(
        "<a ",
        '<a id="politics-knowledge-source" '
      );
    }
    if (blank) {
      blank.outerHTML = sourceLink("挖空版原 PDF", set?.blankSource, 1).replace(
        "<a ",
        '<a id="politics-knowledge-blank" '
      );
    }
  }

  function renderAnswerItems() {
    const grid = document.getElementById("politics-answer-grid");
    if (!grid) return;
    const set = data.answerSets.find((item) => item.id === activeAnswerSet);
    const items = set?.items || [];
    grid.innerHTML = items
      .map(
        (item, index) => `
          <article class="politics-answer-card">
            <div class="politics-answer-meta"><span>${escapeHtml(item.suite)} · 第 ${index + 1} 题</span><b>纯答案</b></div>
            <strong>${escapeHtml(item.title)}</strong>
            <p class="politics-answer-question">${escapeHtml(item.question)}</p>
            <details>
              <summary>展开背诵答案</summary>
              <ol>${item.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ol>
            </details>
          </article>
        `
      )
      .join("");
    document.querySelectorAll("[data-politics-answer-set]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.politicsAnswerSet === activeAnswerSet
      );
    });
    const count = document.getElementById("politics-answer-count");
    if (count) count.textContent = `${items.length} 道分析题`;
    const source = document.getElementById("politics-answer-source");
    if (source) {
      source.outerHTML = sourceLink("打开纯答案 PDF", set?.source, 1).replace(
        "<a ",
        '<a id="politics-answer-source" '
      );
    }
  }

  function renderResourceGroups() {
    const grouped = new Map();
    data.resources.forEach((resource) => {
      if (!grouped.has(resource.group)) grouped.set(resource.group, []);
      grouped.get(resource.group).push(resource);
    });
    return [...grouped.entries()]
      .map(
        ([group, items]) => `
          <section class="politics-resource-group">
            <div class="politics-resource-group-head"><h3>${escapeHtml(group)}</h3><span>${items.length} 份</span></div>
            <div class="politics-resource-list">
              ${items
                .map(
                  (item) => `
                    <article class="politics-resource-item">
                      <span class="politics-resource-file" aria-hidden="true">PDF</span>
                      <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>
                      <span class="politics-resource-actions">
                        ${sourceLink("打开 PDF", item.path, 1)}
                        ${
                          /精简版|挖空版/.test(item.title)
                            ? `<button type="button" data-politics-material-tab="knowledge" data-politics-knowledge-set="${/（一）/.test(item.title) ? "set1" : /（二）/.test(item.title) ? "set2" : "set3"}">查看整理</button>`
                            : /纯答案背诵版/.test(item.title)
                              ? `<button type="button" data-politics-material-tab="answers" data-politics-answer-set="${/马原/.test(item.title) ? "marx" : /史纲/.test(item.title) ? "history" : "thought"}">查看整理</button>`
                              : /刷题表/.test(item.title)
                                ? '<button type="button" data-politics-material-tab="answers">查看速查</button>'
                                : item.group === "精缩与答疑" && item.path
                                  ? '<button type="button" data-politics-material-tab="methods">查看整理</button>'
                                  : ""
                        }
                      </span>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>
        `
      )
      .join("");
  }

  function renderAudioResources() {
    return (data.audio || [])
      .map(
        (item) => `
          <article class="politics-audio-item">
            <span class="politics-audio-mark" aria-hidden="true">声</span>
            <span><strong>${escapeHtml(item.suite)}</strong><small>小谭肖四分析题带背音频</small></span>
            ${sourceLink("播放", item.path)}
          </article>
        `
      )
      .join("");
  }

  function renderMaterials() {
    const mount = document.getElementById("politics-materials-content");
    if (!mount || mount.dataset.ready === "true") return;
    mount.innerHTML = `
      <div class="politics-page">
        ${pageHeading("学习资料 · 政治考点", "考研政治资料库", "选择题知识点、分析题纯答案、答题方法和肖四资料分别在独立标签中。", "politics-materials-title")}
        <section class="politics-overview">
          <div><span>必考专题</span><strong>2</strong></div>
          <div><span>选择题知识点</span><strong>99</strong></div>
          <div><span>分析题纯答案</span><strong>25</strong></div>
          <div><span>肖四资料</span><strong>${data.resources.length}</strong></div>
        </section>
        <nav class="politics-material-tabs" aria-label="政治学习资料分类">
          <button class="is-active" type="button" data-politics-material-tab="knowledge">选择题知识点</button>
          <button type="button" data-politics-material-tab="answers">分析题纯答案</button>
          <button type="button" data-politics-material-tab="methods">答题方法</button>
          <button type="button" data-politics-material-tab="notes">肖四资料</button>
        </nav>
        <div class="politics-material-panel is-active" data-politics-material-panel="knowledge">
          <section class="politics-knowledge" id="politics-knowledge">
            <div class="politics-section-head">
              <div><p>肖四选择题 · 知识点板</p><h2>三套精简版，共 99 个必背知识点</h2></div><span>逐题整理 · 可搜索</span>
            </div>
            <div class="politics-knowledge-toolbar">
              <div class="politics-knowledge-tabs" role="tablist">
                ${data.knowledgeSets.map((set) => `<button class="${set.id === "set1" ? "is-active" : ""}" type="button" data-politics-knowledge-set="${set.id}">${escapeHtml(set.title)}</button>`).join("")}
              </div>
              <label class="politics-knowledge-search">
                <span class="sr-only">搜索政治知识点</span>
                <input id="politics-knowledge-search" type="search" placeholder="搜索关键词，如：高质量发展">
              </label>
              <div class="politics-knowledge-sources">
                ${sourceLink("精简版原 PDF", data.knowledgeSets[0].source, 1).replace("<a ", '<a id="politics-knowledge-source" ')}
                ${sourceLink("挖空版原 PDF", data.knowledgeSets[0].blankSource, 1).replace("<a ", '<a id="politics-knowledge-blank" ')}
              </div>
            </div>
            <div class="politics-knowledge-subhead">
              <span id="politics-knowledge-count">33 个知识点</span>
              <span class="politics-knowledge-subhead-actions">
                <small>单选 1—16、多选 17—33</small>
                <button id="politics-recall-toggle" type="button" data-politics-recall>挖空回忆</button>
              </span>
            </div>
            <div class="politics-knowledge-grid" id="politics-knowledge-grid"></div>
            <button class="politics-knowledge-more" id="politics-knowledge-more" type="button">再显示 12 条</button>
          </section>
        </div>
        <div class="politics-material-panel" data-politics-material-panel="answers" hidden>
          <section class="politics-answers" id="politics-answers">
            <div class="politics-section-head">
              <div><p>纯答案背诵 · 肖四分析题</p><h2>马原、史纲、新思想，分题背答案</h2></div><span id="politics-answer-count">8 道分析题</span>
            </div>
            <div class="politics-answer-toolbar">
              <div class="politics-answer-tabs" role="tablist">
                ${data.answerSets.map((set) => `<button class="${set.id === "marx" ? "is-active" : ""}" type="button" data-politics-answer-set="${set.id}">${escapeHtml(set.title)}</button>`).join("")}
              </div>
              ${sourceLink("打开纯答案 PDF", data.answerSets[0].source, 1).replace("<a ", '<a id="politics-answer-source" ')}
            </div>
            <div class="politics-answer-grid" id="politics-answer-grid"></div>
            <section class="politics-answer-sheet" id="politics-answersheet">
              <div><p>26肖四刷题表</p><h3>四套卷答题速查</h3><span>每套：单选 1—16 题，多选 17—33 题</span></div>
              <div class="politics-answer-sheet-sets"><span>第 1 套</span><span>第 2 套</span><span>第 3 套</span><span>第 4 套</span></div>
            </section>
          </section>
        </div>
        <div class="politics-material-panel" data-politics-material-panel="methods" hidden>
          <section class="politics-methods" id="politics-methods">
            <div class="politics-section-head">
              <div><p>精缩与答疑 · 答题方法</p><h2>会背之后，还要知道怎么用</h2></div><span>整理自木易答疑</span>
            </div>
            <div class="politics-method-grid">
              ${data.methods.map((method, index) => `<article class="politics-method-card"><span>${String(index + 1).padStart(2, "0")} · P.${method.page}</span><strong>${escapeHtml(method.title)}</strong><p>${escapeHtml(method.text)}</p></article>`).join("")}
            </div>
          </section>
        </div>
        <div class="politics-material-panel" data-politics-material-panel="notes" hidden>
          <section class="politics-notes" id="politics-notes">
            <div class="politics-section-head">
              <div><p>肖四笔记合集</p><h2>原卷、带背、精简、挖空都放在这里</h2></div><span>${data.resources.length} 份 PDF · ${(data.audio || []).length} 段音频</span>
            </div>
            <p class="politics-notes-notice">PDF 和带背音频已随网站发布，可直接在新标签页中打开。</p>
            <div class="politics-resources">${renderResourceGroups()}</div>
            <section class="politics-audio-library">
              <div class="politics-resource-group-head"><h3>马原分析题带背音频</h3><span>${(data.audio || []).length} 段</span></div>
              <div class="politics-audio-grid">${renderAudioResources()}</div>
            </section>
          </section>
        </div>
      </div>
    `;
    mount.dataset.ready = "true";
    renderKnowledgeItems();
    renderAnswerItems();
  }

  function renderReview() {
    const mount = document.getElementById("politics-review-content");
    if (!mount || mount.dataset.ready === "true") return;
    mount.innerHTML = `
      <div class="politics-page">
        ${pageHeading("复习小卡片 · 政治考点", "政治考点复习", "先看问题回忆答案，再翻面核对；掌握状态与总工作台、学习档案同步。", "politics-review-title")}
        <section class="politics-review">
          <div class="politics-section-head">
            <div><p>最后一年重点</p><h2>两条主线，28 张卡片</h2></div><span id="politics-review-position"></span>
          </div>
          <div class="politics-review-toolbar">
            <div class="politics-filters" role="tablist">
              <button class="is-active" type="button" data-politics-filter="all">全部考点</button>
              ${data.topics.map((topic) => `<button type="button" data-politics-filter="${topic.id}">${escapeHtml(topic.short)}</button>`).join("")}
            </div>
            <button class="politics-shuffle" type="button" data-politics-shuffle>随机一张</button>
          </div>
          <article class="politics-flashcard">
            <div class="politics-card-meta"><span id="politics-card-topic"></span><span id="politics-card-page"></span></div>
            <div class="politics-card-front" id="politics-card-front"></div>
            <div class="politics-card-answer" id="politics-card-answer" hidden></div>
            <div class="politics-card-actions">
              <button type="button" data-politics-reveal>查看答案</button>
              <button type="button" data-politics-next>还不熟 · 下一张</button>
              <button type="button" data-politics-known>记住了 · 下一张</button>
            </div>
          </article>
        </section>
        <div class="politics-module-back">
          <button type="button" data-view="politics-materials">回到政治学习资料</button>
          <button type="button" data-view="politics-practice">去做政治自测</button>
        </div>
      </div>
    `;
    mount.dataset.ready = "true";
    renderReviewCard();
  }

  function renderPractice() {
    const mount = document.getElementById("politics-practice-content");
    if (!mount || mount.dataset.ready === "true") return;
    mount.innerHTML = `
      <div class="politics-page">
        ${pageHeading("独立学习板块 · 政治自测", "政治考点自测", "用 12 道选择题检查“十五五”规划、抗战胜利80周年和肖四政治常识。", "politics-practice-title")}
        <section class="politics-practice">
          <div class="politics-section-head">
            <div><p>独立自测页</p><h2>两条主线，12 道题快速查漏</h2></div><span>每题即时解析</span>
          </div>
          <div class="politics-quiz-intro" id="politics-quiz-intro">
            <div><strong>先不看答案，完成一轮 12 题自测</strong><p>覆盖“十五五”规划、抗战胜利80周年及肖四政治常识。完成后结算正确率。</p></div>
            <button type="button" data-politics-quiz-start>开始自测</button>
          </div>
          <div class="politics-quiz-shell" id="politics-quiz-shell" hidden>
            <div class="politics-quiz-topline"><span id="politics-quiz-topic"></span><strong id="politics-quiz-position"></strong></div>
            <div class="politics-quiz-progress"><span id="politics-quiz-progress-bar"></span></div>
            <h3 id="politics-quiz-question"></h3>
            <div class="politics-quiz-options" id="politics-quiz-options"></div>
            <div class="politics-quiz-feedback" id="politics-quiz-feedback" hidden></div>
            <div class="politics-quiz-actions"><button type="button" id="politics-quiz-next" data-politics-quiz-next disabled>下一题</button></div>
          </div>
          <div class="politics-quiz-result" id="politics-quiz-result" hidden>
            <span>本轮完成</span><strong><b id="politics-quiz-result-score">0</b> / ${data.practiceQuestions.length}</strong>
            <p id="politics-quiz-result-copy"></p>
            <div><small>正确率 <b id="politics-quiz-result-percent">0</b>%</small><button type="button" data-politics-quiz-start>再测一次</button></div>
          </div>
        </section>
        <div class="politics-module-back">
          <button type="button" data-view="politics-materials">回到学习资料</button>
          <button type="button" data-view="politics-review">去复习卡片</button>
        </div>
      </div>
    `;
    mount.dataset.ready = "true";
    renderPracticeQuestion();
  }

  function renderReviewCard() {
    const pool =
      activeTopic === "all" ? cards : cards.filter((card) => card.topic === activeTopic);
    if (reviewIndex >= pool.length) reviewIndex = 0;
    const card = pool[reviewIndex];
    if (!card) return;
    const topic = topicMap.get(card.topic);
    document.getElementById("politics-card-topic").textContent = `${topic?.short || "考点"} · ${card.tag}`;
    document.getElementById("politics-card-page").textContent = `原资料 P.${card.page}`;
    document.getElementById("politics-review-position").textContent = `第 ${reviewIndex + 1} / ${pool.length} 张`;
    document.getElementById("politics-card-front").textContent = card.front;
    const answer = document.getElementById("politics-card-answer");
    answer.innerHTML = `<span>参考答案</span><strong>${escapeHtml(card.answer)}</strong>`;
    answer.hidden = !reviewRevealed;
    document.querySelector("[data-politics-reveal]").textContent = reviewRevealed ? "收起答案" : "查看答案";
    const knownButton = document.querySelector("[data-politics-known]");
    knownButton.classList.toggle("is-saved", known.has(card.id));
    knownButton.textContent = known.has(card.id) ? "已掌握 · 下一张" : "记住了 · 下一张";
    document.querySelectorAll("[data-politics-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.politicsFilter === activeTopic);
    });
  }

  function renderPracticeQuestion() {
    const intro = document.getElementById("politics-quiz-intro");
    if (!intro) return;
    const shell = document.getElementById("politics-quiz-shell");
    const result = document.getElementById("politics-quiz-result");
    intro.hidden = quizStarted;
    shell.hidden = !quizStarted || quizIndex >= data.practiceQuestions.length;
    result.hidden = !quizStarted || quizIndex < data.practiceQuestions.length;
    if (!quizStarted || quizIndex >= data.practiceQuestions.length) {
      if (quizStarted) {
        const percent = Math.round((quizScore / data.practiceQuestions.length) * 100);
        document.getElementById("politics-quiz-result-score").textContent = quizScore;
        document.getElementById("politics-quiz-result-percent").textContent = percent;
        document.getElementById("politics-quiz-result-copy").textContent =
          percent >= 80
            ? "两条主线掌握得很稳，继续保持。"
            : percent >= 60
              ? "基础已经成形，重点回看错题对应的原资料页。"
              : "建议先回学习资料过一遍，再来重测。";
      }
      return;
    }
    const question = data.practiceQuestions[quizIndex];
    document.getElementById("politics-quiz-topic").textContent = question.topic;
    document.getElementById("politics-quiz-position").textContent = `第 ${quizIndex + 1} / ${data.practiceQuestions.length} 题`;
    document.getElementById("politics-quiz-progress-bar").style.width = `${((quizIndex + 1) / data.practiceQuestions.length) * 100}%`;
    document.getElementById("politics-quiz-question").textContent = question.question;
    document.getElementById("politics-quiz-options").innerHTML = question.options
      .map((option, index) => `<button type="button" data-politics-option="${index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`)
      .join("");
    document.getElementById("politics-quiz-feedback").hidden = true;
    document.getElementById("politics-quiz-next").disabled = true;
    document.getElementById("politics-quiz-next").textContent =
      quizIndex === data.practiceQuestions.length - 1 ? "查看结果" : "下一题";
    quizAnswered = false;
  }

  function syncStats() {
    const percent = cards.length ? Math.round((known.size / cards.length) * 100) : 0;
    document.querySelectorAll(".politics-overall-percent").forEach((node) => {
      node.innerHTML = `${percent}<span>%</span>`;
    });
    const sidebarCount = document.getElementById("sidebar-politics-review-count");
    if (sidebarCount) sidebarCount.textContent = known.size;
    const settingsCount = document.getElementById("settings-politics-mastered");
    if (settingsCount) settingsCount.textContent = known.size;
  }

  function syncSidebar() {
    const percent = cards.length ? Math.round((known.size / cards.length) * 100) : 0;
    document.getElementById("sidebar-current-section").textContent = "考研政治 · 两大必考点";
    document.getElementById("sidebar-mastery").textContent = `${percent}%`;
    document.getElementById("sidebar-progress-bar").style.width = `${percent}%`;
    document.getElementById("sidebar-progress-label").textContent = "政治考点已掌握";
    document.getElementById("sidebar-progress-track").style.setProperty("--progress-position", `${percent}%`);
    const companion = document.getElementById("sidebar-progress-companion");
    companion.dataset.progressState = percent <= 0 ? "zero" : percent >= 100 ? "complete" : "active";
    companion.setAttribute("aria-label", `政治考点学习进度 ${percent}%`);
  }

  function showMaterialsTab(tabName) {
    activeMaterialTab = tabName;
    document.querySelectorAll("[data-politics-material-panel]").forEach((panel) => {
      const active = panel.dataset.politicsMaterialPanel === tabName;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    document.querySelectorAll("[data-politics-material-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.politicsMaterialTab === tabName);
    });
  }

  function show(name) {
    if (name === "politics") renderHub();
    if (name === "politics-materials") {
      renderMaterials();
      renderKnowledgeItems();
      renderAnswerItems();
      showMaterialsTab(activeMaterialTab);
    }
    if (name === "politics-review") {
      renderReview();
      renderReviewCard();
    }
    if (name === "politics-practice") {
      renderPractice();
      renderPracticeQuestion();
    }
    if (["politics", "politics-materials", "politics-review", "politics-practice"].includes(name)) {
      syncStats();
      syncSidebar();
    } else if (["home", "profile", "review-hub"].includes(name)) {
      syncStats();
    }
  }

  document.addEventListener("click", (event) => {
    const materialTab = event.target.closest("[data-politics-material-tab]");
    if (materialTab) {
      const knowledgeSet = materialTab.dataset.politicsKnowledgeSet;
      const answerSet = materialTab.dataset.politicsAnswerSet;
      if (knowledgeSet) {
        activeKnowledgeSet = knowledgeSet;
        knowledgeVisible = 12;
        knowledgeQuery = "";
        revealedKnowledge.clear();
        renderKnowledgeItems();
      }
      if (answerSet) {
        activeAnswerSet = answerSet;
        renderAnswerItems();
      }
      showMaterialsTab(materialTab.dataset.politicsMaterialTab);
      return;
    }
    const knowledgeSetButton = event.target.closest("[data-politics-knowledge-set]");
    if (knowledgeSetButton) {
      activeKnowledgeSet = knowledgeSetButton.dataset.politicsKnowledgeSet;
      knowledgeVisible = 12;
      knowledgeQuery = "";
      revealedKnowledge.clear();
      const search = document.getElementById("politics-knowledge-search");
      if (search) search.value = "";
      renderKnowledgeItems();
      return;
    }
    const answerSetButton = event.target.closest("[data-politics-answer-set]");
    if (answerSetButton) {
      activeAnswerSet = answerSetButton.dataset.politicsAnswerSet;
      renderAnswerItems();
      return;
    }
    if (event.target.closest("[data-politics-recall]")) {
      knowledgeRecall = !knowledgeRecall;
      revealedKnowledge.clear();
      renderKnowledgeItems();
      return;
    }
    const knowledgeItem = event.target.closest("[data-politics-knowledge-item]");
    if (knowledgeRecall && knowledgeItem) {
      revealedKnowledge.add(knowledgeItem.dataset.politicsKnowledgeItem);
      renderKnowledgeItems();
      return;
    }
    if (event.target.closest("#politics-knowledge-more")) {
      knowledgeVisible += 12;
      renderKnowledgeItems();
      return;
    }
    const filterButton = event.target.closest("[data-politics-filter]");
    if (filterButton) {
      activeTopic = filterButton.dataset.politicsFilter;
      reviewIndex = 0;
      reviewRevealed = false;
      renderReviewCard();
      return;
    }
    if (event.target.closest("[data-politics-reveal]")) {
      reviewRevealed = !reviewRevealed;
      renderReviewCard();
      return;
    }
    if (event.target.closest("[data-politics-next]")) {
      const pool = activeTopic === "all" ? cards : cards.filter((card) => card.topic === activeTopic);
      reviewIndex = (reviewIndex + 1) % pool.length;
      reviewRevealed = false;
      renderReviewCard();
      return;
    }
    if (event.target.closest("[data-politics-known]")) {
      const pool = activeTopic === "all" ? cards : cards.filter((card) => card.topic === activeTopic);
      const card = pool[reviewIndex];
      if (card) {
        known.add(card.id);
        saveProgress();
      }
      reviewIndex = (reviewIndex + 1) % pool.length;
      reviewRevealed = false;
      renderReviewCard();
      return;
    }
    if (event.target.closest("[data-politics-shuffle]")) {
      const pool = activeTopic === "all" ? cards : cards.filter((card) => card.topic === activeTopic);
      reviewIndex = pool.length ? Math.floor(Math.random() * pool.length) : 0;
      reviewRevealed = false;
      renderReviewCard();
      return;
    }
    if (event.target.closest("[data-politics-quiz-start]")) {
      quizIndex = 0;
      quizScore = 0;
      quizAnswered = false;
      quizStarted = true;
      renderPracticeQuestion();
      return;
    }
    const option = event.target.closest("[data-politics-option]");
    if (option) {
      if (quizAnswered) return;
      const question = data.practiceQuestions[quizIndex];
      const chosen = Number(option.dataset.politicsOption);
      quizAnswered = true;
      if (chosen === question.answer) quizScore += 1;
      document.querySelectorAll("[data-politics-option]").forEach((button) => {
        const index = Number(button.dataset.politicsOption);
        button.disabled = true;
        button.classList.toggle("is-correct", index === question.answer);
        button.classList.toggle("is-wrong", chosen !== question.answer && index === chosen);
      });
      const feedback = document.getElementById("politics-quiz-feedback");
      feedback.innerHTML = `<strong>${chosen === question.answer ? "回答正确" : "再看一下"}</strong><p>${escapeHtml(question.explanation)}</p>`;
      feedback.hidden = false;
      document.getElementById("politics-quiz-next").disabled = false;
      return;
    }
    if (event.target.closest("[data-politics-quiz-next]")) {
      if (!quizAnswered) return;
      quizIndex += 1;
      renderPracticeQuestion();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id !== "politics-knowledge-search") return;
    knowledgeQuery = event.target.value;
    knowledgeVisible = 12;
    revealedKnowledge.clear();
    renderKnowledgeItems();
  });

  window.PoliticsStudy = {
    show,
    syncStats,
    getStats() {
      return {
        known: known.size,
        total: cards.length,
        percent: cards.length ? Math.round((known.size / cards.length) * 100) : 0
      };
    }
  };

  syncStats();
  const initialHash = window.location.hash.replace(/^#/, "");
  if (
    ["politics", "politics-materials", "politics-review", "politics-practice"].includes(
      initialHash
    )
  ) {
    if (typeof window.showView === "function") window.showView(initialHash);
    show(initialHash);
  }
})();
