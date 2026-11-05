"use strict";
        /* ---------- powers ---------- */
        // Every power costs Morale, has its own cooldown, and shows a wind-up cue before it lands.
        const hidden = (p) => false;
        function powerCost(t, id) {
          const c = TIER[PW[id].tier];
          return t.lastUse[id] !== undefined &&
            simClock - t.lastUse[id] < REPEAT
            ? Math.round(c * 1.5)
            : c;
        }
        function pickTarget(t) {
          const o = ball.owner;
          if (o && o.team === t.id && !o.gk) return o;
          if (t.human && t.ctrl) return t.ctrl;
          let best = null,
            bd = 1e9;
          for (const p of t.players) {
            if (p.gk || p.stun > 0) continue;
            const d = hyp(p.x - ball.x, p.y - ball.y);
            if (d < bd) {
              bd = d;
              best = p;
            }
          }
          return best;
        }
        function carrierOf(t) {
          const o = ball.owner;
          return o && o.team === t.id && !o.gk ? o : null;
        }
        function inOwnHalf(t, x) {
          return (x - CX) * attackDir(t.id) < 0;
        }
        // returns the player the power acts on, or a reason it can't be used right now
        function powerTarget(t, id) {
          const c = carrierOf(t),
            has = ball.owner && ball.owner.team === t.id;
          switch (id) {
            case "shito":
              return c || "Shito shot needs the ball";
            case "trotro":
              return c || "Trotro rush needs the ball";
            case "azonto":
              return c || "Azonto needs the ball";
            case "dumsor":
              return pickTarget(t) || "No one to cue";
            case "obolo":
              return pickTarget(t) || "No one free";
            case "magnet":
              if (has) return "Ball magnet is for loose balls";
              return pickTarget(t) || "No one free";
            case "sankofa":
              if (has) return "Sankofa is for when you have lost the ball";
              if (!inOwnHalf(t, ball.x))
                return "Sankofa works when the ball is in your half";
              return pickTarget(t) || "No one free";
          }
          return "Unknown power";
        }
        // Sankofa rewind: the last few seconds are played backwards on screen before the restart
        const hist = [];
        let goalIdx = 0,
          rewind = null;
        function histPush() {
          const p = [];
          for (const q of ALL) p.push([q.x, q.y, q.fx, q.fy]);
          hist.push({ b: [ball.x, ball.y], p });
          if (hist.length > 420) hist.shift();
        }
        function startRewind(t) {
          state = "rewind";
          timeScaleTarget = 1;
          timeScale = 1;
          ball.owner = null;
          ball.vx = ball.vy = 0;
          ball.fire = 0;
          rewind = { t, i: hist.length - 1, end: Math.max(0, goalIdx - 150) };
          fnoise(1.1, 0.45, 5000, 300, "bandpass", 1.2);
        }
        function rewindStep() {
          const R = rewind;
          if (!R) return;
          R.i = Math.max(R.end, R.i - 2);
          const h = hist[R.i];
          if (h) {
            ball.x = h.b[0];
            ball.y = h.b[1];
            ball.owner = null;
            ball.vx = ball.vy = 0;
            ALL.forEach((p, k) => {
              const q = h.p[k];
              if (!q) return;
              p.x = q[0];
              p.y = q[1];
              p.vx = p.vy = 0;
              p.fx = q[2];
              p.fy = q[3];
            });
          }
          if (R.i <= R.end) {
            rewind = null;
            hist.length = 0;
            if (drill) drillEvent("rewound");
            else setupKickoff(R.t.id);
          }
        }
        function drawRewind() {
          if (state !== "rewind") return;
          const cs = canvas.width / W,
            w = canvas.width,
            h = canvas.height;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = "rgba(224,176,74,.16)";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "rgba(0,0,0,.14)";
          for (let y = 0; y < h; y += 7 * cs) ctx.fillRect(0, y, w, 2.5 * cs);
          const by = (((time * 1100) % (H + 240)) - 120) * cs;
          ctx.fillStyle = "rgba(255,255,255,.16)";
          ctx.fillRect(0, by, w, 44 * cs);
          ctx.fillRect(0, (by + h * 0.45) % h, w, 14 * cs);
          ctx.textAlign = "center";
          ctx.font = 52 * cs + "px 'Bowlby One',Impact,sans-serif";
          ctx.fillStyle = "rgba(21,15,46,.8)";
          ctx.fillText(
            "\u25C0\u25C0 REWIND",
            w / 2 + 3 * cs,
            h * 0.33 + 3 * cs,
          );
          ctx.fillStyle = "#ffd166";
          ctx.fillText("\u25C0\u25C0 REWIND", w / 2, h * 0.33);
          ctx.restore();
        }
        let goalUndone = false;
        // Sankofa: go back and fetch it. Right after conceding, the goal is wiped off and your side restarts with the ball
        function reverseGoal(t) {
          const sc = teams[lastScorer];
          sc.score = Math.max(0, sc.score - 1);
          goalUndone = true;
          reversals++;
          goalLog.pop();
          SFX.sankofa();
          ring(ball.x, ball.y, 10, 320, 0.9, PW.sankofa.color);
          ring(CX, CY, 10, 260, 0.9, PW.sankofa.color);
          shake = Math.max(shake, reduceMotion ? 2 : 10);
          hideBig();
          startRewind(t);
          cmStop();
          say(t.id === 0 ? "sankofa_you" : "sankofa_cpu", 3, 150);
          roar(t.id === 0 ? "goal" : "groan");
          showBanner(
            teamLabel(t) + "SANKOFA! Goal reversed",
            PW.sankofa.color,
            2200,
          );
        }
        function usePower(t, id) {
          const def = PW[id],
            human = t.id === 0 && !demo;
          const no = (msg) => {
            if (human && msg) {
              showBanner(msg, "#9b93c9", 1300);
              SFX.fizzle();
            }
            return false;
          };
          const rev =
            id === "sankofa" &&
            state === "goal" &&
            !demo &&
            lastScorer !== t.id &&
            !goalUndone;
          if (
            paused ||
            (state !== "play" && !rev) ||
            !def ||
            !t.loadout.includes(id)
          )
            return false;
          if (t.wind) return no("");
          if (t.pw[id] > 0) return no(def.name + " is cooling down");
          if (t.lock > 0) return no("");
          const cost = powerCost(t, id);
          if (t.morale < cost)
            return no("Need " + cost + " Morale for " + def.name);
          if (rev) {
            t.morale -= cost;
            t.lastUse[id] = simClock;
            t.pw[id] = def.cd;
            t.lock = LOCK;
            t.stats.powers++;
            t.stats.used[id] = (t.stats.used[id] || 0) + 1;
            reverseGoal(t);
            return true;
          }
          const p = powerTarget(t, id);
          if (typeof p === "string") return no(p);
          t.morale -= cost;
          t.lastUse[id] = simClock;
          t.pw[id] = def.cd;
          t.lock = LOCK;
          t.stats.powers++;
          t.stats.used[id] = (t.stats.used[id] || 0) + 1;
          t.wind = { id, p, t: def.wind, max: def.wind, dx: p.fx, dy: p.fy };
          SFX[id]();
          ring(p.x, p.y, p.r + 46, p.r + 6, def.wind, def.color);
          showBanner(
            teamLabel(t) +
              def.name +
              (id === "trotro" ? "! Circle! Circle!" : "!"),
            def.color,
          );
          powerSay(id, t);
          return true;
        }
        // the wind-up is over: the effect lands if it still makes sense, otherwise the Morale is gone
        function landPower(t) {
          const w = t.wind,
            id = w.id,
            p = w.p,
            def = PW[id];
          t.wind = null;
          const fizzle = () => {
            SFX.fizzle();
            floatText(p.x, p.y - p.r - 14, def.name + " wasted", "#9b93c9");
          };
          switch (id) {
            case "shito":
              if (ball.owner !== p) return fizzle();
              t.rocket = 3;
              ring(p.x, p.y, 8, 60, 0.35, def.color);
              break;
            case "trotro":
              if (ball.owner !== p || p.stun > 0) return fizzle();
              p.dash = 0.7;
              p.dashX = w.dx;
              p.dashY = w.dy;
              p.slide = 0;
              p.recover = 0;
              break;
            case "azonto":
              if (ball.owner !== p) return fizzle();
              p.azonto = 1.8;
              p.azDX = p.fx;
              p.azDY = p.fy;
              p.cut = 0;
              p.cutCD = 0;
              ring(p.x, p.y, 10, 120, 0.5, def.color);
              break;
            case "dumsor":
              t.dumsor = 3;
              for (const q of teams[1 - t.id].players) {
                if (q.gk) continue;
                q.stun = Math.max(q.stun, 3);
                q.slide = 0;
                q.dash = 0;
                ring(q.x, q.y, q.r + 4, q.r + 34, 0.5, def.color);
              }
              break;
            case "obolo":
              p.giant = 4;
              burst(p.x, p.y, 18, {
                color: ["#c08bff", "#e6d8ff"],
                s0: 60,
                s1: 240,
                l0: 0.4,
                l1: 0.8,
              });
              ring(p.x, p.y, 10, 110, 0.5, def.color);
              break;
            case "magnet": {
              const q = t.human && t.ctrl ? t.ctrl : p;
              q.magnet = 2.5;
              ring(q.x, q.y, 10, 130, 0.5, def.color);
              break;
            }
            case "sankofa":
              if (ball.owner && ball.owner.team === t.id) return fizzle();
              t.sankofa = 2;
              say("sankofa_back", 2);
              for (const q of t.players)
                if (!q.gk) ring(q.x, q.y, 8, 70, 0.4, def.color);
              break;
          }
        }

