"use strict";
        /* ---------- layout + loop ---------- */
        function fit() {
          const st = $("stage"),
            cap = $("cap"),
            coarse = window.matchMedia("(pointer:coarse)").matches;
          const rot = coarse && window.innerHeight > window.innerWidth;
          document.body.classList.toggle("fs", coarse);
          frameEl.classList.toggle("rot", rot);
          let aw, ah;
          if (coarse) {
            const vw = window.innerWidth,
              vh = window.innerHeight;
            document.body.style.height = vh + "px";
            aw = rot ? vh : vw;
            ah = rot ? vw : vh;
          } else {
            document.body.style.height = "";
            aw = st.clientWidth - 16;
            ah = st.clientHeight - cap.offsetHeight - 26;
          }
          let w = Math.min(aw, (ah * W) / H);
          w = Math.max(coarse ? 200 : 300, w);
          const h = (w * H) / W;
          frameEl.style.width = w + "px";
          frameEl.style.height = h + "px";
          frameEl.style.setProperty("--u", (w / W).toFixed(4));
          frameEl.classList.toggle("small", w < 820);
          frameEl.classList.toggle("compact", w < 1000);
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          pitchLayer = null;
        }
        window.addEventListener("resize", fit);
        window.addEventListener("orientationchange", () =>
          setTimeout(fit, 150),
        );
        if (document.fonts && document.fonts.ready)
          document.fonts.ready.then(() => {
            pitchLayer = null;
          });
        let last = performance.now();
        function frame(now) {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          crowdTick();
          if (!paused) update(dt);
          updateHUD();
          render();
          requestAnimationFrame(frame);
        }
        fit();
        startDemo();
        requestAnimationFrame(frame);
        /*__TEST_HOOK__*/
