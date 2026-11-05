"use strict";
        /* ---------- practice room ---------- */
        // A drill is one power in a scripted scene: full Morale, no clock, no CPU powers, and a coach card saying what to do next.
        let drill = null;
        const coachEl = $("coach"),
          coachT = $("coachT"),
          coachB = $("coachB"),
          coachRow = $("coachRow");
        const touchy = () => document.body.classList.contains("has-touch");
        function coach(title, body, color, btns) {
          coachT.textContent = title;
          coachB.textContent = body || "";
          coachEl.style.setProperty("--cc", color || "#ffc61a");
          coachRow.innerHTML = "";
          for (const [label, fn, alt] of btns || []) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "btn" + (alt ? " alt" : "");
            b.textContent = label;
            b.addEventListener("click", fn);
            coachRow.appendChild(b);
          }
        }
        function pulse(on) {
          const b = drill && pbtn[drill.id];
          if (b) b.root.classList.toggle("pulse", on);
        }
        function park(p, x, y, role) {
          p.x = x;
          p.y = y;
          p.vx = p.vy = p.dx = p.dy = 0;
          p.fx = attackDir(p.team);
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
          p.role = role === "free" ? null : "hold";
        }
        const DRILL_PARK = [
          [
            [PX0 + 300, PY0 + 60],
            [PX0 + 300, PY1 - 60],
          ],
          [
            [PX1 - 140, PY0 + 50],
            [PX1 - 140, PY1 - 50],
            [PX1 - 220, PY0 + 120],
          ],
        ];
        // s.you: where you start; s.opp / s.mine: CPU and own outfield players as [x,y,'free'?] (they stand still unless 'free');
        // s.give: index of the CPU player who starts with the ball; s.loose: [x,y] for a loose ball. Default: you have the ball.
        function drillScene(s) {
          clearEffects();
          hist.length = 0;
          hideBig();
          goalLog = [];
          goalUndone = false;
          rewind = null;
          for (const t of teams) {
            t.score = 0;
            t.morale = MOR_MAX;
            t.lastUse = {};
            t.lock = 0;
            t.wind = null;
            t.ctrl = null;
            t.chaser = null;
            t.recv = null;
            t.recvPt = null;
            POWERS.forEach((p) => (t.pw[p.id] = 0));
          }
          const a = teams[0].players,
            b = teams[1].players;
          park(a[0], PX0 + 48, CY);
          park(b[0], PX1 - 48, CY);
          park(a[1], s.you[0], s.you[1]);
          for (let i = 0; i < 2; i++) {
            const q = (s.mine || [])[i] || DRILL_PARK[0][i];
            park(a[2 + i], q[0], q[1], q[2]);
          }
          for (let i = 1; i < 4; i++) {
            const q = (s.opp || [])[i - 1] || DRILL_PARK[1][i - 1];
            park(b[i], q[0], q[1], q[2]);
          }
          const own =
              s.give !== undefined ? b[s.give + 1] : s.loose ? null : a[1],
            bx = own ? own.x : s.loose[0],
            by = own ? own.y : s.loose[1];
          ball.x = bx;
          ball.y = by;
          ball.vx = ball.vy = 0;
          ball.owner = null;
          ball.fire = 0;
          ball.shot = false;
          ball.noEarn = false;
          ball.lastTeam = own ? own.team : 1;
          parts.length = 0;
          rings.length = 0;
          later.length = 0;
          if (own) take(own);
          teams[0].ctrl = a[1];
          state = "play";
          timeScale = timeScaleTarget = 1;
        }
        function startDrill(id, again) {
          const def = DRILLS[id];
          if (!def) return;
          initAudio();
          jujuReset();
          demo = false;
          paused = false;
          sudden = false;
          matchT = 999;
          resetTeams();
          hideBig();
          bannerEl.classList.remove("show");
          teams[0].loadout = [id];
          teams[1].loadout = [];
          drill = {
            id,
            def,
            step: "",
            t: 0,
            said: 0,
            done: false,
            again: !!again,
          };
          frameEl.classList.add("playing", "drill");
          hideMenus();
          buildPowerBar();
          def.setup();
          def.start(drill);
        }
        function drillGo(d, step) {
          d.step = step;
          d.t = 0;
          d.said = 0;
        }
        function drillRetry(d, title, body, to) {
          drillGo(d, "retry");
          d.to = to;
          pulse(false);
          coach(title, body, "#ff9f43");
        }
        function drillWin(d, title, body) {
          d.done = true;
          pulse(false);
          const k = Object.keys(DRILLS),
            nx = k[k.indexOf(d.id) + 1];
          coach(title, body, "#3ddc84", [
            ...(nx ? [["Next: " + PW[nx].name, () => startDrill(nx)]] : []),
            ["Again", () => startDrill(d.id, true), !!nx],
            ["Back", toMenu, true],
          ]);
        }
        function drillTick(g) {
          const d = drill;
          d.t += g;
          teams[0].morale = teams[1].morale = MOR_MAX;
          if (d.done) return;
          if (d.step === "retry") {
            if (d.t > 1.6) {
              d.def.setup();
              d.def[d.to](d);
            }
            return;
          }
          d.def.tick(d, g);
        }
        const lostBall = () => ball.owner && ball.owner.team === 1;
        const usePrompt = () =>
          touchy() ? "Tap the glowing power" : "Press 1";
        function drillEvent(n, a) {
          if (drill && !drill.done) drill.def.event(drill, n, a);
        }
        const DRILLS = {
          shito: {
            setup() {
              drillScene({ you: [830, CY], opp: [[950, CY]] });
            },
            start(d) {
              this[d.again ? "arm" : "intro"](d);
            },
            intro(d) {
              drillGo(d, "intro");
              coach(
                "Take a normal shot",
                (touchy()
                  ? "Hold Shoot, then let go."
                  : "Hold Space, then let go.") +
                  " A defender is standing in the way.",
              );
            },
            arm(d) {
              drillGo(d, "arm");
              pulse(true);
              coach(
                "Now arm Shito",
                (touchy() ? "Tap the glowing power." : "Press 1.") +
                  " It costs Morale, and yours is full in practice.",
              );
            },
            event(d, n, fire) {
              if (n === "shot") {
                if (d.step === "intro") drillGo(d, "blocked");
                else if (d.step === "arm")
                  drillRetry(
                    d,
                    "That was a plain shot",
                    "Arm Shito first, then shoot.",
                    "arm",
                  );
                else if (d.step === "fire") {
                  if (fire) drillGo(d, "flight");
                  else
                    drillRetry(
                      d,
                      "Not hot enough",
                      "Hold the charge until the ring turns orange.",
                      "arm",
                    );
                }
              } else if (d.step === "flight" && n === "burn")
                drillWin(
                  d,
                  "Burned straight through!",
                  "Hold the charge past 50% and the shot ignites. Anyone in its path is stunned for 2.5s. Keepers can still parry it.",
                );
              else if (d.step === "flight" && n === "goal")
                drillWin(
                  d,
                  "Goal!",
                  "Shito shots ignite when you hold the charge past 50%. Use one when a defender stands between you and the goal.",
                );
            },
            tick(d) {
              const t = teams[0],
                s = d.step;
              if (
                (s === "intro" || s === "arm" || s === "fire") &&
                ball.owner &&
                ball.owner.team === 1
              )
                return drillRetry(
                  d,
                  "Lost the ball",
                  "Setting it up again.",
                  s === "intro" ? "intro" : "arm",
                );
              if (s === "arm" && (t.wind || t.rocket > 0)) {
                drillGo(d, "fire");
                d.armed = false;
                pulse(false);
                coach(
                  "Hold the shot",
                  "Hold " +
                    (touchy() ? "Shoot" : "Space") +
                    " until the ring around you turns orange, then let go.",
                  PW.shito.color,
                );
              } else if (s === "fire") {
                if (t.rocket > 0) d.armed = true;
                if (d.armed && t.rocket < 1.2) t.rocket = 1.2;
                if (!d.armed && !t.wind && d.t > 0.3)
                  drillRetry(
                    d,
                    "Shito needs the ball",
                    "Keep it at your feet while you arm it.",
                    "arm",
                  );
              } else if (s === "blocked") {
                if (d.t > 1.2 && !d.said) {
                  d.said = 1;
                  coach(
                    "Blocked",
                    "A normal shot cannot get past a defender. Shito can.",
                    "#ff9f43",
                  );
                }
                if (d.t > 3.4) {
                  this.setup();
                  this.arm(d);
                }
              } else if (s === "flight" && d.t > 2.4)
                drillRetry(
                  d,
                  "Missed the defender",
                  "Face the defender and shoot straight at them.",
                  "arm",
                );
              else if (s === "retry" && d.t > 1.6) {
                this.setup();
                this[d.to](d);
              }
            },
          },
          dumsor: {
            setup() {
              drillScene({
                you: [620, CY],
                opp: [
                  [790, CY - 130, "free"],
                  [790, CY + 130, "free"],
                  [740, CY, "free"],
                ],
              });
            },
            start(d) {
              this.use(d);
            },
            use(d) {
              drillGo(d, "use");
              pulse(true);
              coach(
                "Three defenders closing in",
                usePrompt() + " and cut the lights.",
              );
            },
            event(d, n, a) {
              if (
                d.step === "dark" &&
                (n === "shot" || (n === "goal" && a === 0))
              )
                drillWin(
                  d,
                  "Lights out!",
                  "Dumsor freezes every opposing outfielder for 3s while you run free. It is a heavy power, so save it for a clear run at goal.",
                );
            },
            tick(d) {
              const t = teams[0],
                s = d.step;
              if (s === "use") {
                if (lostBall())
                  return drillRetry(
                    d,
                    "Lost the ball",
                    "Setting it up again.",
                    "use",
                  );
                if (t.wind || t.dumsor > 0) {
                  drillGo(d, "dark");
                  pulse(false);
                  coach(
                    "Lights out!",
                    "They are frozen for 3s. Run at goal and shoot!",
                    PW.dumsor.color,
                  );
                }
              } else if (s === "dark" && !t.wind && t.dumsor <= 0 && d.t > 0.6)
                drillRetry(
                  d,
                  "Too slow",
                  "Shoot before the lights come back on.",
                  "use",
                );
            },
          },
          trotro: {
            setup() {
              drillScene({
                you: [540, CY],
                opp: [
                  [700, CY - 34],
                  [700, CY + 34],
                  [780, CY],
                ],
              });
            },
            start(d) {
              this.use(d);
            },
            use(d) {
              drillGo(d, "use");
              pulse(true);
              coach(
                "A wall of defenders",
                "Face them, then " +
                  usePrompt().toLowerCase() +
                  ". Your direction locks once you go, so line up first.",
              );
            },
            event() {},
            tick(d) {
              const t = teams[0],
                you = t.players[1],
                s = d.step;
              if (s === "use") {
                if (lostBall())
                  return drillRetry(
                    d,
                    "Lost the ball",
                    "Setting it up again.",
                    "use",
                  );
                if (t.wind || you.dash > 0) {
                  drillGo(d, "rush");
                  pulse(false);
                  coach("Here we go!", "", PW.trotro.color);
                }
              } else if (s === "rush") {
                const n = teams[1].players.filter(
                  (q) => !q.gk && q.stun > 1,
                ).length;
                if (n >= 2)
                  drillWin(
                    d,
                    "Flattened " + n + " defenders!",
                    "Trotro rush bursts you down your lane and leaves everyone it hits dazed for 2s. Use it when defenders block your way.",
                  );
                else if (d.t > 1.8 && !t.wind && you.dash <= 0)
                  drillRetry(
                    d,
                    "Not enough of them",
                    "Face the wall head on before you go.",
                    "use",
                  );
              }
            },
          },
          azonto: {
            setup() {
              drillScene({
                you: [540, CY],
                opp: [
                  [780, CY - 110, "free"],
                  [820, CY + 110, "free"],
                ],
              });
            },
            start(d) {
              this.use(d);
            },
            use(d) {
              drillGo(d, "use");
              pulse(true);
              d.score = 0;
              coach(
                "Defenders closing in",
                usePrompt() +
                  ", then flick the stick sideways just as one reaches you.",
              );
            },
            event(d, n, a) {
              if (d.step !== "dance") return;
              if (n === "cut" && a < 150) {
                d.score++;
                floatText(
                  teams[0].players[1].x,
                  teams[0].players[1].y - 30,
                  "Nice cut!",
                  "#3ddc84",
                );
              } else if (n === "dodge") {
                d.score += 2;
                floatText(
                  teams[0].players[1].x,
                  teams[0].players[1].y - 30,
                  "Tackle missed!",
                  "#3ddc84",
                );
              }
              if (d.score >= 2)
                drillWin(
                  d,
                  "Dodged!",
                  "Every sharp cut bursts you away, and a tackle that lands in the middle of a cut misses. Cut when the defender is close, not early.",
                );
            },
            tick(d) {
              const t = teams[0],
                you = t.players[1],
                s = d.step;
              if (s === "use") {
                if (lostBall())
                  return drillRetry(
                    d,
                    "Lost the ball",
                    "Setting it up again.",
                    "use",
                  );
                if (t.wind || you.azonto > 0) {
                  drillGo(d, "dance");
                  d.score = 0;
                  pulse(false);
                  coach(
                    "Cut when they close in",
                    "Swing the stick sharply sideways as a defender reaches you. Two good cuts to pass.",
                    PW.azonto.color,
                  );
                }
              } else if (s === "dance") {
                if (lostBall())
                  return drillRetry(
                    d,
                    "Tackled",
                    "Cut sooner, just as they reach you.",
                    "use",
                  );
                if (!t.wind && you.azonto <= 0 && d.t > 0.4)
                  drillRetry(
                    d,
                    "The dance ran out",
                    "Cut sharply as a defender reaches you.",
                    "use",
                  );
              }
            },
          },
          obolo: {
            setup() {
              drillScene({ you: [520, CY], opp: [[700, CY]], give: 0 });
            },
            start(d) {
              this.use(d);
            },
            use(d) {
              drillGo(d, "use");
              pulse(true);
              coach(
                "Win the ball back",
                "The CPU player has it. " +
                  usePrompt() +
                  " for Obolo, then run straight into them.",
              );
            },
            event() {},
            tick(d) {
              const t = teams[0],
                you = t.players[1],
                s = d.step;
              if (s === "use" && (t.wind || you.giant > 0)) {
                drillGo(d, "chop");
                pulse(false);
                coach(
                  "Chop well!",
                  "Shoulder into them. Obolo lasts 4s.",
                  PW.obolo.color,
                );
              } else if (s === "chop") {
                if (ball.owner && ball.owner.team === 0)
                  drillWin(
                    d,
                    "Ball won!",
                    "While Obolo is on, shoulder-to-shoulder tackles go your way and you hold the ball better under pressure. You run slower, so use it up close.",
                  );
                else if (!t.wind && you.giant <= 0 && d.t > 0.5)
                  drillRetry(
                    d,
                    "Obolo wore off",
                    "Go in as soon as it lands.",
                    "use",
                  );
              }
            },
          },
          magnet: {
            setup() {
              drillScene({ you: [560, CY], loose: [900, CY - 80] });
            },
            launch() {
              const y = teams[0].players[1],
                ox = 900,
                oy = CY - 80,
                [nx, ny] = norm(y.x - ox, y.y + 40 - oy);
              ball.x = ox;
              ball.y = oy;
              ball.owner = null;
              ball.vx = nx * 820;
              ball.vy = ny * 820;
              ball.lastTeam = 1;
              ball.shot = false;
              ring(ox, oy, 6, 60, 0.4, PW.magnet.color);
              SFX.pass();
            },
            start(d) {
              if (d.again) this.use(d);
              else {
                drillGo(d, "intro");
                d.sent = false;
                coach(
                  "A fast ball is coming",
                  "Stand in its path and try to trap it.",
                );
              }
            },
            use(d) {
              drillGo(d, "use");
              pulse(true);
              coach(
                "Arm Ball magnet",
                usePrompt() +
                  ", then stand still and let the next ball come to you.",
              );
            },
            event() {},
            tick(d) {
              const t = teams[0],
                you = t.players[1],
                s = d.step;
              if (s === "intro") {
                if (!d.sent && d.t > 1.2) {
                  d.sent = true;
                  this.launch();
                }
                if (d.t > 4.2 && !d.said) {
                  d.said = 1;
                  coach(
                    "Too fast to control",
                    "Fast balls bounce off your first touch. Magnet fixes that.",
                    "#ff9f43",
                  );
                }
                if (d.t > 6.4) {
                  this.setup();
                  this.use(d);
                }
              } else if (s === "use") {
                if (t.wind || you.magnet > 0) {
                  drillGo(d, "catch");
                  d.sent = false;
                  pulse(false);
                  coach(
                    "Magnet on!",
                    "Stand still and let the ball come to you.",
                    PW.magnet.color,
                  );
                }
              } else if (s === "catch") {
                if (!d.sent && d.t > 0.3) {
                  d.sent = true;
                  this.launch();
                }
                if (ball.owner && ball.owner.team === 0)
                  drillWin(
                    d,
                    "Trapped it!",
                    "Ball magnet gives you a sticky first touch for 2.5s: you trap fast and loose balls from further away. It does nothing against a dribbler.",
                  );
                else if (
                  d.sent &&
                  ((!ball.owner && hyp(ball.vx, ball.vy) < 8) ||
                    (!t.wind && you.magnet <= 0))
                )
                  drillRetry(
                    d,
                    "It slipped past",
                    "Stand in its path, close to the ball line.",
                    "use",
                  );
              }
            },
          },
          sankofa: {
            setup() {
              drillScene({
                you: [760, CY + 90],
                mine: [
                  [820, CY - 110],
                  [880, CY + 10],
                ],
                opp: [[600, CY]],
                give: 0,
              });
            },
            start(d) {
              this.use(d);
            },
            use(d) {
              drillGo(d, "use");
              pulse(true);
              coach(
                "Out of position!",
                "The CPU is about to run at your goal. " +
                  usePrompt() +
                  " for Sankofa and your team sprints back.",
              );
            },
            B(d, msg) {
              drillScene({ you: [760, CY], opp: [[260, CY + 10]], give: 0 });
              teams[0].players[0].stun = 2;
              drillGo(d, "script");
              pulse(false);
              coach(
                msg ? "Window missed" : "Now the big one",
                msg || "The CPU is through on goal. Let it go in...",
              );
            },
            concede(d) {
              goalScored(1);
              const t = teams[0];
              t.pw.sankofa = 0;
              t.lastUse = {};
              drillGo(d, "rev");
              pulse(true);
              coach(
                "GOAL! Not so fast",
                usePrompt() + " now to reverse it.",
                PW.sankofa.color,
              );
            },
            event(d, n, a) {
              if (
                n === "goal" &&
                a === 1 &&
                (d.step === "back" || d.step === "shot")
              )
                this.concede(d);
              else if (n === "rewound" && d.step === "rev") {
                state = "play";
                drillWin(
                  d,
                  "Goal wiped!",
                  "Use Sankofa right after conceding and the goal is reversed: the score is wiped and you restart with the ball. You only have a few seconds, so do not wait.",
                );
              } else if (n === "goalover")
                this.B(
                  d,
                  "The GOAL! window is short. Press Sankofa the moment it goes in.",
                );
            },
            tick(d) {
              const t = teams[0],
                s = d.step;
              if (s === "use") {
                if (t.wind || t.sankofa > 0) {
                  const a = t.players,
                    b = teams[1].players;
                  a[2].role = a[3].role = b[1].role = null;
                  drillGo(d, "back");
                  pulse(false);
                  coach(
                    "Sprint back!",
                    "Your team runs goal-side for 2s. Win it back or stop the shot.",
                    PW.sankofa.color,
                  );
                }
              } else if (s === "back") {
                if (ball.owner && ball.owner.team === 0) {
                  drillGo(d, "won");
                  coach(
                    "Won it back!",
                    "Sankofa put your team goal-side. Next: what it does after a goal.",
                    "#3ddc84",
                  );
                } else if (d.t > 7) {
                  drillGo(d, "won");
                  coach(
                    "Held them off",
                    "Sankofa gets your team goal-side fast. Next: what it does after a goal.",
                    "#3ddc84",
                  );
                }
              } else if (s === "won") {
                if (d.t > 2.4) this.B(d);
              } else if (s === "script") {
                if (d.t > 1.3) {
                  const q = teams[1].players[1];
                  shoot(q, 0.9, PX0 - q.x, GY0 + 25 - q.y);
                  drillGo(d, "shot");
                }
              } else if (s === "shot" && d.t > 4) this.B(d, "Try again.");
            },
          },
        };
        function practiceFor(id) {
          const k = DRILLS[id] ? id : Object.keys(DRILLS)[0];
          startDrill(k);
        }

