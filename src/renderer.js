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
const QUADRANTS = ['Alpha', 'Beta'];
const TRADE_TYPES = ['Production', 'Research', 'Culture'];
const OWNER_STATUSES = ['None', 'Pre-War', 'Warp 1', 'Warp 2', 'Warp 3'];

const buildSeats = ({ playerCount, includeBorg, includeDominion }) => {
  const seats = Array.from({ length: playerCount }, (_, index) => ({
    id: `seat-${index + 1}`,
    name: `Player ${index + 1}`,
    initiative: index + 1,
    isNpc: false,
    attackShuttles: 0,
    frigates: 0,
    capitalShips: 0
  }));

  if (includeBorg) {
    seats.push({
      id: 'seat-borg',
      name: 'Borg NPC',
      initiative: seats.length + 1,
      isNpc: true,
      attackShuttles: 0,
      frigates: 0,
      capitalShips: 0
    });
  }

  if (includeDominion) {
    seats.push({
      id: 'seat-dominion',
      name: 'Dominion NPC',
      initiative: seats.length + 1,
      isNpc: true,
      attackShuttles: 0,
      frigates: 0,
      capitalShips: 0
    });
  }

  return seats;
};

const defaultState = () => ({
  round: 1,
  phase: 'Initiative',
  seats: buildSeats({
    playerCount: 3,
    includeBorg: false,
    includeDominion: false
  }),
  empires: [],
  systems: [],
  activeEmpireId: null,
  playerSeatId: 'seat-1',
  tradeAgreements: [],
  history: [],
  logs: [],
  setup: {
    playerCount: 3,
    includeBorg: false,
    includeDominion: false
  }
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
  undoAction: document.getElementById('undo-action'),
  initiativeOrder: document.getElementById('initiative-order'),
  initiativeSelects: document.getElementById('initiative-selects'),
  randomInitiative: document.getElementById('random-initiative'),
  seats: document.getElementById('seats'),
  empireForm: document.getElementById('empire-form'),
  empires: document.getElementById('empires'),
  systemForm: document.getElementById('system-form'),
  systems: document.getElementById('systems'),
  tradeForm: document.getElementById('trade-form'),
  tradeList: document.getElementById('trade-list'),
  setupForm: document.getElementById('setup-form'),
  playerSeat: document.getElementById('player-seat'),
  playerSummary: document.getElementById('player-summary'),
  overviewEarnings: document.getElementById('overview-earnings'),
  headerRound: document.getElementById('header-round'),
  headerPhase: document.getElementById('header-phase'),
  headerOrder: document.getElementById('header-order'),
  openEarnings: document.getElementById('open-earnings'),
  earningsModal: document.getElementById('earnings-modal'),
  earningsBreakdown: document.getElementById('earnings-breakdown'),
  tradeSummary: document.getElementById('trade-summary'),
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

function pushHistory() {
  const snapshot = JSON.parse(JSON.stringify({ ...state, history: [] }));
  state.history = state.history || [];
  state.history.unshift(snapshot);
  if (state.history.length > 20) {
    state.history.pop();
  }
}

function undoLastAction() {
  if (!state.history || state.history.length === 0) {
    return;
  }
  const [previous, ...rest] = state.history;
  state = { ...previous, history: rest };
  saveState();
  renderAll();
  logEntry('Undo applied.');
}

function normalizeState(imported) {
  const base = defaultState();
  const normalized = {
    ...base,
    ...imported
  };

  const normalizedSetup = {
    playerCount: Math.max(1, Math.min(5, Number(imported.setup?.playerCount) || 3)),
    includeBorg: Boolean(imported.setup?.includeBorg),
    includeDominion: Boolean(imported.setup?.includeDominion)
  };

  normalized.setup = normalizedSetup;

  const fallbackSeats = buildSeats(normalizedSetup);
  const importedSeats = imported.seats || [];
  const seatCount = Math.max(importedSeats.length, fallbackSeats.length);
  const seatMap = new Map();

  importedSeats.forEach((seat) => {
    if (seat?.id) {
      seatMap.set(seat.id, seat);
    }
  });

  normalized.seats = Array.from({ length: seatCount }, (_, index) => {
    const fallback = fallbackSeats[index] || {};
    const seat = seatMap.get(fallback.id) || importedSeats[index] || fallback;
    return {
      id: seat.id || fallback.id || `seat-${index + 1}`,
      name:
        seat.name ||
        fallback.name ||
        `${index < normalizedSetup.playerCount ? 'Player' : 'NPC'} ${index + 1}`,
      initiative: seat.initiative || fallback.initiative || index + 1,
      isNpc: seat.isNpc ?? fallback.isNpc ?? index >= normalizedSetup.playerCount,
      attackShuttles: Math.max(0, Number(seat.attackShuttles) || 0),
      frigates: Math.max(0, Number(seat.frigates) || 0),
      capitalShips: Math.max(0, Number(seat.capitalShips) || 0)
    };
  });

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
    attackShuttles: Math.max(0, Number(empire.attackShuttles) || 0),
    fleets: Math.max(0, Number(empire.fleets) || 0),
    frigates: Math.max(0, Number(empire.frigates) || 0),
    capitalShips: Math.max(0, Number(empire.capitalShips) || 0),
    techs: Math.max(0, Number(empire.techs) || 0),
    completedAdvancements: Math.max(0, Number(empire.completedAdvancements) || 0),
    warpLanes: Math.max(0, Number(empire.warpLanes) || 0),
    allianceMembers: Math.max(0, Number(empire.allianceMembers) || 0),
    allianceDominance: Boolean(empire.allianceDominance),
    seatId: empire.seatId || base.seats[0].id
  }));

  normalized.systems = (imported.systems || []).map((system, index) => ({
    id: system.id || `system-${Date.now()}-${index}`,
    name: system.name || `System ${index + 1}`,
    production: Number(system.production) || 0,
    research: Number(system.research) || 0,
    culture: Number(system.culture) || 0,
    control: Number(system.control) || 0,
    ownerEmpireId: system.ownerEmpireId || null,
    hasStarbase: Boolean(system.hasStarbase),
    quadrant: QUADRANTS.includes(system.quadrant) ? system.quadrant : 'Alpha',
    ownerStatus: OWNER_STATUSES.includes(system.ownerStatus)
      ? system.ownerStatus
      : 'None',
    fullyDeveloped: Boolean(system.fullyDeveloped),
    isHomeSystem: Boolean(system.isHomeSystem),
    isEnemyHomeSystem: Boolean(system.isEnemyHomeSystem)
  }));

  normalized.activeEmpireId =
    imported.activeEmpireId || normalized.empires[0]?.id || null;

  const playerSeats = normalized.seats.filter((seat) => !seat.isNpc);
  const preferredSeatId = imported.playerSeatId || normalized.seats[0]?.id;
  normalized.playerSeatId =
    playerSeats.find((seat) => seat.id === preferredSeatId)?.id ||
    playerSeats[0]?.id ||
    base.seats[0].id;

  normalized.tradeAgreements = (imported.tradeAgreements || []).map(
    (agreement, index) => ({
      id: agreement.id || `trade-${Date.now()}-${index}`,
      fromSeatId: agreement.fromSeatId || normalized.seats[0]?.id,
      toType: agreement.toType === 'npc' ? 'npc' : 'seat',
      toSeatId: agreement.toSeatId || normalized.seats[0]?.id,
      toNpcName: agreement.toNpcName || 'NPC',
      giveType: TRADE_TYPES.includes(agreement.giveType)
        ? agreement.giveType
        : 'Production',
      giveAmount: Math.max(0, Number(agreement.giveAmount) || 0),
      receiveType: TRADE_TYPES.includes(agreement.receiveType)
        ? agreement.receiveType
        : 'Production',
      receiveAmount: Math.max(0, Number(agreement.receiveAmount) || 0)
    })
  );

  normalized.history = imported.history || [];

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
  pushHistory();
  state.phase = newPhase;
  saveState();
  renderPhase();
  logEntry(`Phase set to ${newPhase}.`);
}

function setRound(round) {
  pushHistory();
  state.round = round;
  state.phase = 'Initiative';
  saveState();
  renderPhase();
  logEntry(`Round advanced to ${round}. Phase reset to Initiative.`);
}

function updateSeatName(seatId, name) {
  const seat = state.seats.find((item) => item.id === seatId);
  if (!seat) return;
  pushHistory();
  seat.name = name;
  saveState();
  renderInitiative();
  renderSeats();
  logEntry(`Seat renamed to ${name}.`);
}

function updateInitiative(seatId, rank) {
  const seat = state.seats.find((item) => item.id === seatId);
  if (!seat) return;
  pushHistory();
  seat.initiative = rank;
  saveState();
  renderInitiative();
  logEntry(`Initiative updated. ${seat.name} is now ${rank}.`);
}

function randomizeInitiative() {
  pushHistory();
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
  pushHistory();
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
    attackShuttles: 0,
    fleets: 0,
    frigates: 0,
    capitalShips: 0,
    techs: 0,
    completedAdvancements: 0,
    warpLanes: 0,
    allianceMembers: 0,
    allianceDominance: false,
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
  pushHistory();
  Object.assign(empire, updates);
  saveState();
  renderAll();
}

function adjustResource(empireId, resource, delta) {
  const empire = state.empires.find((item) => item.id === empireId);
  if (!empire) return;
  pushHistory();
  const current = empire.resources[resource] || 0;
  empire.resources[resource] = Math.max(0, current + delta);
  saveState();
  renderEmpires();
}

function adjustCounter(empireId, key, delta) {
  const empire = state.empires.find((item) => item.id === empireId);
  if (!empire) return;
  pushHistory();
  empire[key] = Math.max(0, (empire[key] || 0) + delta);
  saveState();
  renderEmpires();
}

function getEmpireColor(empireId) {
  const empire = state.empires.find((item) => item.id === empireId);
  if (!empire) return '#2d3758';
  return CIVILIZATION_COLORS[empire.civilization] || '#2d3758';
}

function setActiveEmpire(empireId) {
  pushHistory();
  state.activeEmpireId = empireId || null;
  const activeEmpire = state.empires.find((empire) => empire.id === empireId);
  const activeSeat = state.seats.find((seat) => seat.id === activeEmpire?.seatId);
  if (activeSeat && !activeSeat.isNpc) {
    state.playerSeatId = activeSeat.id;
  }
  saveState();
  renderActiveEmpire();
  renderPlayerInterface();
}

function addSystem(system) {
  pushHistory();
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
  pushHistory();
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

function getPlayerSeats() {
  return state.seats.filter((seat) => !seat.isNpc);
}

function formatSeatLabel(seat, index) {
  if (seat.isNpc) {
    return `${seat.name} (NPC)`;
  }
  return `Player ${index + 1}`;
}

function formatSeatOptionLabel(seat, index) {
  if (seat.isNpc) {
    return `${seat.name} (NPC)`;
  }
  return seat.name || `Player ${index + 1}`;
}

function findFirstEmpireForSeat(seatId) {
  return state.empires.find((empire) => empire.seatId === seatId)?.id || null;
}

function getPrimaryEmpireForSeat(seatId) {
  if (!seatId) return null;
  const activeEmpire = state.empires.find(
    (empire) => empire.id === state.activeEmpireId && empire.seatId === seatId
  );
  if (activeEmpire) {
    return activeEmpire;
  }
  return state.empires.find((empire) => empire.seatId === seatId) || null;
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

function getTopLevels() {
  if (state.empires.length === 0) {
    return { weapon: 0, shield: 0 };
  }
  return state.empires.reduce(
    (top, empire) => ({
      weapon: Math.max(top.weapon, empire.weaponLevel || 0),
      shield: Math.max(top.shield, empire.shieldLevel || 0)
    }),
    { weapon: 0, shield: 0 }
  );
}

function calculateEndGameScore(empire) {
  const systems = getSystemsForEmpire(empire.id);
  const totals = calculateTotals(empire.id);
  const topLevels = getTopLevels();
  const tradeCount = state.tradeAgreements.filter((agreement) => {
    if (agreement.fromSeatId === empire.seatId) return true;
    return agreement.toType === 'seat' && agreement.toSeatId === empire.seatId;
  }).length;

  const scoreBreakdown = {
    controlledSystems: systems.length * 2,
    enemyHomeSystems: systems.filter((system) => system.isEnemyHomeSystem).length * 5,
    ownHomeSystem: systems.filter((system) => system.isHomeSystem).length * 5,
    starbaseSystems: systems.filter((system) => system.hasStarbase).length,
    productionNodes: totals.production,
    researchNodes: totals.research,
    cultureNodes: totals.culture,
    fullyDeveloped: systems.filter((system) => system.fullyDeveloped).length * 2,
    fleets: (empire.fleets || 0),
    capitalShips: (empire.capitalShips || 0) * 2,
    operationalStarbases: (empire.starbases || 0) * 2,
    warpLanes: (empire.warpLanes || 0),
    advancements: (empire.completedAdvancements || 0),
    topWeapon: empire.weaponLevel === topLevels.weapon ? 2 : 0,
    topShield: empire.shieldLevel === topLevels.shield ? 2 : 0,
    ascendancyTokens: (empire.ascendancyTokens || 0) * 3,
    tradeAgreements: tradeCount,
    allianceMembers: (empire.allianceMembers || 0),
    allianceDominance: empire.allianceDominance
      ? (empire.allianceMembers || 0) * 3
      : 0
  };

  const totalScore = Object.values(scoreBreakdown).reduce(
    (sum, value) => sum + value,
    0
  );

  return { totalScore, scoreBreakdown, tradeCount, topLevels };
}

function calculateSeatScore(seatId) {
  const seatEmpires = state.empires.filter((empire) => empire.seatId === seatId);
  return seatEmpires.reduce(
    (sum, empire) => sum + calculateEndGameScore(empire).totalScore,
    0
  );
}

function calculateDefense(empire) {
  const systems = getSystemsForEmpire(empire.id);
  return systems.reduce(
    (total, system) =>
      total +
      system.production +
      system.research +
      system.control +
      (system.hasStarbase ? 1 : 0),
    0
  );
}

function calculateTradeTotals(seatId) {
  const totals = { Production: 0, Research: 0, Culture: 0 };

  state.tradeAgreements.forEach((agreement) => {
    if (agreement.fromSeatId === seatId) {
      totals[agreement.receiveType] += agreement.receiveAmount;
    }
    if (agreement.toType === 'seat' && agreement.toSeatId === seatId) {
      totals[agreement.giveType] += agreement.giveAmount;
    }
  });

  return totals;
}

function renderPhase() {
  elements.roundValue.textContent = state.round;
  elements.phaseValue.textContent = state.phase;
  if (elements.headerRound) {
    elements.headerRound.textContent = state.round;
  }
  if (elements.headerPhase) {
    elements.headerPhase.textContent = state.phase;
  }
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
  if (elements.headerOrder) {
    elements.headerOrder.textContent =
      order.map((seat) => seat.name).join(' > ') || '—';
  }

  elements.initiativeSelects.innerHTML = '';
  state.seats.forEach((seat) => {
    const container = document.createElement('label');
    container.className = 'card';
    container.textContent = seat.name;
    const select = document.createElement('select');
    Array.from({ length: state.seats.length }, (_, index) => index + 1).forEach(
      (rank) => {
      const option = document.createElement('option');
      option.value = rank;
      option.textContent = `Rank ${rank}`;
      if (seat.initiative === rank) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    );
    select.addEventListener('change', (event) => {
      updateInitiative(seat.id, Number(event.target.value));
    });
    container.appendChild(select);
    elements.initiativeSelects.appendChild(container);
  });
}

function renderSetupForm() {
  if (!elements.setupForm) return;
  elements.setupForm.innerHTML = '';

  const playerSelect = document.createElement('select');
  [1, 2, 3, 4, 5].forEach((count) => {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = `${count} Player${count === 1 ? '' : 's'}`;
    if (state.setup?.playerCount === count) {
      option.selected = true;
    }
    playerSelect.appendChild(option);
  });

  const borgLabel = document.createElement('label');
  borgLabel.className = 'checkbox-label';
  borgLabel.innerHTML = `
    <input type="checkbox" id="setup-borg" ${
      state.setup?.includeBorg ? 'checked' : ''
    } />
    Borg NPC
  `;

  const dominionLabel = document.createElement('label');
  dominionLabel.className = 'checkbox-label';
  dominionLabel.innerHTML = `
    <input type="checkbox" id="setup-dominion" ${
      state.setup?.includeDominion ? 'checked' : ''
    } />
    Dominion NPC
  `;

  const applyButton = document.createElement('button');
  applyButton.className = 'primary';
  applyButton.textContent = 'Apply Setup';

  applyButton.addEventListener('click', () => {
    const playerCount = Math.max(1, Math.min(5, Number(playerSelect.value) || 3));
    const includeBorg = borgLabel.querySelector('input')?.checked || false;
    const includeDominion =
      dominionLabel.querySelector('input')?.checked || false;
    pushHistory();
    state.setup = { playerCount, includeBorg, includeDominion };
    state.seats = buildSeats(state.setup);
    state.playerSeatId = state.seats[0]?.id || null;
    state.empires.forEach((empire) => {
      if (!state.seats.find((seat) => seat.id === empire.seatId)) {
        empire.seatId = state.seats[0]?.id || empire.seatId;
      }
    });
    saveState();
    renderAll();
    logEntry(
      `Game setup updated: ${playerCount} player(s), Borg ${
        includeBorg ? 'on' : 'off'
      }, Dominion ${includeDominion ? 'on' : 'off'}.`
    );
  });

  elements.setupForm.append(playerSelect, borgLabel, dominionLabel, applyButton);
}

function renderSeats() {
  elements.seats.innerHTML = '';
  state.seats.forEach((seat, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    const label = formatSeatLabel(seat, index);
    card.innerHTML = `
      <h3>${label}</h3>
      <label>
        ${seat.isNpc ? 'NPC Name' : 'Player Name'}
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
  state.seats.forEach((seat, index) => {
    const option = document.createElement('option');
    option.value = seat.id;
    option.textContent = formatSeatOptionLabel(seat, index);
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
    const score = calculateEndGameScore(empire);
    const empireColor = CIVILIZATION_COLORS[empire.civilization] || '#2d3758';
    const card = document.createElement('div');
    card.className = 'card empire-card';
    card.style.borderColor = empireColor;
    card.style.boxShadow = `0 0 0 2px ${hexToRgba(empireColor, 0.4)}`;
    card.style.setProperty('--empire-color', empireColor);
    card.style.background = `linear-gradient(140deg, ${hexToRgba(
      empireColor,
      0.35
    )}, #141a2b 60%)`;
    card.innerHTML = `
      <h3>${empire.name}</h3>
      <label>
        Empire Name
        <input type="text" value="${empire.name}" data-field="name" />
      </label>
      <p>Civilization: ${empire.civilization}</p>
      <label>
        Seat
        <select data-field="seat">
          ${state.seats
            .map(
              (seat, index) =>
                `<option value="${seat.id}" ${
                  seat.id === empire.seatId ? 'selected' : ''
                }>${formatSeatOptionLabel(seat, index)}</option>`
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
      <h4>Fleet</h4>
      ${[
        { key: 'fleets', label: 'Fleets in Play' },
        { key: 'attackShuttles', label: 'Attack Shuttles' },
        { key: 'frigates', label: 'Frigates' },
        { key: 'capitalShips', label: 'Capital Ships' }
      ]
        .map(
          (item) => `
          <div class="resource-row">
            <span>${item.label}: ${empire[item.key] || 0}</span>
            <div class="resource-buttons">
              <button data-counter="${item.key}" data-delta="1">+</button>
              <button data-counter="${item.key}" data-delta="-1">-</button>
            </div>
          </div>
        `
        )
        .join('')}
      <h4>Technology &amp; Strategy</h4>
      ${[
        { key: 'techs', label: 'Completed Techs' },
        { key: 'completedAdvancements', label: 'Completed Advancements' },
        { key: 'warpLanes', label: 'Locked/Controlled Warp Lanes' },
        { key: 'allianceMembers', label: 'Alliance Members' }
      ]
        .map(
          (item) => `
          <div class="resource-row">
            <span>${item.label}: ${empire[item.key] || 0}</span>
            <div class="resource-buttons">
              <button data-counter="${item.key}" data-delta="1">+</button>
              <button data-counter="${item.key}" data-delta="-1">-</button>
            </div>
          </div>
        `
        )
        .join('')}
      <label class="checkbox-label">
        <input type="checkbox" data-field="alliance-dominance" ${
          empire.allianceDominance ? 'checked' : ''
        } />
        Alliance Dominance (most systems)
      </label>
      <h4>Totals</h4>
      <p>Nodes — P:${totals.production} R:${totals.research} C:${totals.culture} CTRL:${totals.control}</p>
      <p>Defense Strength: ${defense}</p>
      <p class="muted">Per-planet formula: P + R + CTRL + 1 if starbase.</p>
      <div class="muted">
        ${getSystemsForEmpire(empire.id)
          .map((system) => {
            const value =
              system.production +
              system.research +
              system.control +
              (system.hasStarbase ? 1 : 0);
            return `${system.name}: ${value}`;
          })
          .join('<br />')}
      </div>
      <div class="button-row">
        <button data-active="${empire.id}" class="primary">Set Active</button>
      </div>
      <h4>End Game Score: ${score.totalScore}</h4>
      <ul class="summary-list">
        <li>Controlled Systems: ${score.scoreBreakdown.controlledSystems}</li>
        <li>Enemy Home Systems: ${score.scoreBreakdown.enemyHomeSystems}</li>
        <li>Own Home System: ${score.scoreBreakdown.ownHomeSystem}</li>
        <li>Starbase Systems: ${score.scoreBreakdown.starbaseSystems}</li>
        <li>Production Nodes: ${score.scoreBreakdown.productionNodes}</li>
        <li>Research Nodes: ${score.scoreBreakdown.researchNodes}</li>
        <li>Culture Nodes: ${score.scoreBreakdown.cultureNodes}</li>
        <li>Fully Developed Systems: ${score.scoreBreakdown.fullyDeveloped}</li>
        <li>Fleets in Play: ${score.scoreBreakdown.fleets}</li>
        <li>Capital Ships: ${score.scoreBreakdown.capitalShips}</li>
        <li>Operational Starbases: ${score.scoreBreakdown.operationalStarbases}</li>
        <li>Warp Lanes: ${score.scoreBreakdown.warpLanes}</li>
        <li>Completed Advancements: ${score.scoreBreakdown.advancements}</li>
        <li>Top Weapon Level: ${score.scoreBreakdown.topWeapon}</li>
        <li>Top Shield Level: ${score.scoreBreakdown.topShield}</li>
        <li>Ascendancy Tokens: ${score.scoreBreakdown.ascendancyTokens}</li>
        <li>Trade Agreements: ${score.scoreBreakdown.tradeAgreements}</li>
        <li>Alliance Members: ${score.scoreBreakdown.allianceMembers}</li>
        <li>Alliance Dominance: ${score.scoreBreakdown.allianceDominance}</li>
      </ul>
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

    const allianceDominanceInput = card.querySelector(
      'input[data-field="alliance-dominance"]'
    );
    allianceDominanceInput.addEventListener('change', (event) => {
      updateEmpire(empire.id, { allianceDominance: event.target.checked });
      logEntry(`${empire.name} alliance dominance updated.`);
    });

    const nameInput = card.querySelector('input[data-field="name"]');
    nameInput.addEventListener('change', (event) => {
      const newName = event.target.value.trim();
      if (!newName) {
        event.target.value = empire.name;
        return;
      }
      updateEmpire(empire.id, { name: newName });
      logEntry(`Empire renamed to ${newName}.`);
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

  const quadrantSelect = document.createElement('select');
  QUADRANTS.forEach((quadrant) => {
    const option = document.createElement('option');
    option.value = quadrant;
    option.textContent = quadrant;
    quadrantSelect.appendChild(option);
  });

  const ownerStatusSelect = document.createElement('select');
  OWNER_STATUSES.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    ownerStatusSelect.appendChild(option);
  });

  const starbaseLabel = document.createElement('label');
  starbaseLabel.className = 'checkbox-label';
  starbaseLabel.innerHTML = `
    <input type="checkbox" id="system-starbase" />
    Starbase
  `;

  const fullyDevelopedLabel = document.createElement('label');
  fullyDevelopedLabel.className = 'checkbox-label';
  fullyDevelopedLabel.innerHTML = `
    <input type="checkbox" id="system-fully-developed" />
    Fully Developed
  `;

  const homeSystemLabel = document.createElement('label');
  homeSystemLabel.className = 'checkbox-label';
  homeSystemLabel.innerHTML = `
    <input type="checkbox" id="system-home" />
    Home System (Owner)
  `;

  const enemyHomeSystemLabel = document.createElement('label');
  enemyHomeSystemLabel.className = 'checkbox-label';
  enemyHomeSystemLabel.innerHTML = `
    <input type="checkbox" id="system-enemy-home" />
    Enemy Home System
  `;

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
      ownerEmpireId: ownerSelect.value || null,
      hasStarbase: starbaseLabel.querySelector('input').checked,
      quadrant: quadrantSelect.value,
      ownerStatus: ownerStatusSelect.value,
      fullyDeveloped: fullyDevelopedLabel.querySelector('input').checked,
      isHomeSystem: homeSystemLabel.querySelector('input').checked,
      isEnemyHomeSystem: enemyHomeSystemLabel.querySelector('input').checked
    });
    nameInput.value = '';
    productionInput.value = '';
    researchInput.value = '';
    cultureInput.value = '';
    controlInput.value = '';
    quadrantSelect.value = 'Alpha';
    ownerStatusSelect.value = 'None';
    starbaseLabel.querySelector('input').checked = false;
    fullyDevelopedLabel.querySelector('input').checked = false;
    homeSystemLabel.querySelector('input').checked = false;
    enemyHomeSystemLabel.querySelector('input').checked = false;
  });

  elements.systemForm.append(
    nameInput,
    productionInput,
    researchInput,
    cultureInput,
    controlInput,
    quadrantSelect,
    ownerStatusSelect,
    fullyDevelopedLabel,
    starbaseLabel,
    homeSystemLabel,
    enemyHomeSystemLabel,
    ownerSelect,
    addButton
  );
}

function renderTradeForm() {
  elements.tradeForm.innerHTML = '';
  const fromSeatSelect = document.createElement('select');
  getPlayerSeats().forEach((seat, index) => {
    const option = document.createElement('option');
    option.value = seat.id;
    option.textContent = formatSeatOptionLabel(seat, index);
    fromSeatSelect.appendChild(option);
  });

  const toTypeSelect = document.createElement('select');
  [
    { value: 'seat', label: 'Player' },
    { value: 'npc', label: 'NPC' }
  ].forEach((type) => {
    const option = document.createElement('option');
    option.value = type.value;
    option.textContent = type.label;
    toTypeSelect.appendChild(option);
  });

  const toSeatSelect = document.createElement('select');
  getPlayerSeats().forEach((seat, index) => {
    const option = document.createElement('option');
    option.value = seat.id;
    option.textContent = formatSeatOptionLabel(seat, index);
    toSeatSelect.appendChild(option);
  });

  const toNpcInput = document.createElement('input');
  toNpcInput.placeholder = 'NPC name';
  toNpcInput.value = 'NPC';

  const giveResourceSelect = document.createElement('select');
  TRADE_TYPES.forEach((resource) => {
    const option = document.createElement('option');
    option.value = resource;
    option.textContent = `Partner Gains ${resource}`;
    giveResourceSelect.appendChild(option);
  });

  const giveAmountInput = document.createElement('input');
  giveAmountInput.type = 'number';
  giveAmountInput.min = '0';
  giveAmountInput.placeholder = 'Partner gain';

  const receiveResourceSelect = document.createElement('select');
  TRADE_TYPES.forEach((resource) => {
    const option = document.createElement('option');
    option.value = resource;
    option.textContent = `You Gain ${resource}`;
    receiveResourceSelect.appendChild(option);
  });

  const receiveAmountInput = document.createElement('input');
  receiveAmountInput.type = 'number';
  receiveAmountInput.min = '0';
  receiveAmountInput.placeholder = 'Your gain';

  const addButton = document.createElement('button');
  addButton.className = 'primary';
  addButton.textContent = 'Add Trade';

  const updateTradeVisibility = () => {
    const isNpc = toTypeSelect.value === 'npc';
    toSeatSelect.style.display = isNpc ? 'none' : 'block';
    toNpcInput.style.display = isNpc ? 'block' : 'none';
  };

  toTypeSelect.addEventListener('change', updateTradeVisibility);
  updateTradeVisibility();

  addButton.addEventListener('click', () => {
    const giveAmount = Number(giveAmountInput.value) || 0;
    const receiveAmount = Number(receiveAmountInput.value) || 0;
    if (giveAmount <= 0 && receiveAmount <= 0) return;
    pushHistory();
    const agreement = {
      id: `trade-${Date.now()}`,
      fromSeatId: fromSeatSelect.value,
      toType: toTypeSelect.value,
      toSeatId: toSeatSelect.value,
      toNpcName: toNpcInput.value.trim() || 'NPC',
      giveType: giveResourceSelect.value,
      giveAmount,
      receiveType: receiveResourceSelect.value,
      receiveAmount
    };
    state.tradeAgreements.push(agreement);
    saveState();
    renderTradeAgreements();
    renderPlayerInterface();
    logEntry('Trade agreement added.');
    giveAmountInput.value = '';
    receiveAmountInput.value = '';
  });

  elements.tradeForm.append(
    fromSeatSelect,
    toTypeSelect,
    toSeatSelect,
    toNpcInput,
    giveResourceSelect,
    giveAmountInput,
    receiveResourceSelect,
    receiveAmountInput,
    addButton
  );
}

function renderTradeAgreements() {
  elements.tradeList.innerHTML = '';
  if (state.tradeAgreements.length === 0) {
    elements.tradeList.textContent = 'No trade agreements yet.';
    return;
  }

  state.tradeAgreements.forEach((agreement) => {
    const row = document.createElement('div');
    row.className = 'trade-item';
    const fromSeat = state.seats.find((seat) => seat.id === agreement.fromSeatId);
    const toSeat =
      agreement.toType === 'seat'
        ? state.seats.find((seat) => seat.id === agreement.toSeatId)
        : null;
    const targetLabel =
      agreement.toType === 'npc'
        ? agreement.toNpcName
        : toSeat?.name || 'Player';
    row.innerHTML = `
      <strong>${fromSeat?.name || 'Player'}</strong> ↔ ${targetLabel}
      <span class="summary-pill">${targetLabel} gains ${agreement.giveType}: ${agreement.giveAmount}</span>
      <span class="summary-pill">${fromSeat?.name || 'Player'} gains ${agreement.receiveType}: ${agreement.receiveAmount}</span>
      <button data-delete="${agreement.id}" class="danger">Revoke</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      pushHistory();
      state.tradeAgreements = state.tradeAgreements.filter(
        (item) => item.id !== agreement.id
      );
      saveState();
      renderTradeAgreements();
      renderPlayerInterface();
      logEntry('Trade agreement revoked.');
    });
    elements.tradeList.appendChild(row);
  });
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
        <th>Quadrant</th>
        <th>Owner Status</th>
        <th>Fully Developed</th>
        <th>Starbase</th>
        <th>Home System</th>
        <th>Enemy Home</th>
        <th>Owner</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');

  state.systems.forEach((system) => {
    const row = document.createElement('tr');
    const ownerColor = system.ownerEmpireId
      ? getEmpireColor(system.ownerEmpireId)
      : null;
    if (ownerColor) {
      row.style.background = hexToRgba(ownerColor, 0.25);
    }
    row.innerHTML = `
      <td><input value="${system.name}" /></td>
      <td><input type="number" value="${system.production}" /></td>
      <td><input type="number" value="${system.research}" /></td>
      <td><input type="number" value="${system.culture}" /></td>
      <td><input type="number" value="${system.control}" /></td>
      <td>
        <select data-field="quadrant">
          ${QUADRANTS.map(
            (quadrant) => `
            <option value="${quadrant}" ${
              quadrant === system.quadrant ? 'selected' : ''
            }>${quadrant}</option>
          `
          ).join('')}
        </select>
      </td>
      <td>
        <select data-field="owner-status">
          ${OWNER_STATUSES.map(
            (status) => `
            <option value="${status}" ${
              status === system.ownerStatus ? 'selected' : ''
            }>${status}</option>
          `
          ).join('')}
        </select>
      </td>
      <td>
        <input type="checkbox" data-field="fully-developed" ${
          system.fullyDeveloped ? 'checked' : ''
        } />
      </td>
      <td>
        <input type="checkbox" data-field="starbase" ${
          system.hasStarbase ? 'checked' : ''
        } />
      </td>
      <td>
        <input type="checkbox" data-field="home-system" ${
          system.isHomeSystem ? 'checked' : ''
        } />
      </td>
      <td>
        <input type="checkbox" data-field="enemy-home-system" ${
          system.isEnemyHomeSystem ? 'checked' : ''
        } />
      </td>
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
    const selects = row.querySelectorAll('select');

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
    const quadrantSelect = row.querySelector('select[data-field="quadrant"]');
    quadrantSelect.addEventListener('change', (event) => {
      updateSystem(system.id, { quadrant: event.target.value });
    });

    const ownerStatusSelect = row.querySelector('select[data-field="owner-status"]');
    ownerStatusSelect.addEventListener('change', (event) => {
      updateSystem(system.id, { ownerStatus: event.target.value });
    });

    const fullyDevelopedInput = row.querySelector(
      'input[data-field="fully-developed"]'
    );
    fullyDevelopedInput.addEventListener('change', (event) => {
      updateSystem(system.id, { fullyDeveloped: event.target.checked });
    });

    const starbaseInput = row.querySelector('input[data-field="starbase"]');
    starbaseInput.addEventListener('change', (event) => {
      updateSystem(system.id, { hasStarbase: event.target.checked });
    });

    const homeSystemInput = row.querySelector('input[data-field="home-system"]');
    homeSystemInput.addEventListener('change', (event) => {
      updateSystem(system.id, { isHomeSystem: event.target.checked });
    });

    const enemyHomeSystemInput = row.querySelector(
      'input[data-field="enemy-home-system"]'
    );
    enemyHomeSystemInput.addEventListener('change', (event) => {
      updateSystem(system.id, { isEnemyHomeSystem: event.target.checked });
    });

    const ownerSelectInput = selects[selects.length - 1];
    ownerSelectInput.addEventListener('change', (event) => {
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
  renderSetupForm();
  renderActiveEmpire();
  renderInitiative();
  renderSeats();
  renderPlayerInterface();
  renderEmpireForm();
  renderEmpires();
  renderSystemForm();
  renderTradeForm();
  renderTradeAgreements();
  renderSystems();
  renderLogs();
}

function renderPlayerInterface() {
  elements.playerSeat.innerHTML = '';
  getPlayerSeats().forEach((seat, index) => {
    const option = document.createElement('option');
    option.value = seat.id;
    option.textContent = formatSeatOptionLabel(seat, index);
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
  const tradeTotals = calculateTradeTotals(state.playerSeatId);
  const seatScoreTotal = calculateSeatScore(state.playerSeatId);
  seatCard.innerHTML = `
    <h3>${seat ? seat.name : 'Seat'}</h3>
    <p class="muted">Controlled Empires: ${seatEmpires.length || 0}</p>
    <div>
      <span class="summary-pill">P ${totals.production}</span>
      <span class="summary-pill">R ${totals.research}</span>
      <span class="summary-pill">C ${totals.culture}</span>
      <span class="summary-pill">$ ${totals.dollars}</span>
    </div>
    <div>
      <span class="summary-pill">Shuttles ${seat?.attackShuttles || 0}</span>
      <span class="summary-pill">Frigates ${seat?.frigates || 0}</span>
      <span class="summary-pill">Capital ${seat?.capitalShips || 0}</span>
    </div>
    <p class="muted">End Game Score Total: ${seatScoreTotal}</p>
    <p class="muted">Total Nodes — P:${nodes.production} R:${nodes.research} C:${nodes.culture} CTRL:${nodes.control}</p>
    <p class="muted">Trade Gains — P:${tradeTotals.Production} R:${tradeTotals.Research} C:${tradeTotals.Culture}</p>
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

function openEarningsModal(seatId = null) {
  const targetEmpires = seatId
    ? state.empires.filter((empire) => empire.seatId === seatId)
    : state.empires;

  pendingEarnings = targetEmpires.map((empire) => {
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

  const tradeNote = state.tradeAgreements.length
    ? '<br /><em>Trades add resources to each party; no resources are deducted.</em>'
    : '';

  if (state.tradeAgreements.length === 0) {
    elements.tradeSummary.textContent = 'No trade agreements recorded.';
  } else {
    elements.tradeSummary.innerHTML = state.tradeAgreements
      .map((agreement) => {
        const fromSeat = state.seats.find(
          (seat) => seat.id === agreement.fromSeatId
        );
        const toSeat =
          agreement.toType === 'seat'
            ? state.seats.find((seat) => seat.id === agreement.toSeatId)
            : null;
        const targetLabel =
          agreement.toType === 'npc'
            ? agreement.toNpcName
            : toSeat?.name || 'Player';
        return `${fromSeat?.name || 'Player'} ↔ ${targetLabel}: ${targetLabel} gains ${agreement.giveType} ${agreement.giveAmount}, ${fromSeat?.name || 'Player'} gains ${agreement.receiveType} ${agreement.receiveAmount}`;
      })
      .join('<br />');
  }

  if (tradeNote) {
    elements.tradeSummary.innerHTML += tradeNote;
  }

  elements.earningsModal.classList.remove('hidden');
}

function applyEarnings() {
  if (!pendingEarnings) return;
  pushHistory();
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
  state.tradeAgreements.forEach((agreement) => {
    const fromEmpire = getPrimaryEmpireForSeat(agreement.fromSeatId);
    if (fromEmpire) {
      fromEmpire.resources[agreement.receiveType] += agreement.receiveAmount;
    }
    if (agreement.toType === 'seat') {
      const toEmpire = getPrimaryEmpireForSeat(agreement.toSeatId);
      if (toEmpire) {
        toEmpire.resources[agreement.giveType] += agreement.giveAmount;
      }
    }
  });
  saveState();
  renderEmpires();
  renderPlayerInterface();
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
      pushHistory();
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
  pushHistory();
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

  elements.undoAction.addEventListener('click', undoLastAction);

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
  elements.openEarnings.addEventListener('click', () => openEarningsModal());
  if (elements.overviewEarnings) {
    elements.overviewEarnings.addEventListener('click', () =>
      openEarningsModal(state.playerSeatId)
    );
  }
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
