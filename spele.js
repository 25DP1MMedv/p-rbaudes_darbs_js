// ═══════════════════════════════════
//  STATE
// ═══════════════════════════════════
let balance  = 20.00;
let bet      = 0.50;
let chosen   = 'red'; // 'red' | 'black'
let spinning = false;

let totalSpins = 0;
let totalWins  = 0;
let totalLosses = 0;
let profit     = 0;
let bigWin     = 0;
let streak     = 0;
let streakType = null; // 'win' | 'lose'

// ═══════════════════════════════════
//  ROULETTE TRACK SETUP
// ═══════════════════════════════════
const CELL_W    = 72;
const TRACK_LEN = 60; // cells to generate

const track = document.getElementById('rouletteTrack');

function buildTrack() {
  track.innerHTML = '';
  for (let i = 0; i < TRACK_LEN; i++) {
    const cell = document.createElement('div');
    const isRed = i % 2 === 0;
    cell.className = `roulette-cell ${isRed ? 'red' : 'black'}`;
    cell.textContent = isRed ? 'R' : 'B';
    track.appendChild(cell);
  }
}
buildTrack();

// Center track initially
const trackWrapW = document.querySelector('.roulette-track-wrap').offsetWidth;
track.style.transform = `translateX(${trackWrapW / 2 - CELL_W / 2}px)`;

// ═══════════════════════════════════
//  PICK SIDE
// ═══════════════════════════════════
function pickSide(side) {
  if (spinning) return;
  chosen = side;
  document.getElementById('pickRed').classList.toggle('active', side === 'red');
  document.getElementById('pickBlack').classList.toggle('active', side === 'black');
}

// ═══════════════════════════════════
//  BET CONTROLS
// ═══════════════════════════════════
function adjustBet(delta) {
  bet = Math.max(0.01, Math.min(+(bet + delta).toFixed(2), balance));
  updateBetDisplay();
}

function setBet(val) {
  bet = Math.max(0.01, Math.min(+val.toFixed(2), balance));
  updateBetDisplay();
}

function updateBetDisplay() {
  document.getElementById('betDisplay').textContent = `${bet.toFixed(2)} €`;
  document.getElementById('betMid').textContent     = `${bet.toFixed(2)} €`;
}

// ═══════════════════════════════════
//  SPIN
// ═══════════════════════════════════
function spin() {
  if (spinning) return;
  if (balance < bet) {
    showResult('lose', '❌ Nepietiek līdzekļu!');
    return;
  }

  spinning = true;
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('resultArea').innerHTML = `<div class="result-idle">Griežas...</div>`;

  // Determine outcome — true 50/50
  const outcome = Math.random() < 0.5 ? 'red' : 'black';
  const won     = outcome === chosen;

  // Build a fresh randomized track ending on outcome
  buildAnimTrack(outcome, () => {
    // Settle
    spinning = false;
    document.getElementById('spinBtn').disabled = false;
    resolveOutcome(won, outcome);
  });
}

function buildAnimTrack(outcome, cb) {
  // Generate 80 random cells, last visible cell = outcome
  const cells = [];
  for (let i = 0; i < 80; i++) {
    cells.push(Math.random() < 0.5 ? 'red' : 'black');
  }
  // Force the center cell (index 40) to be outcome
  cells[40] = outcome;

  track.innerHTML = '';
  cells.forEach(c => {
    const cell = document.createElement('div');
    cell.className = `roulette-cell ${c}`;
    cell.textContent = c === 'red' ? 'R' : 'B';
    track.appendChild(cell);
  });

  const wrapW    = document.querySelector('.roulette-track-wrap').offsetWidth;
  const startX   = wrapW / 2 - CELL_W / 2;      // show cell 0 at center
  const targetX  = wrapW / 2 - 40 * CELL_W - CELL_W / 2; // cell 40 at center

  // Start position
  track.style.transition = 'none';
  track.style.transform  = `translateX(${startX}px)`;

  // Force reflow
  track.getBoundingClientRect();

  // Animate
  const duration = 3200;
  track.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.85, 0.35, 1)`;
  track.style.transform  = `translateX(${targetX}px)`;

  setTimeout(cb, duration + 80);
}

// ═══════════════════════════════════
//  RESOLVE
// ═══════════════════════════════════
function resolveOutcome(won, outcome) {
  totalSpins++;

  if (won) {
    const gain = +bet.toFixed(2);
    balance    = +(balance + gain).toFixed(2);
    profit     = +(profit + gain).toFixed(2);
    totalWins++;
    if (gain > bigWin) bigWin = gain;

    if (streakType === 'win') streak++;
    else { streakType = 'win'; streak = 1; }

    showResult('win', `🟢 UZVARA! +${gain.toFixed(2)} €`);
    addHistory('win', outcome, gain);
  } else {
    balance  = Math.max(0, +(balance - bet).toFixed(2));
    profit   = +(profit - bet).toFixed(2);
    totalLosses++;

    if (streakType === 'lose') streak++;
    else { streakType = 'lose'; streak = 1; }

    showResult('lose', `🔴 ZAUDĒTS! −${bet.toFixed(2)} €`);
    addHistory('lose', outcome, -bet);
  }

  updateUI();

  // Big win overlay
  if (won && bet >= 5) {
    setTimeout(() => showOverlay(true, bet), 400);
  }
  // Broke overlay
  if (balance <= 0) {
    setTimeout(() => showOverlay(false, 0), 600);
  }
}

// ═══════════════════════════════════
//  UI UPDATES
// ═══════════════════════════════════
function showResult(type, msg) {
  document.getElementById('resultArea').innerHTML =
    `<div class="result-${type === 'win' ? 'win' : 'lose'}">${msg}</div>`;
}

function updateUI() {
  document.getElementById('balanceDisplay').textContent = `${balance.toFixed(2)} €`;

  const profitEl = document.getElementById('profitDisplay');
  profitEl.textContent = `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} €`;
  profitEl.className = 'bal-val ' + (profit >= 0 ? 'pos' : 'neg');

  document.getElementById('statSpins').textContent   = totalSpins;
  document.getElementById('statWins').textContent    = totalWins;
  document.getElementById('statLosses').textContent  = totalLosses;
  document.getElementById('statWinrate').textContent =
    totalSpins > 0 ? Math.round(totalWins / totalSpins * 100) + '%' : '0%';
  document.getElementById('statBigwin').textContent  = bigWin.toFixed(2) + '€';

  const streakEl = document.getElementById('statStreak');
  if (streak > 0) {
    streakEl.textContent = (streakType === 'win' ? '🟢' : '🔴') + ' ' + streak;
    streakEl.className   = 'stat-val ' + (streakType === 'win' ? 'green' : 'red');
  } else {
    streakEl.textContent = '—';
    streakEl.className   = 'stat-val';
  }

  // Cap bet to balance
  if (bet > balance) setBet(balance);
}

function addHistory(result, outcome, change) {
  // Dot
  const dot = document.createElement('div');
  dot.className = `hdot ${result}`;
  const dots = document.getElementById('historyDots');
  dots.appendChild(dot);
  if (dots.children.length > 40) dots.removeChild(dots.firstChild);

  // List item
  const list  = document.getElementById('historyList');
  const empty = list.querySelector('.history-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = `history-item ${result}-item`;
  item.innerHTML = `
    <div class="history-left">
      ${result === 'win' ? '✅' : '❌'}
      ${outcome === 'red' ? '🔴 Sarkans' : '⚫ Melns'}
      · likme ${bet.toFixed(2)}€
    </div>
    <div class="history-right ${result}">
      ${change >= 0 ? '+' : ''}${change.toFixed(2)} €
    </div>
  `;
  list.insertBefore(item, list.firstChild);
  while (list.children.length > 30) list.removeChild(list.lastChild);
}

// ═══════════════════════════════════
//  OVERLAY
// ═══════════════════════════════════
function showOverlay(win, amount) {
  document.getElementById('overlayEmoji').textContent = win ? '🏆' : '💸';
  document.getElementById('overlayTitle').textContent = win ? 'UZVARA!' : 'BANKROTS!';
  document.getElementById('overlaySub').textContent   = win
    ? `Tu laimēji ${amount.toFixed(2)} € vienā spinā!`
    : 'Bilance = 0. Sāc no jauna!';
  document.getElementById('overlay').classList.add('show');
}

function closeOverlay() {
  document.getElementById('overlay').classList.remove('show');
  if (balance <= 0) {
    balance = 20.00;
    profit  = 0;
    totalSpins = totalWins = totalLosses = streak = 0;
    streakType = null; bigWin = 0;
    setBet(0.50);
    updateUI();
    document.getElementById('historyList').innerHTML = '<div class="history-empty">Vēl nav neviena spina</div>';
    document.getElementById('historyDots').innerHTML = '';
    document.getElementById('resultArea').innerHTML  = '<div class="result-idle">Izvēlies krāsu un spiedi GRIEZT</div>';
  }
}

// ═══════════════════════════════════
//  INIT
// ═══════════════════════════════════
updateBetDisplay();
updateUI();