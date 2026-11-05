"use strict";
        /* ---------- AI ---------- */
        function nearestOppDist(team, x, y) {
          let m = 1e9;
          for (const q of teams[1 - team].players) {
            if (q.stun > 0 || hidden(q)) continue;
            const d = hyp(q.x - x, q.y - y);
            if (d < m) m = d;
          }
          return m;
        }
        function interceptPoint(p) {
          const k = 1.15,
            sp = p.speed * (p.team === 1 && !teams[1].human ? DIFF[settings.diff].speed : 0.96);
          let px = ball.x,
            py = ball.y;
          for (let s = 0; s <= 1.6; s += 0.08) {
            const f = (1 - Math.exp(-k * s)) / k;
            px = clamp(ball.x + ball.vx * f, PX0 + 12, PX1 - 12);
            py = clamp(ball.y + ball.vy * f, PY0 + 12, PY1 - 12);
            if (hyp(px - p.x, py - p.y) <= sp * s) break;
          }
          return [px, py];
        }
        function pickChasers() {
          for (const t of teams) {
            t.chaser = null;
            if (ball.owner && ball.owner.team === t.id) continue;
            if (t.recv && !ball.owner && t.recvT > 0) {
              t.chaser = t.recv;
              continue;
            }
            const ref = ball.owner || ball;
            let best = null,
              bd = 1e9;
            for (const p of t.players) {
              if (p.gk || p.stun > 0) continue;
              let d = hyp(p.x - ref.x, p.y - ref.y);
              if (p.slide > 0) d *= 0.5;
              if (d < bd) {
                bd = d;
                best = p;
              }
            }
            t.chaser = best;
          }
        }
        function steer(p, tx, ty) {
          const dx = tx - p.x,
            dy = ty - p.y,
            d = hyp(dx, dy);
          if (d < 10) {
            p.dx = p.dy = 0;
            return;
          }
          const m = Math.min(1, d / 55);
          p.dx = (dx / d) * m;
          p.dy = (dy / d) * m;
        }
        function aiShoot(p, D, charge) {
          const gk = teams[1 - p.team].players[0],
            gx = oppGoalX(p.team);
          let ty = gk.y < CY ? GY1 - 26 : GY0 + 26;
          ty += rand(-1, 1) * (1 - D.acc) * 110;
          ty = clamp(ty, GY0 - 34, GY1 + 34);
          shoot(
            p,
            charge === undefined ? rand(0.7, 1) : charge,
            gx - p.x,
            ty - p.y,
          );
        }
        function aiMaybePass(p) {
          const dir = attackDir(p.team),
            pressure = nearestOppDist(p.team, p.x, p.y) < 82;
          let best = null,
            bv = -1e9;
          for (const q of teams[p.team].players) {
            if (q === p || q.gk || q.stun > 0) continue;
            const dx = q.x - p.x,
              dy = q.y - p.y,
              d = hyp(dx, dy);
            if (d < 90 || d > 520) continue;
            const open = nearestOppDist(p.team, q.x, q.y);
            if (open < 80) continue;
            const v = dx * dir * 0.5 + open * 0.6 - d * 0.2;
            if (v > bv) {
              bv = v;
              best = q;
            }
          }
          if (best && (pressure || p.hold > 1.7)) {
            passTo(p, best);
            return true;
          }
          return false;
        }
        function aiKeeper(p, dt, D) {
          const gx = ownGoalX(p.team),
            dir = attackDir(p.team);
          if (ball.owner === p) {
            p.dx = p.dy = 0;
            if (p.hold > 0.6) {
              let best = null,
                bv = -1e9;
              for (const q of teams[p.team].players) {
                if (q.gk || q.stun > 0) continue;
                const v =
                  nearestOppDist(p.team, q.x, q.y) + (q.x - p.x) * dir * 0.3;
                if (v > bv) {
                  bv = v;
                  best = q;
                }
              }
              if (best) passTo(p, best);
              else kickBall(p, dir, rand(-0.4, 0.4), 620);
            }
            return;
          }
          p.errT -= dt;
          if (p.errT <= 0) {
            p.err = rand(-1, 1) * D.gkErr;
            p.errT = 0.3;
          }
          const adv = clamp((700 - Math.abs(ball.x - gx)) / 700, 0, 1) * 44;
          let tx = gx + dir * (28 + adv),
            by = ball.y;
          const incoming = !ball.owner && ball.vx * dir < -60;
          if (incoming) {
            const tt = (tx - ball.x) / ball.vx;
            if (tt > 0 && tt < 2) by = ball.y + ball.vy * tt;
          }
          let ty = clamp(by + p.err * (incoming ? 1 : 0.3), GY0 + 8, GY1 - 8);
          if (
            !ball.owner &&
            Math.abs(ball.x - gx) < 190 &&
            Math.abs(ball.y - CY) < 170 &&
            hyp(ball.vx, ball.vy) < 260
          ) {
            tx = ball.x;
            ty = ball.y;
          }
          steer(p, tx, ty);
        }
        function aiControl(p, dt) {
          const t = teams[p.team],
            D = diffOf(p.team);
          if (p.gk) {
            aiKeeper(p, dt, D);
            return;
          }
          if (drill && p.role === "hold") {
            p.dx = p.dy = 0;
            return;
          }
          if (t.recv === p && !ball.owner) {
            const ip = interceptPoint(p),
              dx = ip[0] - p.x,
              dy = ip[1] - p.y,
              d = hyp(dx, dy);
            if (d > 6) {
              p.dx = dx / d;
              p.dy = dy / d;
            }
            return;
          }
          const dir = attackDir(p.team),
            gx = oppGoalX(p.team),
            ogx = ownGoalX(p.team),
            owner = ball.owner;
          if (owner === p) {
            let ax = dir,
              ay = (CY - p.y) * 0.004;
            for (const q of teams[1 - p.team].players) {
              if (q.stun > 0 || hidden(q)) continue;
              const dx = q.x - p.x,
                dy = q.y - p.y,
                d = hyp(dx, dy);
              if (d < 130 && dx * dir > -20) {
                const w = (130 - d) / 130;
                ay += -Math.sign(dy || Math.random() - 0.5) * w * 1.6;
                ax -= w * 0.3 * dir;
              }
            }
            const dist = Math.abs(gx - p.x);
            if (dist < 260) ay += (CY - p.y) * 0.006;
            const [nx, ny] = norm(ax, ay);
            p.dx = nx;
            p.dy = ny;
            // Azonto: cut sharply when a tackler closes in; better CPUs time it more often
            if (p.azonto > 0) {
              p.azT -= dt;
              if (
                p.azT <= 0 &&
                nearestOppDist(p.team, p.x, p.y) < 95 &&
                Math.random() < D.timing
              ) {
                const sg = Math.random() < 0.5 ? 1 : -1;
                p.azX = -ny * sg;
                p.azY = nx * sg;
                p.azHold = 0.18;
                p.azT = 0.45;
              }
              if (p.azHold > 0) {
                p.azHold -= dt;
                p.dx = p.azX;
                p.dy = p.azY;
              }
            }
            // Shito: hold the charge before releasing; weaker CPUs let go too early
            if (t.rocket > 0 && dist < D.shootRange + 60) {
              if (!p.aiRel)
                p.aiRel = Math.random() < D.timing ? 0.92 : rand(0.6, 0.84);
              p.charge = Math.min(1, p.charge + dt / 0.7);
              if (p.charge >= p.aiRel) aiShoot(p, D, p.charge);
              return;
            }
            p.think -= dt;
            if (p.hold > D.react && dist < D.shootRange && p.think <= 0) {
              p.think = 0.12;
              if (Math.random() < (dist < 210 ? 0.5 : 0.22)) {
                aiShoot(p, D);
                return;
              }
            }
            if (p.hold > D.react + 0.2 && p.think <= 0) {
              p.think = 0.2;
              aiMaybePass(p);
            }
            return;
          }
          const teamHas = owner && owner.team === p.team,
            oppHas = owner && owner.team !== p.team,
            f = formation[p.idx];
          const prog = (ball.x - PX0) / (PX1 - PX0),
            myProg = p.team === 0 ? prog : 1 - prog;
          let a = clamp(
            f[0] + (myProg - 0.5) * 320 + (teamHas ? 90 : oppHas ? -40 : 0),
            130,
            PX1 - PX0 - 120,
          );
          let tx = p.team === 0 ? PX0 + a : PX1 - a,
            ty = lerp(f[1], ball.y, 0.35);
          if (t.chaser === p) {
            if (owner && owner.team !== p.team) {
              tx = owner.x + owner.vx * 0.12;
              ty = owner.y + owner.vy * 0.12;
              const d = hyp(owner.x - p.x, owner.y - p.y);
              if (
                d < 92 &&
                p.slideCD <= 0 &&
                !(owner.azonto > 0 && Math.random() < D.timing) &&
                Math.random() < D.slide * dt * 3
              ) {
                p.fx = (owner.x - p.x) / d;
                p.fy = (owner.y - p.y) / d;
                startSlide(p);
                return;
              }
            } else {
              tx = ball.x + ball.vx * 0.18;
              ty = ball.y + ball.vy * 0.18;
            }
          } else if (t.sankofa > 0 && !teamHas) {
            tx = clamp(lerp(ogx, ball.x, 0.42), PX0 + 60, PX1 - 60);
            ty = lerp(CY + (p.idx - 2) * 90, ball.y, 0.5);
          } else if (teamHas) {
            tx = clamp(
              owner.x + dir * (p.idx === 1 ? 170 : 110),
              PX0 + 90,
              PX1 - 90,
            );
            ty = lerp(f[1], CY, 0.2);
          } else if (oppHas) {
            tx = clamp(lerp(ogx, ball.x, 0.5), PX0 + 110, PX1 - 110);
            ty = lerp(f[1], ball.y, 0.4);
          }
          steer(p, tx, ty);
        }
        function laneClear(t, p, dx, dy, len, w) {
          for (const q of teams[1 - t.id].players) {
            if (q.stun > 0) continue;
            const rx = q.x - p.x,
              ry = q.y - p.y,
              al = rx * dx + ry * dy;
            if (al > 0 && al < len && Math.abs(-rx * dy + ry * dx) < w + q.r)
              return false;
          }
          return true;
        }
        function aiPowers(t, dt) {
          t.aiTimer -= dt;
          if (t.aiTimer > 0 || t.wind || t.lock > 0) return;
          const D = diffOf(t.id);
          t.aiTimer = D.powerTick * rand(0.7, 1.3);
          const before = t.stats.powers;
          const o = ball.owner,
            myHas = o && o.team === t.id,
            oppHas = o && o.team !== t.id,
            c = carrierOf(t),
            dir = attackDir(t.id),
            gx = oppGoalX(t.id);
          const sp = hyp(ball.vx, ball.vy);
          let mateDist = 1e9;
          for (const p of t.players) {
            if (!p.gk)
              mateDist = Math.min(mateDist, hyp(p.x - ball.x, p.y - ball.y));
          }
          const goalSide = t.players.filter(
            (p) => !p.gk && (p.x - ball.x) * dir < 0,
          ).length;
          const want = {
            shito: () =>
              c &&
              t.rocket <= 0 &&
              Math.abs(c.x - gx) < D.shootRange + 100 &&
              (() => {
                const [nx, ny] = norm(gx - c.x, CY - c.y);
                return laneClear(t, c, nx, ny, Math.abs(gx - c.x), 24);
              })(),
            trotro: () =>
              c && c.fx * dir > 0.6 && laneClear(t, c, c.fx, c.fy, 260, 30),
            azonto: () => c && nearestOppDist(t.id, c.x, c.y) < 120,
            dumsor: () =>
              c &&
              Math.abs(c.x - gx) < 700 &&
              teams[1 - t.id].players.some(
                (q) => !q.gk && q.stun <= 0 && hyp(q.x - c.x, q.y - c.y) < 260,
              ),
            obolo: () =>
              (oppHas &&
                t.chaser &&
                hyp(t.chaser.x - o.x, t.chaser.y - o.y) < 110) ||
              (c && nearestOppDist(t.id, c.x, c.y) < 80),
            magnet: () =>
              !o && sp > 250 && ball.lastTeam !== t.id && mateDist < 170,
            sankofa: () => !myHas && inOwnHalf(t, ball.x) && goalSide < 2,
          };
          const order = t.loadout.slice().sort(() => Math.random() - 0.5);
          for (const id of order) {
            if (
              t.pw[id] <= 0 &&
              t.morale >= powerCost(t, id) &&
              want[id]() &&
              Math.random() < D.moraleUse
            ) {
              if (usePower(t, id)) break;
            }
          }
          if (t.stats.powers > before) t.aiTimer = D.powerGap;
        }

