const wheel = document.getElementById("wheel");
const ctx = wheel.getContext("2d");

const balanceEl = document.getElementById("balance");
const betEl = document.getElementById("bet");
const resultEl = document.getElementById("result");
const jokeBox = document.getElementById("joke-box");

let balance = 1;
let bet = 0.01;

const jokesLose = [

  "Tu zaudēji. Tagad ūdens ar maizi vakariņās",
  "Kazino īpašnieks tiko pasūtīja Ferrari",
  "Tavs maks aizgāja depresijā",
  "Tagad meklēsi monētas zem dīvāna",
  "Bankas konts: critical damage",
  "Tu sponsorē kazino elektrību",
  "Tagad gulēsi pie Rimi taromāta",
  "Tavs IBAN šobrīd raud",
  "Kebaba vietā būs roltons",
  "Šitais spins bija finanšu pašnāvība",

];

const jokesWin = [

  "OHO bagātais ieradies",
  "Tagad vari atļauties ķiploku mērci",
  "Kazino darbinieki sāk nervozēt",
  "Volstrītas vilks detected",
  "Miljonārs loading...",
  "Tu tiko aplaupīji kazino",
  "Tagad vari flexot Discordā",
  "Ferrari vēl nav, bet kebabs sanāk",

];

const sectors = [

  { text:"0x",   multi:0,    color:"#c0392b" },
  { text:"0.2x", multi:0.2,  color:"#96281B" },
  { text:"0.5x", multi:0.5,  color:"#d35400" },

  { text:"1x",   multi:1,    color:"#2980b9" },
  { text:"1.2x", multi:1.2,  color:"#3498db" },
  { text:"1.5x", multi:1.5,  color:"#16a085" },

  { text:"2x",   multi:2,    color:"#27ae60" },
  { text:"3x",   multi:3,    color:"#8e44ad" },
  { text:"5x",   multi:5,    color:"#f39c12" },

  { text:"10x",  multi:10,   color:"#FF3D3D" },

];

let rotation = 0;
let spinning = false;

// ================= DRAW =================

function drawWheel(rot = 0){

  const size = wheel.width;

  const center = size / 2;

  const radius = size / 2 - 10;

  ctx.clearRect(0,0,size,size);

  const angle =
    (Math.PI * 2) / sectors.length;

  sectors.forEach((s,i)=>{

    const start =
      i * angle + rot;

    const end =
      start + angle;

    ctx.beginPath();

    ctx.moveTo(center,center);

    ctx.arc(
      center,
      center,
      radius,
      start,
      end
    );

    ctx.fillStyle =
      s.color;

    ctx.fill();

    ctx.save();

    ctx.translate(center,center);

    ctx.rotate(start + angle / 2);

    ctx.fillStyle = "white";

    ctx.font = "bold 24px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
      s.text,
      radius * 0.68,
      10
    );

    ctx.restore();
  });
}

drawWheel();

// ================= UI =================

function updateUI(){

  balanceEl.textContent =
    balance.toFixed(2) + " €";

  betEl.textContent =
    bet.toFixed(2) + " €";
}

// ================= BET =================

document.getElementById("plus").onclick = ()=>{

  bet += 0.01;

  bet =
    Number(bet.toFixed(2));

  updateUI();
};

document.getElementById("minus").onclick = ()=>{

  if(bet > 0.01){

    bet -= 0.01;
  }

  bet =
    Number(bet.toFixed(2));

  updateUI();
};

document.querySelectorAll(".quick-btn").forEach(btn=>{

  btn.onclick = ()=>{

    const add =
      Number(btn.dataset.add);

    bet += add;

    bet =
      Number(bet.toFixed(2));

    updateUI();
  };
});

// ================= BALANCE =================

document.getElementById("set-balance").onclick = ()=>{

  const value =
    Number(
      document.getElementById("custom-balance").value
    );

  if(!isNaN(value) && value >= 0){

    balance = value;

    updateUI();
  }
};

// ================= SPIN =================

document.getElementById("spin").onclick = ()=>{

  if(spinning) return;

  if(balance < bet){

    resultEl.textContent =
      "Nav pietiekami €";

    return;
  }

  spinning = true;

  balance -= bet;

  updateUI();

  // ===== RNG =====

  const random =
    Math.random();

  let randomIndex;

  if(random < 0.30){

    randomIndex = 0;

  }else if(random < 0.45){

    randomIndex = 1;

  }else if(random < 0.60){

    randomIndex = 2;

  }else if(random < 0.80){

    randomIndex = 3;

  }else if(random < 0.90){

    randomIndex = 4;

  }else if(random < 0.96){

    randomIndex = 5;

  }else if(random < 0.985){

    randomIndex = 6;

  }else if(random < 0.995){

    randomIndex = 7;

  }else if(random < 0.999){

    randomIndex = 8;

  }else{

    randomIndex = 9;
  }

  const selected =
    sectors[randomIndex];

  const slice =
    360 / sectors.length;

  // ===== PERFECT TARGET =====

  const targetAngle =

    (randomIndex * slice)

    +

    (slice / 2);

  const spins =
    360 * (6 + Math.random() * 3);

  const finalRotation =

    spins

    +

    (270 - targetAngle);

  const start =
    rotation;

  const end =
    rotation + finalRotation;

  const duration =
    4000 + Math.random() * 1500;

  const startTime =
    performance.now();

  // ===== ANIMATION =====

  function animate(now){

    const t =
      Math.min(
        (now - startTime) / duration,
        1
      );

    const ease =
      1 - Math.pow(1 - t,4);

    rotation =
      start + (end - start) * ease;

    drawWheel(
      (-rotation) * Math.PI / 180
    );

    // kazino vibration
    const click =
      Math.floor(rotation / 12);

    if(click !== window.lastClick){

      window.lastClick = click;

      wheel.style.transform =
        `translateY(${Math.random()*2}px)`;
    }

    if(t < 1){

      requestAnimationFrame(animate);

    }else{

      wheel.style.transform =
        "translateY(0px)";

      // ===== WIN =====

      const win =
        bet * selected.multi;

      balance += win;

      balance =
        Number(balance.toFixed(2));

      updateUI();

      resultEl.textContent =

        `Tu uzgriezi ${selected.text}
         un laimēji ${win.toFixed(2)} €`;

      // ===== JOKES =====

      if(selected.multi <= 0.5){

        jokeBox.textContent =

          jokesLose[
            Math.floor(
              Math.random() * jokesLose.length
            )
          ];

      }else{

        jokeBox.textContent =

          jokesWin[
            Math.floor(
              Math.random() * jokesWin.length
            )
          ];
      }

      spinning = false;
    }
  }

  requestAnimationFrame(animate);
};

updateUI();