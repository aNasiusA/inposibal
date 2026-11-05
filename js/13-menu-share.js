"use strict";
        /* ---------- menu wiring ---------- */
        function toggleMute() {
          muted = !muted;
          if (master) master.gain.value = muted ? 0 : 0.5;
          if (muted) cmStop();
          $("btnMute").textContent = muted ? "Sound off" : "Sound on";
          saveSettings();
        }
        function syncSeg() {
          document
            .querySelectorAll("#segDiff button")
            .forEach((b) =>
              b.setAttribute(
                "aria-pressed",
                String(b.dataset.v === settings.diff),
              ),
            );
          document
            .querySelectorAll("#segLen button")
            .forEach((b) =>
              b.setAttribute(
                "aria-pressed",
                String(+b.dataset.v === settings.len),
              ),
            );
        }
        $("segDiff").addEventListener("click", (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          settings.diff = b.dataset.v;
          syncSeg();
          saveSettings();
        });
        $("segLen").addEventListener("click", (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          settings.len = +b.dataset.v;
          syncSeg();
          saveSettings();
        });
        $("btnStart").addEventListener("click", () => {
          if (settings.loadout.length !== 3) return;
          initAudio();
          startMatch();
        });
        $("pdesc").addEventListener("click", (e) => {
          const b = e.target.closest("[data-practice]");
          if (b) startDrill(b.dataset.practice);
        });
        $("btnPractice").addEventListener("click", () => practiceFor(shownId));
        $("btnPause").addEventListener("click", () => setPaused(!paused));
        $("btnMute").addEventListener("click", toggleMute);
        $("btnMute").textContent = muted ? "Sound off" : "Sound on";
        $("btnResume").addEventListener("click", () => setPaused(false));
        $("btnQuit").addEventListener("click", toMenu);
        $("btnAgain").addEventListener("click", () => {
          if (net.on) return netRematch();
          initAudio();
          startMatch();
        });
        $("btnMenu").addEventListener("click", toMenu);
        const nameIn = $("nameIn");
        nameIn.value = settings.name;
        nameIn.addEventListener("input", () => {
          settings.name = nameIn.value.slice(0, 14);
          saveSettings();
        });
        nameIn.addEventListener("keydown", (e) => {
          if (e.key === "Enter") nameIn.blur();
        });
        /* ---------- share card ---------- */
        const svgImg = (p, color) =>
          new Promise((res) => {
            const src = p.icon.replace(
              "<svg ",
              '<svg xmlns="http://www.w3.org/2000/svg" fill="' +
                color +
                '" color="' +
                color +
                '" ',
            );
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = () => res(null);
            im.src =
              "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
          });
        function wrapText(c, t, x, y, mw, lh) {
          const w = t.split(" ");
          let l = "";
          for (const k of w) {
            const tt = l ? l + " " + k : k;
            if (c.measureText(tt).width > mw && l) {
              c.fillText(l, x, y);
              l = k;
              y += lh;
            } else l = tt;
          }
          c.fillText(l, x, y);
          return y + lh;
        }
        async function buildShareCard(m) {
          try {
            await document.fonts.ready;
          } catch (e) {}
          const W2 = 1080,
            H2 = 1830,
            cv = document.createElement("canvas");
          cv.width = W2;
          cv.height = H2;
          const c = cv.getContext("2d");
          const g = c.createRadialGradient(W2 / 2, 0, 100, W2 / 2, 0, H2);
          g.addColorStop(0, "#2c2060");
          g.addColorStop(0.6, "#150f2e");
          g.addColorStop(1, "#0d0820");
          c.fillStyle = g;
          c.fillRect(0, 0, W2, H2);
          c.fillStyle = "rgba(255,255,255,.04)";
          for (let i = 0; i < 8; i++) c.fillRect(0, (i * H2) / 8, W2, H2 / 16);
          const F = "'Bowlby One',Impact,sans-serif",
            G = "'Figtree',system-ui,sans-serif";
          c.textAlign = "center";
          c.font = "92px " + F;
          c.fillStyle = "#e0245e";
          c.fillText("Inposibal", W2 / 2 + 5, 135);
          c.fillStyle = "#ffc61a";
          c.fillText("Inposibal", W2 / 2, 130);
          const win = m.a > m.b,
            draw = m.a === m.b,
            res = win ? "VICTORY" : draw ? "DRAW" : "DEFEAT";
          c.font = "40px " + F;
          c.fillStyle = win ? "#ffc61a" : draw ? "#fff" : "#ff6b92";
          c.fillText(res, W2 / 2, 205);
          let nf = 70;
          c.font = nf + "px " + F;
          while (c.measureText(m.name).width > W2 - 160 && nf > 30) {
            nf -= 4;
            c.font = nf + "px " + F;
          }
          c.fillStyle = "#e0245e";
          c.fillText(m.name, W2 / 2 + 4, 295);
          c.fillStyle = "#fff";
          c.fillText(m.name, W2 / 2, 291);
          c.font = "800 32px " + G;
          c.fillStyle = "#cfc7f5";
          c.fillText(
            "vs CPU (" +
              { chill: "Chill", pro: "Pro", legend: "Legend" }[m.diff] +
              ")",
            W2 / 2,
            342,
          );
          c.font = "230px " + F;
          c.fillStyle = "#fff";
          c.fillText(m.a + " - " + m.b, W2 / 2, 570);
          if (m.juju) {
            c.font = "46px " + F;
            c.fillStyle = "#b86bff";
            c.fillText("CPU USED JUJU", W2 / 2, 640);
          } else if (m.rev) {
            c.font = "40px " + F;
            c.fillStyle = "#e0b04a";
            c.fillText(
              "SANKOFA REVERSED " + m.rev + " GOAL" + (m.rev > 1 ? "S" : ""),
              W2 / 2,
              640,
            );
          }
          // goal timeline
          const tx0 = 120,
            tx1 = W2 - 120,
            ty = 720;
          c.strokeStyle = "rgba(255,255,255,.25)";
          c.lineWidth = 6;
          c.lineCap = "round";
          c.beginPath();
          c.moveTo(tx0, ty);
          c.lineTo(tx1, ty);
          c.stroke();
          c.font = "700 24px " + G;
          c.fillStyle = "#8f87c4";
          c.fillText("0:00", tx0, ty + 50);
          c.fillText(Math.floor(m.len / 60) + ":00", tx1, ty + 50);
          for (const [tm, when] of m.goals) {
            const x = tx0 + (tx1 - tx0) * Math.min(1, when / m.len);
            c.fillStyle = tm === 0 ? "#ffc61a" : "#e0245e";
            c.beginPath();
            c.arc(x, ty, 16, 0, Math.PI * 2);
            c.fill();
            c.strokeStyle = "#150f2e";
            c.lineWidth = 4;
            c.stroke();
          }
          // stats
          const rows = [
            [m.sa, "Shots", m.sb],
            [m.pa + "%", "Possession", 100 - m.pa + "%"],
            [m.ma, "Morale earned", m.mb],
            [m.pw, "Powers used", m.pwb],
          ];
          let y = 830;
          for (const [l, mid, r] of rows) {
            c.fillStyle = "rgba(255,255,255,.07)";
            c.beginPath();
            c.roundRect(90, y - 48, W2 - 180, 76, 20);
            c.fill();
            c.font = "800 42px " + G;
            c.textAlign = "left";
            c.fillStyle = "#ffc61a";
            c.fillText(String(l), 130, y + 6);
            c.textAlign = "right";
            c.fillStyle = "#ff6b92";
            c.fillText(String(r), W2 - 130, y + 6);
            c.textAlign = "center";
            c.font = "700 30px " + G;
            c.fillStyle = "#cfc7f5";
            c.fillText(mid, W2 / 2, y + 4);
            y += 92;
          }
          // tactics
          c.font = "46px " + F;
          c.fillStyle = "#fff";
          c.fillText("MY TACTICS", W2 / 2, y + 50);
          y += 90;
          const imgs = await Promise.all(
            m.load.map((id) => svgImg(PW[id], "#1a1030")),
          );
          m.load.forEach((id, i) => {
            const p = PW[id],
              cx = W2 / 2 + (i - 1) * 320,
              n = m.used[id] || 0;
            c.fillStyle = p.color;
            c.beginPath();
            c.arc(cx, y + 60, 64, 0, Math.PI * 2);
            c.fill();
            if (imgs[i]) c.drawImage(imgs[i], cx - 36, y + 24, 72, 72);
            c.font = "800 32px " + G;
            c.fillStyle = "#fff";
            c.fillText(p.name, cx, y + 170);
            c.font = "700 26px " + G;
            c.fillStyle = "#cfc7f5";
            c.fillText(n ? "used " + n + "x" : "saved it", cx, y + 206);
          });
          y += 250;
          // comment
          c.font = "italic 800 38px " + G;
          c.fillStyle = "#fff";
          c.textAlign = "center";
          const endY = wrapText(
            c,
            "\u201c" + m.cmt + "\u201d",
            W2 / 2,
            y + 10,
            W2 - 200,
            52,
          );
          c.font = "800 34px " + G;
          c.fillStyle = "#ffc61a";
          c.fillText("inposibal.anasiusa.dev", W2 / 2, H2 - 50);
          return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
        }
        let shareBlob = null,
          shareUrl = "";
        $("btnShare").addEventListener("click", async () => {
          if (!lastMatch) return;
          const bs = $("btnShare");
          bs.disabled = true;
          bs.textContent = "Making it...";
          try {
            shareBlob = await buildShareCard(lastMatch);
            if (shareUrl) URL.revokeObjectURL(shareUrl);
            shareUrl = URL.createObjectURL(shareBlob);
            $("shareImg").src = shareUrl;
            const p = $("sharePane");
            p.classList.remove("hidden");
            p.style.display = "grid";
          } catch (e) {}
          bs.disabled = false;
          bs.textContent = "Share";
        });
        $("btnShareClose").addEventListener("click", () => {
          $("sharePane").style.display = "none";
        });
        $("btnSend").addEventListener("click", async () => {
          if (!shareBlob) return;
          const m = lastMatch,
            txt =
              m.name +
              " " +
              m.a +
              " - " +
              m.b +
              " CPU on Inposibal. " +
              m.cmt +
              " Play: https://inposibal.anasiusa.dev";
          const file = new File([shareBlob], "inposibal-result.png", {
            type: "image/png",
          });
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                text: txt,
                title: "Inposibal",
              });
              return;
            }
          } catch (e) {
            if (e && e.name === "AbortError") return;
          }
          const a = document.createElement("a");
          a.href = shareUrl;
          a.download = "inposibal-result.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          try {
            await navigator.clipboard.writeText(txt);
          } catch (e) {}
        });
        document.addEventListener("click", (e) => {
          const b = e.target.closest(".segAud button");
          if (!b) return;
          settings[b.dataset.v] = !settings[b.dataset.v];
          saveSettings();
          applyAudioSettings();
        });
        applyAudioSettings();
        syncSeg();
        buildPicker();

