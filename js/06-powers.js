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
            case "kente":
              if (t.kente > 0) return "Kente wall is already up";
              return t.players[0];
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
            case "kente":
              raiseKente(t);
              break;
          }
        }


        /* ---------- Kente wall ---------- */
        // A cloth across your goal mouth. The next opposing shot sinks into it, the goal goes up, the cloth holds,
        // then it snaps back: the goal comes off and the ball is fired into whoever kicked it.
        const KENTE = ["#f2b705", "#0b7a3e", "#f2b705", "#c8102e", "#151515", "#f2b705", "#0b7a3e", "#1d4fa3"],
          KENTE_UP = 3,
          K_STRETCH = 0.8,
          K_HOLD = 0.65,
          K_SPEED = 1900;
        let kenteSeq = null,
          kenteFlash = 0;
        function kenteSide(tid) {
          return { line: ownGoalX(tid), sg: tid === 0 ? 1 : -1 };
        }
        function raiseKente(t) {
          const { line, sg } = kenteSide(t.id);
          t.kente = KENTE_UP;
          t.kd = 0;
          t.kw = 0.9;
          t.ky = CY;
          for (let y = GY0 + 10; y < GY1; y += 22)
            burst(line, y, 3, {
              color: KENTE,
              s0: 60,
              s1: 200,
              l0: 0.4,
              l1: 0.9,
              z0: 2.5,
              z1: 5,
              a: sg > 0 ? 0 : Math.PI,
              spread: 1.1,
              kind: "confetti",
            });
          ring(line, CY, 10, 150, 0.6, PW.kente.color);
        }
        // called from the ball's sub-steps: the ball has touched an active cloth
        function kenteCatch() {
          if (ball.owner || state !== "play") return false;
          const k = ball.kicker;
          for (const t of teams) {
            if (t.kente <= 0 || !k || k.team === t.id) continue;
            const { line, sg } = kenteSide(t.id);
            if (ball.y > GY0 && ball.y < GY1 && (ball.x - line) * sg < ball.r) {
              startKente(t, k);
              return true;
            }
          }
          return false;
        }
        function startKente(t, k) {
          const { line, sg } = kenteSide(t.id),
            sp = hyp(ball.vx, ball.vy),
            sh = teams[k.team];
          kenteSeq = {
            tid: t.id,
            sid: k.team,
            si: k.idx,
            ph: 0,
            T: 0,
            d0: Math.max(0, ball.r - (ball.x - line) * sg),
            max: clamp(26 + sp * 0.025, 46, 60),
            vy: ball.vy * 0.25,
            hit: false,
          };
          state = "kente";
          t.kente = 0;
          t.ky = ball.y;
          t.kd = kenteSeq.d0;
          ball.fire = 0;
          ball.vx = ball.vy = 0;
          ball.owner = null;
          for (const p of ALL) p.vx = p.vy = 0;
          timeScale = timeScaleTarget = 0.6;
          // the goal goes up
          sh.score++;
          SFX.goal();
          SFX.kenteStretch();
          setBig("GOAL!", sh.color);
          roar(k.team === 0 ? "goal" : "groan");
          cmStop();
          say(k.team === 0 ? "goal_you" : "goal_cpu", 3);
          shake = Math.max(shake, reduceMotion ? 2 : 9);
          burst(line, ball.y, 26, {
            color: [sh.color, "#fff", "#ffc61a"],
            kind: "confetti",
            s0: 80,
            s1: 360,
            l0: 0.8,
            l1: 1.6,
            z0: 4,
            z1: 7,
            g: 300,
            drag: 1,
            a: sg > 0 ? 0 : Math.PI,
            spread: 1.2,
          });
        }
        const easeOut = (x) => 1 - Math.pow(1 - x, 3);
        function kenteStep(dt) {
          const K = kenteSeq;
          if (!K) {
            state = "play";
            return;
          }
          const t = teams[K.tid],
            { line, sg } = kenteSide(K.tid),
            shooter = teams[K.sid].players[K.si];
          K.T += dt;
          if (K.ph === 0) {
            // stretch: the ball sinks deep into the cloth and slows to nothing
            const f = Math.min(1, K.T / K_STRETCH),
              d = lerp(K.d0, K.max, easeOut(f));
            K.vy *= Math.exp(-5 * dt);
            ball.y = clamp(ball.y + K.vy * dt, GY0 + ball.r + 6, GY1 - ball.r - 6);
            t.ky = ball.y;
            t.kd = d;
            ball.x = line - sg * (d - ball.r);
            ball.rot += dt * 30 * (1 - f);
            if (Math.random() < 0.6)
              burst(ball.x, ball.y, 1, {
                color: KENTE,
                s0: 20,
                s1: 90,
                l0: 0.3,
                l1: 0.6,
                z0: 1.5,
                z1: 3,
              });
            if (f >= 1) {
              K.ph = 1;
              K.T = 0;
              setBig("GOAL...?", teams[K.sid].color);
              SFX.kenteCreak();
              timeScale = timeScaleTarget = 0.35;
            }
          } else if (K.ph === 1) {
            // hold: the cloth trembles at full stretch, everything waits
            const f = Math.min(1, K.T / K_HOLD);
            t.kd = K.max + Math.sin(K.T * 70) * (1.2 + f * 2.8);
            ball.x = line - sg * (t.kd - ball.r);
            shake = Math.max(shake, reduceMotion ? 0 : 1 + f * 3);
            if (f >= 1) kenteSnap(K, t, line, sg, shooter);
          } else {
            // fly: straight back at whoever kicked it
            const tx = shooter ? shooter.x : CX,
              ty = shooter ? shooter.y : CY,
              dx = tx - ball.x,
              dy = ty - ball.y,
              d = hyp(dx, dy),
              rr = (shooter ? shooter.r : 0) + ball.r;
            if (d <= rr || K.T > 1.6) {
              kenteImpact(K, t, shooter, dx / (d || 1), dy / (d || 1));
              return;
            }
            const step = Math.min(d - rr + 0.01, K_SPEED * dt),
              nx = dx / d,
              ny = dy / d;
            for (let s = 0; s < step; s += 14)
              burst(ball.x + nx * s, ball.y + ny * s, 2, {
                color: KENTE,
                s0: 10,
                s1: 70,
                l0: 0.35,
                l1: 0.7,
                z0: 2.5,
                z1: 5.5,
                drag: 3,
              });
            ball.x += nx * step;
            ball.y += ny * step;
            ball.vx = nx * K_SPEED;
            ball.vy = ny * K_SPEED;
            ball.rot += dt * 60;
          }
        }
        function kenteSnap(K, t, line, sg, shooter) {
          const sh = teams[K.sid];
          K.ph = 2;
          K.T = 0;
          sh.score = Math.max(0, sh.score - 1);
          t.kd = 0;
          t.kw = 1.3;
          kenteFlash = 1;
          timeScale = timeScaleTarget = 1;
          ball.x = line + sg * (ball.r + 4);
          SFX.kenteSnap();
          setBig("NO GOAL!", PW.kente.color, 1500);
          showBanner(
            teamLabel(t) + "KENTE WALL! Sent back to sender!",
            PW.kente.color,
            2400,
          );
          cmStop();
          say("save", 3);
          roar(t.id === 0 ? "goal" : "groan");
          shake = Math.max(shake, reduceMotion ? 3 : 18);
          ring(line, t.ky, 8, 200, 0.55, PW.kente.color);
          ring(line, t.ky, 8, 120, 0.4, "#fff");
          burst(line, t.ky, 40, {
            color: KENTE,
            kind: "confetti",
            s0: 120,
            s1: 520,
            l0: 0.6,
            l1: 1.3,
            z0: 3,
            z1: 7,
            drag: 1.4,
            a: sg > 0 ? 0 : Math.PI,
            spread: 1.3,
          });
          if (shooter) {
            ring(shooter.x, shooter.y, shooter.r + 50, shooter.r + 4, 0.3, "#fff");
            floatText(shooter.x, shooter.y - shooter.r - 18, "INCOMING!", "#fff");
          }
        }
        function kenteImpact(K, t, p, nx, ny) {
          kenteSeq = null;
          state = "play";
          kenteFlash = Math.max(kenteFlash, 0.6);
          ball.fire = 0;
          ball.shot = false;
          ball.noEarn = true;
          ball.kicker = null;
          ball.lastTeam = t.id;
          if (p) {
            p.stun = Math.max(p.stun, 3);
            p.slide = 0;
            p.dash = 0;
            p.charge = 0;
            p.pickupLock = Math.max(p.pickupLock, 1.2);
            p.x = clamp(p.x + nx * 22, PX0 + p.r, PX1 - p.r);
            p.y = clamp(p.y + ny * 22, PY0 + p.r, PY1 - p.r);
            // it pops off sideways and on away from your goal, never back into it
            const side = Math.random() < 0.5 ? 1 : -1,
              [bx, by] = norm(-ny * side * 0.8 + nx * 0.5, nx * side * 0.8 + ny * 0.5);
            ball.x = clamp(p.x + bx * (p.r + ball.r + 2), PX0 + ball.r, PX1 - ball.r);
            ball.y = clamp(p.y + by * (p.r + ball.r + 2), PY0 + ball.r, PY1 - ball.r);
            ball.vx = bx * 380;
            ball.vy = by * 380;
            burst(p.x, p.y, 34, {
              color: KENTE,
              s0: 120,
              s1: 460,
              l0: 0.4,
              l1: 1,
              z0: 3,
              z1: 6,
            });
            burst(p.x, p.y, 10, {
              color: "#fff",
              s0: 200,
              s1: 600,
              l0: 0.15,
              l1: 0.35,
              z0: 2,
              z1: 4,
            });
            ring(p.x, p.y, p.r, p.r + 90, 0.5, PW.kente.color);
            ring(p.x, p.y, p.r, p.r + 50, 0.35, "#fff");
            floatText(p.x, p.y - p.r - 16, "KNOCKED OUT!", "#ffd166");
          } else {
            ball.vx = ball.vy = 0;
          }
          SFX.kenteHit();
          shake = Math.max(shake, reduceMotion ? 3 : 20);
          timeScale = 0.2;
          timeScaleTarget = 1;
          earn(t, "save", 10, t.players[0]);
          if (drill) drillEvent("kente");
        }

        // juju against the wall: a quick stretch and snap per ball, then it flies home and flattens whoever cast it
        function kenteJujuBlock(b) {
          const t = teams[0];
          juju.blocked = true;
          b.back = true;
          b.t = 0;
          b.dur = 0.4;
          b.sx = b.x;
          b.sy = b.y;
          b.tx = b.q ? b.q.x : CX;
          b.ty = b.q ? b.q.y : CY;
          t.ky = b.y;
          t.kd = 0;
          t.kw = 1.3;
          t.kente = Math.max(t.kente, 0.4);
          kenteFlash = Math.max(kenteFlash, 0.7);
          SFX.kenteSnap();
          setBig("BLOCKED!", PW.kente.color, 1200);
          showBanner("You: KENTE WALL! Juju sent back!", PW.kente.color, 2200);
          roar("goal");
          shake = Math.max(shake, reduceMotion ? 2 : 14);
          ring(PX0, b.y, 8, 170, 0.5, PW.kente.color);
          ring(PX0, b.y, 8, 90, 0.35, "#b86bff");
          burst(PX0, b.y, 30, {
            color: [...KENTE, "#b86bff", "#e6d0ff"],
            kind: "confetti",
            s0: 100,
            s1: 460,
            l0: 0.5,
            l1: 1.1,
            z0: 3,
            z1: 6,
            a: 0,
            spread: 1.3,
          });
          floatText(PX0 + 60, b.y, "NO JUJU", PW.kente.color);
        }
        function kenteJujuHit(b) {
          const p = b.q;
          SFX.kenteHit();
          shake = Math.max(shake, reduceMotion ? 2 : 12);
          if (!p) return;
          p.stun = Math.max(p.stun, 3);
          p.slide = p.dash = 0;
          burst(p.x, p.y, 26, {
            color: [...KENTE, "#b86bff"],
            s0: 120,
            s1: 420,
            l0: 0.4,
            l1: 0.9,
            z0: 3,
            z1: 6,
          });
          ring(p.x, p.y, p.r, p.r + 70, 0.45, PW.kente.color);
          floatText(p.x, p.y - p.r - 16, "KNOCKED OUT!", "#ffd166");
        }
