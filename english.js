(() => {
  const data = window.ENGLISH_STUDY_DATA;
  if (!data) return;

  const STORAGE_KEY = "liangEnglishStudyV2";
  const levels = data.meta.vocab.levels;
  const levelMap = new Map(levels.map((level) => [level.id, level]));
  const fullLevelMap = new Map([
    ...levels.map((level) => [level.id, level.label]),
    ["all", "全部词汇"]
  ]);
  const sampleWord = data.words[0]?.w || "";
  const counts = levels.reduce((result, level) => {
    result[level.id] = data.words.filter((entry) => entry.level === level.id).length;
    return result;
  }, {});
  const totalWords = data.words.length;
  const masteredSet = new Set();

  let savedState = {};
  try {
    savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    savedState = {};
  }
  (Array.isArray(savedState.mastered) ? savedState.mastered : []).forEach((word) =>
    masteredSet.add(word)
  );

  const ui = {
    view: "vocab",
    level: "high",
    list: "all",
    query: "",
    visible: 80,
    deck: [],
    deckIndex: 0,
    deckRevealed: false,
    examRange: "recent",
    activeExam: null,
    reviewLevel: "high",
    reviewDeck: [],
    reviewIndex: 0,
    reviewRevealed: false
  };

  function saveProgress() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mastered: [...masteredSet],
          readExams: Array.isArray(savedState.readExams) ? savedState.readExams : []
        })
      );
    } catch {
      // The page still works when local storage is unavailable.
    }
    syncDashboardStats();
    syncSidebarProgress(ui.view);
  }

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
    const normalized = String(path).replace(/\\/g, "/");
    const encoded = normalized
      .split("/")
      .map((part, index) => (index === 0 ? part : encodeURIComponent(part)))
      .join("/");
    return `file:///${encoded}${page ? `#page=${page}` : ""}`;
  }

  function isLocalFileSource(path) {
    return /^[A-Za-z]:[\\/]/.test(String(path || "")) ||
      String(path || "").startsWith("file:");
  }

  function isPublicWebPage() {
    return /^https?:$/.test(window.location.protocol);
  }

  function levelLabel(id) {
    return fullLevelMap.get(id) || "词汇";
  }

  function levelTone(id) {
    return levelMap.get(id)?.tone || "slate";
  }

  function sourceLabel(entry) {
    if (entry.list) return `Word List ${String(entry.list).padStart(2, "0")}`;
    return levelLabel(entry.level);
  }

  function getStats() {
    const readExams = Array.isArray(savedState.readExams)
      ? savedState.readExams.length
      : 0;
    const totalExams = data.meta.exams.length;
    return {
      mastered: masteredSet.size,
      totalWords,
      readExams,
      totalExams,
      wordPercent: totalWords
        ? Math.round((masteredSet.size / totalWords) * 100)
        : 0,
      examPercent: totalExams
        ? Math.round((readExams / totalExams) * 100)
        : 0
    };
  }

  function syncDashboardStats() {
    const stats = getStats();
    const homeMastered = document.getElementById("home-english-mastered");
    const homeRead = document.getElementById("home-english-read");
    const englishHomeMastery = document.getElementById("english-home-mastery");
    const englishHomeTotalWords = document.getElementById("english-home-total-words");
    const englishHomeMastered = document.getElementById("english-home-mastered");
    const englishHomeMasteredLabel = document.getElementById("english-home-mastered-label");
    const englishHomeExamCount = document.getElementById("english-home-exam-count");
    const settingsEnglishMastered = document.getElementById("settings-english-mastered");
    const settingsEnglishExams = document.getElementById("settings-english-exams");
    const reviewHubCount = document.getElementById("review-hub-english-count");
    const sidebarReviewCount = document.getElementById("sidebar-english-review-count");
    if (homeMastered) {
      homeMastered.textContent = `${stats.mastered.toLocaleString("zh-CN")} 个已掌握`;
    }
    if (homeRead) {
      homeRead.textContent = `${stats.readExams} / ${stats.totalExams} 已打开`;
    }
    if (englishHomeMastery) {
      englishHomeMastery.innerHTML = `${stats.wordPercent}<span>%</span>`;
    }
    if (englishHomeTotalWords) {
      englishHomeTotalWords.textContent = stats.totalWords.toLocaleString("zh-CN");
    }
    if (englishHomeMastered) {
      englishHomeMastered.textContent = stats.mastered.toLocaleString("zh-CN");
    }
    if (englishHomeMasteredLabel) {
      englishHomeMasteredLabel.textContent =
        `已完成 ${stats.wordPercent}% · 掌握状态自动保存`;
    }
    if (englishHomeExamCount) {
      englishHomeExamCount.textContent = `${stats.readExams} / ${stats.totalExams}`;
    }
    if (settingsEnglishMastered) {
      settingsEnglishMastered.textContent = stats.mastered.toLocaleString("zh-CN");
    }
    if (settingsEnglishExams) {
      settingsEnglishExams.textContent = `${stats.readExams} / ${stats.totalExams}`;
    }
    levels.forEach((level) => {
      const count = document.getElementById(`english-home-level-${level.id}-count`);
      if (count) count.textContent = counts[level.id].toLocaleString("zh-CN");
    });
    if (reviewHubCount) {
      reviewHubCount.textContent =
        `${stats.mastered.toLocaleString("zh-CN")} / ${stats.totalWords.toLocaleString("zh-CN")} 已掌握`;
    }
    if (sidebarReviewCount) {
      sidebarReviewCount.textContent = stats.mastered.toLocaleString("zh-CN");
    }
  }

  function filteredWords() {
    const query = ui.query.trim().toLowerCase();
    return data.words.filter((entry) => {
      const levelMatches = ui.level === "all" || entry.level === ui.level;
      const listMatches =
        ui.list === "all" || String(entry.list) === String(ui.list);
      const queryMatches =
        !query ||
        entry.w.includes(query) ||
        (entry.meaning || "").toLowerCase().includes(query) ||
        (entry.example || "").toLowerCase().includes(query);
      return levelMatches && listMatches && queryMatches;
    });
  }

  function availableLists(level) {
    if (!["high", "medium", "low"].includes(level)) return [];
    const values = new Set(
      data.words
        .filter((entry) => entry.level === level && entry.list)
        .map((entry) => entry.list)
    );
    return [...values].sort((a, b) => a - b);
  }

  function syncSidebarProgress(viewName = ui.view) {
    const label = document.getElementById("sidebar-current-section");
    const mastery = document.getElementById("sidebar-mastery");
    const progress = document.getElementById("sidebar-progress-bar");
    const progressLabel = document.getElementById("sidebar-progress-label");
    const track = document.getElementById("sidebar-progress-track");
    const companion = document.getElementById("sidebar-progress-companion");

    const isExam = viewName === "english-exams" || viewName === "exam";
    const isHome = viewName === "english-home";
    const isVocabularyReview =
      viewName === "review-english" || viewName === "review";
    const percent = isExam
      ? Math.min(100, Math.round(((savedState.readExams || []).length / 33) * 100))
      : Math.min(100, Math.round((masteredSet.size / totalWords) * 100));

    if (label) {
      label.textContent = isExam
        ? "英语二 · 历年真题"
        : isHome
          ? "考研英语 · 英语二"
        : isVocabularyReview
          ? "英语二 · 词汇复习"
          : "英语二 · 词汇闪过";
    }
    if (mastery) mastery.textContent = `${percent}%`;
    if (progress) progress.style.width = `${percent}%`;
    if (progressLabel) {
      progressLabel.textContent = isExam
        ? "真题已打开"
        : isHome
          ? "英语词汇已掌握"
        : isVocabularyReview
          ? "词汇复习已掌握"
          : "词汇已掌握";
    }
    if (track) track.style.setProperty("--progress-position", `${percent}%`);
    if (companion) {
      const state = percent <= 0 ? "zero" : percent >= 100 ? "complete" : "active";
      companion.dataset.progressState = state;
      companion.setAttribute("aria-label", `英语学习进度 ${percent}%`);
    }
  }

  function renderVocabPage() {
    const root = document.getElementById("english-vocab-content");
    if (!root || root.dataset.ready === "true") {
      renderVocabLibrary();
      return;
    }

    root.innerHTML = `
      <section class="english-hero vocab-hero">
        <div class="english-hero-copy">
          <span class="english-eyebrow">27 考研 · 英语二</span>
          <h1>词汇闪过</h1>
          <p>从原书扫描页整理出 ${totalWords.toLocaleString("zh-CN")} 个词条，保留 30 个 Word List、6 层词频和原书页码。可以搜索、按词频筛词，也可以直接开始一组少而准的词卡。</p>
          <div class="english-hero-actions">
            <button class="english-primary" type="button" data-vocab-start>
              <span>开始今日词卡</span><b>30</b>
            </button>
            <a class="english-secondary" href="${fileUrl(data.meta.vocab.source, 12)}" target="_blank" rel="noopener">打开原书</a>
          </div>
        </div>
        <div class="vocab-hero-mark" aria-hidden="true">
          <span>WORD</span>
          <strong>${totalWords.toLocaleString("zh-CN")}</strong>
          <small>words in your deck</small>
        </div>
      </section>

      <section class="english-stat-grid" aria-label="词汇统计">
        ${levels
          .map(
            (level) => `
              <button class="english-stat tone-${level.tone}" type="button" data-vocab-level="${level.id}">
                <span>${level.label}</span>
                <strong>${counts[level.id].toLocaleString("zh-CN")}</strong>
                <small>原书标注 ${level.bookCount.toLocaleString("zh-CN")}</small>
              </button>
            `
          )
          .join("")}
      </section>

      <section class="vocab-deck-shell" id="vocab-deck-shell" hidden>
        <div class="vocab-deck-top">
          <div>
            <span class="english-kicker">今日词卡</span>
            <strong id="vocab-deck-position">1 / 30</strong>
          </div>
          <div class="vocab-deck-progress"><span id="vocab-deck-progress"></span></div>
          <button class="english-icon-button" type="button" data-vocab-close aria-label="收起词卡">×</button>
        </div>
        <div class="vocab-flashcard" id="vocab-flashcard"></div>
        <div class="vocab-deck-actions" id="vocab-deck-actions"></div>
      </section>

      <section class="vocab-toolbar">
        <label class="vocab-search">
          <span aria-hidden="true">⌕</span>
          <input id="vocab-search-input" type="search" value="${escapeHtml(ui.query)}" placeholder="搜索英文单词、中文释义或 Word List…" autocomplete="off">
        </label>
        <div class="vocab-level-tabs" role="tablist" aria-label="选择词频">
          <button class="${ui.level === "all" ? "is-active" : ""}" type="button" data-vocab-level-filter="all">全部</button>
          ${levels
            .map(
              (level) => `
                <button class="${ui.level === level.id ? "is-active" : ""}" type="button" data-vocab-level-filter="${level.id}">
                  ${level.label}
                </button>
              `
            )
            .join("")}
        </div>
        <label class="vocab-list-filter" id="vocab-list-filter">
          <span>Word List</span>
          <select id="vocab-list-select"></select>
          <span class="vocab-list-static" hidden>全部词条 · 不分单元</span>
        </label>
      </section>

      <section class="vocab-library">
        <div class="vocab-library-head">
          <div>
            <span class="english-kicker">Vocabulary library</span>
            <h2 id="vocab-result-title">${levelLabel(ui.level)}</h2>
          </div>
          <p id="vocab-result-count"></p>
        </div>
        <div class="vocab-word-grid" id="vocab-word-grid"></div>
        <button class="english-load-more" type="button" data-vocab-more hidden>再显示 80 个词</button>
      </section>
    `;
    root.dataset.ready = "true";
    renderVocabLibrary();
  }

  function renderListOptions() {
    const select = document.getElementById("vocab-list-select");
    const filter = document.getElementById("vocab-list-filter");
    const staticLabel = filter?.querySelector(".vocab-list-static");
    if (!select) return;
    const lists = availableLists(ui.level);
    if (!lists.length) {
      ui.list = "all";
      filter?.classList.add("is-static");
      select.disabled = true;
      select.hidden = true;
      if (staticLabel) staticLabel.hidden = false;
      return;
    }
    if (ui.list !== "all" && !lists.includes(Number(ui.list))) ui.list = "all";
    filter?.classList.remove("is-static");
    select.disabled = false;
    select.hidden = false;
    if (staticLabel) staticLabel.hidden = true;
    select.innerHTML = `
      <option value="all">全部 Word List</option>
      ${lists
        .map(
          (number) =>
            `<option value="${number}" ${String(number) === String(ui.list) ? "selected" : ""}>Word List ${String(number).padStart(2, "0")}</option>`
        )
        .join("")}
    `;
  }

  function renderVocabLibrary() {
    const grid = document.getElementById("vocab-word-grid");
    if (!grid) return;
    renderListOptions();
    const words = filteredWords();
    const visible = words.slice(0, ui.visible);
    const title = document.getElementById("vocab-result-title");
    const count = document.getElementById("vocab-result-count");
    const more = document.querySelector("[data-vocab-more]");
    if (title) {
      title.textContent =
        ui.query.trim() ? `“${ui.query.trim()}”的搜索结果` : levelLabel(ui.level);
    }
    if (count) count.textContent = `${words.length.toLocaleString("zh-CN")} 个词条`;
    if (more) more.hidden = visible.length >= words.length;
    document.querySelectorAll("[data-vocab-level-filter]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.vocabLevelFilter === ui.level
      );
    });

    if (!visible.length) {
      grid.innerHTML = `
        <div class="english-empty">
          <strong>没有找到这个词</strong>
          <p>换一个拼写，或者切换到“全部”词频再试一次。</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = visible
      .map((entry) => {
        const mastered = masteredSet.has(entry.w);
        return `
          <article class="vocab-word-card ${mastered ? "is-mastered" : ""}">
            <div class="vocab-word-top">
              <span class="vocab-tone tone-${levelTone(entry.level)}">${levelLabel(entry.level)}</span>
              <span>${sourceLabel(entry)}</span>
            </div>
            <div class="vocab-word-main">
              <div>
                <h3>${escapeHtml(entry.w)}</h3>
                ${
                  entry.phonetic
                    ? `<span class="vocab-phonetic">/ ${escapeHtml(entry.phonetic)} /</span>`
                    : ""
                }
              </div>
              <button class="${mastered ? "is-starred" : ""}" type="button" data-vocab-master="${escapeHtml(entry.w)}" aria-label="${mastered ? "取消已掌握" : "标记已掌握"}">${mastered ? "★" : "☆"}</button>
            </div>
            <p class="vocab-meaning">${escapeHtml(entry.meaning || "暂无释义")}</p>
            ${
              entry.example
                ? `<p class="vocab-example">${escapeHtml(entry.example)}</p>`
                : `<p class="vocab-example is-muted">原书第 ${entry.source_page || entry.page} 页 · 查看词组与释义</p>`
            }
            <div class="vocab-word-foot">
              <span>PDF p.${entry.source_page || entry.page}</span>
              <a href="${fileUrl(data.meta.vocab.source, entry.source_page || entry.page)}" target="_blank" rel="noopener">原书页 ↗</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function buildDeck() {
    const pool = filteredWords();
    const unseen = pool.filter((entry) => !masteredSet.has(entry.w));
    ui.deck = (unseen.length ? unseen : pool).slice(0, 30);
    ui.deckIndex = 0;
    ui.deckRevealed = false;
  }

  function renderDeck() {
    const shell = document.getElementById("vocab-deck-shell");
    const card = document.getElementById("vocab-flashcard");
    const actions = document.getElementById("vocab-deck-actions");
    if (!shell || !card || !actions) return;
    if (!ui.deck.length) buildDeck();
    shell.hidden = false;
    const entry = ui.deck[ui.deckIndex];
    if (!entry) {
      card.innerHTML = `
        <div class="vocab-deck-finished">
          <span>ROUND COMPLETE</span>
          <h2>这组词已经过完</h2>
          <p>重新开始会优先抽到还没有标记掌握的单词。</p>
        </div>
      `;
      actions.innerHTML = `<button class="english-primary" type="button" data-vocab-restart>换一组 30 词</button>`;
      document.getElementById("vocab-deck-position").textContent = "30 / 30";
      document.getElementById("vocab-deck-progress").style.width = "100%";
      return;
    }

    const mastered = masteredSet.has(entry.w);
    document.getElementById("vocab-deck-position").textContent =
      `${ui.deckIndex + 1} / ${ui.deck.length}`;
    document.getElementById("vocab-deck-progress").style.width =
      `${((ui.deckIndex + 1) / ui.deck.length) * 100}%`;

    card.innerHTML = `
      <div class="vocab-deck-meta">
        <span class="vocab-tone tone-${levelTone(entry.level)}">${levelLabel(entry.level)}</span>
        <span>${sourceLabel(entry)} · PDF p.${entry.source_page || entry.page}</span>
      </div>
      <button class="vocab-card-word" type="button" data-vocab-reveal aria-label="显示单词用法">
        <strong>${escapeHtml(entry.w)}</strong>
        ${
          entry.phonetic
            ? `<span class="vocab-deck-phonetic">/ ${escapeHtml(entry.phonetic)} /</span>`
            : ""
        }
        <small>${ui.deckRevealed ? "用法与出处" : "点一下，查看用法"}</small>
      </button>
      <div class="vocab-card-reveal ${ui.deckRevealed ? "is-visible" : ""}">
        <div class="vocab-card-meaning">
          <span>中文释义</span>
          <strong>${escapeHtml(entry.meaning || "暂无释义")}</strong>
        </div>
        <div class="vocab-card-usage">
          <span>BOOK USAGE</span>
          <p>${escapeHtml(entry.example || `回到原书第 ${entry.source_page || entry.page} 页，结合词根、词组和例句掌握这个词。`)}</p>
        </div>
        <a href="${fileUrl(data.meta.vocab.source, entry.source_page || entry.page)}" target="_blank" rel="noopener">打开原书对应页 ↗</a>
      </div>
    `;

    actions.innerHTML = `
      <button class="english-secondary" type="button" data-vocab-again>再看一次</button>
      <button class="english-primary ${mastered ? "is-saved" : ""}" type="button" data-vocab-know>
        ${mastered ? "已掌握 · 下一个" : "记住了 · 下一个"}
      </button>
    `;
  }

  function buildEnglishReviewDeck() {
    const pool =
      ui.reviewLevel === "all"
        ? data.words
        : data.words.filter((entry) => entry.level === ui.reviewLevel);
    const unseen = pool.filter((entry) => !masteredSet.has(entry.w));
    ui.reviewDeck = unseen.length ? unseen : pool;
    ui.reviewIndex = 0;
    ui.reviewRevealed = false;
  }

  function renderEnglishReviewPage() {
    const root = document.getElementById("english-review-content");
    if (!root) return;

    if (root.dataset.ready !== "true") {
      root.innerHTML = `
        <div class="view-heading english-review-heading">
          <div>
            <p class="section-index">复习小卡片 · 英语词汇</p>
            <h1 id="review-english-title">英语词汇复习</h1>
            <p>先看英文回忆中文，再翻面核对释义与原书用法。掌握状态会和“词汇闪过”同步。</p>
          </div>
          <div class="review-streak english-review-streak">
            <strong id="english-review-mastered-total">0</strong>
            <span>个词已掌握</span>
          </div>
        </div>
        <section class="english-review-shell">
          <div class="english-review-toolbar">
            <div class="english-review-levels" role="tablist" aria-label="英语词汇复习词频">
              <button type="button" data-english-review-level="high">高频词</button>
              <button type="button" data-english-review-level="medium">中频词</button>
              <button type="button" data-english-review-level="low">低频词</button>
              <button type="button" data-english-review-level="occasional">偶考词</button>
              <button type="button" data-english-review-level="simple">简单词</button>
              <button type="button" data-english-review-level="supplement">补充词</button>
              <button type="button" data-english-review-level="all">全部</button>
            </div>
            <button class="english-secondary english-review-shuffle" type="button" data-english-review-shuffle>换一组</button>
          </div>
          <div class="english-review-layout">
            <article class="english-review-card" id="english-review-card"></article>
            <aside class="english-review-side">
              <div class="english-review-side-head">
                <span>VOCABULARY RECALL</span>
                <h2>今天先辨认，再回忆</h2>
                <p>不要急着看答案。先在脑中说出中文意思，再翻面检查。连续两次都能想起的词，再标记“记住了”。</p>
              </div>
              <div class="english-review-mini-stats">
                <div><span>当前词频</span><strong id="english-review-level-label">高频词</strong></div>
                <div><span>本轮位置</span><strong id="english-review-position">1 / 1</strong></div>
                <div><span>全库掌握</span><strong id="english-review-percent">0%</strong></div>
              </div>
              <a class="english-review-book-link" href="${fileUrl(data.meta.vocab.source, 12)}" target="_blank" rel="noopener">打开《词汇闪过》原书 ↗</a>
            </aside>
          </div>
        </section>
      `;
      root.dataset.ready = "true";
      buildEnglishReviewDeck();
    }
    renderEnglishReviewCard();
  }

  function renderEnglishReviewCard() {
    const card = document.getElementById("english-review-card");
    if (!card) return;
    if (!ui.reviewDeck.length) buildEnglishReviewDeck();
    const entry = ui.reviewDeck[ui.reviewIndex];
    const stats = getStats();

    document.querySelectorAll("[data-english-review-level]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.englishReviewLevel === ui.reviewLevel
      );
    });
    const levelText =
      document.getElementById("english-review-level-label");
    const position = document.getElementById("english-review-position");
    const percent = document.getElementById("english-review-percent");
    const masteredTotal = document.getElementById("english-review-mastered-total");
    if (levelText) {
      levelText.textContent =
        ui.reviewLevel === "all" ? "全部词汇" : levelLabel(ui.reviewLevel);
    }
    if (position) {
      position.textContent = entry
        ? `${ui.reviewIndex + 1} / ${ui.reviewDeck.length}`
        : "本轮完成";
    }
    if (percent) percent.textContent = `${stats.wordPercent}%`;
    if (masteredTotal) {
      masteredTotal.textContent = stats.mastered.toLocaleString("zh-CN");
    }

    if (!entry) {
      card.innerHTML = `
        <div class="vocab-deck-finished">
          <span>ROUND COMPLETE</span>
          <h2>这组词汇复习完成</h2>
          <p>重新抽词时会优先选择还没有标记掌握的内容。</p>
          <button class="english-primary" type="button" data-english-review-shuffle>再抽一组</button>
        </div>
      `;
      return;
    }

    card.innerHTML = `
      <div class="english-review-card-top">
        <span class="vocab-tone tone-${levelTone(entry.level)}">${levelLabel(entry.level)}</span>
        <span>${sourceLabel(entry)} · PDF p.${entry.source_page || entry.page}</span>
      </div>
      <button class="english-review-word" type="button" data-english-review-reveal aria-label="显示英语单词释义">
        <small>${ui.reviewRevealed ? "中文释义" : "先回忆中文意思"}</small>
        <strong>${escapeHtml(entry.w)}</strong>
        ${
          entry.phonetic
            ? `<span>/ ${escapeHtml(entry.phonetic)} /</span>`
            : ""
        }
      </button>
      <div class="english-review-answer ${ui.reviewRevealed ? "is-visible" : ""}">
        <span>MEANING</span>
        <strong>${escapeHtml(entry.meaning)}</strong>
        <p>${escapeHtml(entry.example || "回到原书对应页查看完整词组与例句。")}</p>
        <a href="${fileUrl(data.meta.vocab.source, entry.source_page || entry.page)}" target="_blank" rel="noopener">查看原书页 ↗</a>
      </div>
      <div class="english-review-card-actions">
        <button class="english-secondary" type="button" data-english-review-next>还不熟 · 下一张</button>
        <button class="english-primary" type="button" data-english-review-known>记住了 · 下一张</button>
      </div>
    `;
  }

  function moveEnglishReview(known) {
    const entry = ui.reviewDeck[ui.reviewIndex];
    if (entry && known) masteredSet.add(entry.w);
    saveProgress();
    ui.reviewIndex += 1;
    ui.reviewRevealed = false;
    renderEnglishReviewCard();
  }

  function moveDeck(known) {
    const entry = ui.deck[ui.deckIndex];
    if (entry && known) masteredSet.add(entry.w);
    saveProgress();
    ui.deckIndex += 1;
    ui.deckRevealed = false;
    renderDeck();
    renderVocabLibrary();
  }

  function renderExamPage() {
    const root = document.getElementById("english-exam-content");
    if (!root || root.dataset.ready === "true") {
      renderExamCards();
      return;
    }
    const recentExams = data.meta.exams.slice().sort((a, b) => b.year - a.year);
    root.innerHTML = `
      <section class="english-hero exam-hero">
        <div class="english-hero-copy">
          <span class="english-eyebrow">1980 — 2026 · English II</span>
          <h1>英语二历年真题</h1>
          <p>2010-2026 已接入站内阅读，原卷、答案与解析保留原始 PDF 入口；1980-2009 可按年份或合集直接打开，旧卷也用同一套整理方式归档。</p>
          <div class="english-hero-actions">
            <button class="english-primary" type="button" data-exam-open="${recentExams[0].year}">打开 ${recentExams[0].year} 真题</button>
            <a class="english-secondary" href="${fileUrl(data.meta.examRoot)}" target="_blank" rel="noopener">打开资料目录</a>
          </div>
        </div>
        <div class="exam-hero-board" aria-hidden="true">
          <div><strong>17</strong><span>套站内试卷</span></div>
          <div><strong>33</strong><span>个年份版本</span></div>
          <div><strong>4</strong><span>大题型</span></div>
        </div>
      </section>

      <section class="exam-toolbar">
        <div class="exam-range-switch" role="tablist" aria-label="真题年份范围">
          <button class="${ui.examRange === "recent" ? "is-active" : ""}" type="button" data-exam-range="recent">2010 — 2026</button>
          <button class="${ui.examRange === "archive" ? "is-active" : ""}" type="button" data-exam-range="archive">1980 — 2009</button>
        </div>
        <p><span id="exam-visible-count"></span> 份资料 · 点击整张试卷卡在线阅读</p>
      </section>

      <p class="exam-online-hint">真题正文已收录在站内，点击任意年份卡即可在线阅读；本机原卷 PDF 不会在其他设备上显示。</p>
      <section class="exam-card-grid" id="exam-card-grid"></section>
    `;
    root.dataset.ready = "true";
    renderExamCards();
  }

  function examCard(item) {
    const read = (savedState.readExams || []).includes(item.year);
    const showLocalLinks = !isPublicWebPage() || !isLocalFileSource(item.source);
    return `
      <article class="exam-card ${read ? "is-read" : ""}" data-exam-card-open="${item.year}" tabindex="0" role="button" aria-label="在线阅读 ${item.year} 年英语二真题">
        <div class="exam-card-top">
          <span>${read ? "已打开" : "NATIONAL EXAM"}</span>
          <b>204</b>
        </div>
        <h2>${item.year}</h2>
        <p>全国硕士研究生招生考试<br>英语（二）</p>
        <div class="exam-tags">
          ${item.sections.map((section) => `<span>${section}</span>`).join("")}
        </div>
        <div class="exam-card-actions">
          <button class="english-primary" type="button" data-exam-open="${item.year}">在线阅读</button>
          ${
            item.source && showLocalLinks
              ? `<a class="english-link-button" href="${fileUrl(item.source)}" target="_blank" rel="noopener">原卷 PDF</a>`
              : ""
          }
          ${
            item.analysis && showLocalLinks
              ? `<a class="english-link-button" href="${fileUrl(item.analysis)}" target="_blank" rel="noopener">解析</a>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function archiveCard(item) {
    const available = !isPublicWebPage() || !isLocalFileSource(item.source);
    return `
      <article class="exam-archive-card ${available ? "" : "is-unavailable"}">
        <div>
          <span>ARCHIVE PAPER</span>
          <h2>${escapeHtml(item.label)}</h2>
        </div>
        ${
          available
            ? `<a href="${fileUrl(item.source)}" target="_blank" rel="noopener">打开原卷 ↗</a>`
            : `<span class="exam-archive-unavailable">原件仅保存在本机</span>`
        }
      </article>
    `;
  }

  function renderExamCards() {
    const grid = document.getElementById("exam-card-grid");
    if (!grid) return;
    const items =
      ui.examRange === "recent"
        ? data.meta.exams.slice().sort((a, b) => b.year - a.year)
        : data.meta.archive.slice().sort((a, b) =>
            b.label.localeCompare(a.label, "zh-CN", { numeric: true })
          );
    grid.innerHTML = items.length
      ? items
          .map((item) =>
            ui.examRange === "recent" ? examCard(item) : archiveCard(item)
          )
          .join("")
      : `<div class="english-empty"><strong>暂无资料</strong><p>没有找到这个年份范围的试卷。</p></div>`;
    document.getElementById("exam-visible-count").textContent = items.length;
    document.querySelectorAll("[data-exam-range]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.examRange === ui.examRange);
    });
  }

  function currentExamBlocks(paper) {
    if (paper.blocks) return paper.blocks;
    return (paper.pages || []).map((page) => ({
      type: "page",
      page: page.page,
      text: page.text
    }));
  }

  function paperHeadingClass(text) {
    if (/^(section|part)\b/i.test(text)) return "is-section";
    if (/^(text|word list)\s+\d+/i.test(text)) return "is-text";
    if (/^(directions|【|\(?[一二三四五六七八九十]+[、.])/i.test(text)) return "is-note";
    return "";
  }

  function renderPaper(paper) {
    const dialog = document.getElementById("english-paper-dialog");
    const body = document.getElementById("english-paper-body");
    const title = document.getElementById("english-paper-title");
    const subtitle = document.getElementById("english-paper-subtitle");
    if (!dialog || !body || !title || !subtitle) return;
    ui.activeExam = paper.year;
    title.textContent = `${paper.year} 年全国硕士研究生招生考试`;
    subtitle.textContent = "英语（二） · 科目代码 204";
    const blocks = currentExamBlocks(paper);
    body.innerHTML = blocks
      .map((block) => {
        if (block.type === "table") {
          return `
            <div class="english-paper-table-wrap">
              <table class="english-paper-table">
                <tbody>
                  ${block.rows
                    .map(
                      (row) =>
                        `<tr>${row
                          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                          .join("")}</tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `;
        }
        if (block.type === "page") {
          return `<article class="english-paper-page"><span>PAGE ${block.page}</span><p>${escapeHtml(block.text)}</p></article>`;
        }
        return `<p class="${paperHeadingClass(block.text)}">${escapeHtml(block.text)}</p>`;
      })
      .join("");

    const sourceLink = document.getElementById("english-paper-source");
    const analysisLink = document.getElementById("english-paper-analysis");
    const showLocalLinks = !isPublicWebPage();
    if (sourceLink) {
      sourceLink.hidden = !paper.source || !showLocalLinks;
      if (paper.source) sourceLink.href = fileUrl(paper.source);
    }
    if (analysisLink) {
      analysisLink.hidden = !paper.analysis || !showLocalLinks;
      if (paper.analysis) analysisLink.href = fileUrl(paper.analysis);
    }

    const readExams = new Set(savedState.readExams || []);
    readExams.add(paper.year);
    savedState.readExams = [...readExams];
    saveProgress();
    renderExamCards();
    if (!dialog.open) dialog.showModal();
  }

  function resetDeck() {
    buildDeck();
    renderDeck();
  }

  function show(name) {
    if (name === "vocab-flash") {
      ui.view = "vocab";
      renderVocabPage();
      syncSidebarProgress("vocab-flash");
    }
    if (name === "english-exams") {
      ui.view = "exam";
      renderExamPage();
      syncSidebarProgress("english-exams");
    }
    if (name === "review-english") {
      ui.view = "review";
      renderEnglishReviewPage();
      syncSidebarProgress("review-english");
    }
    if (name === "english-home") {
      syncDashboardStats();
      syncSidebarProgress("english-home");
    }
    if (name === "home" || name === "profile" || name === "review-hub") {
      syncDashboardStats();
    }
  }

  document.addEventListener("click", (event) => {
    const levelCard = event.target.closest("[data-vocab-level]");
    if (levelCard) {
      ui.level = levelCard.dataset.vocabLevel;
      ui.list = "all";
      ui.visible = 80;
      renderVocabLibrary();
      document.getElementById("vocab-result-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const levelFilter = event.target.closest("[data-vocab-level-filter]");
    if (levelFilter) {
      ui.level = levelFilter.dataset.vocabLevelFilter;
      ui.list = "all";
      ui.visible = 80;
      renderVocabLibrary();
      return;
    }

    const start = event.target.closest("[data-vocab-start]");
    if (start) {
      resetDeck();
      document.getElementById("vocab-deck-shell")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const closeDeck = event.target.closest("[data-vocab-close]");
    if (closeDeck) {
      document.getElementById("vocab-deck-shell").hidden = true;
      return;
    }

    const reveal = event.target.closest("[data-vocab-reveal]");
    if (reveal) {
      ui.deckRevealed = !ui.deckRevealed;
      renderDeck();
      return;
    }

    const again = event.target.closest("[data-vocab-again]");
    if (again) {
      const entry = ui.deck[ui.deckIndex];
      if (entry) {
        masteredSet.delete(entry.w);
        saveProgress();
        renderVocabLibrary();
      }
      renderDeck();
      return;
    }

    const know = event.target.closest("[data-vocab-know]");
    if (know) {
      moveDeck(true);
      return;
    }

    const restart = event.target.closest("[data-vocab-restart]");
    if (restart) {
      resetDeck();
      return;
    }

    const masteredButton = event.target.closest("[data-vocab-master]");
    if (masteredButton) {
      const word = masteredButton.dataset.vocabMaster;
      if (masteredSet.has(word)) masteredSet.delete(word);
      else masteredSet.add(word);
      saveProgress();
      renderVocabLibrary();
      return;
    }

    const more = event.target.closest("[data-vocab-more]");
    if (more) {
      ui.visible += 80;
      renderVocabLibrary();
      return;
    }

    const reviewLevel = event.target.closest("[data-english-review-level]");
    if (reviewLevel) {
      ui.reviewLevel = reviewLevel.dataset.englishReviewLevel;
      buildEnglishReviewDeck();
      renderEnglishReviewCard();
      return;
    }

    const reviewReveal = event.target.closest("[data-english-review-reveal]");
    if (reviewReveal) {
      ui.reviewRevealed = !ui.reviewRevealed;
      renderEnglishReviewCard();
      return;
    }

    const reviewNext = event.target.closest("[data-english-review-next]");
    if (reviewNext) {
      moveEnglishReview(false);
      return;
    }

    const reviewKnown = event.target.closest("[data-english-review-known]");
    if (reviewKnown) {
      moveEnglishReview(true);
      return;
    }

    const reviewShuffle = event.target.closest("[data-english-review-shuffle]");
    if (reviewShuffle) {
      buildEnglishReviewDeck();
      renderEnglishReviewCard();
      return;
    }

    const range = event.target.closest("[data-exam-range]");
    if (range) {
      ui.examRange = range.dataset.examRange;
      renderExamCards();
      return;
    }

    const openExam = event.target.closest("[data-exam-open]");
    if (openExam) {
      const paper = data.meta.exams.find(
        (item) => String(item.year) === openExam.dataset.examOpen
      );
      if (paper) renderPaper(paper);
      else showToast("这套试卷暂时没有站内正文。");
      return;
    }

    const examCardButton = event.target.closest("[data-exam-card-open]");
    if (examCardButton && !event.target.closest("a, button")) {
      const paper = data.meta.exams.find(
        (item) => String(item.year) === examCardButton.dataset.examCardOpen
      );
      if (paper) renderPaper(paper);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const examCardButton = event.target.closest("[data-exam-card-open]");
    if (!examCardButton) return;
    event.preventDefault();
    const paper = data.meta.exams.find(
      (item) => String(item.year) === examCardButton.dataset.examCardOpen
    );
    if (paper) renderPaper(paper);
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "vocab-search-input") {
      ui.query = event.target.value;
      ui.visible = 80;
      renderVocabLibrary();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "vocab-list-select") {
      ui.list = event.target.value;
      ui.visible = 80;
      renderVocabLibrary();
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-english-dialog-close]")) {
      document.getElementById("english-paper-dialog")?.close();
    }
  });

  window.EnglishStudy = {
    show,
    sampleWord,
    getStats,
    syncDashboardStats
  };

  syncDashboardStats();
  const initialHash = window.location.hash.replace(/^#/, "");
  if (
    ["vocab-flash", "english-exams", "review-english", "english-home", "home", "profile", "settings", "review-hub"].includes(
      initialHash
    )
  ) {
    if (typeof window.showView === "function") window.showView(initialHash);
    show(initialHash);
  }
})();
