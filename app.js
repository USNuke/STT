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

const phaseList = document.querySelectorAll('#phase-list li');
let phaseIndex = 0;

document.getElementById('advance-phase')?.addEventListener('click', () => {
  phaseList[phaseIndex].classList.remove('active');
  phaseIndex = (phaseIndex + 1) % phaseList.length;
  phaseList[phaseIndex].classList.add('active');
});

const diceResults = document.getElementById('dice-results');
const diceCount = document.getElementById('dice-count');

document.getElementById('roll-dice')?.addEventListener('click', () => {
  const count = Number.parseInt(diceCount.value, 10) || 1;
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
  diceResults.textContent = `Rolls: ${rolls.join(', ')} | Hits: ${rolls.filter((r) => r >= 5).length}`;
});

const productionTotal = document.getElementById('production-total');
const systemsInput = document.getElementById('systems');
const bonusInput = document.getElementById('bonus');

const updateProduction = () => {
  const systems = Number.parseInt(systemsInput.value, 10) || 0;
  const bonus = Number.parseInt(bonusInput.value, 10) || 0;
  productionTotal.textContent = (6 + systems + bonus).toString();
};

systemsInput.addEventListener('input', updateProduction);
bonusInput.addEventListener('input', updateProduction);
updateProduction();

const logEntry = document.getElementById('log-entry');
const logList = document.getElementById('log-list');

document.getElementById('add-log')?.addEventListener('click', () => {
  if (!logEntry.value.trim()) return;
  const li = document.createElement('li');
  li.className = 'log-item';
  li.textContent = logEntry.value.trim();
  logList.prepend(li);
  logEntry.value = '';
});

document.getElementById('clear-log')?.addEventListener('click', () => {
  logList.innerHTML = '';
});

const resourceDialog = document.getElementById('resource-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogEnergy = document.getElementById('dialog-energy');
const dialogProduction = document.getElementById('dialog-production');
const dialogResearch = document.getElementById('dialog-research');

const resourceFields = {
  federation: {
    energy: document.getElementById('fed-energy'),
    production: document.getElementById('fed-production'),
    research: document.getElementById('fed-research'),
  },
  klingon: {
    energy: document.getElementById('klingon-energy'),
    production: document.getElementById('klingon-production'),
    research: document.getElementById('klingon-research'),
  },
  romulan: {
    energy: document.getElementById('romulan-energy'),
    production: document.getElementById('romulan-production'),
    research: document.getElementById('romulan-research'),
  },
};

let currentFaction = 'federation';

document.querySelectorAll('[data-faction]').forEach((button) => {
  button.addEventListener('click', () => {
    currentFaction = button.dataset.faction;
    const fields = resourceFields[currentFaction];
    dialogTitle.textContent = `Adjust Resources: ${button.closest('.faction-card')?.querySelector('h3')?.textContent}`;
    dialogEnergy.value = fields.energy.textContent;
    dialogProduction.value = fields.production.textContent;
    dialogResearch.value = fields.research.textContent;
    resourceDialog.showModal();
  });
});

resourceDialog.addEventListener('close', () => {
  if (resourceDialog.returnValue !== 'confirm') return;
  const fields = resourceFields[currentFaction];
  fields.energy.textContent = dialogEnergy.value;
  fields.production.textContent = dialogProduction.value;
  fields.research.textContent = dialogResearch.value;
});

const roundValue = document.getElementById('round-value');

const incrementRound = () => {
  roundValue.textContent = (Number.parseInt(roundValue.textContent, 10) + 1).toString();
};

document.getElementById('init-turn')?.addEventListener('click', incrementRound);

document.getElementById('save-state')?.addEventListener('click', () => {
  const data = {
    round: roundValue.textContent,
    initiative: document.getElementById('initiative-value').textContent,
    tension: document.getElementById('tension-value').textContent,
    factions: Object.fromEntries(
      Object.entries(resourceFields).map(([key, fields]) => [
        key,
        {
          energy: fields.energy.textContent,
          production: fields.production.textContent,
          research: fields.research.textContent,
        },
      ])
    ),
  };
  localStorage.setItem('ascendancy-state', JSON.stringify(data));
  alert('Game state saved to local storage.');
});

const loadState = () => {
  const stored = localStorage.getItem('ascendancy-state');
  if (!stored) return;
  const data = JSON.parse(stored);
  roundValue.textContent = data.round ?? roundValue.textContent;
  document.getElementById('initiative-value').textContent = data.initiative ?? 'Federation';
  document.getElementById('tension-value').textContent = data.tension ?? 'Moderate';
  Object.entries(data.factions ?? {}).forEach(([key, values]) => {
    const fields = resourceFields[key];
    if (!fields) return;
    fields.energy.textContent = values.energy ?? fields.energy.textContent;
    fields.production.textContent = values.production ?? fields.production.textContent;
    fields.research.textContent = values.research ?? fields.research.textContent;
  });
};

loadState();
