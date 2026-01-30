const VALID_USERNAME = "dinq";
const VALID_PASSWORD = "life";

const state = {
  loggedIn: false,
  selectedGame: null,
  ruleset: "classic",
  playersOnline: 0,
  resources: {
    dollars: 0,
    production: 0,
    research: 0,
    culture: 0,
  },
  systems: [],
};

const RESOURCE_KEYS = [
  { key: "dollars", label: "$" },
  { key: "production", label: "Production" },
  { key: "research", label: "Research" },
  { key: "culture", label: "Culture" },
];

function initializeApp() {
  const sessionTitle = document.getElementById("session-title");
  const playerCount = document.getElementById("player-count");
  const rulesetValue = document.getElementById("ruleset");
  const sessionNote = document.getElementById("session-note");
  const loginForm = document.getElementById("login-form");
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");
  const loginFeedback = document.getElementById("login-feedback");
  const gameFeedback = document.getElementById("game-feedback");
  const selectAscendancy = document.getElementById("select-ascendancy");
  const rulesetOptions = document.getElementById("ruleset-options");
  const confirmRuleset = document.getElementById("confirm-ruleset");
  const resourceGrid = document.getElementById("resource-grid");
  const resetResources = document.getElementById("reset-resources");
  const systemForm = document.getElementById("system-form");
  const systemName = document.getElementById("system-name");
  const systemProduction = document.getElementById("node-production");
  const systemResearch = document.getElementById("node-research");
  const systemCulture = document.getElementById("node-culture");
  const systemControl = document.getElementById("node-control");
  const systemList = document.getElementById("system-list");
  const systemFeedback = document.getElementById("system-feedback");
  const notesInput = document.getElementById("session-notes");
  const noteCount = document.getElementById("note-count");
  const loadBriefing = document.getElementById("load-briefing");

  if (
    !sessionTitle ||
    !playerCount ||
    !rulesetValue ||
    !sessionNote ||
    !loginForm ||
    !loginUsername ||
    !loginPassword ||
    !loginFeedback ||
    !gameFeedback ||
    !selectAscendancy ||
    !rulesetOptions ||
    !confirmRuleset ||
    !resourceGrid ||
    !resetResources ||
    !systemForm ||
    !systemName ||
    !systemProduction ||
    !systemResearch ||
    !systemCulture ||
    !systemControl ||
    !systemList ||
    !systemFeedback ||
    !notesInput ||
    !noteCount ||
    !loadBriefing
  ) {
    return;
  }

  function updateStatus() {
    sessionTitle.textContent = state.selectedGame ?? "Awaiting Login";
    playerCount.textContent = String(state.playersOnline);
    rulesetValue.textContent = state.ruleset === "homebrew" ? "HOME" : "CLASSIC";
  }

  function updateSessionNote(message, tone = "info") {
    sessionNote.textContent = message;
    sessionNote.dataset.tone = tone;
  }

  function setLoginFeedback(message, tone = "info") {
    loginFeedback.textContent = message;
    loginFeedback.dataset.tone = tone;
  }

  function setGameFeedback(message, tone = "info") {
    gameFeedback.textContent = message;
    gameFeedback.dataset.tone = tone;
  }

  function setSystemFeedback(message, tone = "info") {
    systemFeedback.textContent = message;
    systemFeedback.dataset.tone = tone;
  }

  function updateNoteCount() {
    noteCount.textContent = `${notesInput.value.length} characters`;
  }

  function renderResources() {
    resourceGrid.innerHTML = "";
    RESOURCE_KEYS.forEach((resource) => {
      const wrapper = document.createElement("div");
      wrapper.className = "resource-card";
      wrapper.innerHTML = `
        <div>
          <strong>${resource.label}</strong>
          <p>${resource.key}</p>
        </div>
        <div class="resource-controls">
          <button type="button" data-action="decrease" data-key="${resource.key}">-</button>
          <span class="resource-value">${state.resources[resource.key]}</span>
          <button type="button" data-action="increase" data-key="${resource.key}">+</button>
        </div>
      `;
      resourceGrid.appendChild(wrapper);
    });
  }

  function renderSystems() {
    systemList.innerHTML = "";
    if (state.systems.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.textContent = "No systems tracked yet.";
      systemList.appendChild(empty);
      return;
    }

    state.systems.forEach((system) => {
      const item = document.createElement("li");
      item.className = "system-card";
      item.innerHTML = `
        <div>
          <strong>${system.name}</strong>
          <p>P ${system.production} · R ${system.research} · C ${system.culture} · CTRL ${system.control}</p>
        </div>
        <button type="button" class="ghost" data-remove="${system.id}">Remove</button>
      `;
      systemList.appendChild(item);
    });
  }

  function handleLogin(event) {
    event.preventDefault();
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      state.loggedIn = true;
      state.playersOnline = 1;
      setLoginFeedback("Login confirmed. Player profile loaded.", "success");
      updateSessionNote("Login complete. Select Star Trek Ascendancy to continue.", "success");
    } else {
      state.loggedIn = false;
      state.playersOnline = 0;
      setLoginFeedback("Login failed. Check username and password.", "error");
      updateSessionNote("Login required to load player-specific data.", "error");
    }
    updateStatus();
  }

  function selectGame() {
    if (!state.loggedIn) {
      setGameFeedback("Please log in before selecting a game.", "error");
      updateSessionNote("Authentication required before game selection.", "error");
      return;
    }

    state.selectedGame = "Star Trek Ascendancy";
    setGameFeedback("Star Trek Ascendancy selected. Choose Classic or Homebrew.", "success");
    updateSessionNote("Game selected. Confirm ruleset to load session options.", "info");
    updateStatus();
  }

  function confirmRulesetSelection() {
    if (!state.selectedGame) {
      updateSessionNote("Select a game before confirming a ruleset.", "error");
      return;
    }

    const selected = rulesetOptions.querySelector("input[name='ruleset']:checked");
    if (!selected) {
      updateSessionNote("Choose Classic or Homebrew to continue.", "error");
      return;
    }

    state.ruleset = selected.value;
    updateStatus();

    if (state.ruleset === "homebrew") {
      updateSessionNote(
        "Homebrew enabled. Custom mods will load with player dashboards.",
        "success"
      );
    } else {
      updateSessionNote("Classic rules confirmed. No mods applied.", "success");
    }
  }

  function loadBriefingNotes() {
    if (!state.loggedIn || !state.selectedGame) {
      updateSessionNote("Login and select a game before loading briefings.", "error");
      return;
    }

    const briefing =
      state.ruleset === "homebrew"
        ? "Homebrew briefing loaded. Review custom objectives and mod notes."
        : "Classic briefing loaded. Follow official objectives and mission timing.";

    notesInput.removeAttribute("readonly");
    notesInput.value = briefing;
    updateNoteCount();
    updateSessionNote("Player briefing loaded.", "success");
  }

  function adjustResource(key, delta) {
    state.resources[key] = Math.max(0, state.resources[key] + delta);
    renderResources();
  }

  function handleResourceClick(event) {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const key = button.dataset.key;
    if (!action || !key) {
      return;
    }

    const delta = action === "increase" ? 1 : -1;
    adjustResource(key, delta);
  }

  function handleResetResources() {
    RESOURCE_KEYS.forEach((resource) => {
      state.resources[resource.key] = 0;
    });
    renderResources();
  }

  function handleAddSystem(event) {
    event.preventDefault();
    const name = systemName.value.trim();
    if (!name) {
      setSystemFeedback("Enter a system name to continue.", "error");
      return;
    }

    const system = {
      id: crypto.randomUUID(),
      name,
      production: Number(systemProduction.value) || 0,
      research: Number(systemResearch.value) || 0,
      culture: Number(systemCulture.value) || 0,
      control: Number(systemControl.value) || 0,
    };

    state.systems.push(system);
    systemForm.reset();
    systemProduction.value = "0";
    systemResearch.value = "0";
    systemCulture.value = "0";
    systemControl.value = "0";
    setSystemFeedback("System added.", "success");
    renderSystems();
  }

  function handleRemoveSystem(event) {
    const button = event.target.closest("button[data-remove]");
    if (!button) {
      return;
    }

    const id = button.dataset.remove;
    state.systems = state.systems.filter((system) => system.id !== id);
    renderSystems();
  }

  document.getElementById("player-login")?.addEventListener("click", () => {
    loginUsername.focus();
  });

  document.getElementById("open-library")?.addEventListener("click", () => {
    selectAscendancy.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  loginForm.addEventListener("submit", handleLogin);
  selectAscendancy.addEventListener("click", selectGame);
  confirmRuleset.addEventListener("click", confirmRulesetSelection);
  loadBriefing.addEventListener("click", loadBriefingNotes);
  resourceGrid.addEventListener("click", handleResourceClick);
  resetResources.addEventListener("click", handleResetResources);
  systemForm.addEventListener("submit", handleAddSystem);
  systemList.addEventListener("click", handleRemoveSystem);
  notesInput.addEventListener("input", updateNoteCount);

  renderResources();
  renderSystems();
  updateStatus();
  updateNoteCount();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
