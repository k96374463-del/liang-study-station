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
  let deckIndex = 0;
  let revealed = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fileUrl(path, page = null) {
    if (!path) return "";
    const encoded = String(path)
      .replace(/\\/g, "/")
      .split("/")
      .map((part, index) => (index === 0 ? part : encodeURIComponent(part)))
      .join("/");
    return `file:///${encoded}${page ? `#page=${page}` : ""}`;
  }

  function isLocalPath(path) {
    return /^[A-Za-z]:[\\/]/.test(String(path || ""));
  }

  function canOpenLocalFiles() {
    return window.location.protocol === "file:";
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ known: [...known] }));
    } catch {
      // Progress remains available for the current page view.
    }
    syncStats();
    window.updateProgressUI?.();
  }

  function topicCards(topicId) {
    return cards.filter((card) => card.topic === topicId);
  }

  function deckCards() {
    return activeTopic === "all"
      ? cards
      : cards.filter((card) => card.topic === activeTopic);
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

  function sourceLink(label, path, page = null) {
    if (!path) {
      return `<span class="politics-pending">待更新</span>`;
    }
    const available = !isLocalPath(path) || canOpenLocalFiles();
    if (!available) {
      return `<span class="politics-local-only">原始资料仅本机可读</span>`;
    }
    return `<a href="${fileUrl(path, page)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  }

  function renderResources() {
    const grouped = new Map();
    data.resources.forEach((resource) => {
      if (!grouped.has(resource.group)) grouped.set(resource.group, []);
      grouped.get(resource.group).push(resource);
    });
    return [...grouped.entries()]
      .map(
        ([group, items]) => `
          <section class="politics-resource-group">
            <div class="politics-resource-group-head">
              <h3>${escapeHtml(group)}</h3>
              <span>${items.length} 份</span>
            </div>
            <div class="politics-resource-list">
              ${items
                .map(
                  (item) => `
                    <article class="politics-resource-item">
                      <span class="politics-resource-file" aria-hidden="true">PDF</span>
                      <span>
                        <strong>${escapeHtml(item.title)}</strong>
                        <small>${escapeHtml(item.detail)}</small>
                      </span>
                      ${sourceLink("打开", item.path, 1)}
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
            <span>
              <strong>${escapeHtml(item.suite)}</strong>
              <small>小谭肖四分析题带背音频</small>
            </span>
            ${sourceLink("播放", item.path)}
          </article>
        `
      )
      .join("");
  }

  function ensurePage() {
    const root = document.getElementById("politics-content");
    if (!root || root.dataset.ready === "true") return root;
    const noteStatus = canOpenLocalFiles()
      ? "原始 PDF 和音频保存在本机，可从此页直接打开。"
      : "公网版展示考点整理与资料索引；原始 PDF 和音频仅在本机页面可打开。";
    root.innerHTML = `
      <div class="view-heading politics-heading">
        <div>
          <p class="section-index">总工作台 · 05</p>
          <h1 id="politics-title">考研政治</h1>
          <p>肖秀荣 26 考研两大必考点，加上肖四背诵资料索引，集中复习时政选择题与材料分析题。</p>
        </div>
        <div class="politics-heading-score">
          <span>必考点掌握</span>
          <strong id="politics-overall-percent">0<span>%</span></strong>
        </div>
      </div>

      <section class="politics-brief" aria-labelledby="politics-brief-title">
        <div class="politics-brief-copy">
          <p>26 考研 · 肖老师说今年两大考点</p>
          <h2 id="politics-brief-title">先把两条主线记牢，再把肖四答案背顺</h2>
          <span>28 张必考点卡分成“十五五”和“抗战胜利80周年”两组；每组都标出原资料页码，避免只记结论不知道出处。</span>
          <div class="politics-brief-actions">
            <button type="button" data-politics-jump="review">开始考点复习</button>
            ${sourceLink("打开 5 页原资料", data.meta.source, 1)}
          </div>
        </div>
        <div class="politics-brief-stamp" aria-hidden="true">
          <strong>2</strong>
          <span>必考主线</span>
          <small>28 POINTS</small>
        </div>
      </section>

      <section class="politics-overview" aria-label="政治学习概览">
        <div><span>必考点卡</span><strong>${cards.length}</strong></div>
        <div><span>重点专题</span><strong>${data.topics.length}</strong></div>
        <div><span>肖四资料</span><strong>${data.resources.length}</strong></div>
        <div><span>带背音频</span><strong>${(data.audio || []).length}</strong></div>
      </section>

      <section class="politics-topics" aria-labelledby="politics-topics-title">
        <div class="politics-section-head">
          <div>
            <p>两大必考点</p>
            <h2 id="politics-topics-title">先认题眼，再记完整表述</h2>
          </div>
          <span>进度按考点卡片计算</span>
        </div>
        <div class="politics-topic-grid">
          ${data.topics
            .map(
              (topic) => `
                <button class="politics-topic-card politics-topic-${topic.tone}" type="button" data-politics-topic="${topic.id}">
                  <span class="politics-topic-number">${topic.number}</span>
                  <span class="politics-topic-copy">
                    <small>${escapeHtml(topic.kicker)}</small>
                    <strong>${escapeHtml(topic.title)}</strong>
                    <em>${escapeHtml(topic.summary)}</em>
                  </span>
                  <span class="politics-topic-progress">
                    <b id="politics-topic-${topic.id}-percent">0%</b>
                    <i><span id="politics-topic-${topic.id}-bar"></span></i>
                    <small id="politics-topic-${topic.id}-count">0 / ${topicCards(topic.id).length}</small>
                  </span>
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="politics-review" id="politics-review" aria-labelledby="politics-review-title">
        <div class="politics-section-head">
          <div>
            <p>复习小卡片 · 政治考点</p>
            <h2 id="politics-review-title">看完题目，先说答案再翻面</h2>
          </div>
          <span id="politics-review-position">第 1 / ${cards.length} 张</span>
        </div>
        <div class="politics-review-toolbar">
          <div class="politics-filters" role="tablist" aria-label="选择政治考点专题">
            <button class="is-active" type="button" data-politics-filter="all">全部考点</button>
            ${data.topics
              .map(
                (topic) =>
                  `<button type="button" data-politics-filter="${topic.id}">${escapeHtml(topic.short)}</button>`
              )
              .join("")}
          </div>
          <button class="politics-shuffle" type="button" data-politics-shuffle>随机一张</button>
        </div>
        <article class="politics-flashcard" id="politics-flashcard">
          <div class="politics-card-meta">
            <span id="politics-card-topic">十五五规划</span>
            <span id="politics-card-page">原资料 P.1</span>
          </div>
          <div class="politics-card-front" id="politics-card-front"></div>
          <div class="politics-card-answer" id="politics-card-answer" hidden></div>
          <div class="politics-card-actions">
            <button type="button" data-politics-reveal>查看答案</button>
            <button type="button" data-politics-next>还不熟 · 下一张</button>
            <button type="button" data-politics-known>记住了 · 下一张</button>
          </div>
        </article>
      </section>

      <section class="politics-notes" id="politics-notes" aria-labelledby="politics-notes-title">
        <div class="politics-section-head">
          <div>
            <p>肖四笔记合集</p>
            <h2 id="politics-notes-title">原卷、带背、精简、挖空都放在这里</h2>
          </div>
          <span>${data.resources.length} 份 PDF · ${(data.audio || []).length} 段音频</span>
        </div>
        <p class="politics-notes-notice">${noteStatus}</p>
        <div class="politics-resources">
          ${renderResources()}
        </div>
        <section class="politics-audio-library">
          <div class="politics-resource-group-head">
            <h3>马原分析题带背音频</h3>
            <span>${(data.audio || []).length} 段</span>
          </div>
          <div class="politics-audio-grid">${renderAudioResources()}</div>
        </section>
      </section>
    `;
    root.dataset.ready = "true";
    return root;
  }

  function syncStats() {
    const mastered = known.size;
    const total = cards.length;
    const percent = total ? Math.round((mastered / total) * 100) : 0;
    const overall = document.getElementById("politics-overall-percent");
    if (overall) overall.innerHTML = `${percent}<span>%</span>`;
    const sidebarCount = document.getElementById("sidebar-politics-review-count");
    if (sidebarCount) sidebarCount.textContent = mastered;
    const settingsCount = document.getElementById("settings-politics-mastered");
    if (settingsCount) settingsCount.textContent = mastered;
    data.topics.forEach((topic) => {
      const progress = topicMastery(topic.id);
      const percentNode = document.getElementById(`politics-topic-${topic.id}-percent`);
      const barNode = document.getElementById(`politics-topic-${topic.id}-bar`);
      const countNode = document.getElementById(`politics-topic-${topic.id}-count`);
      if (percentNode) percentNode.textContent = `${progress.percent}%`;
      if (barNode) barNode.style.width = `${progress.percent}%`;
      if (countNode) {
        countNode.textContent = `${progress.mastered} / ${progress.total}`;
      }
    });
  }

  function syncSidebar(percent) {
    const section = document.getElementById("sidebar-current-section");
    const mastery = document.getElementById("sidebar-mastery");
    const bar = document.getElementById("sidebar-progress-bar");
    const label = document.getElementById("sidebar-progress-label");
    const track = document.getElementById("sidebar-progress-track");
    const companion = document.getElementById("sidebar-progress-companion");
    if (section) section.textContent = "考研政治 · 两大必考点";
    if (mastery) mastery.textContent = `${percent}%`;
    if (bar) bar.style.width = `${percent}%`;
    if (label) label.textContent = "政治考点已掌握";
    if (track) track.style.setProperty("--progress-position", `${percent}%`);
    if (companion) {
      companion.dataset.progressState =
        percent <= 0 ? "zero" : percent >= 100 ? "complete" : "active";
      companion.setAttribute("aria-label", `政治考点学习进度 ${percent}%`);
    }
  }

  function renderCard() {
    ensurePage();
    const pool = deckCards();
    if (!pool.length) return;
    if (deckIndex >= pool.length) deckIndex = 0;
    const card = pool[deckIndex];
    const topic = topicMap.get(card.topic);
    const front = document.getElementById("politics-card-front");
    const answer = document.getElementById("politics-card-answer");
    const topicNode = document.getElementById("politics-card-topic");
    const pageNode = document.getElementById("politics-card-page");
    const position = document.getElementById("politics-review-position");
    if (!front || !answer || !card) return;
    if (topicNode) topicNode.textContent = `${topic?.short || "考点"} · ${card.tag}`;
    if (pageNode) pageNode.textContent = `原资料 P.${card.page}`;
    if (position) position.textContent = `第 ${deckIndex + 1} / ${pool.length} 张`;
    front.textContent = card.front;
    answer.innerHTML = `<span>参考答案</span><strong>${escapeHtml(card.answer)}</strong>`;
    answer.hidden = !revealed;
    const revealButton = document.querySelector("[data-politics-reveal]");
    if (revealButton) revealButton.textContent = revealed ? "收起答案" : "查看答案";
    const knownButton = document.querySelector("[data-politics-known]");
    if (knownButton) {
      knownButton.classList.toggle("is-saved", known.has(card.id));
      knownButton.textContent = known.has(card.id)
        ? "已掌握 · 下一张"
        : "记住了 · 下一张";
    }
    document.querySelectorAll("[data-politics-filter]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.politicsFilter === activeTopic
      );
    });
    syncStats();
  }

  function moveCard(remember) {
    const pool = deckCards();
    const card = pool[deckIndex];
    if (card && remember) known.add(card.id);
    if (card && remember) saveProgress();
    deckIndex += 1;
    revealed = false;
    renderCard();
  }

  function selectTopic(topicId) {
    activeTopic = topicId || "all";
    deckIndex = 0;
    revealed = false;
    renderCard();
    document.getElementById("politics-review")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function show(name) {
    if (name !== "politics") {
      if (["home", "profile", "review-hub"].includes(name)) syncStats();
      return;
    }
    ensurePage();
    renderCard();
    const total = cards.length || 1;
    syncSidebar(Math.round((known.size / total) * 100));
  }

  document.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-politics-jump]");
    if (jump) {
      window.setTimeout(() => {
        document.getElementById(`politics-${jump.dataset.politicsJump}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 120);
      return;
    }
    const topicButton = event.target.closest("[data-politics-topic]");
    if (topicButton) {
      selectTopic(topicButton.dataset.politicsTopic);
      return;
    }
    const filterButton = event.target.closest("[data-politics-filter]");
    if (filterButton) {
      activeTopic = filterButton.dataset.politicsFilter;
      deckIndex = 0;
      revealed = false;
      renderCard();
      return;
    }
    if (event.target.closest("[data-politics-reveal]")) {
      revealed = !revealed;
      renderCard();
      return;
    }
    if (event.target.closest("[data-politics-next]")) {
      moveCard(false);
      return;
    }
    if (event.target.closest("[data-politics-known]")) {
      moveCard(true);
      return;
    }
    if (event.target.closest("[data-politics-shuffle]")) {
      const pool = deckCards();
      deckIndex = pool.length ? Math.floor(Math.random() * pool.length) : 0;
      revealed = false;
      renderCard();
    }
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
  if (initialHash === "politics") {
    if (typeof window.showView === "function") window.showView("politics");
    show("politics");
  }
})();
