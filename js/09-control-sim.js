"use strict";
        /* ---------- human control ---------- */
        function humanControl(p, dt) {
          const input = inputOf(p.team);
          let mx = input.mx,
            my = input.my;
          const m = hyp(mx, my);
          if (m > 1) {
            mx /= m;
            my /= m;
          }
          p.dx = mx;
          p.dy = my;
          const rt = teams[p.team];
          if (rt.recv === p && !ball.owner) {
            const mm = hyp(mx, my);
            if (mm < 0.25) rt.recvArmed = true;
            if (rt.recvArmed && mm > 0.25) rt.recv = null;
            else {
              const ip = interceptPoint(p),
                ddx = ip[0] - p.x,
                ddy = ip[1] - p.y,
                dd = hyp(ddx, ddy);
              rt.recvPt = ip;
              if (dd > 6) {
                p.dx = ddx / dd;
                p.dy = ddy / dd;
              } else {
                p.dx = p.dy = 0;
              }
              return;
            }
          }
          if (ball.owner === p) {
            if (input.shootHeld) p.charge = Math.min(1, p.charge + dt / 0.7);
            if (input.shootUp) {
              const c = Math.max(0.55, p.charge);
              let dx = p.fx,
                dy = p.fy;
              const gx = oppGoalX(p.team);
              if (dx * attackDir(p.team) > 0.2) {
                const tt = (gx - p.x) / dx,
                  yh = p.y + dy * tt;
                if (yh > GY0 - 80 && yh < GY1 + 80) {
                  const ty = clamp(yh, GY0 + 14, GY1 - 14);
                  dx = gx - p.x;
                  dy = ty - p.y;
                }
              }
              shoot(p, c, dx, dy);
            } else if (input.passT > 0) {
              input.passT = 0;
              humanPass(p);
            }
          } else {
            p.charge = 0;
            if (input.slide) startSlide(p);
            if (input.press) {
              const tg =
                  ball.owner && ball.owner.team !== p.team ? ball.owner : ball,
                ex = tg.x - p.x,
                ey = tg.y - p.y,
                ed = hyp(ex, ey);
              if (ed > 4) {
                p.dx = ex / ed;
                p.dy = ey / ed;
              }
            }
          }
        }
        function assignControl(t, dt) {
          t.swT -= dt;
          const o = ball.owner;
          if (o && o.team === t.id && !o.gk) {
            t.ctrl = o;
            return;
          }
          if (t.ctrl && t.swT > 0) return;
          let best = null,
            bd = 1e9;
          for (const p of t.players) {
            if (p.gk) continue;
            let d = hyp(p.x - ball.x, p.y - ball.y);
            if (p === t.ctrl) d *= 0.8;
            if (p.stun > 0) d *= 1.6;
            if (d < bd) {
              bd = d;
              best = p;
            }
          }
          t.ctrl = best;
          t.swT = 0.15;
        }
        function switchPlayer(t = teams[0]) {
          if (demo || state !== "play" || paused) return;
          if (ball.owner && ball.owner === t.ctrl) return;
          let best = null,
            bd = 1e9;
          for (const p of t.players) {
            if (p.gk || p === t.ctrl || p.stun > 0) continue;
            const d = hyp(p.x - ball.x, p.y - ball.y);
            if (d < bd) {
              bd = d;
              best = p;
            }
          }
          if (best) {
            t.ctrl = best;
            t.swT = 1;
            t.recv = null;
          }
        }

        /* ---------- simulation ---------- */
        function movePlayer(p, dt) {
          p.x = clamp(p.x + p.vx * dt, PX0 + p.r, PX1 - p.r);
          p.y = clamp(p.y + p.vy * dt, PY0 + p.r, PY1 - p.r);
        }
        function updatePlayer(p, dt, active) {
          p.stun = Math.max(0, p.stun - dt);
          p.giant = Math.max(0, p.giant - dt);
          p.azonto = Math.max(0, p.azonto - dt);
          p.slideCD = Math.max(0, p.slideCD - dt);
          p.recover = Math.max(0, p.recover - dt);
          p.pickupLock = Math.max(0, p.pickupLock - dt);
          p.tackleCD = Math.max(0, p.tackleCD - dt);
          p.hitCD = Math.max(0, p.hitCD - dt);
          p.protect = Math.max(0, p.protect - dt);
          p.magnet = Math.max(0, p.magnet - dt);
          p.heavy = Math.max(0, p.heavy - dt);
          p.cut = Math.max(0, p.cut - dt);
          p.cutCD = Math.max(0, p.cutCD - dt);
          p.scale += ((p.giant > 0 ? 1.25 : 1) - p.scale) * Math.min(1, dt * 7);
          p.r = p.base * p.scale;
          p.hold = ball.owner === p ? p.hold + dt : 0;
          if (p.stun > 0) {
            p.dash = 0;
            const k = Math.exp(-5 * dt);
            p.vx *= k;
            p.vy *= k;
            movePlayer(p, dt);
            return;
          }
          if (p.dash > 0) {
            p.dash -= dt;
            const s = p.speed * 1.7;
            p.vx = p.dashX * s;
            p.vy = p.dashY * s;
            p.fx = p.dashX;
            p.fy = p.dashY;
            p.phase += dt * 16;
            for (const q of teams[1 - p.team].players) {
              if (q.gk || q.stun > 0) continue;
              if (hyp(q.x - p.x, q.y - p.y) < q.r + p.r + 14) {
                q.stun = 2;
                q.slide = 0;
                q.dash = 0;
                {
                  const nx = -p.dashY,
                    ny = p.dashX,
                    sd = (q.x - p.x) * nx + (q.y - p.y) * ny >= 0 ? 1 : -1;
                  q.vx = p.dashX * 220 + nx * sd * 620;
                  q.vy = p.dashY * 220 + ny * sd * 620;
                }
                burst(q.x, q.y, 14, {
                  color: ["#f5f1e6", "#d2bea0", "#fff"],
                  s0: 80,
                  s1: 320,
                  l0: 0.3,
                  l1: 0.7,
                });
                ring(q.x, q.y, q.r, q.r + 36, 0.35, "#f5f1e6");
                shake = Math.max(shake, reduceMotion ? 1 : 5);
                SFX.tackle();
              }
            }
            if (p.dash <= 0 || ball.owner !== p) {
              p.dash = 0;
              if (ball.owner === p) {
                p.heavy = 0.4;
                p.protect = 0;
              }
            }
            if (Math.random() < 0.6)
              burst(p.x - p.dashX * p.r, p.y - p.dashY * p.r, 1, {
                color: "rgba(210,190,160,.7)",
                s0: 10,
                s1: 40,
                l0: 0.3,
                l1: 0.6,
                z0: 4,
                z1: 7,
                drag: 2,
              });
            movePlayer(p, dt);
            return;
          }
          if (p.slide > 0) {
            p.slide -= dt;
            p.vx = p.fx * 580;
            p.vy = p.fy * 580;
            if (p.slide <= 0) p.recover = 0.32;
            p.phase += dt * 14;
            movePlayer(p, dt);
            if (Math.random() < 0.5)
              burst(p.x, p.y, 1, {
                color: "#e8fff0",
                s0: 10,
                s1: 50,
                l0: 0.2,
                l1: 0.4,
                z0: 2,
                z1: 4,
              });
            return;
          }
          if (p.recover > 0) {
            const k = Math.exp(-10 * dt);
            p.vx *= k;
            p.vy *= k;
            movePlayer(p, dt);
            return;
          }
          p.dx = p.dy = 0;
          const T = teams[p.team],
            human = !demo && T.human && p === T.ctrl,
            dir = attackDir(p.team);
          if (active) {
            if (human) humanControl(p, dt);
            else aiControl(p, dt);
          }
          const D = diffOf(p.team),
            cpuTeam = p.team === 1 && !T.human;
          let mul = (p.giant > 0 ? 0.85 : 1) * (ball.owner === p ? 0.93 : 1);
          if (ball.owner === p && p.charge > 0 && T.rocket > 0) mul *= 0.6;
          if (T.sankofa > 0 && !p.gk && ball.owner !== p && p.dx * dir < -0.2)
            mul *= human ? 1.3 : 1.4;
          const sp =
              p.speed * (cpuTeam ? D.speed : human ? 1 : 0.96) * mul,
            k = Math.min(1, dt * (p.giant > 0 ? 7 : 11));
          // Azonto: a change of direction of 60 degrees or more is a cut; tackles landing in its 0.15s window miss
          let cut = false;
          if (p.azonto > 0 && ball.owner === p && p.cutCD <= 0) {
            const m = hyp(p.dx, p.dy);
            if (m > 0.5) {
              const nx = p.dx / m,
                ny = p.dy / m;
              if (nx * p.azDX + ny * p.azDY < 0.5) {
                cut = true;
                p.cut = 0.15;
                p.cutCD = 0.4;
                p.azDX = nx;
                p.azDY = ny;
                p.fx = nx;
                p.fy = ny;
                SFX.cut();
                if (drill) drillEvent("cut", nearestOppDist(p.team, p.x, p.y));
                burst(p.x, p.y - p.r, 2, {
                  kind: "note",
                  color: "#3ddc84",
                  a: -Math.PI / 2,
                  spread: 0.8,
                  s0: 40,
                  s1: 90,
                  l0: 0.6,
                  l1: 0.9,
                  z0: 16,
                  z1: 20,
                  drag: 1,
                });
              }
            }
          }
          if (cut) {
            p.vx = p.dx * sp * 1.25;
            p.vy = p.dy * sp * 1.25;
          } else {
            p.vx += (p.dx * sp - p.vx) * k;
            p.vy += (p.dy * sp - p.vy) * k;
          }
          if (hyp(p.dx, p.dy) > 0.15) {
            const [nx, ny] = norm(p.dx, p.dy),
              f = Math.min(1, dt * (p.giant > 0 ? 7 : 15));
            const [ax, ay] = norm(
              p.fx + (nx - p.fx) * f,
              p.fy + (ny - p.fy) * f,
            );
            p.fx = ax;
            p.fy = ay;
          }
          p.phase += hyp(p.vx, p.vy) * dt * 0.055;
          movePlayer(p, dt);
        }
        function separatePlayers() {
          for (let i = 0; i < ALL.length; i++)
            for (let j = i + 1; j < ALL.length; j++) {
              const a = ALL[i],
                b = ALL[j];
              if (a.stun > 0 || b.stun > 0 || a.slide > 0 || b.slide > 0)
                continue;
              const dx = b.x - a.x,
                dy = b.y - a.y,
                d = hyp(dx, dy),
                rr = (a.r + b.r) * 0.92;
              if (d >= rr || d === 0) continue;
              const o = rr - d,
                nx = dx / d,
                ny = dy / d,
                wa = (b.r * b.r) / (a.r * a.r + b.r * b.r),
                wb = 1 - wa;
              a.x -= nx * o * wa;
              a.y -= ny * o * wa;
              b.x += nx * o * wb;
              b.y += ny * o * wb;
            }
        }
        function resolveTackles() {
          const o = ball.owner;
          if (!o) return;
          for (const q of teams[1 - o.team].players) {
            if (q.stun > 0 || q.tackleCD > 0) continue;
            const d = hyp(q.x - o.x, q.y - o.y);
            if (d >= q.r + o.r + 4) continue;
            const behind = (q.x - o.x) * o.fx + (q.y - o.y) * o.fy < 0;
            if (o.azonto > 0 && o.cut > 0 && !(q.slide > 0 && behind)) {
              q.tackleCD = 0.8;
              q.stun = Math.max(q.stun, 0.45);
              q.slide = 0;
              burst(q.x, q.y, 3, {
                kind: "note",
                color: "#3ddc84",
                a: -Math.PI / 2,
                spread: 1,
                s0: 40,
                s1: 90,
                l0: 0.6,
                l1: 0.9,
                z0: 16,
                z1: 20,
                drag: 1,
              });
              SFX.tackle();
              if (drill) drillEvent("dodge");
              continue;
            }
            // Trotro rush: a defender already standing in the lane takes the ball
            if (o.dash > 0) continue;
            const inLane = false;
            if (o.protect > 0 && !inLane) continue;
            const cpu = q.team === 1 && !teams[1].human,
              Dq = diffOf(1);
            let chance = cpu ? Dq.tackle : 0.45;
            if (q.slide > 0) chance = cpu ? Dq.slideHit : 1;
            if (q.gk) chance = 0.15;
            else if (q.giant > 0 && q.slide <= 0)
              chance = Math.min(0.95, chance + 0.35);
            if (o.giant > 0)
              chance =
                q.slide > 0 ? chance * 0.7 : Math.max(0.08, chance - 0.25);
            if (o.heavy > 0) chance = Math.min(1, chance + 0.25);
            if (inLane) chance = 1;
            q.tackleCD = 0.55;
            if (Math.random() < chance) {
              const slid = q.slide > 0;
              ball.owner = q;
              q.hold = 0;
              q.protect = 0.5;
              q.pickupLock = 0;
              o.pickupLock = 0.5;
              o.dash = 0;
              const [nx, ny] = norm(o.x - q.x, o.y - q.y);
              o.vx += nx * 240;
              o.vy += ny * 240;
              SFX.tackle();
              ball.shot = false;
              teams[o.team].lastPass = null;
              earn(teams[q.team], slid ? "slide" : "tackle", slid ? 12 : 14, q);
              if (slid) say("slide", 1);
              burst((o.x + q.x) / 2, (o.y + q.y) / 2, 8, {
                color: "#fff",
                s0: 50,
                s1: 200,
                l0: 0.2,
                l1: 0.4,
              });
            } else if (o.giant <= 0) {
              const [nx, ny] = norm(o.x - q.x, o.y - q.y);
              o.vx += nx * 90;
              o.vy += ny * 90;
            }
            break;
          }
        }

        function wallFx(sp) {
          if (sp > 200) SFX.bounce();
        }
        function ballWalls() {
          const r = ball.r;
          if (ball.y < PY0 + r) {
            ball.y = PY0 + r;
            wallFx(Math.abs(ball.vy));
            ball.vy = Math.abs(ball.vy) * 0.82;
          } else if (ball.y > PY1 - r) {
            ball.y = PY1 - r;
            wallFx(Math.abs(ball.vy));
            ball.vy = -Math.abs(ball.vy) * 0.82;
          }
          for (const left of [true, false]) {
            const lineX = left ? PX0 : PX1,
              sg = left ? 1 : -1,
              inside = (ball.x - lineX) * sg,
              inMouth = ball.y > GY0 && ball.y < GY1;
            if (inMouth) {
              if (inside < -GD + r) {
                ball.x = lineX + sg * (-GD + r);
                ball.vx = sg * Math.abs(ball.vx) * 0.2;
              }
              if (inside < 0) {
                if (ball.y < GY0 + r) {
                  ball.y = GY0 + r;
                  ball.vy = Math.abs(ball.vy) * 0.3;
                } else if (ball.y > GY1 - r) {
                  ball.y = GY1 - r;
                  ball.vy = -Math.abs(ball.vy) * 0.3;
                }
              }
            } else if (inside < r) {
              ball.x = lineX + sg * r;
              wallFx(Math.abs(ball.vx));
              ball.vx = sg * Math.abs(ball.vx) * 0.82;
            }
            for (const py of [GY0, GY1]) {
              const dx = ball.x - lineX,
                dy = ball.y - py,
                d = hyp(dx, dy);
              if (d < r + 6 && d > 0) {
                const nx = dx / d,
                  ny = dy / d,
                  vn = ball.vx * nx + ball.vy * ny;
                if (vn < 0) {
                  ball.vx -= 1.7 * vn * nx;
                  ball.vy -= 1.7 * vn * ny;
                  wallFx(Math.abs(vn));
                  burst(ball.x, ball.y, 5, {
                    color: "#fff",
                    s0: 50,
                    s1: 150,
                    l0: 0.15,
                    l1: 0.3,
                  });
                }
                ball.x = lineX + nx * (r + 6);
                ball.y = py + ny * (r + 6);
              }
            }
          }
        }
        function ballPlayers() {
          const fire = ball.fire > 0,
            sp = hyp(ball.vx, ball.vy);
          for (const p of ALL) {
            if (p.stun > 0) continue;
            const dx = ball.x - p.x,
              dy = ball.y - p.y,
              d = hyp(dx, dy),
              rr = p.r + ball.r,
              reach = rr + (p.magnet > 0 ? 25 : 0);
            if (d >= reach) continue;
            const opp = p.team !== ball.lastTeam,
              nx = dx / (d || 1),
              ny = dy / (d || 1);
            // Shito: an opponent body blocks it and a keeper can only parry, nobody catches it
            if (fire) {
              if (!opp || d >= rr) continue;
              if (!p.gk) {
                if (drill) drillEvent("burn");
                say("shito_burn", 3);
                p.stun = Math.max(p.stun, 2.5);
                p.slide = 0;
                p.dash = 0;
                ball.vx *= 0.93;
                ball.vy *= 0.93;
                ball.noEarn = false;
                burst(p.x, p.y, 16, {
                  color: ["#ff5a36", "#ff9f43", "#ffd166"],
                  s0: 80,
                  s1: 300,
                  l0: 0.3,
                  l1: 0.7,
                });
                ring(p.x, p.y, p.r, p.r + 40, 0.4, "#ff5a36");
                shake = Math.max(shake, reduceMotion ? 1 : 4);
                SFX.tackle();
                continue;
              }
              const vn = ball.vx * nx + ball.vy * ny;
              if (vn < 0) {
                ball.vx -= 2 * vn * nx;
                ball.vy -= 2 * vn * ny;
              }
              const a = p.gk ? rand(-0.5, 0.5) : 0,
                c = Math.cos(a),
                s = Math.sin(a),
                vx = ball.vx;
              ball.vx = (vx * c - ball.vy * s) * 0.45;
              ball.vy = (vx * s + ball.vy * c) * 0.45;
              ball.x = p.x + nx * rr;
              ball.y = p.y + ny * rr;
              ball.fire = 0;
              p.pickupLock = Math.max(p.pickupLock, 0.5);
              if (p.gk) {
                if (ball.shot) {
                  earn(teams[1 - p.team], "ontarget", 8);
                  earn(teams[p.team], "save", 6, p);
                  roar("ooh");
                  say("save", 1);
                }
              } else p.stun = Math.max(p.stun, 0.4);
              ball.shot = false;
              ball.lastTeam = p.team;
              ball.noEarn = true;
              burst(ball.x, ball.y, 10, {
                color: ["#ff5a36", "#ff9f43", "#fff"],
                s0: 60,
                s1: 240,
                l0: 0.2,
                l1: 0.5,
              });
              shake = Math.max(shake, reduceMotion ? 2 : 5);
              SFX.tackle();
              return;
            }
            const limit = p.magnet > 0 ? 900 : p.gk ? 700 : 600;
            if (p.pickupLock <= 0 && sp < limit) {
              onPickup(p, sp);
              take(p);
              return;
            }
            if (d >= rr) continue;
            const vn = ball.vx * nx + ball.vy * ny;
            if (vn < 0) {
              ball.vx -= 1.65 * vn * nx;
              ball.vy -= 1.65 * vn * ny;
              ball.vx += p.vx * 0.35;
              ball.vy += p.vy * 0.35;
              wallFx(Math.abs(vn));
              if (p.gk && opp && ball.shot) {
                earn(teams[1 - p.team], "ontarget", 8);
                earn(teams[p.team], "save", 6, p);
                roar("ooh");
                say("save", 1);
                ball.shot = false;
              }
            }
            ball.x = p.x + nx * rr;
            ball.y = p.y + ny * rr;
          }
        }
        function updateBall(g) {
          if (ball.owner) {
            const p = ball.owner,
              off = p.r + ball.r + 2 + (p.heavy > 0 ? 20 : 0),
              tx = p.x + p.fx * off,
              ty = p.y + p.fy * off,
              k = Math.min(1, g * 22);
            ball.x = clamp(
              ball.x + (tx - ball.x) * k,
              PX0 + ball.r,
              PX1 - ball.r,
            );
            ball.y = clamp(
              ball.y + (ty - ball.y) * k,
              PY0 + ball.r,
              PY1 - ball.r,
            );
            ball.vx = p.vx;
            ball.vy = p.vy;
            ball.rot += (hyp(p.vx, p.vy) * g) / ball.r;
            return;
          }
          const speed = hyp(ball.vx, ball.vy),
            steps = Math.max(1, Math.ceil((speed * g) / 8)),
            h = g / steps;
          for (let s = 0; s < steps; s++) {
            ball.x += ball.vx * h;
            ball.y += ball.vy * h;
            ballWalls();
            if (state === "play") {
              ballPlayers();
              if (ball.owner) return;
            }
          }
          const inNet = ball.x < PX0 || ball.x > PX1,
            k = (ball.fire > 0 ? 0.3 : 1.15) + (inNet ? 5 : 0);
          ball.vx *= Math.exp(-k * g);
          ball.vy *= Math.exp(-k * g);
          if (hyp(ball.vx, ball.vy) < 8) {
            ball.vx = ball.vy = 0;
          }
          ball.rot += ((speed * g) / ball.r) * 0.6;
          if (ball.fire > 0) {
            ball.fire -= g;
            if (speed < 520) ball.fire = 0;
            burst(ball.x, ball.y, 3, {
              color: ["#ff5a36", "#b3261e", "#ff9f43"],
              kind: "flame",
              s0: 10,
              s1: 60,
              l0: 0.25,
              l1: 0.5,
              z0: 5,
              z1: 10,
              drag: 3,
            });
            if (Math.random() < 0.5)
              burst(ball.x, ball.y, 1, {
                color: "rgba(70,35,25,.55)",
                s0: 10,
                s1: 40,
                l0: 0.5,
                l1: 0.9,
                z0: 4,
                z1: 8,
                drag: 2,
              });
          }
        }
        function checkGoal() {
          if (ball.y > GY0 && ball.y < GY1) {
            if (ball.x < PX0 - ball.r) return 1;
            if (ball.x > PX1 + ball.r) return 0;
          }
          return -1;
        }

        function playUpdate(g) {
          if (drill) drillTick(g);
          if (juju.active) {
            matchT = Math.max(matchT, 0.05);
            jujuUpdate(g);
          }
          if (!sudden && !demo && !juju.active && !drill) {
            if (net.on) juju.rolled = true;
            matchT -= g;
            if (matchT <= 10 && !CM.l10 && !sudden) {
              CM.l10 = true;
              say("last10", 2);
            }
            if (matchT <= 3 && !juju.rolled) {
              juju.rolled = true;
              if (
                teams[1].score < teams[0].score &&
                matchT > 0 &&
                Math.random() < 0.5
              )
                jujuCast();
            }
            if (matchT <= 0 && !juju.active) {
              matchT = 0;
              if (teams[0].score === teams[1].score) {
                sudden = true;
                showBanner("Level at full time. Next goal wins!", "#fff");
                SFX.whistle();
                say("golden", 3, 400);
              } else {
                endMatch();
                return;
              }
            }
          }
          simClock += g;
          for (const t of teams) {
            for (const p of POWERS) t.pw[p.id] = Math.max(0, t.pw[p.id] - g);
            t.rocket = Math.max(0, t.rocket - g);
            t.dumsor = Math.max(0, t.dumsor - g);
            t.sankofa = Math.max(0, t.sankofa - g);
            t.lock = Math.max(0, t.lock - g);
            if (t.wind) {
              t.wind.t -= g;
              if (t.wind.t <= 0) landPower(t);
            }
            t.recvT = Math.max(0, t.recvT - g);
            if (ball.owner || t.recvT <= 0) {
              t.recv = null;
              t.recvPt = null;
            }
          }
          for (const t of teams) if (t.human) assignControl(t, g);
          pickChasers();
          if (!drill)
            for (const t of teams) if (demo || (t.id === 1 && !t.human)) aiPowers(t, g);
          for (const p of ALL) updatePlayer(p, g, true);
          separatePlayers();
          resolveTackles();
          updateBall(g);
          trackBeat();
          if (ball.owner) teams[ball.owner.team].stats.poss += g;
          const sc = checkGoal();
          if (sc >= 0) {
            if (drill) drillEvent("goal", sc);
            else goalScored(sc);
          }
        }

        function stepFx(g, dt) {
          for (let i = parts.length - 1; i >= 0; i--) {
            const q = parts[i];
            q.life += g;
            if (q.life >= q.max) {
              parts.splice(i, 1);
              continue;
            }
            q.vy += q.g * g;
            const k = Math.exp(-q.drag * g);
            q.vx *= k;
            q.vy *= k;
            q.x += q.vx * g;
            q.y += q.vy * g;
            q.rot += g * 8;
          }
          for (let i = rings.length - 1; i >= 0; i--) {
            rings[i].life += dt;
            if (rings[i].life >= rings[i].max) rings.splice(i, 1);
          }
        }
        function update(dt) {
          if (net.guest) {
            netGuestStep(dt);
            return;
          }
          time += dt;
          timeScale += (timeScaleTarget - timeScale) * Math.min(1, dt * 6);
          if (Math.abs(timeScale - timeScaleTarget) < 0.01)
            timeScale = timeScaleTarget;
          const g = dt * timeScale;
          if (shake > 0) shake = Math.max(0, shake - dt * 45);
          for (let i = later.length - 1; i >= 0; i--) {
            later[i].t -= g;
            if (later[i].t <= 0) {
              const f = later[i].fn;
              later.splice(i, 1);
              f();
            }
          }
          if (state === "kickoff") {
            stateT -= dt;
            for (const p of ALL) updatePlayer(p, g, false);
            if (!demo) {
              const n = Math.ceil((stateT - 0.4) / 0.6);
              if (n >= 1) setBig(String(n), "#fff");
              else setBig("Go!", "#ffc61a", 700);
            }
            if (stateT <= 0) {
              state = "play";
              const a = teams[kickTeam].players[1];
              take(a);
              teams[1 - kickTeam].players.forEach((p) => (p.pickupLock = 0.6));
              if (!demo) {
                SFX.whistle();
                say("kickoff", 2, 300);
              }
            }
          } else if (state === "rewind") rewindStep();
          else if (state === "play") playUpdate(g);
          else if (state === "goal") {
            stateT -= dt;
            for (const p of ALL) updatePlayer(p, g, false);
            updateBall(g);
            if (stateT < 2.2) timeScaleTarget = 1;
            if (
              !demo &&
              !net.on &&
              lastScorer === 0 &&
              !goalUndone &&
              stateT < 2.6 &&
              stateT > 2.2
            ) {
              const c = teams[1],
                D = diffOf(1);
              if (
                c.loadout.includes("sankofa") &&
                c.pw.sankofa <= 0 &&
                c.morale >= powerCost(c, "sankofa") &&
                Math.random() < g * D.moraleUse * 1.2
              )
                usePower(c, "sankofa");
            }
            if (stateT <= 0) {
              hideBig();
              if (sudden && !demo) {
                endMatch();
              } else if (drill) drillEvent("goalover");
              else setupKickoff(1 - lastScorer);
            }
          }
          if (!demo && (state === "play" || state === "goal")) histPush();
          stepFx(g, dt);
          input.shootUp = false;
          input.slide = false;
          input.passT = Math.max(0, input.passT - dt);
          rin.shootUp = false;
          rin.slide = false;
          rin.passT = Math.max(0, rin.passT - dt);
        }

