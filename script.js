// ═══════════════════════════════════════════════════════════
//  SPIN & WIN — 1. LĪMENIS
//  Mērķis: no 20€ sasniegt 100€
//  Precīza ritenia loģika: winIdx izvēlēts pirms animācijas,
//  rezultāts nāk TIKAI no winIdx — nekad no leņķa.
// ═══════════════════════════════════════════════════════════

const canvas  = document.getElementById('wheel');
const ctx     = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const cx = W / 2, cy = H / 2;
const R  = W / 2 - 6;

// ── SEKTORI ──────────────────────────────────────────────
const SECTORS = [
  { text: "0x",   multi: 0,    fill: "#c0392b", tc: "#ffaaaa" },
  { text: "0.2x", multi: 0.2,  fill: "#7b241c", tc: "#ffbbbb" },
  { text: "0.5x", multi: 0.5,  fill: "#d35400", tc: "#ffd5aa" },
  { text: "1x",   multi: 1,    fill: "#1a5276", tc: "#aaddff" },
  { text: "1.2x", multi: 1.2,  fill: "#1f618d", tc: "#bbdeff" },
  { text: "1.5x", multi: 1.5,  fill: "#117a65", tc: "#aaffd5" },
  { text: "2x",   multi: 2,    fill: "#1e8449", tc: "#aaffcc" },
  { text: "3x",   multi: 3,    fill: "#6c3483", tc: "#ddaaff" },
  { text: "5x",   multi: 5,    fill: "#9a7d0a", tc: "#ffeeaa" },
  { text: "10x",  multi: 10,   fill: "#922b21", tc: "#ff6666" },
];

// Svērtās varbūtības — summa = 1.0
const WEIGHTS = [0.30, 0.15, 0.15, 0.20, 0.10, 0.06, 0.025, 0.010, 0.004, 0.001];

const N     = SECTORS.length;
const TAU   = Math.PI * 2;
const SLICE = TAU / N;
const TOP   = -Math.PI / 2; // rādītājs augšā

// ── STĀVOKLIS ────────────────────────────────────────────
const GOAL      = 100;
const START_BAL = 20;
const MIN_BET   = 0.01;
const BET_STEP  = 0.01;

let balance      = START_BAL;
let bet          = 0.01;
let spinning     = false;
let currentAngle = 0;
let totalSpins   = 0;

// ── JOKI ─────────────────────────────────────────────────
const JOKES_LOSE = [
  "Tu zaudēji. Tagad ūdens ar maizi vakariņās 🍞",
  "Kazino īpašnieks tiko pasūtīja Ferrari 🏎",
  "Tavs maks aizgāja depresijā 😢",
  "Tagad meklēsi monētas zem dīvāna 🛋",
  "Bankas konts: critical damage 💀",
  "Tu sponsorē kazino elektrību ⚡",
  "Kebaba vietā būs roltons 🍜",
  "Šitais spins bija finanšu pašnāvība 📉",
  "Tavs IBAN šobrīd raud 😭",
  "Ekonomika kritās, tu arī 📉",
];
const JOKES_WIN = [
  "OHO bagātais ieradies 🤑",
  "Tagad vari atļauties ķiploku mērci 🧄",
  "Kazino darbinieki sāk nervozēt 😰",
  "Miljonārs loading... 💸",
  "Tu tiko aplaupīji kazino 🏦",
  "Ferrari vēl nav, bet kebabs sanāk 🌯",
  "Tagad vari flexot Discordā 😎",
  "Volstrītas vilks detected 🐺",
  "Sigma grind pays off 💪",
];

function randJoke(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── DOM ELEMENTI ─────────────────────────────────────────
const balEl      = document.getElementById('balance');
const betDispEl  = document.getElementById('bet-disp');
const betMidEl   = document.getElementById('bet-mid');
const resultEl   = document.getElementById('result');
const jokeEl     = document.getElementById('joke');
const progFill   = document.getElementById('prog-fill');
const progText   = document.getElementById('prog-text');
const spinBtn    = document.getElementById('spin');
const winOverlay = document.getElementById('win-overlay');
const winSubText = document.getElementById('win-sub-text');

// ── UI UPDATE ─────────────────────────────────────────────
function updateUI() {
  balEl.textContent     = balance.toFixed(2) + ' €';
  betDispEl.textContent = bet.toFixed(2) + ' €';
  betMidEl.textContent  = bet.toFixed(2) + ' €';

  const pct = Math.min((balance / GOAL) * 100, 100);
  progFill.style.width = pct + '%';
  progText.textContent = balance.toFixed(2) + '€ / ' + GOAL + '€';
}
updateUI();

// ── BET CONTROLS ─────────────────────────────────────────
document.getElementById('plus').onclick = () => {
  bet = +(bet + BET_STEP).toFixed(2);
  updateUI();
};

document.getElementById('minus').onclick = () => {
  if (bet > MIN_BET) {
    bet = Math.max(MIN_BET, +(bet - BET_STEP).toFixed(2));
    updateUI();
  }
};

document.querySelectorAll('.qbtn').forEach(b => {
  b.onclick = () => {
    bet = +(bet + +b.dataset.add).toFixed(2);
    updateUI();
  };
});

document.getElementById('reset-btn').onclick = resetGame;
document.getElementById('win-close').onclick  = resetGame;

function resetGame() {
  balance      = START_BAL;
  bet          = MIN_BET;
  spinning     = false;
  currentAngle = 0;
  totalSpins   = 0;
  spinBtn.disabled     = false;
  winOverlay.classList.remove('show');
  resultEl.textContent = 'Spiedi GRIEZT!';
  resultEl.style.color = '#ff9900';
  jokeEl.textContent   = '';
  draw(currentAngle);
  updateUI();
}

// ── RNG ───────────────────────────────────────────────────
function weightedRandom() {
  let r = Math.random();
  for (let i = 0; i < WEIGHTS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return i;
  }
  return N - 1;
}

// ── DRAW ──────────────────────────────────────────────────
function draw(angle) {
  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < N; i++) {
    const { text, fill, tc } = SECTORS[i];
    const a0   = angle + i * SLICE;
    const a1   = a0 + SLICE;
    const aMid = a0 + SLICE / 2;

    // Sektors
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // Šūnas robeža
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Dalītājs no centra
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Teksts
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(aMid);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 4;
    ctx.fillStyle    = tc;
    ctx.font         = `bold ${text.length > 2 ? 11 : 13}px 'Rajdhani', sans-serif`;
    ctx.fillText(text, R * 0.65, 0);
    ctx.restore();
  }

  // Ārējais gredzens
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Centrālā poga
  const g = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 14);
  g.addColorStop(0, '#555');
  g.addColorStop(1, '#111');
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
}

draw(currentAngle);

// ── SPIN ──────────────────────────────────────────────────
spinBtn.onclick = () => {
  if (spinning) return;

  if (bet <= 0) {
    resultEl.style.color = '#ff3333';
    resultEl.textContent = '❌ Likme nevar būt 0!';
    return;
  }

  if (balance < bet) {
    resultEl.style.color = '#ff3333';
    resultEl.textContent = '❌ Nav pietiekami naudas!';
    jokeEl.textContent   = 'Taupīgais investors detected 📊';
    return;
  }

  spinning = true;
  spinBtn.disabled     = true;
  resultEl.style.color = '#ff9900';
  resultEl.textContent = '🎰 ...';
  jokeEl.textContent   = '';

  balance = +(balance - bet).toFixed(2);
  totalSpins++;
  updateUI();

  // ── SOLIS 1: Uzvarētājs PIRMS animācijas ─────
  const winIdx = weightedRandom();
  const winner = SECTORS[winIdx];

  // ── SOLIS 2: Mērķa leņķis (modulārs 0..TAU) ─
  // draw(angle): sektors i = [angle + i*SLICE, angle + (i+1)*SLICE]
  // Lai sektors winIdx centrs būtu pie TOP:
  //   angle + winIdx*SLICE + SLICE/2 ≡ TOP (mod TAU)
  //   angle = TOP - winIdx*SLICE - SLICE/2
  const targetMod = ((TOP - winIdx * SLICE - SLICE / 2) % TAU + TAU) % TAU;

  // ── SOLIS 3: Delta no pašreizējās pozīcijas ──
  const curMod = ((currentAngle % TAU) + TAU) % TAU;
  let delta    = targetMod - curMod;
  if (delta < 0)    delta += TAU;
  if (delta < 0.15) delta += TAU;

  // ── SOLIS 4: Absolūtais endAngle ─────────────
  const extraSpins = (6 + Math.floor(Math.random() * 5)) * TAU;
  const endAngle   = currentAngle + extraSpins + delta;

  // ── SOLIS 5: Animācija ────────────────────────
  const DURATION = 4200 + Math.random() * 1200;
  const t0       = performance.now();
  const startA   = currentAngle;
  let   lastSec  = -1;

  function frame(now) {
    const t    = Math.min((now - t0) / DURATION, 1);
    const ease = 1 - Math.pow(1 - t, 5);
    const ang  = startA + (endAngle - startA) * ease;

    draw(ang);

    const sec = Math.floor(((ang % TAU) + TAU) % TAU / SLICE);
    if (sec !== lastSec) {
      lastSec = sec;
      canvas.style.transform = `scale(${1 + Math.random() * 0.004})`;
    }

    if (t < 1) { requestAnimationFrame(frame); return; }

    // ── BEIGAS ────────────────────────────────
    canvas.style.transform = '';
    currentAngle = endAngle; // absolūts — nepārveido mod TAU!
    draw(currentAngle);

    // Rezultāts TIEŠI no winIdx
    const win = +(bet * winner.multi).toFixed(2);
    balance   = +(balance + win).toFixed(2);
    updateUI();

    if (winner.multi === 0) {
      resultEl.style.color = '#ff4444';
      resultEl.textContent = `Zaudēji ${winner.text} — −${bet.toFixed(2)} €`;
      jokeEl.textContent   = randJoke(JOKES_LOSE);
    } else if (winner.multi >= 2) {
      resultEl.style.color = '#00e5a0';
      resultEl.textContent = `🏆 ${winner.text} — +${win.toFixed(2)} €!`;
      jokeEl.textContent   = randJoke(JOKES_WIN);
    } else {
      resultEl.style.color = '#ff9900';
      resultEl.textContent = `${winner.text} — laimēji ${win.toFixed(2)} €`;
      jokeEl.textContent   = winner.multi <= 0.5
        ? randJoke(JOKES_LOSE)
        : randJoke(JOKES_WIN);
    }

    // Līmenis izpildīts?
    if (balance >= GOAL) {
      setTimeout(() => {
        winSubText.textContent =
          `Tu sasniedzi ${balance.toFixed(2)}€ ${totalSpins} spinos! Absolūts sigma! 💪`;
        winOverlay.classList.add('show');
      }, 600);
      spinning = false;
      return;
    }

    // Beidzies nauda?
    if (balance < MIN_BET) {
      resultEl.style.color = '#ff3333';
      jokeEl.textContent   = 'Maks tukšs. Ej mājās. 💸';
      spinBtn.disabled     = true;
      spinning             = false;
      return;
    }

    spinning         = false;
    spinBtn.disabled = false;
  }

  requestAnimationFrame(frame);
};