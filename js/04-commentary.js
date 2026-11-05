"use strict";
        /* ---------- crowd, music and the commentator ---------- */
        const CM = {
          man: null,
          buf: {},
          cur: null,
          pri: 0,
          lastGroup: {},
          lastId: {},
          lastAny: 0,
          seq: 0,
          l10: false,
        };
        fetch("audio/cm/manifest.json")
          .then((x) => x.json())
          .then((m) => {
            CM.man = m;
          })
          .catch(() => {});
        function busGain(b, v, t) {
          if (b && actx) b.gain.setTargetAtTime(v, actx.currentTime, t || 0.12);
        }
        function cmGet(id) {
          if (CM.buf[id]) return CM.buf[id];
          if (!actx) return Promise.reject();
          return (CM.buf[id] = fetch("audio/cm/" + id + ".mp3")
            .then((x) => x.arrayBuffer())
            .then(
              (a) => new Promise((ok, no) => actx.decodeAudioData(a, ok, no)),
            )
            .catch((e) => {
              delete CM.buf[id];
              throw e;
            }));
        }
        function cmPreload(groups) {
          if (!actx || !CM.man) return;
          groups.forEach((g) =>
            (CM.man[g] || [])
              .slice(0, 2)
              .forEach((v) => cmGet(v.id).catch(() => {})),
          );
        }
        const cmCap = document.getElementById("cmCap");
        function capShow(t) {
          if (!cmCap) return;
          cmCap.textContent = t;
          cmCap.classList.add("show");
        }
        function capHide() {
          if (cmCap) cmCap.classList.remove("show");
        }
        function duckBuses(on) {
          busGain(
            musicBus,
            settings.music ? MUS_LVL * (on ? 0.3 : 1) : 0,
            on ? 0.05 : 0.3,
          );
          busGain(crowdBus, crowdBase * (on ? 0.45 : 1), on ? 0.05 : 0.3);
        }
        function cmStop() {
          if (CM.cur) {
            try {
              CM.cur.stop();
            } catch (e) {}
            CM.cur = null;
          }
          CM.pri = 0;
          capHide();
          duckBuses(false);
        }
        // one voice at a time: a line only interrupts a lower priority one, and stale lines are dropped so he never calls what already ended
        function say(group, pri, delay) {
          pri = pri || 1;
          if (delay) {
            setTimeout(() => say(group, pri), delay);
            return;
          }
          if (
            demo ||
            !settings.voice ||
            muted ||
            !actx ||
            actx.state !== "running" ||
            !CM.man ||
            !CM.man[group] ||
            !CM.man[group].length ||
            paused
          )
            return;
          const now = performance.now();
          if (CM.cur && pri <= CM.pri) return;
          if (pri < 3 && now < CM.lastAny + 1400) return;
          if (now - (CM.lastGroup[group] || -1e9) < (pri >= 3 ? 2500 : 6500))
            return;
          const list = CM.man[group];
          let v;
          do {
            v = list[Math.floor(Math.random() * list.length)];
          } while (list.length > 1 && v.id === CM.lastId[group]);
          CM.lastGroup[group] = now;
          CM.lastId[group] = v.id;
          const seq = ++CM.seq,
            t0 = now;
          cmGet(v.id)
            .then((buf) => {
              if (
                performance.now() - t0 > (pri >= 3 ? 4500 : 1600) ||
                paused ||
                !actx ||
                (seq !== CM.seq && pri < 3) ||
                (CM.cur && pri <= CM.pri)
              )
                return;
              const src = actx.createBufferSource();
              src.buffer = buf;
              src.connect(voiceBus);
              if (CM.cur) {
                try {
                  CM.cur.stop();
                } catch (e) {}
              }
              CM.cur = src;
              CM.pri = pri;
              CM.lastAny = performance.now() + buf.duration * 1000;
              duckBuses(true);
              capShow(v.text);
              src.onended = () => {
                if (CM.cur === src) {
                  CM.cur = null;
                  CM.pri = 0;
                  capHide();
                  duckBuses(false);
                }
              };
              src.start();
            })
            .catch(() => {});
        }
        let noiseBuf = null;
        function noiseBuffer() {
          if (noiseBuf || !actx) return noiseBuf;
          const n = actx.sampleRate * 2,
            b = actx.createBuffer(1, n, actx.sampleRate),
            c = b.getChannelData(0);
          for (let i = 0; i < n; i++) c[i] = Math.random() * 2 - 1;
          return (noiseBuf = b);
        }
        function crowdStart() {
          if (!actx || crowdSrc) return;
          const n = actx.sampleRate * 3,
            b = actx.createBuffer(1, n, actx.sampleRate),
            c = b.getChannelData(0);
          let l = 0;
          for (let i = 0; i < n; i++) {
            l = l * 0.94 + (Math.random() * 2 - 1) * 0.35;
            c[i] =
              l * (0.8 + 0.2 * Math.sin((i / actx.sampleRate) * 6.28 * 0.7));
          }
          const s = actx.createBufferSource(),
            f = actx.createBiquadFilter();
          s.buffer = b;
          s.loop = true;
          f.type = "lowpass";
          f.frequency.value = 1200;
          s.connect(f);
          f.connect(crowdBus);
          s.start();
          crowdSrc = s;
          busGain(crowdBus, crowdBase, 0.6);
        }
        function crowdStop() {
          if (crowdSrc) {
            busGain(crowdBus, 0, 0.4);
            const s = crowdSrc;
            crowdSrc = null;
            setTimeout(() => {
              try {
                s.stop();
              } catch (e) {}
            }, 1500);
          }
        }
        function crowdTick() {
          if (!crowdSrc || demo) return;
          const gx = Math.min(Math.abs(ball.x - PX0), Math.abs(ball.x - PX1)),
            near = Math.max(0, 1 - gx / 340);
          const target = 0.32 + 0.4 * near;
          crowdBase += (target - crowdBase) * 0.04;
          if (!CM.cur) busGain(crowdBus, crowdBase, 0.3);
        }
        function roar(kind) {
          if (!actx || muted || demo || actx.state !== "running") return;
          const P = {
            goal: [2.8, 700, 1600, 2.2],
            ooh: [1.1, 500, 950, 1.2],
            groan: [1.4, 520, 240, 1.1],
          }[kind];
          if (!P) return;
          const d = P[0],
            f0 = P[1],
            f1 = P[2],
            v = P[3],
            s = actx.createBufferSource(),
            f = actx.createBiquadFilter(),
            g = actx.createGain(),
            t = actx.currentTime;
          s.buffer = noiseBuffer();
          s.loop = true;
          f.type = "bandpass";
          f.Q.value = 0.8;
          f.frequency.setValueAtTime(f0, t);
          f.frequency.linearRampToValueAtTime(f1, t + d * 0.5);
          f.frequency.linearRampToValueAtTime(f0, t + d);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(v, t + d * 0.2);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          s.connect(f);
          f.connect(g);
          g.connect(crowdBus);
          s.start(t);
          s.stop(t + d + 0.1);
        }
        // a light afrobeat groove: kick, rim, shaker, bass and chord stabs
        function mTone(fr, t, d, type, v, slide) {
          const o = actx.createOscillator(),
            g = actx.createGain();
          o.type = type;
          o.frequency.setValueAtTime(fr, t);
          if (slide)
            o.frequency.exponentialRampToValueAtTime(
              Math.max(30, slide),
              t + d,
            );
          g.gain.setValueAtTime(v, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(g);
          g.connect(musicBus);
          o.start(t);
          o.stop(t + d + 0.02);
        }
        function mNoise(t, d, v, hp) {
          const s = actx.createBufferSource(),
            f = actx.createBiquadFilter(),
            g = actx.createGain();
          s.buffer = noiseBuffer();
          f.type = "highpass";
          f.frequency.value = hp;
          g.gain.setValueAtTime(v, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          s.connect(f);
          f.connect(g);
          g.connect(musicBus);
          s.start(t, Math.random());
          s.stop(t + d + 0.02);
        }
        const ROOTS = [110, 110, 87.31, 98],
          CHORDS = [
            [220, 261.6, 329.6],
            [220, 261.6, 329.6],
            [174.6, 220, 261.6],
            [196, 246.9, 293.7],
          ];
        function musicStep(st, t) {
          const s = st % 16,
            bar = (st >> 4) % 4;
          if (s === 0 || s === 7 || s === 10)
            mTone(130, t, 0.16, "sine", 0.9, 45);
          if (s === 4 || s === 12) mNoise(t, 0.09, 0.35, 1800);
          mNoise(t, 0.04, s % 4 === 2 ? 0.14 : 0.07, 6500);
          if ([0, 3, 6, 10, 12].includes(s))
            mTone(ROOTS[bar], t, 0.2, "triangle", 0.5);
          if (s === 2 || s === 6 || s === 11)
            CHORDS[bar].forEach((f) => mTone(f, t, 0.12, "square", 0.05));
        }
        function musicStart() {
          if (!actx || musicOn) return;
          musicOn = true;
          musStep = 0;
          musNext = actx.currentTime + 0.15;
          musTimer = setInterval(musicTick, 120);
        }
        function musicStop() {
          musicOn = false;
          clearInterval(musTimer);
        }
        function musicTick() {
          if (!actx || !musicOn) return;
          if (!settings.music || paused || actx.state !== "running") {
            if (musNext < actx.currentTime) musNext = actx.currentTime + 0.1;
            return;
          }
          const spb = 60 / 112 / 4;
          while (musNext < actx.currentTime + 0.35) {
            musicStep(musStep, musNext);
            musNext += spb;
            musStep = (musStep + 1) % 64;
          }
        }
        function applyAudioSettings() {
          busGain(musicBus, settings.music ? MUS_LVL : 0, 0.1);
          if (!settings.voice) cmStop();
          document
            .querySelectorAll(".segAud button")
            .forEach((b) =>
              b.setAttribute("aria-pressed", String(!!settings[b.dataset.v])),
            );
        }
        function audioMatchStart() {
          CM.lastGroup = {};
          CM.lastAny = 0;
          CM.l10 = false;
          musicStart();
          cmPreload([
            "kickoff",
            "goal_you",
            "goal_cpu",
            "save",
            "shot",
            "last10",
            "win",
            "loss",
          ]);
        }
        function audioMatchEnd(a, b) {
          musicStop();
          crowdStop();
          cmStop();
          const g =
            juju.used && a.score < b.score
              ? "juju_loss"
              : a.score > b.score
                ? a.score - b.score >= 4
                  ? "win_big"
                  : "win"
                : a.score < b.score
                  ? "loss"
                  : "draw";
          cmPreload([g]);
          say(g, 3, 900);
        }
        function powerSay(id, t) {
          const you = t.id === 0,
            m = {
              shito: you ? "shito_you" : "shito_cpu",
              dumsor: you ? "dumsor_you" : "dumsor_cpu",
              trotro: you ? "trotro_you" : "trotro_cpu",
              obolo: "obolo",
              magnet: "magnet",
              azonto: "azonto",
            }[id];
          if (m) say(m, 2);
        }
        const juju = {
          rolled: false,
          active: false,
          balls: [],
          t: 0,
          n: 0,
          landed: 0,
          used: false,
        };
        let goalLog = [],
          reversals = 0;
        function jujuReset() {
          goalLog = [];
          reversals = 0;
          juju.used = false;
          juju.rolled = juju.active = false;
          juju.balls = [];
          juju.landed = 0;
        }
        function jujuCast() {
          juju.used = true;
          const c = teams[1],
            h = teams[0],
            n = h.score - c.score + 1;
          juju.active = true;
          juju.n = n;
          juju.landed = 0;
          juju.balls = [];
          juju.t = 0;
          const src = c.players.filter((q) => !q.gk);
          for (let i = 0; i < n; i++) {
            const q = src[i % src.length];
            juju.balls.push({
              sx: q.x,
              sy: q.y,
              tx: PX0 - 14,
              ty: rand(GY0 + 20, GY1 - 20),
              delay: 0.9 + i * 0.3,
              t: 0,
              dur: 0.55,
              x: q.x,
              y: q.y,
              done: false,
              rot: 0,
            });
          }
          showBanner("CPU: JUJU!", "#b86bff", 2400);
          setBig("JUJU!", "#b86bff", 1400);
          cmStop();
          say("juju", 3);
          SFX.dumsor();
          shake = Math.max(shake, reduceMotion ? 2 : 10);
          for (const q of src)
            ring(q.x, q.y, q.r + 4, q.r + 70, 0.9, "#b86bff");
        }
        function jujuUpdate(g) {
          if (!juju.active) return;
          juju.t += g;
          for (const b of juju.balls) {
            if (b.done) continue;
            if (juju.t < b.delay) {
              b.x = b.sx;
              b.y = b.sy;
              continue;
            }
            b.t += g;
            const k = Math.min(1, b.t / b.dur);
            b.x = b.sx + (b.tx - b.sx) * k;
            b.y = b.sy + (b.ty - b.sy) * k;
            b.rot += g * 30;
            if (Math.random() < 0.8)
              burst(b.x, b.y, 1, {
                color: ["#b86bff", "#e6d0ff"],
                s0: 20,
                s1: 90,
                l0: 0.3,
                l1: 0.6,
              });
            if (k >= 1) {
              b.done = true;
              juju.landed++;
              teams[1].score++;
              goalLog.push([1, Math.round(settings.len - Math.max(0, matchT))]);
              SFX.goal();
              roar("goal");
              say("juju_goal", 3);
              shake = Math.max(shake, reduceMotion ? 2 : 12);
              burst(PX0, b.ty, 50, {
                color: ["#b86bff", "#fff", "#ffc61a", "#e0245e"],
                kind: "confetti",
                s0: 80,
                s1: 480,
                l0: 1,
                l1: 2,
                z0: 4,
                z1: 8,
                g: 380,
                drag: 0.9,
                a: 0,
                spread: 1.4,
              });
              ring(PX0, b.ty, 10, 200, 0.7, "#b86bff");
              floatText(PX0 + 60, b.ty, "GOAL", "#b86bff");
            }
          }
          if (
            juju.landed >= juju.n &&
            juju.t > juju.balls[juju.balls.length - 1].delay + 0.9
          ) {
            juju.active = false;
            matchT = 0;
          }
        }
        function playerName() {
          return (settings.name || "").trim() || "Player";
        }
        function startMatch() {
          drill = null;
          frameEl.classList.remove("drill");
          jujuReset();
          demo = false;
          document.querySelector("#hud .tm .n").textContent = playerName();
          paused = false;
          sudden = false;
          matchT = settings.len;
          resetTeams();
          hideBig();
          bannerEl.classList.remove("show");
          frameEl.classList.add("playing");
          $("menu").classList.add("hidden");
          $("end").classList.add("hidden");
          $("pause").classList.add("hidden");
          buildPowerBar();
          buildCpuLoad();
          setupKickoff(0);
          showBanner(
            "CPU picked " +
              teams[1].loadout.map((id) => PW[id].name).join(", "),
            "#ff6b92",
            2600,
          );
          audioMatchStart();
        }
        function startDemo() {
          drill = null;
          frameEl.classList.remove("drill");
          jujuReset();
          demo = true;
          paused = false;
          sudden = false;
          matchT = 999;
          resetTeams();
          hideBig();
          frameEl.classList.remove("playing");
          setupKickoff(Math.random() < 0.5 ? 0 : 1);
        }
        function toMenu() {
          musicStop();
          crowdStop();
          cmStop();
          $("end").classList.add("hidden");
          $("pause").classList.add("hidden");
          $("menu").classList.remove("hidden");
          startDemo();
        }
        const pick = (a) => a[Math.floor(Math.random() * a.length)];
        function matchComment(a, b, n) {
          const d = a.score - b.score,
            tot = a.stats.poss + b.stats.poss || 1,
            pa = a.stats.poss / tot,
            P = [],
            add = (...x) => P.push(...x);
          const lens = settings.len;
          if (juju.used) {
            add(
              "The CPU used JUJU. " +
                n +
                " was robbed by spiritual forces. Please call VAR to the ancestors.",
              "Lost to witchcraft. Technically not a skill issue.",
              "JUJU at the last second. " +
                n +
                " would like to speak to the referee, the pastor and the herbalist.",
              'The CPU said "I will not lose" and the universe said "okay".',
              "Down to the last 3 seconds and the CPU consulted the village elders. Scandalous.",
              "Not even Messi can beat a man with a juju. " + n + " did well.",
              "Final whistle, then a puff of smoke. Somebody check the CPU's grandmother.",
              "The CPU did not outplay " +
                n +
                ". The CPU out-prayed " +
                n +
                ".",
              "Screenshot this and send it to the FA. This is spiritual fraud.",
              '"It was 5-1, I swear." - ' + n + ", to everyone, forever.",
              "The CPU lost for 117 seconds and then simply stopped losing.",
              "Juju is not a tactic. Juju is a lifestyle. Rematch and bring salt.",
            );
          } else {
            if (reversals > 0 && d >= 0)
              add(
                "Sankofa: went back and fetched that goal. " +
                  n +
                  " bends time now.",
                "Conceded, reversed it, carried on. " +
                  n +
                  " does not accept bad news.",
                "The goal never happened. " +
                  n +
                  " has the receipts and they are all blank.",
                "VAR? No. SANKOFA. Goal deleted, feelings spared.",
              );
            else if (reversals > 0)
              add(
                "Even Sankofa could not save " +
                  n +
                  ". Some goals just come back.",
                "Used time travel and still lost. That is a real skill.",
              );
            if (d >= 4)
              add(
                "Absolute scenes. The CPU is filing a complaint with the ministry.",
                "Chale, that was not a match, that was a lesson.",
                n + " ate and left no crumbs.",
                "The CPU has asked for a transfer to a different game.",
                "The CPU is now a Sunday league fan.",
                n + " did not play the game, " + n + " reviewed it.",
                "Somebody check on the CPU. It has stopped answering.",
                "Scoreline so rude it needs an apology note.",
                "This was a robbery. By " +
                  n +
                  ". In broad daylight. With confetti.",
              );
            else if (d >= 2)
              add(
                "Kai! " + n + " no dey play.",
                "Clean win. The CPU will be talking about this at the trotro station.",
                n + " came, saw and collected the jollof.",
                "Comfortable. Dangerous. Slightly smug.",
                "The CPU is asking where the exit is.",
                "Good win. " + n + " is taking the long way home to be seen.",
                "The CPU has been humbled and it has not yet recovered its password.",
              );
            else if (d === 1)
              add(
                "Won by a whisker. Heart rate: unavailable.",
                "One goal. Zero dignity left for the CPU.",
                "Scraped it. A win is a win, ask anyone in Kumasi.",
                "Tight. Sweaty. Legal. " + n + " wins.",
                "Won by one. The other goal was never found.",
                "Barely won, will tell it like a heist film.",
              );
            else if (d === 0)
              add(
                "A draw. Nobody won, everybody lied about how it went.",
                "Level. Both sides claim they were robbed.",
                "Honours even. The CPU says it let " + n + " get that.",
                "Nobody lost, nobody won, jollof is still undecided.",
                "A draw is just a loss with better branding.",
              );
            else if (d >= -1)
              add(
                "So close. " +
                  n +
                  " blames the pitch. The pitch has no comment.",
                "Lost by one. Replay it in your head and it is a win.",
                "Lost by a whisker, but " + n + " has the better personality.",
                "Heartbreak in the 1-goal zone. The CPU did not even celebrate. Rude.",
                n + " was robbed. By a robot. Of one goal. Quietly.",
              );
            else if (d >= -3)
              add(
                "The CPU is a robot and still showed no mercy.",
                n + ' said "I was just warming up". For 2 minutes.',
                "Skill issue? Respectfully, maybe. Rematch?",
                n + " will be back. Probably after lunch.",
                "The CPU does not even have legs. Think about that.",
                "Lost. Blaming the phone, the network and the weather in that order.",
                "An educational defeat. The lesson was: lose less.",
              );
            else
              add(
                "That was not a loss, that was a documentary.",
                n + ' is typing "lag" in the group chat.',
                "The CPU is calling the family to come and watch.",
                "The scoreline needs a seatbelt.",
                "Even the goalkeeper stopped to clap. For the CPU.",
                n + " needs hugs and a better formation.",
                "Deleting this screenshot in 3, 2, 1...",
              );
            if (b.score === 0 && d > 0)
              add(
                "Clean sheet! The CPU got nothing. Not even a kind word.",
                n + " kept it tight. Even the air could not get in.",
                "Shutout. The CPU is on its knees.",
              );
            if (a.score === 0 && d < 0)
              add(
                "Zero goals. The net was open and still said no.",
                "The ball and " + n + " were not on speaking terms today.",
              );
            if (a.score >= 7)
              add("Seven goals?! This is a basketball score, " + n + ".");
            if (a.score + b.score >= 10)
              add(
                "A goal fest. The goalkeepers asked for overtime pay.",
                "The keepers are demanding hazard pay.",
              );
            if (a.stats.powers === 0)
              add(
                "Did not use a single power. " +
                  n +
                  " plays on principle. Or panic.",
                "Zero powers used. Brave? Silly? Both.",
              );
            else if (a.stats.powers >= 10)
              add(
                "Used " +
                  a.stats.powers +
                  " powers. " +
                  n +
                  " treated this like a ritual.",
                "Power spam detected. The CPU is reporting this.",
              );
            if (b.stats.powers >= 10)
              add(
                "The CPU used " +
                  b.stats.powers +
                  " powers. Even robots love a bit of chaos.",
              );
            if (pa >= 0.7 && d <= 0)
              add(
                "Had " +
                  Math.round(pa * 100) +
                  "% possession and still did not win. That is a rare talent.",
                "All the ball, none of the goals. Very modern football.",
              );
            if (pa <= 0.3 && d > 0)
              add(
                "Won with only " +
                  Math.round(pa * 100) +
                  "% of the ball. Efficient. Shameless. Beautiful.",
                "The CPU had the ball. " + n + " had the goals.",
              );
            if (lens === 60 && d > 0)
              add("Won in one minute. The CPU is still lacing its boots.");
            if (lens === 240 && d < 0)
              add("Four whole minutes of football and still lost. Dedication.");
            if (settings.diff === "legend" && d > 0)
              add(
                "Beat LEGEND. Put it on the CV. Put it on the tombstone.",
                n + " beat Legend difficulty. Everyone, act normal.",
              );
            if (settings.diff === "legend" && d < 0)
              add(
                "Lost to Legend. It is in the name. It is a legend. You are fine.",
              );
            if (settings.diff === "chill" && d > 0)
              add("Beat Chill. The CPU was literally on holiday.");
            if (settings.diff === "chill" && d < 0)
              add(
                "Lost to CHILL difficulty. Take a sip of water. We will not tell anyone. (Screenshot it.)",
              );
          }
          return pick(P);
        }
        let lastCmt = "",
          lastMatch = null;
        function endMatch() {
          state = "ended";
          paused = false;
          SFX.whistle();
          hideBig();
          const a = teams[0],
            b = teams[1];
          audioMatchEnd(a, b);
          $("endTitle").textContent =
            a.score > b.score
              ? "You win!"
              : a.score < b.score
                ? "CPU wins"
                : "Draw";
          $("endTitle").style.color =
            a.score > b.score
              ? "#ffc61a"
              : a.score < b.score
                ? "#ff6b92"
                : "#fff";
          $("endScore").textContent = a.score + " - " + b.score;
          const tot = a.stats.poss + b.stats.poss || 1,
            pa = Math.round((a.stats.poss / tot) * 100);
          const row = (l, m, r) =>
            '<span class="l">' +
            l +
            '</span><span class="m">' +
            m +
            '</span><span class="r">' +
            r +
            "</span>";
          $("endStats").innerHTML =
            row(a.stats.shots, "Shots", b.stats.shots) +
            row(pa + "%", "Possession", 100 - pa + "%") +
            row(
              Math.round(a.stats.morale),
              "Morale earned",
              Math.round(b.stats.morale),
            ) +
            row(a.stats.powers, "Powers used", b.stats.powers);
          const nm = playerName();
          lastCmt = matchComment(a, b, nm);
          $("endCmt").textContent = lastCmt;
          lastMatch = {
            name: nm,
            a: a.score,
            b: b.score,
            pa,
            sa: a.stats.shots,
            sb: b.stats.shots,
            ma: Math.round(a.stats.morale),
            mb: Math.round(b.stats.morale),
            pw: a.stats.powers,
            pwb: b.stats.powers,
            load: [...a.loadout],
            cpuLoad: [...b.loadout],
            used: { ...a.stats.used },
            cused: { ...b.stats.used },
            diff: settings.diff,
            len: settings.len,
            goals: goalLog.slice(),
            juju: juju.used,
            rev: reversals,
            cmt: lastCmt,
          };
          $("end").classList.remove("hidden");
        }
        function goalScored(team) {
          const t = teams[team],
            con = teams[1 - team];
          t.score++;
          lastScorer = team;
          goalUndone = false;
          goalIdx = hist.length;
          goalLog.push([team, Math.round(settings.len - Math.max(0, matchT))]);
          state = "goal";
          teams.forEach((x) => (x.lock = 0));
          stateT = 3.1;
          timeScaleTarget = 0.3;
          shake = reduceMotion ? 3 : 16;
          SFX.goal();
          if (ball.shot && ball.lastTeam === team) earn(t, "ontarget", 8);
          earn(con, "concede", 15);
          ball.fire = 0;
          ball.shot = false;
          clearEffects();
          setBig("GOAL!", t.color, 2600);
          {
            const d = t.score - con.score;
            roar(team === 0 ? "goal" : "groan");
            say(
              t.score === con.score
                ? "equaliser"
                : d >= 3
                  ? team === 0
                    ? "rout_you"
                    : "rout_cpu"
                  : team === 0
                    ? "goal_you"
                    : "goal_cpu",
              3,
              350,
            );
          }
          const gx = oppGoalX(team);
          burst(gx, ball.y, 70, {
            color: [t.color, "#fff", "#ffc61a", "#e0245e", "#3ddc84"],
            kind: "confetti",
            s0: 80,
            s1: 520,
            l0: 1.2,
            l1: 2.4,
            z0: 4,
            z1: 8,
            g: 380,
            drag: 0.9,
            a: team === 0 ? Math.PI : 0,
            spread: 1.4,
          });
          ring(gx, ball.y, 10, 260, 0.8, t.color);
        }

