"use strict";
/* ---------- online play ----------
   Host-authoritative 1v1 over a WebSocket relay (server/). The host runs the normal sim
   with the guest as team 1. The guest runs no sim: it sends its input and renders the
   host's snapshots MIRRORED (x flipped, teams swapped) so on the guest's screen the guest
   is always team 0, yellow, attacking to the right, and the HUD/input code is unchanged. */
// Fill in after `wrangler deploy` (the workers.dev URL printed by the deploy)
const RELAY_PROD = "wss://relay.anasiusa.dev";
const RELAY = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? "ws://localhost:8787"
  : RELAY_PROD;
const SNAP_MS = 33,
  IN_MS = 16,
  INTERP_MS = 80,
  MX = PX0 + PX1; // mirror axis: x' = MX - x
// player fields that travel in a snapshot; the *_NEG ones flip sign when mirrored
const PF = [
  "x", "y", "vx", "vy", "fx", "fy", "stun", "giant", "azonto", "magnet",
  "dash", "dashX", "dashY", "heavy", "cut", "slide", "recover", "charge",
  "phase", "scale", "protect", "hold",
];
const PF_NEG = new Set(["vx", "fx", "dashX"]);
const r2 = (v) => Math.round(v * 100) / 100;
const EV = [];
const snapBuf = [];
const rematch = { me: false, opp: false };
let snapTimer = 0,
  inTimer = 0,
  pingTimer = 0;
const pred = { who: null, x: 0, y: 0 }; // guest-side prediction for the player you control
net.rtt = 0;

/* ----- connection ----- */
function netSend(o) {
  if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(o));
}
function netConnect(path, onmsg) {
  netClose();
  let ws;
  try {
    ws = new WebSocket(RELAY + path);
  } catch (e) {
    olView("Can't reach the server", "Online play isn't available right now.", "", true);
    return null;
  }
  net.ws = ws;
  ws.onmessage = (e) => {
    let m;
    try {
      m = JSON.parse(e.data);
    } catch (_) {
      return;
    }
    if (net.ws === ws) onmsg(m);
  };
  ws.onclose = () => {
    if (net.ws === ws) {
      net.ws = null;
      onNetClosed();
    }
  };
  ws.onerror = () => {};
  return ws;
}
function netClose() {
  const w = net.ws;
  net.ws = null;
  if (w)
    try {
      w.close();
    } catch (e) {}
}
function netLeave() {
  netClose();
  clearInterval(snapTimer);
  clearInterval(inTimer);
  clearInterval(pingTimer);
  $("pingEl").textContent = "";
  net.rtt = 0;
  net.on = net.host = net.guest = false;
  net.role = null;
  net.forfeit = false;
  net.retry = null;
  snapBuf.length = 0;
  EV.length = 0;
  rin.mx = rin.my = 0;
  rin.shootHeld = rin.shootUp = rin.slide = rin.press = false;
  rin.passT = 0;
  $("btnAgain").style.display = "";
  $("btnAgain").textContent = "Rematch";
}
function onNetClosed() {
  if (net.on) netPeerLeft();
  else if (!$("online").classList.contains("hidden"))
    olView("Disconnected", "The connection to the server dropped.", "", true);
}
function netPeerLeft() {
  if (!net.on || state === "ended") return;
  net.forfeit = true;
  $("btnAgain").style.display = "none";
  clearInterval(snapTimer);
  clearInterval(inTimer);
  endMatch();
}

/* ----- lobby UI ----- */
function olView(title, msg, code, showMain) {
  $("olTitle").textContent = title;
  $("olMsg").textContent = msg;
  $("olCode").textContent = code || "";
  $("olMain").style.display = showMain ? "" : "none";
  $("olCopy").style.display = code ? "" : "none";
}
function olOpen() {
  if (settings.loadout.length !== 3) {
    showBanner("Pick your 3 powers first", "#9b93c9", 1800);
    return;
  }
  initAudio();
  $("menu").classList.add("hidden");
  $("online").classList.remove("hidden");
  olView(
    "Play online",
    "Your 3 powers: " + settings.loadout.map((id) => PW[id].name).join(", "),
    "",
    true,
  );
}
function olBack() {
  $("online").classList.add("hidden");
  $("menu").classList.remove("hidden");
  try {
    netLeave();
  } catch (e) {
    console.error(e);
  }
}
const roomLink = () =>
  location.origin + location.pathname + "?room=" + (net.code || "");
const randCode = () =>
  Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[(Math.random() * 24) | 0]).join("");
function createRoom(tries) {
  tries = tries || 0;
  net.code = randCode();
  net.retry = { create: true, tries };
  olView("Creating room...", "", "", false);
  netConnect("/ws/room/" + net.code + "?create=1", roomMsg);
}
function joinRoom(code, attempt) {
  net.code = code;
  net.retry = { create: false, attempt: attempt || 0, code };
  olView("Joining " + code + "...", "", "", false);
  netConnect("/ws/room/" + code, roomMsg);
}
function quickMatch() {
  olView("Finding an opponent...", "Hang tight. This waits until someone else taps Quick match.", "", false);
  netConnect("/ws/queue", (m) => {
    if (m.t !== "match") return;
    netClose(); // the server closes this socket; don't treat that as a drop
    if (m.create) {
      net.code = m.code;
      net.retry = { create: true, tries: 9 };
      netConnect("/ws/room/" + m.code + "?create=1", roomMsg);
    } else joinRoom(m.code, 0);
  });
}
function roomMsg(m) {
  switch (m.t) {
    case "error":
      if (m.msg === "taken" && net.retry && net.retry.create && net.retry.tries < 6)
        return createRoom(net.retry.tries + 1);
      if (m.msg === "notfound" && net.retry && !net.retry.create && net.retry.attempt < 6)
        return setTimeout(() => {
          if ($("online").classList.contains("hidden") || !net.retry) return;
          joinRoom(net.retry.code, net.retry.attempt + 1);
        }, 500);
      return olView(
        m.msg === "notfound" ? "Room not found" : m.msg === "full" ? "Room is full" : "Couldn't join",
        "Check the code and try again.",
        "",
        true,
      );
    case "role":
      net.role = m.role;
      if (m.role === "host")
        olView("Waiting for a friend", "Share this code, or copy the link.", net.code, false);
      else olView("Joined " + net.code, "Waiting for the host to start...", "", false);
      return;
    case "peer":
      netSend({
        t: "hello",
        name: playerName(),
        loadout: settings.loadout,
        len: settings.len,
      });
      return;
    case "hello":
      if (net.role !== "host") return;
      if (!acceptOpp(m)) return;
      netSend({ t: "start", name: playerName(), loadout: settings.loadout, len: settings.len });
      startOnline("host");
      return;
    case "start":
      if (net.role !== "guest" || !acceptOpp(m)) return;
      if (m.len === 60 || m.len === 120 || m.len === 240) settings.len = m.len;
      startOnline("guest");
      return;
    case "in":
      if (!net.host || !net.on) return;
      rin.mx = -(+m.mx || 0);
      rin.my = +m.my || 0;
      rin.shootHeld = !!m.sh;
      if (m.su) rin.shootUp = true;
      if (m.p) rin.passT = 0.18;
      if (m.sl) rin.slide = true;
      rin.press = !!m.pr;
      return;
    case "pw":
      if (net.host && net.on && PW[m.id]) usePower(teams[1], m.id);
      return;
    case "sw":
      if (net.host && net.on) switchPlayer(teams[1]);
      return;
    case "snap":
      if (net.guest) onSnap(m);
      return;
    case "rematch":
      rematch.opp = true;
      if (net.host && rematch.me) rematchGo();
      return;
    case "ping":
      return netSend({ t: "pong", ts: m.ts });
    case "pong": {
      const r = performance.now() - m.ts;
      net.rtt = net.rtt ? net.rtt * 0.7 + r * 0.3 : r;
      $("pingEl").textContent = Math.round(net.rtt) + " ms";
      return;
    }
    case "left":
      return netPeerLeft();
  }
}
function acceptOpp(m) {
  const l = Array.isArray(m.loadout) ? m.loadout.filter((id) => PW[id]) : [];
  if (l.length !== 3 || new Set(l).size !== 3) return false;
  net.oppName = String(m.name || "Player").slice(0, 14);
  net.oppLoadout = l;
  return true;
}
function startOnline(role) {
  net.on = true;
  net.host = role === "host";
  net.guest = role === "guest";
  net.forfeit = false;
  rematch.me = rematch.opp = false;
  snapBuf.length = 0;
  EV.length = 0;
  $("online").classList.add("hidden");
  $("btnAgain").style.display = "";
  $("btnAgain").textContent = "Rematch";
  initAudio();
  startMatch();
  clearInterval(snapTimer);
  clearInterval(inTimer);
  clearInterval(pingTimer);
  net.rtt = 0;
  pred.who = null;
  pingTimer = setInterval(() => netSend({ t: "ping", ts: performance.now() }), 1000);
  if (net.host) snapTimer = setInterval(sendSnap, SNAP_MS);
  else inTimer = setInterval(sendInput, IN_MS);
}
function netRematch() {
  if (net.forfeit) return;
  rematch.me = true;
  $("btnAgain").textContent = "Waiting for " + net.oppName + "...";
  netSend({ t: "rematch" });
  if (net.host && rematch.opp) rematchGo();
}
function rematchGo() {
  netSend({ t: "start", name: playerName(), loadout: settings.loadout, len: settings.len });
  startOnline("host");
}

/* ----- guest: input and power relays ----- */
function localPower(id) {
  if (net.guest) netSend({ t: "pw", id });
  else usePower(teams[0], id);
}
function localSwitch() {
  if (net.guest) netSend({ t: "sw" });
  else switchPlayer();
}
function sendInput() {
  const m = {
    t: "in",
    mx: r2(input.mx),
    my: r2(input.my),
    sh: input.shootHeld ? 1 : 0,
    su: input.shootUp ? 1 : 0,
    p: input.passT > 0 ? 1 : 0,
    sl: input.slide ? 1 : 0,
    pr: input.press ? 1 : 0,
  };
  // the guest never runs update(), so it clears its own one-shot flags here
  input.shootUp = false;
  input.slide = false;
  input.passT = 0;
  netSend(m);
}

/* ----- host: events and snapshots ----- */
function emit(...e) {
  if (net.host && net.on && EV.length < 150) EV.push(e);
}
(function patchForEvents() {
  for (const k of Object.keys(SFX)) {
    const f = SFX[k];
    if (typeof f !== "function") continue;
    SFX[k] = function (...a) {
      emit("s", k, ...a);
      return f.apply(this, a);
    };
  }
  const wrap = (fn, tag, pre) => (...a) => {
    emit(tag, ...a);
    return fn(...a);
  };
  say = wrap(say, "say");
  roar = wrap(roar, "roar");
  showBanner = wrap(showBanner, "bn");
  burst = wrap(burst, "bu");
  ring = wrap(ring, "rg");
  floatText = wrap(floatText, "ft");
  let lastBig = "";
  const sb = setBig,
    hb = hideBig;
  setBig = (t, c, h) => {
    if (t !== lastBig || h) emit("bg", t, c, h);
    lastBig = t;
    return sb(t, c, h);
  };
  hideBig = () => {
    lastBig = "";
    emit("hb");
    return hb();
  };
  const em = endMatch;
  endMatch = () => {
    em();
    if (net.host && net.on) {
      emit("end", goalLog.slice());
      sendSnap();
    }
  };
})();
function sendSnap() {
  if (!net.host || !net.on || !net.ws) return;
  const tm = (t) => ({
    sc: t.score,
    mo: r2(t.morale),
    ro: r2(t.rocket),
    du: r2(t.dumsor),
    sa: r2(t.sankofa),
    lk: r2(t.lock),
    pw: t.pw,
    lu: t.lastUse,
    ct: t.ctrl ? t.ctrl.idx : -1,
    rc: t.recv ? t.recv.idx : -1,
    rp: t.recvPt,
    w: t.wind
      ? [t.wind.id, t.wind.p.team, t.wind.p.idx, r2(t.wind.t), t.wind.max, r2(t.wind.dx), r2(t.wind.dy)]
      : null,
    st: t.stats,
  });
  netSend({
    t: "snap",
    p: ALL.map((p) => PF.map((k) => r2(p[k]))),
    b: [r2(ball.x), r2(ball.y), r2(ball.vx), r2(ball.vy), r2(ball.rot), r2(ball.fire)],
    bo: ball.owner ? [ball.owner.team, ball.owner.idx] : null,
    bs: ball.shot ? 1 : 0,
    bl: ball.lastTeam,
    tm: teams.map(tm),
    g: {
      st: state,
      sT: r2(stateT),
      mt: r2(matchT),
      su: sudden ? 1 : 0,
      ts: r2(timeScale),
      sk: r2(shake),
      ls: lastScorer,
      gu: goalUndone ? 1 : 0,
      kt: kickTeam,
      sc: r2(simClock),
    },
    ev: EV.splice(0),
  });
}

/* ----- guest: decode (mirror), buffer, interpolate ----- */
function onSnap(s) {
  const P = new Array(8);
  for (let k = 0; k < 8; k++) {
    const h = k >> 2,
      i = k & 3;
    P[(1 - h) * 4 + i] = s.p[k].map((v, j) =>
      j === 0 ? MX - v : PF_NEG.has(PF[j]) ? -v : v,
    );
  }
  const B = [MX - s.b[0], s.b[1], -s.b[2], s.b[3], s.b[4], s.b[5]];
  snapBuf.push({ at: performance.now(), P, B, s, done: false });
  while (snapBuf.length > 40) {
    const o = snapBuf.shift();
    if (!o.done) applyDiscrete(o.s);
  }
}
function applyDiscrete(s) {
  const g = s.g;
  state = g.st;
  stateT = g.sT;
  matchT = g.mt;
  sudden = !!g.su;
  timeScale = timeScaleTarget = g.ts;
  shake = Math.max(shake, g.sk);
  lastScorer = 1 - g.ls;
  goalUndone = !!g.gu;
  kickTeam = 1 - g.kt;
  simClock = g.sc;
  for (let h = 0; h < 2; h++) {
    const L = teams[1 - h],
      d = s.tm[h];
    L.score = d.sc;
    L.morale = d.mo;
    L.rocket = d.ro;
    L.dumsor = d.du;
    L.sankofa = d.sa;
    L.lock = d.lk;
    L.pw = d.pw;
    L.lastUse = d.lu;
    L.ctrl = d.ct >= 0 ? L.players[d.ct] : null;
    L.recv = d.rc >= 0 ? L.players[d.rc] : null;
    L.recvPt = d.rp ? [MX - d.rp[0], d.rp[1]] : null;
    L.wind = d.w
      ? { id: d.w[0], p: teams[1 - d.w[1]].players[d.w[2]], t: d.w[3], max: d.w[4], dx: -d.w[5], dy: d.w[6] }
      : null;
    L.stats = d.st;
  }
  ball.owner = s.bo ? teams[1 - s.bo[0]].players[s.bo[1]] : null;
  ball.shot = !!s.bs;
  ball.lastTeam = 1 - s.bl;
  for (const e of s.ev) applyEvent(e);
}
const swapSide = (k) =>
  k.endsWith("_you") ? k.slice(0, -4) + "_cpu" : k.endsWith("_cpu") ? k.slice(0, -4) + "_you" : k;
function applyEvent(e) {
  switch (e[0]) {
    case "s":
      if (SFX[e[1]]) SFX[e[1]](...e.slice(2));
      break;
    case "say":
      say(swapSide(e[1]), e[2], e[3]);
      break;
    case "roar":
      roar(e[1] === "goal" ? "groan" : e[1] === "groan" ? "goal" : e[1]);
      break;
    case "bn":
      showBanner(e[1], e[2], e[3]);
      break;
    case "bg":
      setBig(e[1], e[2], e[3]);
      break;
    case "hb":
      hideBig();
      break;
    case "bu": {
      const o = Object.assign({}, e[4]);
      if (o.a !== undefined) o.a = Math.PI - o.a;
      burst(MX - e[1], e[2], e[3], o);
      break;
    }
    case "rg":
      ring(MX - e[1], e[2], e[3], e[4], e[5], e[6]);
      break;
    case "ft":
      floatText(MX - e[1], e[2], e[3], e[4]);
      break;
    case "end":
      goalLog.length = 0;
      for (const [t, m] of e[1]) goalLog.push([1 - t, m]);
      endMatch();
      clearInterval(inTimer);
      break;
  }
}
function netGuestStep(dt) {
  time += dt;
  const rt = performance.now() - INTERP_MS;
  while (snapBuf.length > 1 && snapBuf[1].at <= rt) {
    const o = snapBuf.shift();
    if (!o.done) applyDiscrete(o.s);
  }
  const cur = snapBuf[0],
    nxt = snapBuf[1];
  if (cur) {
    if (!cur.done) {
      cur.done = true;
      applyDiscrete(cur.s);
    }
    let k = 0;
    if (nxt) k = clamp((rt - cur.at) / Math.max(1, nxt.at - cur.at), 0, 1);
    for (let i = 0; i < 8; i++) {
      const p = ALL[i],
        a = cur.P[i],
        b = nxt ? nxt.P[i] : a;
      const jump = nxt && (Math.abs(b[0] - a[0]) > 140 || Math.abs(b[1] - a[1]) > 140);
      for (let j = 0; j < PF.length; j++)
        p[PF[j]] = jump || !nxt ? a[j] : a[j] + (b[j] - a[j]) * k;
      p.r = p.base * p.scale;
    }
    const a = cur.B,
      b = nxt ? nxt.B : a;
    const jump = nxt && (Math.abs(b[0] - a[0]) > 200 || Math.abs(b[1] - a[1]) > 200);
    ball.x = jump ? a[0] : a[0] + (b[0] - a[0]) * k;
    ball.y = jump ? a[1] : a[1] + (b[1] - a[1]) * k;
    ball.vx = a[2];
    ball.vy = a[3];
    ball.rot = a[4];
    ball.fire = a[5];
  }
  predictOwn(dt);
  if (shake > 0) shake = Math.max(0, shake - dt * 45);
  stepFx(dt * timeScale, dt);
}
// The host only hears your keys after a trip over the network, so on your screen the
// player you control would answer late. Show it where the host's latest snapshot says
// it is, plus the movement your current keys will add over the time that snapshot is
// already stale. Smoothed so corrections don't snap.
function predictOwn(dt) {
  const c = teams[0].ctrl,
    last = snapBuf[snapBuf.length - 1];
  if (!c || !last || state !== "play" || c.stun > 0 || c.dash > 0 || c.slide > 0 || c.recover > 0) {
    pred.who = null;
    return;
  }
  const a = last.P[ALL.indexOf(c)];
  const age = Math.min(0.4, (performance.now() - last.at + net.rtt / 2) / 1000);
  const m = Math.max(1, hyp(input.mx, input.my)),
    sp = c.speed * (c.giant > 0 ? 0.85 : 1) * (ball.owner === c ? 0.93 : 1);
  const tx = clamp(a[0] + (input.mx / m) * sp * age, PX0 + c.r, PX1 - c.r),
    ty = clamp(a[1] + (input.my / m) * sp * age, PY0 + c.r, PY1 - c.r);
  if (pred.who !== c || Math.hypot(tx - pred.x, ty - pred.y) > 160) {
    pred.who = c;
    pred.x = tx;
    pred.y = ty;
  } else {
    const k = Math.min(1, dt * 16);
    pred.x += (tx - pred.x) * k;
    pred.y += (ty - pred.y) * k;
  }
  if (ball.owner === c) {
    ball.x += pred.x - c.x;
    ball.y += pred.y - c.y;
  }
  c.x = pred.x;
  c.y = pred.y;
  if (hyp(input.mx, input.my) > 0.2) {
    const n = norm(input.mx, input.my);
    c.fx = n[0];
    c.fy = n[1];
  }
}

/* ----- wiring ----- */
$("btnOnline").addEventListener("click", olOpen);
$("olBack").addEventListener("click", olBack);
$("olCreate").addEventListener("click", () => createRoom(0));
$("olQuick").addEventListener("click", quickMatch);
$("olJoin").addEventListener("click", () => {
  const c = $("olJoinIn").value.trim().toUpperCase();
  if (/^[A-Z0-9]{4,5}$/.test(c)) joinRoom(c, 0);
  else $("olMsg").textContent = "Enter the 4 or 5 letter room code.";
});
$("olJoinIn").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("olJoin").click();
});
$("olCopy").addEventListener("click", () => {
  const url = roomLink();
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
    () => ($("olMsg").textContent = "Link copied. Send it to a friend."),
    () => ($("olMsg").textContent = url),
  );
});
(() => {
  const code = (new URLSearchParams(location.search).get("room") || "").toUpperCase();
  if (/^[A-Z0-9]{4,5}$/.test(code) && settings.loadout.length === 3) {
    olOpen();
    joinRoom(code, 0);
  }
})();
