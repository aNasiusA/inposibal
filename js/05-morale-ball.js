"use strict";
        /* ---------- Morale ---------- */
        // Earned only by active play. Repeating the same action type within DR_WIN seconds pays a bit less each time.
        function earn(t, type, base, p) {
          let r = t.dr[type];
          if (r && simClock - r.t < DR_WIN) r.n = Math.min(2, r.n + 1);
          else r = t.dr[type] = { n: 0, t: 0 };
          r.t = simClock;
          const amt = Math.round(base * 1.5 * [1, 0.85, 0.7][r.n]),
            got = Math.min(MOR_MAX - t.morale, amt);
          t.morale += got;
          t.stats.morale += got;
          if (p && amt > 0) {
            floatText(
              p.x,
              p.y - p.r - 14,
              "+" + amt,
              got > 0 ? "#ffc61a" : "rgba(255,255,255,.5)",
            );
            if (t.id === 0 && got > 0) SFX.earn();
          }
          return got;
        }
        function oppAhead(team, x) {
          const dir = attackDir(team);
          let n = 0;
          for (const q of teams[1 - team].players)
            if (!q.gk && (q.x - x) * dir > 0) n++;
          return n;
        }
        // pickup of a free ball: interceptions, saves and forward passes pay; easy touches do not
        function onPickup(p, sp) {
          const t = teams[p.team],
            o = teams[1 - p.team],
            lp = t.lastPass;
          t.lastPass = null;
          o.lastPass = null;
          if (!ball.noEarn) {
            if (ball.lastTeam !== p.team) {
              if (ball.shot && p.gk) {
                earn(o, "ontarget", 8);
                earn(t, "save", 6, p);
                roar("ooh");
                say("save", 1);
              } else if (!p.gk && sp > 200) earn(t, "intercept", 12, p);
            } else if (lp && !p.gk) {
              const fw = (p.x - lp.x) * attackDir(p.team),
                d = hyp(p.x - lp.x, p.y - lp.y);
              if (d >= 90 && fw >= 120 && oppAhead(p.team, p.x) < lp.ahead)
                earn(t, "progpass", 8, p);
            }
          }
          ball.shot = false;
          ball.noEarn = false;
        }
        function trackBeat() {
          const o = ball.owner;
          if (!o || o.gk) {
            beat.o = null;
            beat.s.clear();
            return;
          }
          if (beat.o !== o) {
            beat.o = o;
            beat.s.clear();
          }
          const dir = attackDir(o.team);
          for (const q of teams[1 - o.team].players) {
            if (q.gk) continue;
            const rx = (q.x - o.x) * dir,
              d = hyp(q.x - o.x, q.y - o.y);
            if (q.stun > 0) {
              beat.s.delete(q);
              continue;
            }
            if (d < 70 && rx > 10) beat.s.add(q);
            else if (beat.s.has(q) && rx < -24) {
              beat.s.delete(q);
              if (d < 130) earn(teams[o.team], "beat", 10, o);
            } else if (beat.s.has(q) && d > 160) beat.s.delete(q);
          }
        }

        /* ---------- ball actions ---------- */
        function kickBall(p, dx, dy, speed, lock) {
          const [nx, ny] = norm(dx, dy);
          ball.owner = null;
          ball.x = clamp(
            p.x + nx * (p.r + ball.r + 3),
            PX0 + ball.r,
            PX1 - ball.r,
          );
          ball.y = clamp(
            p.y + ny * (p.r + ball.r + 3),
            PY0 + ball.r,
            PY1 - ball.r,
          );
          ball.vx = nx * speed;
          ball.vy = ny * speed;
          p.fx = nx;
          p.fy = ny;
          p.pickupLock = lock === undefined ? 0.3 : lock;
          p.hold = 0;
          p.charge = 0;
          p.aiRel = 0;
          ball.lastTeam = p.team;
          ball.shot = false;
          ball.noEarn = false;
          teams[p.team].lastPass = null;
          burst(ball.x, ball.y, 5, {
            color: "#fff",
            s0: 30,
            s1: 120,
            l0: 0.15,
            l1: 0.35,
            z0: 1.5,
            z1: 3,
          });
        }
        // Shito is spent on the next shot either way; it only ignites from a near-full charge
        function shoot(p, charge, dx, dy) {
          const t = teams[p.team];
          let sp = 520 + charge * 780;
          const armed = t.rocket > 0,
            fire = armed && charge >= 0.5;
          t.rocket = 0;
          if (fire) sp = 1400;
          kickBall(p, dx, dy, sp);
          ball.shot = true;
          t.stats.shots++;
          if (!fire) say("shot", 1);
          if (fire) {
            ball.fire = 3;
            SFX.shito();
            shake = Math.max(shake, reduceMotion ? 2 : 6);
            ring(ball.x, ball.y, 6, 90, 0.4, "#ff5a36");
          } else {
            SFX.shot();
            if (armed) {
              SFX.fizzle();
              floatText(p.x, p.y - p.r - 14, "Not hot enough", "#ff9f43");
            }
          }
          if (drill && p.team === 0) drillEvent("shot", fire);
        }
        function passTo(p, q) {
          const t = teams[p.team],
            lead = 0.25,
            tx = q.x + q.vx * lead,
            ty = q.y + q.vy * lead,
            dx = tx - p.x,
            dy = ty - p.y,
            d = hyp(dx, dy);
          kickBall(p, dx, dy, clamp(d * 1.7 + 220, 320, 540) * 1);
          SFX.pass();
          t.lastPass = { x: p.x, y: p.y, ahead: oppAhead(p.team, p.x) };
          if (!q.gk) {
            t.recv = q;
            t.recvT = 2;
            t.recvArmed = false;
            t.recvPt = null;
          }
        }
        function passTarget(p) {
          const t = teams[p.team],
            human = !demo && p === teams[0].ctrl;
          let dx = p.fx,
            dy = p.fy;
          if (human && hyp(input.mx, input.my) > 0.25) {
            const n = norm(input.mx, input.my);
            dx = n[0];
            dy = n[1];
          }
          let best = null,
            bs = -9,
            near = null,
            nd = 1e9;
          for (const q of t.players) {
            if (q === p || q.stun > 0) continue;
            const qx = q.x - p.x,
              qy = q.y - p.y,
              d = hyp(qx, qy) || 1;
            if (d < 45) continue;
            if (!q.gk && d < nd) {
              nd = d;
              near = q;
            }
            const dot = (qx * dx + qy * dy) / d;
            if (dot < 0.45) continue;
            const s =
              dot * 1.2 +
              Math.min(nearestOppDist(t.id, q.x, q.y), 160) / 260 -
              d / 1400 -
              (q.gk ? 0.6 : 0);
            if (s > bs) {
              bs = s;
              best = q;
            }
          }
          return best || near;
        }
        function humanPass(p) {
          const t = teams[p.team],
            q = passTarget(p);
          if (q) {
            passTo(p, q);
            if (!q.gk) {
              t.ctrl = q;
              t.swT = 0.6;
            }
          } else {
            kickBall(p, p.fx, p.fy, 420);
            SFX.pass();
          }
        }
        function startSlide(p) {
          if (p.slideCD > 0 || p.recover > 0 || p.slide > 0 || p.stun > 0)
            return;
          p.slide = 0.28;
          p.slideCD = 1.25;
          SFX.tackle();
          burst(p.x, p.y, 6, {
            color: "#d9ffe6",
            s0: 30,
            s1: 110,
            l0: 0.25,
            l1: 0.5,
            z0: 2,
            z1: 4,
          });
        }
        function take(p) {
          ball.owner = p;
          p.hold = 0;
          p.protect = 0.7;
          p.aiRel = 0;
          ball.fire = 0;
          const t = teams[p.team];
          if (t.sankofa > 0) t.sankofa = 0;
        }

