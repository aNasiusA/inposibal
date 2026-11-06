"use strict";
/* ---------- world ---------- */
const SKIN = [
  ["#7a4a2b", "#a96b3f", "#d49a6a", "#5a3420"],
  ["#c68642", "#8d5524", "#e0ac69", "#6b4226"],
];
const formation = [
  [48, CY],
  [430, CY],
  [300, 190],
  [300, 510],
];
function makePlayer(team, idx) {
  const gk = idx === 0;
  return {
    team,
    idx,
    gk,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    fx: team === 0 ? 1 : -1,
    fy: 0,
    dx: 0,
    dy: 0,
    base: gk ? 19 : 17,
    scale: 1,
    r: gk ? 19 : 17,
    speed: gk ? 232 : 238,
    stun: 0,
    giant: 0,
    azonto: 0,
    magnet: 0,
    dash: 0,
    dashX: 0,
    dashY: 0,
    heavy: 0,
    cut: 0,
    cutCD: 0,
    azDX: 0,
    azDY: 0,
    azHold: 0,
    azX: 0,
    azY: 0,
    azT: 0,
    aiRel: 0,
    slide: 0,
    slideCD: 0,
    recover: 0,
    pickupLock: 0,
    tackleCD: 0,
    hitCD: 0,
    protect: 0,
    phase: Math.random() * 6,
    charge: 0,
    hold: 0,
    think: 0,
    err: 0,
    errT: 0,
    skin: SKIN[team][idx],
  };
}
function makeTeam(id) {
  const t = {
    id,
    score: 0,
    players: [],
    loadout: [],
    rocket: 0,
    morale: MOR_START,
    dr: {},
    lastUse: {},
    lock: 0,
    wind: null,
    dumsor: 0,
    sankofa: 0,
    kente: 0,
    kd: 0,
    kw: 0,
    ky: CY,
    lastPass: null,
    pw: {},
    aiTimer: 1.5,
    ctrl: null,
    human: false,
    chaser: null,
    swT: 0,
    recv: null,
    recvT: 0,
    recvArmed: false,
    recvPt: null,
    stats: { shots: 0, powers: 0, poss: 0, morale: 0, used: {} },
    color: id === 0 ? "#ffc61a" : "#e0245e",
    dark: id === 0 ? "#9a6f00" : "#7d0b31",
  };
  POWERS.forEach((p) => (t.pw[p.id] = 0));
  for (let i = 0; i < 4; i++) t.players.push(makePlayer(id, i));
  return t;
}
const teams = [makeTeam(0), makeTeam(1)],
  ALL = [...teams[0].players, ...teams[1].players];
const ball = {
  x: CX,
  y: CY,
  vx: 0,
  vy: 0,
  r: BR,
  owner: null,
  rot: 0,
  fire: 0,
  lastTeam: 0,
  shot: false,
  noEarn: false,
  kicker: null,
};
let state = "kickoff",
  stateT = 1,
  matchT = 120,
  sudden = false,
  demo = true,
  paused = false,
  timeScale = 1,
  timeScaleTarget = 1,
  shake = 0,
  lastScorer = 0,
  kickTeam = 0,
  time = 0;
let simClock = 0;
const parts = [],
  rings = [],
  later = [],
  beat = { o: null, s: new Set() };
const input = {
  mx: 0,
  my: 0,
  shootHeld: false,
  shootUp: false,
  passT: 0,
  slide: false,
  press: false,
};
// the remote player's input on the host (team 1), same shape as `input`
const rin = {
  mx: 0,
  my: 0,
  shootHeld: false,
  shootUp: false,
  passT: 0,
  slide: false,
  press: false,
};
const inputOf = (team) => (team === 0 ? input : rin);
// who is on the other end: DIFF for the CPU, plain "pro" stats for any human team
const diffOf = (team) =>
  team === 1 && !teams[1].human ? DIFF[settings.diff] : DIFF.pro;

/* ---------- fx helpers ---------- */
function burst(x, y, n, o) {
  for (let i = 0; i < n && parts.length < 800; i++) {
    const a =
        o.a !== undefined
          ? o.a + rand(-(o.spread || 0.5), o.spread || 0.5)
          : rand(0, TAU),
      s = rand(o.s0 || 40, o.s1 || 200);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0,
      max: rand(o.l0 || 0.4, o.l1 || 0.9),
      size: rand(o.z0 || 2, o.z1 || 5),
      color: Array.isArray(o.color)
        ? o.color[(Math.random() * o.color.length) | 0]
        : o.color || "#fff",
      g: o.g || 0,
      drag: o.drag || 1.5,
      kind: o.kind || "dot",
      rot: rand(0, TAU),
    });
  }
}
function ring(x, y, r0, r1, max, color) {
  rings.push({ x, y, r0, r1, life: 0, max, color });
}
function floatText(x, y, text, color) {
  if (demo || parts.length >= 800) return;
  parts.push({
    x,
    y,
    vx: 0,
    vy: -46,
    life: 0,
    max: 1.1,
    size: 15,
    color,
    g: 0,
    drag: 1,
    kind: "txt",
    text,
    rot: 0,
  });
}
const bannerEl = $("banner"),
  bigEl = $("big");
let bannerTimer = 0,
  bigTimer = 0,
  bigLabel = "";
function showBanner(text, color, ms) {
  if (demo) return;
  bannerEl.textContent = text;
  bannerEl.style.setProperty("--bc", color || "#fff");
  bannerEl.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => bannerEl.classList.remove("show"), ms || 2000);
}
function setBig(text, color, holdMs) {
  if (demo) return;
  if (bigLabel !== text) {
    bigLabel = text;
    bigEl.textContent = text;
    bigEl.style.color = color || "#fff";
    bigEl.classList.add("show");
    bigEl.classList.remove("pop");
    void bigEl.offsetWidth;
    bigEl.classList.add("pop");
  }
  clearTimeout(bigTimer);
  if (holdMs) bigTimer = setTimeout(hideBig, holdMs);
}
function hideBig() {
  bigEl.classList.remove("show");
  bigLabel = "";
  clearTimeout(bigTimer);
}

/* ---------- match flow ---------- */
function resetTeams() {
  simClock = 0;
  teams.forEach((t) => {
    t.score = 0;
    t.rocket = 0;
    t.ctrl = null;
    t.chaser = null;
    t.aiTimer = 1.5;
    t.stats = { shots: 0, powers: 0, poss: 0, morale: 0, used: {} };
    t.morale = demo ? rand(30, 80) : MOR_START;
    t.dr = {};
    t.lastUse = {};
    t.lock = 0;
    t.wind = null;
    t.dumsor = 0;
    t.sankofa = 0;
    t.kente = t.kd = t.kw = 0;
    kenteSeq = null;
    t.lastPass = null;
    t.human = !demo && (t.id === 0 || net.on);
    t.loadout =
      t.id === 0 && !demo
        ? settings.loadout.slice()
        : t.human
          ? net.oppLoadout.slice()
          : randomLoadout();
    POWERS.forEach((p) => (t.pw[p.id] = 0));
  });
}
function clearEffects() {
  teams.forEach((t) => {
    t.rocket = 0;
    t.wind = null;
    t.dumsor = 0;
    t.sankofa = 0;
    t.kente = t.kd = t.kw = 0;
    kenteSeq = null;
    t.lastPass = null;
  });
  for (const p of ALL) {
    p.giant =
      p.azonto =
      p.magnet =
      p.dash =
      p.heavy =
      p.cut =
      p.cutCD =
      p.azHold =
      p.aiRel =
        0;
  }
}
function setupKickoff(kt) {
  kickTeam = kt;
  clearEffects();
  hist.length = 0;
  for (const t of teams)
    for (const p of t.players) {
      const f = formation[p.idx],
        d = attackDir(t.id);
      p.x = t.id === 0 ? PX0 + f[0] : PX1 - f[0];
      p.y = f[1];
      p.vx = p.vy = p.dx = p.dy = 0;
      p.fx = d;
      p.fy = 0;
      p.stun =
        p.slide =
        p.recover =
        p.pickupLock =
        p.tackleCD =
        p.hitCD =
        p.protect =
        p.charge =
        p.hold =
          0;
      p.scale = 1;
      p.r = p.base;
    }
  const a = teams[kt].players[1];
  a.x = CX - attackDir(kt) * 24;
  a.y = CY;
  teams.forEach((t) => {
    t.ctrl = null;
    t.chaser = null;
    t.recv = null;
    t.recvPt = null;
  });
  ball.x = CX;
  ball.y = CY;
  ball.vx = ball.vy = 0;
  ball.owner = null;
  ball.fire = 0;
  ball.shot = false;
  ball.noEarn = false;
  parts.length = 0;
  rings.length = 0;
  later.length = 0;
  beat.o = null;
  beat.s.clear();
  for (const t of teams) if (t.human) t.ctrl = t.players[1];
  state = "kickoff";
  stateT = demo ? 0.8 : 2.3;
  timeScale = timeScaleTarget = 1;
}
