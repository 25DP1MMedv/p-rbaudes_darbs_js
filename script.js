// ============================================================
// SPIN & WIN — vienkāršs multiplieris kazino
// Iemaksa: 1.00 €  |  Likme: 0.10–1.00 €  |  Max laim: 1.00 €
// ============================================================

// ── Konstantes ──────────────────────────────────────────────

const MAX_BALANCE  = 1.00;  // sākuma bilance
const MAX_WIN_CAP  = 1.00;  // maksimālais kopējais laimests
const BET_STEP     = 0.10;
const BET_MIN      = 0.10;

// Rulete: sektori  [multipieris, varbūtībe (svars), krāsa]
const SECTORS = [
  { label: '×0',   multi: 0,   weight: 20, color: '#c0392b' },
  { label: '×0.5', multi: 0.5, weight: 15, color: '#e67e22' },
  { label: '×1',   multi: 1,   weight: 25, color: '#2980b9' },
  { label: '×1.5', multi: 1.5, weight: 15, color: '#8e44ad' },
  { label: '×2',   multi: 2,   weight: 12, color: '#27ae60' },
  { label: '×3',   multi: 3,   weight: 7,  color: '#16a085' },
  { label: '×5',   multi: 5,   weight: 4,  color: '#f39c12' },
  { label: '×10',  multi: 10,  weight: 2,  color: '#e8c84a' },
];

const TOTAL_WEIGHT = SECTORS.reduce((s, x) => s + x.weight, 0);

// ── Stāvoklis ───────────────────────────────────────────────

let balance    = MAX_BALANCE;
let bet        = 0.10;
let totalWon   = 0;        // kopā laimēts šajā sesijā
let spinning   = false;
let currentRot = 0;        // pašreizējā riteņa rotācija (grādi)
let history    = [];

// ── DOM ─────────────────────────────────────────────────────

const elBalance    = document.getElementById('balance');
const elBetDisplay = document.getElementById('bet-display');
const elWinBar     = document.getElementById('win-bar');
const elWinBarVal  = document.getElementById('win-bar-val');
const elWheelMulti = document.getElementById('wheel-multi');
const elResultMsg  = document.getElementById('result-msg');
const elHistList   = document.getElementById('history-list');
const elSpinBtn    = document.getElementById('spin-btn');
const canvas       = document.getElementById('wheel-canvas');
const ctx          = canvas.getContext('2d');

// ── Riteņa zīmēšana ─────────────────────────────────────────

function drawWheel(rotationDeg) {
  const W = canvas.width;
  const cx = W / 2, cy = W / 2, r = W / 2 - 4;
  ctx.clearRect(0, 0, W, W);

  let startAngle = (rotationDeg - 90) * Math.PI / 180; // -90 lai sāktu no augšas

  SECTORS.forEach(sec => {
    const slice = (sec.weight / TOTAL_WEIGHT) * 2 * Math.PI;
    const endAngle = startAngle + slice;

    // Sektors
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = sec.color;
    ctx.fill();
    ctx.strokeStyle = '#0f0f13';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Teksts
    const midAngle = startAngle + slice / 2;
    const tx = cx + (r * 0.65) * Math.cos(midAngle);
    const ty = cy + (r * 0.65) * Math.sin(midAngle);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midAngle + Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(14, r * 0.12)}px "DM Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sec.label, 0, 0);
    ctx.restore();

    startAngle = endAngle;
  });

  // Centrālais aplis
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.28, 0, 2 * Math.PI);
  ctx.fillStyle = '#0f0f13';
  ctx.fill();
  ctx.strokeStyle = '#2e2e3e';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ── Nejaušs sektors pēc svara ───────────────────────────────

function pickSector() {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const sec of SECTORS) {
    rand -= sec.weight;
    if (rand <= 0) return sec;
  }
  return SECTORS[SECTORS.length - 1];
}

// ── Aprēķina sektora centru rotācijā grādos ─────────────────

function sectorCenterDeg(sectorIndex) {
  let passed = 0;
  for (let i = 0; i < sectorIndex; i++) {
    passed += (SECTORS[i].weight / TOTAL_WEIGHT) * 360;
  }
  const sliceDeg = (SECTORS[sectorIndex].weight / TOTAL_WEIGHT) * 360;
  return passed + sliceDeg / 2;
}

// ── UI atjaunināšana ─────────────────────────────────────────

function updateUI() {
  elBalance.textContent = balance.toFixed(2) + ' €';
  elBetDisplay.textContent = bet.toFixed(2) + ' €';

  const capPct = Math.min(totalWon / MAX_WIN_CAP, 1) * 100;
  elWinBar.style.width = capPct + '%';
  elWinBarVal.textContent = totalWon.toFixed(2) + ' € laimēts';

  // Likme nevar pārsniegt bilanci
  if (bet > balance) bet = Math.max(BET_MIN, Math.floor(balance / BET_STEP) * BET_STEP);
  elBetDisplay.textContent = bet.toFixed(2) + ' €';

  // Atspējo pogu ja nav naudas vai sasniegts limits
  const cantPlay = balance < BET_MIN || totalWon >= MAX_WIN_CAP;
  elSpinBtn.disabled = cantPlay || spinning;
}

// ── Vēstures pievienošana ────────────────────────────────────

function addHistory(betAmt, multi, result) {
  const row = document.createElement('div');
  row.className = 'history-row';
  const sign   = result >= 0 ? '+' : '';
  const cls    = result >= 0 ? 'h-win' : 'h-lose';
  row.innerHTML = `
    <span class="h-bet">Likme: ${betAmt.toFixed(2)} €</span>
    <span class="h-multi">${multi.label}</span>
    <span class="${cls}">${sign}${result.toFixed(2)} €</span>
  `;
  // Noņem "vēl nav" tekstu
  const empty = elHistList.querySelector('.history-empty');
  if (empty) empty.remove();

  elHistList.prepend(row);
  if (elHistList.children.length > 10) elHistList.lastChild.remove();
}

// ── Galvenā griezšanas funkcija ──────────────────────────────

function spin() {
  if (spinning || balance < BET_MIN) return;

  spinning = true;
  elSpinBtn.disabled = true;
  elResultMsg.className = 'result-msg';
  elResultMsg.textContent = 'Griežas...';
  elWheelMulti.className = 'wheel-multi';
  elWheelMulti.textContent = '?';

  // Atņem likmi uzreiz
  balance -= bet;
  balance = +balance.toFixed(2);
  elBalance.classList.remove('up', 'down');
  elBalance.classList.add('down');
  updateUI();

  // Izvēlas sektoru
  const chosen = pickSector();
  const chosenIdx = SECTORS.indexOf(chosen);

  // Aprēķina galīgo rotāciju tā, lai izvēlētais sektors būtu augšā (0°)
  const sectorCenter = sectorCenterDeg(chosenIdx); // grādi no sākuma
  const spins = 5 + Math.floor(Math.random() * 4);       // 5–8 pilni apgriezieni
  const targetRot = currentRot + spins * 360 + (360 - sectorCenter);

  const spinDuration = 2500; // ms
  const startTime = performance.now();
  const startRot  = currentRot;

  // Animācija ar requestAnimationFrame
  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / spinDuration, 1);
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - t, 4);
    const rot  = startRot + (targetRot - startRot) * ease;

    drawWheel(rot);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      currentRot = targetRot % 360;
      drawWheel(currentRot);
      finishSpin(chosen, bet);
    }
  }
  requestAnimationFrame(animate);
}

// ── Pēc griezšanas ──────────────────────────────────────────

function finishSpin(sector, betAmt) {
  const rawWin = +(betAmt * sector.multi).toFixed(2);

  // Ierobežo ar atlikušo vietu līdz MAX_WIN_CAP
  const room   = +(MAX_WIN_CAP - totalWon).toFixed(2);
  const actualWin = Math.min(rawWin, room);

  balance    = +(balance + actualWin).toFixed(2);
  totalWon   = +(totalWon + actualWin).toFixed(2);

  const profit = +(actualWin - betAmt).toFixed(2);

  // Parāda rezultātu
  elWheelMulti.textContent = sector.label;

  if (sector.multi === 0) {
    elWheelMulti.classList.add('lose');
    elResultMsg.classList.add('lose');
    elResultMsg.textContent = `×0 — zaudēts ${betAmt.toFixed(2)} €`;
    elBalance.classList.add('down');
  } else if (profit > 0) {
    elWheelMulti.classList.add('win');
    elResultMsg.classList.add('win');
    elResultMsg.textContent = `${sector.label} → laimēts ${actualWin.toFixed(2)} € (+${profit.toFixed(2)} €)`;
    elBalance.classList.add('up');
  } else {
    elResultMsg.textContent = `${sector.label} → atpakaļ ${actualWin.toFixed(2)} €`;
    elBalance.classList.remove('up', 'down');
  }

  addHistory(betAmt, sector, profit);

  // Ja sasniegts limits
  if (totalWon >= MAX_WIN_CAP) {
    elResultMsg.textContent += ' — Jackpot limits sasniegts! 🎉';
    elSpinBtn.disabled = true;
  }

  updateUI();
  spinning = false;
  if (balance >= BET_MIN && totalWon < MAX_WIN_CAP) elSpinBtn.disabled = false;
}

// ── Likmes vadība ────────────────────────────────────────────

document.getElementById('btn-minus').addEventListener('click', () => {
  bet = Math.max(BET_MIN, +(bet - BET_STEP).toFixed(2));
  updateUI();
});
document.getElementById('btn-plus').addEventListener('click', () => {
  bet = Math.min(balance, +(bet + BET_STEP).toFixed(2));
  updateUI();
});

document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = parseFloat(btn.dataset.val);
    bet = Math.min(balance, v);
    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateUI();
  });
});

// ── Spin poga ────────────────────────────────────────────────

document.getElementById('spin-btn').addEventListener('click', spin);

// ── Reset ────────────────────────────────────────────────────

document.getElementById('reset-btn').addEventListener('click', () => {
  balance  = MAX_BALANCE;
  totalWon = 0;
  bet      = BET_MIN;
  history  = [];
  elHistList.innerHTML = '<div class="history-empty">Vēl nav neviena grieziena.</div>';
  elWheelMulti.className = 'wheel-multi';
  elWheelMulti.textContent = '?';
  elResultMsg.className = 'result-msg';
  elResultMsg.textContent = 'Izvēlies likmi un griezies!';
  elBalance.className = 'balance';
  currentRot = 0;
  drawWheel(0);
  updateUI();
});

// ── Init ─────────────────────────────────────────────────────

drawWheel(0);
updateUI();