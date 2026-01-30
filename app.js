const profiles = [
  {
    name: "Alex Rivera",
    status: "Signed in",
    device: "Tablet",
  },
  {
    name: "Morgan Lee",
    status: "Awaiting login",
    device: "PC",
  },
  {
    name: "Samir Patel",
    status: "Signed in",
    device: "Tablet",
  },
];

const games = [
  {
    title: "Star Trek Ascendancy",
    tag: "Campaign",
    detail: "Load cooperative variant pack",
  },
  {
    title: "Gloomhaven",
    tag: "Scenario",
    detail: "Activate party perks",
  },
  {
    title: "Root",
    tag: "Skirmish",
    detail: "Enable faction bots",
  },
];

const sessionOptions = [
  "Custom objectives enabled",
  "Shared initiative tracker",
  "Auto-save after each phase",
  "Private player dashboards",
  "Tablet friendly layout",
  "Tutorial prompts",
];

function initializeApp() {
  const profileList = document.getElementById("profile-list");
  const gameList = document.getElementById("game-list");
  const optionGrid = document.getElementById("option-grid");
  const notesInput = document.getElementById("session-notes");
  const noteCount = document.getElementById("note-count");
  const sessionNote = document.getElementById("session-note");

  if (!profileList || !gameList || !optionGrid || !notesInput || !noteCount || !sessionNote) {
    return;
  }

  function renderProfiles() {
    profileList.innerHTML = "";
    profiles.forEach((profile) => {
      const card = document.createElement("div");
      card.className = "profile-card";
      card.innerHTML = `
        <div>
          <strong>${profile.name}</strong>
          <p>${profile.status}</p>
        </div>
        <div>
          <span>${profile.device}</span>
          <p>Seat ready</p>
        </div>
      `;
      profileList.appendChild(card);
    });
  }

  function renderGames() {
    gameList.innerHTML = "";
    games.forEach((game) => {
      const item = document.createElement("li");
      item.className = "game-card";
      item.innerHTML = `
        <div>
          <strong>${game.title}</strong>
          <p>${game.detail}</p>
        </div>
        <span class="tag">${game.tag}</span>
      `;
      gameList.appendChild(item);
    });
  }

  function renderOptions() {
    optionGrid.innerHTML = "";
    sessionOptions.forEach((option) => {
      const chip = document.createElement("div");
      chip.className = "option-chip";
      chip.textContent = option;
      optionGrid.appendChild(chip);
    });
  }

  function updateNoteCount() {
    const count = notesInput.value.length;
    noteCount.textContent = `${count} characters`;
  }

  function updateSessionNote(message) {
    sessionNote.textContent = message;
  }

  function wireActions() {
    document.getElementById("player-login")?.addEventListener("click", () => {
      updateSessionNote("Login window opened. Prompting players to authenticate.");
    });

    document.getElementById("choose-game")?.addEventListener("click", () => {
      updateSessionNote("Select a game to load player dashboards and scenario data.");
    });

    document.getElementById("invite-player")?.addEventListener("click", () => {
      updateSessionNote("Invite sent. Waiting for another player to join.");
    });

    document.getElementById("lock-roster")?.addEventListener("click", () => {
      updateSessionNote("Roster locked. Loading player-specific information.");
    });

    document.getElementById("manage-library")?.addEventListener("click", () => {
      updateSessionNote("Library manager opened. Add or remove games as needed.");
    });

    document.getElementById("save-options")?.addEventListener("click", () => {
      updateSessionNote("Session options saved. Ready to launch player views.");
    });

    document.getElementById("send-briefing")?.addEventListener("click", () => {
      updateSessionNote("Player briefing delivered to all connected devices.");
    });

    notesInput.addEventListener("input", updateNoteCount);
  }

  renderProfiles();
  renderGames();
  renderOptions();
  updateNoteCount();
  wireActions();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
