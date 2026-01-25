const CIVILIZATIONS = [
  'Federation',
  'Klingon',
  'Romulan',
  'Cardassian',
  'Ferengi',
  'Dominion',
  'Borg',
  'Andorian',
  'Vulcan',
  'Custom / Other'
];

const CIVILIZATION_COLORS = {
  Federation: '#1f3b8f',
  Klingon: '#c0392b',
  Romulan: '#2ecc71',
  Cardassian: '#d08c2a',
  Ferengi: '#f1c40f',
  Dominion: '#7d3fbf',
  Borg: '#2f3542',
  Andorian: '#6cc4ff',
  Vulcan: '#27ae60',
  'Custom / Other': '#95a5a6'
};

const PHASES = ['Initiative', 'Command', 'Building', 'Recharge'];

const defaultState = () => ({
  round: 1,
  phase: 'Initiative',
  seats: [
    { id: 'seat-1', name: 'Jason', initiative: 1 },
    { id: 'seat-2', name: 'Christine', initiative: 2 },
    { id: 'seat-3', name: 'Jacob', initiative: 3 }
  ],
  empires: [],
  systems: [],
  activeEmpireId: null,
  playerSeatId: 'seat-1',
  logs: []
});

let state = loadState();
let pendingEarnings = null;

const elements = {
  activeEmpire: document.getElementById('active-empire'),
  accentPreview: document.getElementById('accent-preview'),
  roundValue: document.getElementById('round-value'),
  phaseValue: document.getElementById('phase-value'),
  nextRound: document.getElementById('next-round'),
  prevPhase: document.getElementById('prev-phase'),
  nextPhase: document.getElementById('next-phase'),
  initiativeOrder: document.getElementById('initiative-order'),
  initiativeSelects: document.getElementById('initiative-selects'),
  randomInitiative: document.getElementById('random-initiative'),
  seats: document.getElementById('seats'),
  empireForm: document.getElementById('empire-form'),
  empires: document.getElementById('empires'),
  systemForm: document.getElementById('system-form'),
  systems: document.getElementById('systems'),
  playerSeat: document.getElementById('player-seat'),
  playerSummary: document.getElementById('player-summary'),
  openEarnings: document.getElementById('open-earnings'),
  earningsModal: document.getElementById('earnings-modal'),
  earningsBreakdown: document.getElementById('earnings-breakdown'),
  applyEarnings: document.getElementById('apply-earnings'),
  cancelEarnings: document.getElementById('cancel-earnings'),
  logEntries: document.getElementById('log-entries'),
  copyLog: document.getElementById('copy-log'),
  exportLog: document.getElementById('export-log'),
  exportState: document.getElementById('export-state'),
  importState: document.getElementById('import-state'),
  resetState: document.getElementById('reset-state')
};

function loadState() {
  try {
    const raw = localStorage.getItem('stt-companion-state');
    if (!raw) {
      return defaultState();
    }
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem('stt-companion-state', JSON.stringify(state));
}

function normalizeState(imported) {
  const base = defaultState();
  const normalized = {
    ...base,
    ...imported
  };

  normalized.seats = (imported.seats || base.seats).map((seat, index) => ({
    id: seat.id || `seat-${index + 1}`,
    name: seat.name || base.seats[index]?.name || `Seat ${index + 1}`,
    initiative: seat.initiative || index + 1
  }));

  normalized.empires = (imported.empires || []).map((empire, index) => ({
    id: empire.id || `empire-${Date.now()}-${index}`,
    name: empire.name || `Empire ${index + 1}`,
    civilization: CIVILIZATIONS.includes(empire.civilization)
      ? empire.civilization
      : 'Custom / Other',
    ascendancyTokens: Math.max(0, Number(empire.ascendancyTokens) || 0),
    commandTokens: Math.max(0, Number(empire.commandTokens) || 0),
    resources: {
      production: Math.max(0, Number(empire.resources?.production) || 0),
      research: Math.max(0, Number(empire.resources?.research) || 0),
      culture: Math.max(0, Number(empire.resources?.culture) || 0),
      dollars: Math.max(0, Number(empire.resources?.dollars) || 0)
    },
    starbases: Math.max(0, Number(empire.starbases) || 0),
    weaponLevel: Math.max(0, Number(empire.weaponLevel) || 0),
    shieldLevel: Math.max(0, Number(empire.shieldLevel) || 0),
    seatId: empire.seatId || base.seats[0].id
  }));

  normalized.systems = (imported.systems || []).map((system, index) => ({
    id: system.id || `system-${Date.now()}-${index}`,
    name: system.name || `System ${index + 1}`,
    production: Number(system.production) || 0,
    research: Number(system.research) || 0,
    culture: Number(system.culture) || 0,
    control: Number(system.control) || 0,
    ownerEmpireId: system.ownerEmpireId || null
  }));

  normalized.activeEmpireId =
    imported.activeEmpireId || normalized.empires[0]?.id || null;

  normalized.playerSeatId =
    imported.playerSeatId || normalized.seats[0]?.id || base.seats[0].id;

  normalized.logs = imported.logs || [];

  return normalized;
}

function logEntry(message) {
  const timestamp = new Date().toLocaleString();
  state.logs.unshift(`[${timestamp}] ${message}`);
  saveState();
  renderLogs();
}

function setPhase(newPhase) {
  state.phase = newPhase;
  saveState();
  renderPhase();
  logEntry(`Phase set to ${newPhase}.`);
}

function setRound(round) {
  state.round = round;
  state.phase = 'Initiative';
  saveState();
  renderPhase();
  logEntry(`Round advanced to ${round}. Phase reset to Initiative.`);
}

function updateSeatName(seatId, name) {
  const seat = state.seats.find((item) => item.id === seatId);
  if (!seat) return;
  seat.name = name;
  saveState();
  renderInitiative();
  renderSeats();
  logEntry(`Seat renamed to ${name}.`);
}

function updateInitiative(seatId, rank) {
  const seat = state.seats.find((item) => item.id === seatId);
  if (!seat) return;
  seat.initiative = rank;
  saveState();
  renderInitiative();
  logEntry(`Initiative updated. ${seat.name} is now ${rank}.`);
}

function randomizeInitiative() {
  const shuffled = [...state.seats].sort(() => Math.random() - 0.5);
  shuffled.forEach((seat, index) => {
    seat.initiative = index + 1;
  });
  const ordered = getInitiativeOrder();
  state.activeEmpireId = findFirstEmpireForSeat(ordered[0]?.id);
  saveState();
  renderAll();
  logEntry('Initiative randomized.');
}

function addEmpire({ name, civilization, seatId }) {
  const newEmpire = {
    id: `empire-${Date.now()}`,
    name,
    civilization,
    ascendancyTokens: 0,
    commandTokens: 0,
    resources: { production: 0, research: 0, culture: 0, dollars: 0 },
    starbases: 0,
    weaponLevel: 0,
    shieldLevel: 0,
    seatId
  };
  state.empires.push(newEmpire);
  if (!state.activeEmpireId) {
    state.activeEmpireId = newEmpire.id;
  }
  saveState();
  renderAll();
  logEntry(`Empire added: ${name} (${civilization}).`);
}

function updateEmpire(empireId, updates) {
  const empire = state.empires.find((item) => item.id === empireId);
  if (!empire) return;
  Object.assign(empire, updates);
  saveState();
  renderAll();
}

function adjustResource(empireId, resource, delta) {
  const empire = state.empires.find((item) => item.id === empireId);
  if (!empire) return;
  const current = empire.resources[resource] || 0;
  empire.resources[resource] = Math.max(0, current + delta);
  saveState();
  renderEmpires();
}

function adjustCounter(empireId, key, delta) {
  const empire = state.empires.find((item) => item.id === empireId);
  if (!empire) return;
  empire[key] = Math.max(0, (empire[key] || 0) + delta);
  saveState();
  renderEmpires();
}

function setActiveEmpire(empireId) {
  state.activeEmpireId = empireId || null;
  saveState();
  renderActiveEmpire();
}

function addSystem(system) {
  state.systems.push({
    ...system,
    id: `system-${Date.now()}`
  });
  saveState();
  renderSystems();
  logEntry(`System added: ${system.name}.`);
}

function updateSystem(systemId, updates) {
  const system = state.systems.find((item) => item.id === systemId);
  if (!system) return;
  Object.assign(system, updates);
  saveState();
  renderSystems();
  logEntry(`System updated: ${system.name}.`);
}

function getSystemsForEmpire(empireId) {
  return state.systems.filter((system) => system.ownerEmpireId === empireId);
}

function getInitiativeOrder() {
  return [...state.seats].sort((a, b) => a.initiative - b.initiative);
}

function findFirstEmpireForSeat(seatId) {
  return state.empires.find((empire) => empire.seatId === seatId)?.id || null;
}

function calculateTotals(empireId) {
  const systems = getSystemsForEmpire(empireId);
  return systems.reduce(
    (totals, system) => ({
      production: totals.production + system.production,
      research: totals.research + system.research,
      culture: totals.culture + system.culture,
      control: totals.control + system.control
    }),
    { production: 0, research: 0, culture: 0, control: 0 }
  );
}

function calculateDefense(empire) {
  const totals = calculateTotals(empire.id);
  return (
    empire.starbases * 10 +
    empire.weaponLevel * 2 +
    empire.shieldLevel * 2 +
    totals.control
  );
}

function renderPhase() {
  elements.roundValue.textContent = state.round;
  elements.phaseValue.textContent = state.phase;
}

function renderActiveEmpire() {
  elements.activeEmpire.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'None';
  elements.activeEmpire.appendChild(placeholder);

  state.empires.forEach((empire) => {
    const option = document.createElement('option');
    option.value = empire.id;
    option.textContent = `${empire.name} (${empire.civilization})`;
    if (empire.id === state.activeEmpireId) {
      option.selected = true;
    }
    elements.activeEmpire.appendChild(option);
  });

  const activeEmpire = state.empires.find(
    (empire) => empire.id === state.activeEmpireId
  );
  const color = activeEmpire
    ? CIVILIZATION_COLORS[activeEmpire.civilization]
    : '#2d3758';

  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-soft', hexToRgba(color, 0.2));
  elements.accentPreview.style.background = color;
  elements.accentPreview.style.boxShadow = `0 0 12px ${color}`;
  elements.activeEmpire.style.borderColor = color;
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderInitiative() {
  const order = getInitiativeOrder();
  elements.initiativeOrder.textContent = order
    .map((seat) => seat.name)
    .join(' > ');

  elements.initiativeSelects.innerHTML = '';
  state.seats.forEach((seat) => {
    const container = document.createElement('label');
    container.className = 'card';
    container.textContent = seat.name;
    const select = document.createElement('select');
    [1, 2, 3].forEach((rank) => {
      const option = document.createElement('option');
      option.value = rank;
      option.textContent = `Rank ${rank}`;
      if (seat.initiative === rank) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener('change', (event) => {
      updateInitiative(seat.id, Number(event.target.value));
    });
    container.appendChild(select);
    elements.initiativeSelects.appendChild(container);
  });
}

function renderSeats() {
  elements.seats.innerHTML = '';
  state.seats.forEach((seat) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${seat.name}</h3>
      <label>
        Seat Name
        <input type="text" value="${seat.name}" />
      </label>
      <p>Initiative Rank: ${seat.initiative}</p>
    `;
    const input = card.querySelector('input');
    input.addEventListener('change', (event) => {
      updateSeatName(seat.id, event.target.value.trim() || seat.name);
    });
    elements.seats.appendChild(card);
  });
}

function renderEmpireForm() {
  elements.empireForm.innerHTML = '';
  const nameInput = document.createElement('input');
  nameInput.placeholder = 'Empire name';

  const civSelect = document.createElement('select');
  CIVILIZATIONS.forEach((civ) => {
    const option = document.createElement('option');
    option.value = civ;
    option.textContent = civ;
    civSelect.appendChild(option);
  });

  const seatSelect = document.createElement('select');
  state.seats.forEach((seat) => {
    const option = document.createElement('option');
    option.value = seat.id;
    option.textContent = seat.name;
    seatSelect.appendChild(option);
  });

  const addButton = document.createElement('button');
  addButton.className = 'primary';
  addButton.textContent = 'Add Empire';

  addButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    addEmpire({
      name,
      civilization: civSelect.value,
      seatId: seatSelect.value
    });
    nameInput.value = '';
  });

  elements.empireForm.append(nameInput, civSelect, seatSelect, addButton);
}

function renderEmpires() {
  elements.empires.innerHTML = '';
  state.empires.forEach((empire) => {
    const totals = calculateTotals(empire.id);
    const defense = calculateDefense(empire);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${empire.name}</h3>
      <p>Civilization: ${empire.civilization}</p>
      <label>
        Seat
        <select data-field="seat">
          ${state.seats
            .map(
              (seat) =>
                `<option value="${seat.id}" ${
                  seat.id === empire.seatId ? 'selected' : ''
                }>${seat.name}</option>`
            )
            .join('')}
        </select>
      </label>
      <div class="resource-row">
        <span>Ascendancy Tokens: ${empire.ascendancyTokens}</span>
        <div class="resource-buttons">
          <button data-counter="ascendancyTokens" data-delta="1">+</button>
          <button data-counter="ascendancyTokens" data-delta="-1">-</button>
        </div>
      </div>
      <div class="resource-row">
        <span>Command Tokens: ${empire.commandTokens}</span>
        <div class="resource-buttons">
          <button data-counter="commandTokens" data-delta="1">+</button>
          <button data-counter="commandTokens" data-delta="-1">-</button>
        </div>
      </div>
      <h4>Resources</h4>
      ${['production', 'research', 'culture', 'dollars']
        .map(
          (resource) => `
          <div class="resource-row">
            <span>${resource.toUpperCase()}: ${empire.resources[resource]}</span>
            <div class="resource-buttons">
              <button data-resource="${resource}" data-delta="1">+</button>
              <button data-resource="${resource}" data-delta="-1">-</button>
            </div>
          </div>
        `
        )
        .join('')}
      <h4>Military</h4>
      ${[
        { key: 'starbases', label: 'Starbases' },
        { key: 'weaponLevel', label: 'Weapon Level' },
        { key: 'shieldLevel', label: 'Shield Level' }
      ]
        .map(
          (item) => `
          <div class="resource-row">
            <span>${item.label}: ${empire[item.key]}</span>
            <div class="resource-buttons">
              <button data-counter="${item.key}" data-delta="1">+</button>
              <button data-counter="${item.key}" data-delta="-1">-</button>
            </div>
          </div>
        `
        )
        .join('')}
      <h4>Totals</h4>
      <p>Nodes — P:${totals.production} R:${totals.research} C:${totals.culture} CTRL:${totals.control}</p>
      <p>Defense Strength: ${defense}</p>
      <p class="muted">Formula: (${empire.starbases} × 10) + (${empire.weaponLevel} × 2) + (${empire.shieldLevel} × 2) + (${totals.control} CTRL)</p>
      <div class="button-row">
        <button data-active="${empire.id}" class="primary">Set Active</button>
      </div>
    `;

    card.querySelectorAll('button[data-resource]').forEach((button) => {
      button.addEventListener('click', () => {
        adjustResource(
          empire.id,
          button.dataset.resource,
          Number(button.dataset.delta)
        );
      });
    });

    card.querySelectorAll('button[data-counter]').forEach((button) => {
      button.addEventListener('click', () => {
        adjustCounter(
          empire.id,
          button.dataset.counter,
          Number(button.dataset.delta)
        );
      });
    });

    const seatSelect = card.querySelector('select[data-field="seat"]');
    seatSelect.addEventListener('change', (event) => {
      updateEmpire(empire.id, { seatId: event.target.value });
      logEntry(`${empire.name} is now controlled by a new seat.`);
    });

    const activeButton = card.querySelector('button[data-active]');
    activeButton.addEventListener('click', () => setActiveEmpire(empire.id));

    elements.empires.appendChild(card);
  });
}

function renderSystemForm() {
  elements.systemForm.innerHTML = '';
  const nameInput = document.createElement('input');
  nameInput.placeholder = 'System name';
  const productionInput = document.createElement('input');
  productionInput.type = 'number';
  productionInput.placeholder = 'Production';
  const researchInput = document.createElement('input');
  researchInput.type = 'number';
  researchInput.placeholder = 'Research';
  const cultureInput = document.createElement('input');
  cultureInput.type = 'number';
  cultureInput.placeholder = 'Culture';
  const controlInput = document.createElement('input');
  controlInput.type = 'number';
  controlInput.placeholder = 'Control';

  const ownerSelect = document.createElement('select');
  const unownedOption = document.createElement('option');
  unownedOption.value = '';
  unownedOption.textContent = 'Unowned';
  ownerSelect.appendChild(unownedOption);
  state.empires.forEach((empire) => {
    const option = document.createElement('option');
    option.value = empire.id;
    option.textContent = empire.name;
    ownerSelect.appendChild(option);
  });

  const addButton = document.createElement('button');
  addButton.className = 'primary';
  addButton.textContent = 'Add System';

  addButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    addSystem({
      name,
      production: Number(productionInput.value) || 0,
      research: Number(researchInput.value) || 0,
      culture: Number(cultureInput.value) || 0,
      control: Number(controlInput.value) || 0,
      ownerEmpireId: ownerSelect.value || null
    });
    nameInput.value = '';
    productionInput.value = '';
    researchInput.value = '';
    cultureInput.value = '';
    controlInput.value = '';
  });

  elements.systemForm.append(
    nameInput,
    productionInput,
    researchInput,
    cultureInput,
    controlInput,
    ownerSelect,
    addButton
  );
}

function renderSystems() {
  elements.systems.innerHTML = '';
  if (state.systems.length === 0) {
    elements.systems.textContent = 'No systems added yet.';
    return;
  }

  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>P</th>
        <th>R</th>
        <th>C</th>
        <th>CTRL</th>
        <th>Owner</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');

  state.systems.forEach((system) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input value="${system.name}" /></td>
      <td><input type="number" value="${system.production}" /></td>
      <td><input type="number" value="${system.research}" /></td>
      <td><input type="number" value="${system.culture}" /></td>
      <td><input type="number" value="${system.control}" /></td>
      <td>
        <select>
          <option value="">Unowned</option>
          ${state.empires
            .map(
              (empire) =>
                `<option value="${empire.id}" ${
                  empire.id === system.ownerEmpireId ? 'selected' : ''
                }>${empire.name}</option>`
            )
            .join('')}
        </select>
      </td>
    `;

    const inputs = row.querySelectorAll('input');
    const select = row.querySelector('select');

    inputs[0].addEventListener('change', (event) => {
      updateSystem(system.id, { name: event.target.value.trim() || system.name });
    });
    inputs[1].addEventListener('change', (event) => {
      updateSystem(system.id, { production: Number(event.target.value) || 0 });
    });
    inputs[2].addEventListener('change', (event) => {
      updateSystem(system.id, { research: Number(event.target.value) || 0 });
    });
    inputs[3].addEventListener('change', (event) => {
      updateSystem(system.id, { culture: Number(event.target.value) || 0 });
    });
    inputs[4].addEventListener('change', (event) => {
      updateSystem(system.id, { control: Number(event.target.value) || 0 });
    });
    select.addEventListener('change', (event) => {
      updateSystem(system.id, { ownerEmpireId: event.target.value || null });
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  elements.systems.appendChild(table);
}

function renderLogs() {
  elements.logEntries.innerHTML = '';
  if (state.logs.length === 0) {
    elements.logEntries.textContent = 'No log entries yet.';
    return;
  }
  state.logs.forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = entry;
    elements.logEntries.appendChild(div);
  });
}

function renderAll() {
  renderPhase();
  renderActiveEmpire();
  renderInitiative();
  renderSeats();
  renderPlayerInterface();
  renderEmpireForm();
  renderEmpires();
  renderSystemForm();
  renderSystems();
  renderLogs();
}

function renderPlayerInterface() {
  elements.playerSeat.innerHTML = '';
  state.seats.forEach((seat) => {
    const option = document.createElement('option');
    option.value = seat.id;
    option.textContent = seat.name;
    if (seat.id === state.playerSeatId) {
      option.selected = true;
    }
    elements.playerSeat.appendChild(option);
  });

  const seat = state.seats.find((item) => item.id === state.playerSeatId);
  const seatEmpires = state.empires.filter(
    (empire) => empire.seatId === state.playerSeatId
  );
  const totals = seatEmpires.reduce(
    (acc, empire) => ({
      production: acc.production + empire.resources.production,
      research: acc.research + empire.resources.research,
      culture: acc.culture + empire.resources.culture,
      dollars: acc.dollars + empire.resources.dollars
    }),
    { production: 0, research: 0, culture: 0, dollars: 0 }
  );

  const nodes = seatEmpires.reduce(
    (acc, empire) => {
      const empireTotals = calculateTotals(empire.id);
      return {
        production: acc.production + empireTotals.production,
        research: acc.research + empireTotals.research,
        culture: acc.culture + empireTotals.culture,
        control: acc.control + empireTotals.control
      };
    },
    { production: 0, research: 0, culture: 0, control: 0 }
  );

  elements.playerSummary.innerHTML = '';

  const seatCard = document.createElement('div');
  seatCard.className = 'card';
  seatCard.innerHTML = `
    <h3>${seat ? seat.name : 'Seat'}</h3>
    <p class="muted">Controlled Empires: ${seatEmpires.length || 0}</p>
    <div>
      <span class="summary-pill">P ${totals.production}</span>
      <span class="summary-pill">R ${totals.research}</span>
      <span class="summary-pill">C ${totals.culture}</span>
      <span class="summary-pill">$ ${totals.dollars}</span>
    </div>
    <p class="muted">Total Nodes — P:${nodes.production} R:${nodes.research} C:${nodes.culture} CTRL:${nodes.control}</p>
  `;

  const empireCard = document.createElement('div');
  empireCard.className = 'card';
  empireCard.innerHTML = `
    <h3>Empire Details</h3>
    ${
      seatEmpires.length === 0
        ? '<p class="muted">No empires assigned to this seat yet.</p>'
        : seatEmpires
            .map((empire) => {
              const systemCount = getSystemsForEmpire(empire.id).length;
              return `
                <div>
                  <strong>${empire.name}</strong> (${empire.civilization})
                  <ul class="summary-list">
                    <li>Systems: ${systemCount}</li>
                    <li>Ascendancy Tokens: ${empire.ascendancyTokens}</li>
                    <li>Command Tokens: ${empire.commandTokens}</li>
                  </ul>
                </div>
              `;
            })
            .join('')
    }
  `;

  elements.playerSummary.append(seatCard, empireCard);
}

function openEarningsModal() {
  pendingEarnings = state.empires.map((empire) => {
    const totals = calculateTotals(empire.id);
    return {
      empireId: empire.id,
      name: empire.name,
      totals
    };
  });

  elements.earningsBreakdown.innerHTML = pendingEarnings
    .map(
      (entry) => `
      <div class="card">
        <strong>${entry.name}</strong>
        <p>+P ${entry.totals.production} | +R ${entry.totals.research} | +C ${entry.totals.culture} | +$ ${entry.totals.control}</p>
      </div>
    `
    )
    .join('');

  elements.earningsModal.classList.remove('hidden');
}

function applyEarnings() {
  if (!pendingEarnings) return;
  pendingEarnings.forEach((entry) => {
    const empire = state.empires.find((item) => item.id === entry.empireId);
    if (!empire) return;
    empire.resources.production += entry.totals.production;
    empire.resources.research += entry.totals.research;
    empire.resources.culture += entry.totals.culture;
    empire.resources.dollars += entry.totals.control;
  });
  pendingEarnings = null;
  elements.earningsModal.classList.add('hidden');
  saveState();
  renderEmpires();
  logEntry('Earnings applied for all empires.');
}

function cancelEarnings() {
  pendingEarnings = null;
  elements.earningsModal.classList.add('hidden');
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stt-ascendancy-state.json';
  link.click();
  URL.revokeObjectURL(url);
}

function exportLog() {
  const blob = new Blob([state.logs.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stt-ascendancy-log.txt';
  link.click();
  URL.revokeObjectURL(url);
}

function importStateFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = normalizeState(parsed);
      saveState();
      renderAll();
      logEntry('State imported from JSON.');
    } catch (error) {
      logEntry('Import failed: invalid JSON.');
    }
  };
  reader.readAsText(file);
}

function resetState() {
  state = defaultState();
  saveState();
  renderAll();
  logEntry('State reset to defaults.');
}

function copyLogToClipboard() {
  const text = state.logs.join('\n');
  if (window.sttApi?.copyText) {
    window.sttApi.copyText(text);
  }
  logEntry('Log copied to clipboard.');
}

function attachEventListeners() {
  elements.activeEmpire.addEventListener('change', (event) => {
    setActiveEmpire(event.target.value || null);
  });

  elements.playerSeat.addEventListener('change', (event) => {
    state.playerSeatId = event.target.value;
    saveState();
    renderPlayerInterface();
  });

  elements.nextRound.addEventListener('click', () => {
    setRound(state.round + 1);
  });

  elements.prevPhase.addEventListener('click', () => {
    const index = PHASES.indexOf(state.phase);
    const newIndex = (index - 1 + PHASES.length) % PHASES.length;
    setPhase(PHASES[newIndex]);
  });

  elements.nextPhase.addEventListener('click', () => {
    const index = PHASES.indexOf(state.phase);
    const newIndex = (index + 1) % PHASES.length;
    setPhase(PHASES[newIndex]);
  });

  elements.randomInitiative.addEventListener('click', randomizeInitiative);
  elements.openEarnings.addEventListener('click', openEarningsModal);
  elements.applyEarnings.addEventListener('click', applyEarnings);
  elements.cancelEarnings.addEventListener('click', cancelEarnings);
  elements.copyLog.addEventListener('click', copyLogToClipboard);
  elements.exportLog.addEventListener('click', exportLog);
  elements.exportState.addEventListener('click', exportState);
  elements.importState.addEventListener('change', (event) => {
    if (event.target.files.length > 0) {
      importStateFile(event.target.files[0]);
      event.target.value = '';
    }
  });
  elements.resetState.addEventListener('click', resetState);
}

function initialize() {
  attachEventListeners();
  renderAll();
  if (state.logs.length === 0) {
    logEntry('Game started.');
  }
}

initialize();
