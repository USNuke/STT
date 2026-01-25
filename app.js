const factions = [
  {
    name: "United Federation of Planets",
    diplomacy: "High",
    research: "Advanced",
    logistics: "Stable",
  },
  {
    name: "Klingon Empire",
    diplomacy: "Volatile",
    research: "Aggressive",
    logistics: "Rising",
  },
  {
    name: "Romulan Star Empire",
    diplomacy: "Cautious",
    research: "Stealth",
    logistics: "Hidden",
  },
];

const fleetMissions = [
  "USS Venture escorting convoy to Sector 9.",
  "IKS Bortas leading border skirmish drills.",
  "IRW Khazara monitoring neutral zone anomalies.",
];

function initializeApp() {
  const factionList = document.getElementById("faction-list");
  const fleetList = document.getElementById("fleet-list");
  const notesInput = document.getElementById("session-notes");
  const noteCount = document.getElementById("note-count");
  const sessionNote = document.getElementById("session-note");

  if (!factionList || !fleetList || !notesInput || !noteCount || !sessionNote) {
    return;
  }

  function renderFactions() {
    factionList.innerHTML = "";
    factions.forEach((faction) => {
      const card = document.createElement("div");
      card.className = "faction-card";
      card.innerHTML = `
        <div>
          <strong>${faction.name}</strong>
          <p>Diplomacy: ${faction.diplomacy}</p>
        </div>
        <div>
          <span>${faction.research}</span>
          <p>Logistics: ${faction.logistics}</p>
        </div>
      `;
      factionList.appendChild(card);
    });
  }

  function renderFleet() {
    fleetList.innerHTML = "";
    fleetMissions.forEach((mission) => {
      const item = document.createElement("li");
      item.textContent = mission;
      fleetList.appendChild(item);
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
    document.getElementById("new-session")?.addEventListener("click", () => {
      updateSessionNote(
        "Fresh session started. Remember to reveal new exploration tokens."
      );
    });

    document.getElementById("share-summary")?.addEventListener("click", () => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText("Ascendancy Companion summary ready for the crew.")
          .then(() => updateSessionNote("Summary copied to clipboard."))
          .catch(() =>
            updateSessionNote("Copy failed. Use manual share from notes.")
          );
      } else {
        updateSessionNote("Clipboard unavailable. Copy manually from notes.");
      }
    });

    document.getElementById("forecast")?.addEventListener("click", () => {
      updateSessionNote(
        "Forecast: prioritize research to unlock warp conduits next round."
      );
    });

    document.getElementById("log-turn")?.addEventListener("click", () => {
      updateSessionNote(
        "Turn logged. Update crew assignments and initiate end phase checks."
      );
    });

    document.getElementById("add-mission")?.addEventListener("click", () => {
      const mission = `New mission logged at ${new Date().toLocaleTimeString()}.`;
      fleetMissions.unshift(mission);
      renderFleet();
    });

    document.getElementById("save-notes")?.addEventListener("click", () => {
      updateSessionNote("Notes archived to session log.");
    });

    notesInput.addEventListener("input", updateNoteCount);
  }

  renderFactions();
  renderFleet();
  updateNoteCount();
  wireActions();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
