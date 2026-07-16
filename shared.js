/* ===========================================================
   Dear Papa — shared logic
   =========================================================== */

const CONFIG = {
  SUPABASE_URL: "https://iliakhaufgpjjtwamisn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaWFraGF1Zmdwamp0d2FtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTU0NTMsImV4cCI6MjA5NjQzMTQ1M30.nim8jt-cUhb3IIWjnd0FC3NF6xS_gg8RelBBJG1bIno",
  RAZORPAY_KEY: "rzp_live_SzQtvFAXjL2NL5",
  PRICE_PAISE: 4900, // ₹49 — change freely, just keep it in paise (₹1 = 100)
  PRICE_LABEL: "₹49",
  // Optional: paste a free Giphy API key (developers.giphy.com, ~2 min signup)
  // to show real gifs in the balloon pops. Leave blank to use the built-in
  // dad-joke cards instead — they work great with zero setup.
  GIPHY_API_KEY: ""
};

const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

/* ---------- typewriter + tick sound ---------- */

let audioCtx = null;
let soundOn = true;

function setSoundOn(on){
  soundOn = on;
  document.querySelectorAll("[data-mute-icon]").forEach(el => {
    el.textContent = on ? "🔊" : "🔇";
  });
}

function tick(){
  if(!soundOn) return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1600 + Math.random() * 500, t);
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }catch(e){ /* audio not available, fail silently */ }
}

/**
 * Types `text` into `el` character by character with a typewriter tick.
 * Returns a function that, if called, instantly completes the typing.
 */
function typeText(el, text, speedMs, onDone){
  el.textContent = "";
  const caret = document.createElement("span");
  caret.className = "caret";
  el.appendChild(caret);

  let i = 0;
  let finished = false;
  let timer = null;

  function step(){
    if(i >= text.length){
      finish();
      return;
    }
    const ch = text[i];
    caret.insertAdjacentText("beforebegin", ch);
    if(ch !== " " && ch !== "\n") tick();
    i++;
    const jitter = Math.random() * 16;
    const extra = ch === "\n" ? 220 : (ch === "," ? 120 : 0);
    timer = setTimeout(step, speedMs + jitter + extra);
  }

  function finish(){
    if(finished) return;
    finished = true;
    clearTimeout(timer);
    el.textContent = text;
    onDone && onDone();
  }

  step();
  return finish; // call to skip ahead
}

/* ---------- dad jokes (fallback content, no API needed) ---------- */

const DAD_JOKES = [
  "Why don't dads ever get lost? They refuse to ask for directions — even from GPS.",
  "Dad's secret BBQ ingredient: forty-five minutes of standing near the grill, doing nothing.",
  "Dad logic: the AC isn't broken, you're just not used to 31°C indoors.",
  "Dad's workout routine: carrying every grocery bag in one trip. No exceptions.",
  "Dad's favourite app is the one that finds petrol 1 rupee cheaper, 2km away.",
  "Dad's nighttime ritual: checking every door is locked. Three times. Out loud.",
  "Dad joke setting: ON. Permanently. No update available.",
  "Dad's remote control rule: he's not watching it, he's just holding it.",
  "Dad's favourite sentence: 'In my time, this cost five rupees.'",
  "Dad parallel-parks a truck better than you park a hatchback.",
  "Dad's umbrella theory: if he brings one, it won't rain. Tested. Confirmed.",
  "Dad still calls it 'the mobile' and somehow that's correct again now."
];

function randomJoke(used){
  const pool = DAD_JOKES.filter(j => !used.has(j));
  const list = pool.length ? pool : DAD_JOKES;
  const joke = list[Math.floor(Math.random() * list.length)];
  used.add(joke);
  return joke;
}

/* ---------- gif fetch (optional, used only if GIPHY_API_KEY is set) ---------- */

const GIF_QUERIES = ["funny dad", "dad joke", "dad dancing", "proud dad", "dad jokes"];

async function fetchDadGif(){
  if(!CONFIG.GIPHY_API_KEY) return null;
  try{
    const q = GIF_QUERIES[Math.floor(Math.random() * GIF_QUERIES.length)];
    const offset = Math.floor(Math.random() * 25);
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(CONFIG.GIPHY_API_KEY)}&q=${encodeURIComponent(q)}&limit=1&offset=${offset}&rating=pg`;
    const res = await fetch(url);
    if(!res.ok) return null;
    const json = await res.json();
    const item = json && json.data && json.data[0];
    return item ? item.images.downsized_medium.url : null;
  }catch(e){
    return null;
  }
}

/* ---------- balloon mini-game ---------- */

const BALLOON_COLORS = ["#C99A52", "#E2542D", "#5B6A4D", "#E4D8BE", "#7A5A3A"];

/**
 * Builds 5 balloons inside `container`. Calls onAllPopped() once every
 * balloon has been popped. Calls onPop(index) on each individual pop.
 */
function setupBalloons(container, onPop, onAllPopped){
  container.innerHTML = "";
  const used = new Set();
  let poppedCount = 0;

  for(let i = 0; i < 5; i++){
    const wrap = document.createElement("div");
    wrap.className = "balloon-wrap";
    wrap.style.animationDelay = `${(i * 0.4).toFixed(2)}s`;
    wrap.style.animationDuration = `${(2.8 + Math.random()).toFixed(2)}s`;

    const btn = document.createElement("button");
    btn.className = "balloon";
    btn.style.background = BALLOON_COLORS[i % BALLOON_COLORS.length];
    btn.style.color = BALLOON_COLORS[i % BALLOON_COLORS.length];
    btn.setAttribute("aria-label", "Pop balloon");

    const string = document.createElement("div");
    string.className = "balloon-string";

    btn.addEventListener("click", () => {
      if(btn.classList.contains("popped")) return;
      pop(btn, wrap);
    });

    wrap.appendChild(btn);
    wrap.appendChild(string);
    container.appendChild(wrap);
  }

  function pop(btn, wrap){
    btn.classList.add("popped");
    burst(btn);
    poppedCount++;
    onPop && onPop(poppedCount, used);
    if(poppedCount >= 5) onAllPopped && onAllPopped();
  }
}

function burst(originEl){
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = BALLOON_COLORS;
  for(let i = 0; i < 14; i++){
    const dot = document.createElement("div");
    dot.className = "burst";
    const angle = (Math.PI * 2 * i) / 14;
    const dist = 40 + Math.random() * 40;
    dot.style.left = `${cx}px`;
    dot.style.top = `${cy}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.setProperty("--bx", `${Math.cos(angle) * dist}px`);
    dot.style.setProperty("--by", `${Math.sin(angle) * dist}px`);
    dot.style.animation = "burstOut .5s ease-out forwards";
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 520);
  }
}

/* ---------- misc helpers ---------- */

function escapeHtml(str){
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}