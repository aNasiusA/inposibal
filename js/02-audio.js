"use strict";
        /* ---------- audio ---------- */
        let actx = null,
          master = null,
          lastBounce = 0,
          musicBus = null,
          crowdBus = null,
          voiceBus = null,
          crowdBase = 0.4,
          MUS_LVL = 0.5,
          crowdSrc = null,
          musicOn = false,
          musTimer = 0,
          musStep = 0,
          musNext = 0;
        function makeCtx() {
          try {
            actx = new (window.AudioContext || window.webkitAudioContext)();
            master = actx.createGain();
            master.gain.value = muted ? 0 : 0.5;
            master.connect(actx.destination);
            musicBus = actx.createGain();
            crowdBus = actx.createGain();
            voiceBus = actx.createGain();
            musicBus.gain.value = settings.music ? MUS_LVL : 0;
            crowdBus.gain.value = crowdBase;
            voiceBus.gain.value = 1;
            [musicBus, crowdBus, voiceBus].forEach((b) => b.connect(master));
            crowdSrc = null;
            musicOn = false;
            actx.onstatechange = () => {
              if (actx && actx.state !== "running" && !document.hidden)
                wakeAudio();
            };
          } catch (e) {
            actx = null;
          }
        }
        function initAudio() {
          if (!actx) makeCtx();
          wakeAudio();
        }
        // iOS suspends (or "interrupts") audio when the phone locks or the tab is hidden; bring it back, or rebuild it if it died
        function wakeAudio() {
          if (!actx) return;
          if (actx.state === "closed") {
            makeCtx();
            return;
          }
          if (actx.state !== "running") {
            try {
              const p = actx.resume();
              if (p && p.catch) p.catch(() => {});
            } catch (e) {}
          }
        }
        ["visibilitychange", "pageshow", "focus"].forEach((ev) =>
          window.addEventListener(ev, () => {
            if (!document.hidden) wakeAudio();
          }),
        );
        ["pointerdown", "touchend", "keydown"].forEach((ev) =>
          window.addEventListener(ev, wakeAudio, {
            passive: true,
            capture: true,
          }),
        );
        function tone(f, d, type, v, slide, delay) {
          if (!actx || muted) return;
          if (actx.state !== "running") {
            wakeAudio();
            return;
          }
          const t = actx.currentTime + (delay || 0),
            o = actx.createOscillator(),
            g = actx.createGain();
          o.type = type || "sine";
          o.frequency.setValueAtTime(f, t);
          if (slide)
            o.frequency.exponentialRampToValueAtTime(
              Math.max(30, f + slide),
              t + d,
            );
          g.gain.setValueAtTime(v || 0.2, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(g);
          g.connect(master);
          o.start(t);
          o.stop(t + d + 0.03);
        }
        function noise(d, v, delay) {
          if (!actx || muted) return;
          if (actx.state !== "running") {
            wakeAudio();
            return;
          }
          const n = Math.floor(actx.sampleRate * d),
            b = actx.createBuffer(1, n, actx.sampleRate),
            c = b.getChannelData(0);
          for (let i = 0; i < n; i++)
            c[i] = (Math.random() * 2 - 1) * (1 - i / n);
          const s = actx.createBufferSource(),
            g = actx.createGain();
          s.buffer = b;
          g.gain.value = v || 0.2;
          s.connect(g);
          g.connect(master);
          s.start(actx.currentTime + (delay || 0));
        }
        // filtered noise burst with a moving cutoff: the building block for kicks, whooshes and thuds
        function fnoise(d, v, f0, f1, type, q, delay) {
          if (!actx || muted || actx.state !== "running") return;
          const t = actx.currentTime + (delay || 0),
            s = actx.createBufferSource(),
            f = actx.createBiquadFilter(),
            g = actx.createGain();
          s.buffer = noiseBuffer();
          f.type = type || "bandpass";
          f.Q.value = q || 1;
          f.frequency.setValueAtTime(Math.max(40, f0), t);
          f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + d);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.025, d * 0.25));
          g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          s.connect(f);
          f.connect(g);
          g.connect(master);
          s.start(t, Math.random());
          s.stop(t + d + 0.05);
        }
        // a referee's pea whistle: a high tone with a fast trill
        function peep(d, delay) {
          if (!actx || muted || actx.state !== "running") return;
          const t = actx.currentTime + (delay || 0),
            o = actx.createOscillator(),
            l = actx.createOscillator(),
            lg = actx.createGain(),
            g = actx.createGain();
          o.type = "sine";
          o.frequency.value = 2850;
          l.frequency.value = 34;
          lg.gain.value = 90;
          l.connect(lg);
          lg.connect(o.frequency);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
          g.gain.setValueAtTime(0.2, t + d - 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(g);
          g.connect(master);
          o.start(t);
          l.start(t);
          o.stop(t + d + 0.02);
          l.stop(t + d + 0.02);
        }
        const SFX = {
          shot() {
            fnoise(0.07, 0.55, 2000, 400, "bandpass", 0.8);
            tone(170, 0.13, "sine", 0.55, -120);
          },
          pass() {
            fnoise(0.05, 0.25, 1500, 500, "bandpass", 0.8);
            tone(150, 0.09, "sine", 0.3, -80);
          },
          whistle() {
            peep(0.3);
            peep(0.55, 0.36);
          },
          goal() {
            [220, 277, 330].forEach((f) => tone(f, 1, "sawtooth", 0.09));
            tone(110, 1, "sawtooth", 0.1);
            [523, 659, 784, 1047].forEach((f, i) =>
              tone(f, 0.25, "triangle", 0.07, 0, 0.35 + i * 0.08),
            );
          },
          shito() {
            fnoise(0.75, 0.55, 300, 3600, "bandpass", 1.2);
            tone(90, 0.5, "sawtooth", 0.16, 420);
            for (let i = 0; i < 7; i++)
              fnoise(
                0.04,
                0.3,
                5000,
                2500,
                "highpass",
                1,
                0.1 + i * 0.09 + Math.random() * 0.05,
              );
          },
          dumsor() {
            tone(420, 0.9, "sawtooth", 0.12, -360);
            tone(60, 0.7, "sine", 0.55, -25, 0.08);
            fnoise(0.6, 0.35, 2200, 90, "lowpass", 0.7);
          },
          obolo() {
            tone(70, 0.38, "sine", 0.75, -32);
            fnoise(0.22, 0.45, 700, 100, "lowpass");
            tone(62, 0.4, "sine", 0.7, -28, 0.24);
            fnoise(0.22, 0.4, 600, 90, "lowpass", 0.7, 0.24);
          },
          magnet() {
            tone(180, 0.85, "sine", 0.2, 280);
            tone(186, 0.85, "sine", 0.2, 290);
            fnoise(0.8, 0.14, 500, 1600, "bandpass", 4);
          },
          trotro() {
            [0, 0.24].forEach((d) => {
              tone(330, 0.18, "sawtooth", 0.13, 0, d);
              tone(415, 0.18, "sawtooth", 0.11, 0, d);
            });
            fnoise(1, 0.28, 180, 520, "lowpass", 0.7, 0.3);
          },
          sankofa() {
            fnoise(0.75, 0.4, 250, 4200, "bandpass", 1);
            tone(880, 1, "sine", 0.14, 0, 0.6);
            tone(1320, 0.9, "sine", 0.09, 0, 0.62);
            tone(660, 1.1, "triangle", 0.08, 0, 0.6);
          },
          azonto() {
            [
              [300, 0],
              [220, 0.11],
              [300, 0.22],
              [390, 0.33],
              [220, 0.44],
            ].forEach(([f, d]) => {
              tone(f, 0.11, "sine", 0.5, -130, d);
              fnoise(0.03, 0.2, 2000, 800, "bandpass", 1, d);
            });
          },
          tackle() {
            tone(95, 0.18, "sine", 0.65, -55);
            fnoise(0.08, 0.38, 1000, 200, "bandpass", 0.8);
          },
          earn() {
            tone(1319, 0.12, "sine", 0.07);
            tone(1760, 0.2, "sine", 0.06, 0, 0.06);
          },
          fizzle() {
            tone(260, 0.3, "sawtooth", 0.1, -200);
            fnoise(0.3, 0.16, 1600, 200, "lowpass");
          },
          cut() {
            tone(900, 0.05, "triangle", 0.07);
          },
          bounce() {
            const n = performance.now();
            if (n - lastBounce < 70) return;
            lastBounce = n;
            fnoise(0.05, 0.16, 700, 200, "lowpass");
            tone(190, 0.06, "sine", 0.2, -90);
          },
        };

