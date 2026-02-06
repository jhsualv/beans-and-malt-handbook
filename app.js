const state = {
    recipes: [],
    filtered: [],
    categories: new Set(),
    selectedCategory: "all",
    query: "",
    current: null,
    meta: null,

  };
  
  const el = (id) => document.getElementById(id);
  
  function normalize(s) {
    return (s || "").toLowerCase().trim();
  }
  
  function matches(recipe, q) {
    if (!q) return true;
    const hay = [
      recipe.name,
      recipe.category,
      ...(recipe.tags || []),
      ...(recipe.measurements || []).map(m => `${m.label} ${m.value}`),
      ...(recipe.cupPrep || []),
      ...(recipe.buildSteps || []),
      ...(recipe.commonMistakes || [])
    ].join(" ");
    return normalize(hay).includes(normalize(q));
  }
  
  function applyFilters() {
    const q = state.query;
    const cat = state.selectedCategory;
  
    state.filtered = state.recipes.filter(r => {
      const catOk = (cat === "all") || (r.category === cat);
      const qOk = matches(r, q);
      return catOk && qOk;
    });
  
    renderList();
  }
  
  function renderList() {
    const list = el("recipeList");
    const empty = el("emptyState");
  
    list.innerHTML = "";
  
    if (state.filtered.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
  
    for (const r of state.filtered) {
      const card = document.createElement("div");
      card.className = "card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Open recipe: ${r.name}`);
  
      card.innerHTML = `
        <div class="card__title">
          <h2 class="card__name">${escapeHtml(r.name)}</h2>
          <span class="badge">${escapeHtml(r.yields || "")}</span>
        </div>
        <div class="card__meta">
          <span class="meta">${escapeHtml(r.category || "")}</span>
          ${(r.tags || []).slice(0, 3).map(t => `<span class="meta">• ${escapeHtml(t)}</span>`).join("")}
        </div>
      `;
  
      card.addEventListener("click", () => openDetail(r.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") openDetail(r.id);
      });
  
      list.appendChild(card);
    }
  }
  
  function openDetail(id) {
    const r = state.recipes.find(x => x.id === id);
    if (!r) return;
  
    state.current = r;
  
    const detail = el("recipeDetail");
    detail.innerHTML = renderDetailHtml(r);
  
    // Reset checkboxes every time you open a recipe
    detail.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  
    setView("detail");
    history.pushState({ view: "detail", id }, "", `#${encodeURIComponent(id)}`);
  }
  
  function setView(view) {
    const listView = el("listView");
    const detailView = el("detailView");
  
    if (view === "detail") {
      listView.classList.remove("view--active");
      detailView.classList.add("view--active");
    } else {
      detailView.classList.remove("view--active");
      listView.classList.add("view--active");
    }
  }
  
  function renderBuildSection(r) {
    // New format: multiple build orders on one page
    if (Array.isArray(r.buildOrders) && r.buildOrders.length > 0) {
      return r.buildOrders
        .map((bo, i) => {
          const steps = (bo.steps || [])
            .map((s, idx) => stepHtml(`build-${i}-${idx}`, s))
            .join("");
  
          return `
            <div class="section">
              <h3>${escapeHtml(bo.title || "Build order")}</h3>
              <div class="checklist">${steps || `<span class="muted">None</span>`}</div>
            </div>
          `;
        })
        .join("");
    }
  
    // Old format: single buildSteps list
    const steps = (r.buildSteps || [])
      .map((s, idx) => stepHtml(`build-${idx}`, s))
      .join("");
  
    return `
      <div class="section">
        <h3>Build order</h3>
        <div class="checklist">${steps || `<span class="muted">None</span>`}</div>
      </div>
    `;
  }

  function renderDetailHtml(r) {
    const measurements = (r.measurements || [])
      .filter(
        (m) =>
            m.value &&
            String(m.value).toLowerCase() !== "none"
      )
      .map(
        (m) => `
            <div class="row">
                <div class="key">${escapeHtml(m.label)}</div>
                <div class="val">${escapeHtml(m.value)}</div>
            </div>
        `
    )
    .join("");
  
    const cupPrep = (r.cupPrep || [])
      .map((s, idx) => stepHtml(`cup-${idx}`, s))
      .join("");
  
    // Optional: common mistakes block
    const mistakes = r.commonMistakes || [];
    const mistakesHtml = mistakes.length
      ? `
        <div class="section">
          <h3>Common mistakes</h3>
          <div class="note">${mistakes
            .map((x) => `• ${escapeHtml(x)}`)
            .join("<br/>")}</div>
        </div>
      `
      : "";
  
    return `
      <h2>${escapeHtml(r.name)}</h2>
      <p class="sub">${escapeHtml(r.category || "")}${
        r.yields ? ` • ${escapeHtml(r.yields)}` : ""
      }</p>
  
      <div class="section">
        <h3>Measurements</h3>
        <div class="kv">${measurements || `<span class="muted">None</span>`}</div>
      </div>
  
      <div class="section">
        <h3>Cup prep</h3>
        <div class="checklist">${cupPrep || `<span class="muted">None</span>`}</div>
      </div>
  
      ${renderBuildSection(r)}
  
      ${mistakesHtml}
    `;
  }
  
  function stepHtml(id, text) {
    return `
      <label class="step">
        <input type="checkbox" aria-label="Mark step complete" />
        <div class="text">${escapeHtml(text)}</div>
      </label>
    `;
  }
  
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  function renderMetaNotes() {
    const box = el("metaNotes");
    if (!box) return;
  
    const notes = state.meta?.notes || [];
    if (!notes.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
  
    const storageKey = "metaNotesCollapsed";
    const isCollapsed = localStorage.getItem(storageKey) === "1";
  
    const items = notes.map(n => `<li>${escapeHtml(n)}</li>`).join("");
  
    box.innerHTML = `
      <div class="metaNotes__header" role="button" tabindex="0" aria-expanded="${!isCollapsed}">
        <h3 style="margin:0;">Quick notes</h3>
        <span class="metaNotes__chev" aria-hidden="true"></span>
      </div>
      <div class="metaNotes__body">
        <ul>${items}</ul>
      </div>
    `;
  
    box.classList.toggle("metaNotes--collapsed", isCollapsed);
    box.hidden = false;
  
    const header = box.querySelector(".metaNotes__header");
    const toggle = () => {
      const nowCollapsed = !box.classList.contains("metaNotes--collapsed");
      box.classList.toggle("metaNotes--collapsed", nowCollapsed);
      localStorage.setItem(storageKey, nowCollapsed ? "1" : "0");
      header.setAttribute("aria-expanded", String(!nowCollapsed));
    };
  
    header.addEventListener("click", toggle);
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  }  

  async function loadRecipes() {
    const res = await fetch("recipes.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load recipes.json");
    const data = await res.json();
  
    el("lastUpdated").textContent = data.lastUpdated || "-";
    
    state.meta = data.meta || null;
    
    const basesById = new Map((data.bases || []).map(b => [b.id, b]));

    function mergeArrays(baseArr, overrideArr) {
      const a = Array.isArray(baseArr) ? baseArr : [];
      const b = Array.isArray(overrideArr) ? overrideArr : [];
      return [...a, ...b];
    }
  
    function mergeMeasurements(baseMs, overrideMs) {
        const base = Array.isArray(baseMs) ? baseMs : [];
        const over = Array.isArray(overrideMs) ? overrideMs : [];
      
        const map = new Map();
        for (const m of base) map.set(m.label, m);
        for (const m of over) map.set(m.label, m); // override same label
      
        return [...map.values()];
    }
      
  
    function expandRecipe(r) {
      if (!r.baseId) return r;
  
      const base = basesById.get(r.baseId);
      if (!base) return r;
  
      return {
        ...base,
        ...r,
        measurements: mergeMeasurements(base.measurements, r.measurements),
        cupPrep: Array.isArray(r.cupPrep) ? r.cupPrep : base.cupPrep,
        buildOrders: Array.isArray(r.buildOrders) ? r.buildOrders : base.buildOrders,
        buildSteps: Array.isArray(r.buildSteps) ? r.buildSteps : base.buildSteps,

        commonMistakes: mergeArrays(base.commonMistakes, r.commonMistakes),
        tags: mergeArrays(base.tags, r.tags),
      };
    }
  
    state.recipes = (data.recipes || []).map(expandRecipe);
    state.filtered = [...state.recipes];
  
    state.categories = new Set(state.recipes.map(r => r.category).filter(Boolean));  
    populateCategories();
    renderMetaNotes();

    applyFilters();
  
    // Open recipe from hash if present
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    if (hash) openDetail(hash);
  }
  
  function populateCategories() {
    const select = el("categorySelect");
    // Keep first option ("all"), then rebuild others
    while (select.options.length > 1) select.remove(1);
  
    [...state.categories].sort().forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
  }
  
  function setupUI() {
    el("searchInput").addEventListener("input", (e) => {
      state.query = e.target.value;
      applyFilters();
    });
  
    el("categorySelect").addEventListener("change", (e) => {
      state.selectedCategory = e.target.value;
      applyFilters();
    });
  
    el("backBtn").addEventListener("click", () => {
      history.pushState({ view: "list" }, "", "#");
      setView("list");
    });
  
    window.addEventListener("popstate", () => {
      const hash = decodeURIComponent(location.hash.replace("#", ""));
      if (hash) openDetail(hash);
      else setView("list");
    });
  }
  
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("service-worker.js");
  }
  
  function setupInstallPrompt() {
    const installBtn = el("installBtn");
    let deferredPrompt = null;
  
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.hidden = false;
    });
  
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  }
  
  (async function init() {
    setupUI();
    setupInstallPrompt();
    registerServiceWorker();
    await loadRecipes();
  })();
  