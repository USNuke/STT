const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('main section');

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.target);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const setActiveNav = () => {
  const scrollPosition = window.scrollY + 200;
  sections.forEach((section) => {
    if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
      navButtons.forEach((btn) => btn.classList.remove('active'));
      document.querySelector(`.nav-btn[data-target="${section.id}"]`)?.classList.add('active');
    }
  });
};

window.addEventListener('scroll', setActiveNav);
setActiveNav();

const statusBanner = document.getElementById('status-banner');
const setStatus = (message) => {
  statusBanner.textContent = message;
  statusBanner.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
};

const roundValue = document.getElementById('round-value');
const roundIncrease = document.getElementById('round-increase');
const roundDecrease = document.getElementById('round-decrease');

const updateRound = (delta) => {
  const current = Number.parseInt(roundValue.textContent, 10) || 1;
  const next = Math.max(1, current + delta);
  roundValue.textContent = next;
  setStatus(`Round updated to ${next}.`);
};

roundIncrease.addEventListener('click', () => updateRound(1));
roundDecrease.addEventListener('click', () => updateRound(-1));

document.getElementById('init-turn')?.addEventListener('click', () => updateRound(1));

document.getElementById('save-state')?.addEventListener('click', () => {
  localStorage.setItem('ascendancy-state', JSON.stringify(buildState()));
  setStatus('Snapshot saved to local storage.');
  syncExport();
});

document.getElementById('load-state')?.addEventListener('click', () => {
  loadState();
  setStatus('Snapshot loaded from local storage.');
});

const initiativeList = document.getElementById('initiative-list');

const advanceInitiative = () => {
  const items = Array.from(initiativeList.querySelectorAll('li'));
  if (items.length === 0) return;
  const activeIndex = items.findIndex((item) => item.classList.contains('active'));
  items.forEach((item) => item.classList.remove('active'));
  const nextIndex = (activeIndex + 1) % items.length;
  items[nextIndex].classList.add('active');
  setStatus(`Initiative passed to ${items[nextIndex].textContent}.`);
};

document.getElementById('advance-initiative')?.addEventListener('click', advanceInitiative);

const tensionSelect = document.getElementById('tension-select');
const tensionNote = document.getElementById('tension-note');

tensionSelect.addEventListener('change', () => {
  tensionNote.textContent = `${tensionSelect.value} threat level`;
  setStatus(`Galactic tension set to ${tensionSelect.value}.`);
});

const defaultFactions = [
  { name: 'United Federation of Planets', tag: 'Diplomacy', energy: 8, production: 6, research: 5 },
  { name: 'Klingon Empire', tag: 'Aggression', energy: 7, production: 7, research: 3 },
  { name: 'Romulan Star Empire', tag: 'Intrigue', energy: 6, production: 5, research: 6 },
];

const factionGrid = document.getElementById('faction-grid');
let factions = [...defaultFactions];

const renderFactions = () => {
  factionGrid.innerHTML = '';
  factions.forEach((faction, index) => {
    const card = document.createElement('article');
    card.className = 'faction-card';
    card.innerHTML = `
      <div class="faction-header">
        <h3 contenteditable="true" data-field="name">${faction.name}</h3>
        <span class="pill" contenteditable="true" data-field="tag">${faction.tag}</span>
      </div>
      <div class="resource-grid">
        <label>Energy<input type="number" min="0" data-field="energy" value="${faction.energy}" /></label>
        <label>Production<input type="number" min="0" data-field="production" value="${faction.production}" /></label>
        <label>Research<input type="number" min="0" data-field="research" value="${faction.research}" /></label>
      </div>
      <button class="ghost" data-remove="${index}">Remove Faction</button>
    `;
    factionGrid.appendChild(card);
  });
};

factionGrid.addEventListener('input', (event) => {
  const target = event.target;
  const card = target.closest('.faction-card');
  if (!card) return;
  const index = Array.from(factionGrid.children).indexOf(card);
  const field = target.dataset.field;
  if (!field) return;
  if (target.tagName === 'INPUT') {
    factions[index][field] = Number.parseInt(target.value, 10) || 0;
  } else if (target.isContentEditable) {
    factions[index][field] = target.textContent.trim();
  }
  setStatus('Faction data updated.');
});

factionGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const index = Number.parseInt(button.dataset.remove, 10);
  factions.splice(index, 1);
  renderFactions();
  setStatus('Faction removed.');
});

const factionDialog = document.getElementById('faction-dialog');
const dialogName = document.getElementById('dialog-name');
const dialogTag = document.getElementById('dialog-tag');

document.getElementById('add-faction')?.addEventListener('click', () => {
  dialogName.value = '';
  dialogTag.value = '';
  factionDialog.showModal();
});

factionDialog.addEventListener('close', () => {
  if (factionDialog.returnValue !== 'confirm') return;
  factions.push({
    name: dialogName.value.trim() || 'New Faction',
    tag: dialogTag.value.trim() || 'Custom',
    energy: 5,
    production: 5,
    research: 5,
  });
  renderFactions();
  setStatus('Custom faction added.');
});

document.getElementById('reset-factions')?.addEventListener('click', () => {
  factions = [...defaultFactions];
  renderFactions();
  setStatus('Factions reset to default.');
});

const phaseList = document.getElementById('phase-list');
const phaseOrder = ['Command Phase', 'Movement Phase', 'Research Phase', 'Production Phase', 'End Phase'];
let phaseIndex = 0;

const renderPhases = () => {
  phaseList.innerHTML = '';
  phaseOrder.forEach((phase, index) => {
    const li = document.createElement('li');
    li.className = `phase-item ${index === phaseIndex ? 'active' : ''}`;
    li.innerHTML = `
      <input type="checkbox" ${index < phaseIndex ? 'checked' : ''} />
      <span>${phase}</span>
    `;
    phaseList.appendChild(li);
  });
};

renderPhases();

document.getElementById('advance-phase')?.addEventListener('click', () => {
  phaseIndex = (phaseIndex + 1) % phaseOrder.length;
  renderPhases();
  setStatus(`Phase advanced to ${phaseOrder[phaseIndex]}.`);
});

document.getElementById('reset-phases')?.addEventListener('click', () => {
  phaseIndex = 0;
  renderPhases();
  setStatus('Phases reset.');
});

const diceResults = document.getElementById('dice-results');
const diceLog = document.getElementById('dice-log');
const diceCount = document.getElementById('dice-count');
const diceMod = document.getElementById('dice-mod');

const logDice = (text) => {
  const item = document.createElement('li');
  item.textContent = text;
  diceLog.prepend(item);
  if (diceLog.children.length > 5) {
    diceLog.removeChild(diceLog.lastChild);
  }
};

document.getElementById('roll-dice')?.addEventListener('click', () => {
  const count = Number.parseInt(diceCount.value, 10) || 1;
  const modifier = Number.parseInt(diceMod.value, 10) || 0;
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1 + modifier);
  const hits = rolls.filter((roll) => roll >= 5).length;
  const summary = `Rolls: ${rolls.join(', ')} | Hits: ${hits}`;
  diceResults.textContent = summary;
  logDice(summary);
});

const productionTotal = document.getElementById('production-total');
const baseProduction = document.getElementById('base-production');
const systemsInput = document.getElementById('systems');
const bonusInput = document.getElementById('bonus');

const updateProduction = () => {
  const base = Number.parseInt(baseProduction.value, 10) || 0;
  const systems = Number.parseInt(systemsInput.value, 10) || 0;
  const bonus = Number.parseInt(bonusInput.value, 10) || 0;
  productionTotal.textContent = (base + systems + bonus).toString();
};

baseProduction.addEventListener('input', updateProduction);
systemsInput.addEventListener('input', updateProduction);
bonusInput.addEventListener('input', updateProduction);
updateProduction();

const techGrid = document.getElementById('tech-grid');
const techInput = document.getElementById('tech-input');

let techCards = [
  { title: 'Starfleet Engineering', detail: 'Boost flagship shields and unlock advanced command protocols.' },
  { title: 'Disruptor Arrays', detail: 'Increase attack dice and unlock ambush tactics.' },
  { title: 'Cloaking Matrix', detail: 'Reduce detection ranges and surprise enemy fleets.' },
];

const renderTech = () => {
  techGrid.innerHTML = '';
  techCards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'tech-card';
    div.innerHTML = `
      <h3 contenteditable="true" data-index="${index}" data-field="title">${card.title}</h3>
      <p contenteditable="true" data-index="${index}" data-field="detail">${card.detail}</p>
      <button class="ghost" data-remove-tech="${index}">Remove</button>
    `;
    techGrid.appendChild(div);
  });
};

techGrid.addEventListener('input', (event) => {
  const target = event.target;
  const index = Number.parseInt(target.dataset.index, 10);
  if (Number.isNaN(index)) return;
  techCards[index][target.dataset.field] = target.textContent.trim();
  setStatus('Tech card updated.');
});

techGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-tech]');
  if (!button) return;
  techCards.splice(Number.parseInt(button.dataset.removeTech, 10), 1);
  renderTech();
  setStatus('Tech card removed.');
});

renderTech();

document.getElementById('add-tech')?.addEventListener('click', () => {
  const name = techInput.value.trim();
  if (!name) return;
  techCards.push({ title: name, detail: 'Describe this technology.' });
  techInput.value = '';
  renderTech();
  setStatus('New tech card added.');
});

const logEntry = document.getElementById('log-entry');
const logList = document.getElementById('log-list');

const renderLog = (entries) => {
  logList.innerHTML = '';
  entries.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.textContent = entry;
    logList.appendChild(li);
  });
};

let logEntries = [
  'Stardate 2401.2 — Federation brokered peace on Rigel VII.',
  'Stardate 2401.4 — Klingon fleet encountered unknown anomaly.',
];

renderLog(logEntries);

document.getElementById('add-log')?.addEventListener('click', () => {
  if (!logEntry.value.trim()) return;
  const entry = `${new Date().toLocaleDateString()} — ${logEntry.value.trim()}`;
  logEntries.unshift(entry);
  renderLog(logEntries);
  logEntry.value = '';
  setStatus('Log entry added.');
});

document.getElementById('clear-log')?.addEventListener('click', () => {
  logEntries = [];
  renderLog(logEntries);
  setStatus('Captain\'s log cleared.');
});

const exportOutput = document.getElementById('export-output');
const importInput = document.getElementById('import-input');

const buildState = () => ({
  round: roundValue.textContent,
  initiative: Array.from(initiativeList.querySelectorAll('li')).map((item) => ({
    name: item.textContent,
    active: item.classList.contains('active'),
  })),
  tension: tensionSelect.value,
  factions,
  phaseIndex,
  diceLog: Array.from(diceLog.querySelectorAll('li')).map((item) => item.textContent),
  production: {
    base: baseProduction.value,
    systems: systemsInput.value,
    bonus: bonusInput.value,
  },
  techCards,
  logEntries,
});

const applyState = (state) => {
  roundValue.textContent = state.round ?? roundValue.textContent;
  tensionSelect.value = state.tension ?? tensionSelect.value;
  tensionNote.textContent = `${tensionSelect.value} threat level`;

  if (Array.isArray(state.initiative) && state.initiative.length > 0) {
    initiativeList.innerHTML = '';
    state.initiative.forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = entry.name;
      if (entry.active) li.classList.add('active');
      initiativeList.appendChild(li);
    });
  }

  if (Array.isArray(state.factions)) {
    factions = state.factions;
    renderFactions();
  }

  if (typeof state.phaseIndex === 'number') {
    phaseIndex = state.phaseIndex;
    renderPhases();
  }

  if (state.production) {
    baseProduction.value = state.production.base ?? baseProduction.value;
    systemsInput.value = state.production.systems ?? systemsInput.value;
    bonusInput.value = state.production.bonus ?? bonusInput.value;
    updateProduction();
  }

  if (Array.isArray(state.techCards)) {
    techCards = state.techCards;
    renderTech();
  }

  if (Array.isArray(state.logEntries)) {
    logEntries = state.logEntries;
    renderLog(logEntries);
  }

  if (Array.isArray(state.diceLog)) {
    diceLog.innerHTML = '';
    state.diceLog.forEach((entry) => logDice(entry));
  }
};

const syncExport = () => {
  exportOutput.value = JSON.stringify(buildState(), null, 2);
};

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    setStatus('Unable to parse saved data. Check the snapshot format.');
    return null;
  }
};

const loadState = () => {
  const stored = localStorage.getItem('ascendancy-state');
  if (!stored) return;
  const data = safeParse(stored);
  if (!data) return;
  applyState(data);
  syncExport();
};

renderFactions();
loadState();
syncExport();

exportOutput.addEventListener('focus', () => exportOutput.select());

document.getElementById('copy-export')?.addEventListener('click', async () => {
  await navigator.clipboard.writeText(exportOutput.value);
  setStatus('Export copied to clipboard.');
});

document.getElementById('import-state')?.addEventListener('click', () => {
  if (!importInput.value.trim()) return;
  const data = safeParse(importInput.value);
  if (!data) return;
  applyState(data);
  localStorage.setItem('ascendancy-state', JSON.stringify(buildState()));
  setStatus('Import complete.');
  syncExport();
});
