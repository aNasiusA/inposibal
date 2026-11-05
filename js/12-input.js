"use strict";
        /* ---------- input ---------- */
        const keys = new Set();
        let kbx = 0,
          kby = 0,
          tsx = 0,
          tsy = 0;
        function readKeys() {
          const l = keys.has("ArrowLeft") || keys.has("KeyA"),
            r = keys.has("ArrowRight") || keys.has("KeyD"),
            u = keys.has("ArrowUp") || keys.has("KeyW"),
            d = keys.has("ArrowDown") || keys.has("KeyS");
          kbx = (r ? 1 : 0) - (l ? 1 : 0);
          kby = (d ? 1 : 0) - (u ? 1 : 0);
          syncMove();
        }
        function syncMove() {
          let x = kbx + tsx,
            y = kby + tsy;
          const m = hyp(x, y);
          if (m > 1) {
            x /= m;
            y /= m;
          }
          input.mx = x;
          input.my = y;
        }
        const SLOT = {
          Digit1: 0,
          Digit2: 1,
          Digit3: 2,
          Numpad1: 0,
          Numpad2: 1,
          Numpad3: 2,
        };
        function setPaused(v) {
          if (demo || state === "ended" || net.on) return;
          paused = v;
          $("pause").classList.toggle("hidden", !v);
          if (!v) $("settings").classList.add("hidden");
          if (v) {
            input.shootHeld = false;
            cmStop();
          }
        }
        window.addEventListener("keydown", (e) => {
          if (
            !demo &&
            !paused &&
            [
              "Space",
              "ArrowUp",
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
            ].includes(e.code)
          )
            e.preventDefault();
          if (e.target && e.target.tagName === "INPUT") return;
          if (e.repeat) return;
          if (e.code === "Escape" || e.code === "KeyP") {
            if (!demo) setPaused(!paused);
            return;
          }
          if (e.code === "KeyM") {
            toggleMute();
            return;
          }
          if (demo || paused) return;
          if (e.code in SLOT) {
            const id = teams[0].loadout[SLOT[e.code]];
            if (id) localPower(id);
            return;
          }
          if (e.code === "Space" || e.code === "KeyJ") {
            input.shootHeld = true;
            return;
          }
          if (
            e.code === "KeyK" ||
            e.code === "ShiftLeft" ||
            e.code === "ShiftRight" ||
            e.code === "KeyX"
          ) {
            input.passT = 0.18;
            return;
          }
          if (e.code === "KeyL" || e.code === "KeyZ") {
            input.slide = true;
            return;
          }
          if (e.code === "KeyQ" || e.code === "KeyE") {
            localSwitch();
            return;
          }
          keys.add(e.code);
          readKeys();
        });
        window.addEventListener("keyup", (e) => {
          if (e.target && e.target.tagName === "INPUT") return;
          if (e.code === "Space" || e.code === "KeyJ") {
            if (input.shootHeld) {
              input.shootHeld = false;
              input.shootUp = true;
            }
            return;
          }
          keys.delete(e.code);
          readKeys();
        });
        window.addEventListener("blur", () => {
          keys.clear();
          kbx = kby = 0;
          syncMove();
          input.shootHeld = false;
          if (!demo && (state === "play" || state === "kickoff"))
            setPaused(true);
        });
        document.addEventListener("visibilitychange", () => {
          if (
            document.hidden &&
            !demo &&
            (state === "play" || state === "kickoff")
          )
            setPaused(true);
        });
        ["gesturestart", "gesturechange", "dblclick"].forEach((t) =>
          document.addEventListener(t, (e) => e.preventDefault(), {
            passive: false,
          }),
        );
        window.addEventListener(
          "touchstart",
          () => document.body.classList.add("has-touch"),
          { once: true, passive: true },
        );
        (function touchUI() {
          const zone = $("stickZone"),
            base = $("stickBase"),
            knob = $("knob");
          let id = null;
          const move = (e) => {
            const rc = base.getBoundingClientRect(),
              R = rc.width / 2,
              cx = rc.left + R,
              cy = rc.top + R;
            let x = (e.clientX - cx) / R,
              y = (e.clientY - cy) / R;
            if (frameEl.classList.contains("rot")) {
              const t = x;
              x = y;
              y = -t;
            }
            const m = hyp(x, y);
            if (m > 1) {
              x /= m;
              y /= m;
            }
            tsx = Math.abs(x) < 0.12 ? 0 : x;
            tsy = Math.abs(y) < 0.12 ? 0 : y;
            syncMove();
            knob.style.transform =
              "translate(" + x * R * 0.55 + "px," + y * R * 0.55 + "px)";
          };
          zone.addEventListener("pointerdown", (e) => {
            id = e.pointerId;
            zone.setPointerCapture(id);
            move(e);
            e.preventDefault();
          });
          zone.addEventListener("pointermove", (e) => {
            if (e.pointerId === id) move(e);
          });
          const end = (e) => {
            if (e.pointerId !== id) return;
            id = null;
            tsx = tsy = 0;
            syncMove();
            knob.style.transform = "";
          };
          zone.addEventListener("pointerup", end);
          zone.addEventListener("pointercancel", end);
          const sh = $("tShoot");
          sh.addEventListener("pointerdown", (e) => {
            initAudio();
            if (!(ball.owner && ball.owner === teams[0].ctrl)) {
              input.slide = true;
              e.preventDefault();
              return;
            }
            input.shootHeld = true;
            sh.setPointerCapture(e.pointerId);
            e.preventDefault();
          });
          const shEnd = () => {
            if (input.shootHeld) {
              input.shootHeld = false;
              input.shootUp = true;
            }
          };
          sh.addEventListener("pointerup", shEnd);
          sh.addEventListener("pointercancel", shEnd);
          const act = $("tAct"),
            hasBall = () => !!ball.owner && ball.owner === teams[0].ctrl;
          act.addEventListener("pointerdown", (e) => {
            if (hasBall()) input.passT = 0.18;
            else {
              input.press = true;
              act.setPointerCapture(e.pointerId);
            }
            e.preventDefault();
          });
          const pEnd = () => {
            input.press = false;
          };
          act.addEventListener("pointerup", pEnd);
          act.addEventListener("pointercancel", pEnd);
          $("tSwitch").addEventListener("pointerdown", (e) => {
            localSwitch();
            e.preventDefault();
          });
        })();

