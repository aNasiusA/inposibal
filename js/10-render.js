"use strict";
        /* ---------- rendering ---------- */
        let pitchLayer = null,
          darkLayer = null,
          dctx = null;
        function rr(c, x, y, w, h, r) {
          c.beginPath();
          c.moveTo(x + r, y);
          c.arcTo(x + w, y, x + w, y + h, r);
          c.arcTo(x + w, y + h, x, y + h, r);
          c.arcTo(x, y + h, x, y, r);
          c.arcTo(x, y, x + w, y, r);
          c.closePath();
        }
        function buildPitch() {
          const cs = canvas.width / W;
          pitchLayer = document.createElement("canvas");
          pitchLayer.width = canvas.width;
          pitchLayer.height = canvas.height;
          const c = pitchLayer.getContext("2d");
          c.setTransform(cs, 0, 0, cs, 0, 0);
          c.fillStyle = "#1b1438";
          c.fillRect(0, 0, W, H);
          let seed = 7;
          const rnd = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
          };
          const crowd = [
            "#6a58c9",
            "#8b7be0",
            "#fcd116",
            "#ce1126",
            "#006b3f",
            "#b9b0f2",
          ];
          for (let i = 0; i < 1100; i++) {
            const x = rnd() * W,
              y = rnd() * H;
            if (x > PX0 - 64 && x < PX1 + 64 && y > PY0 - 34 && y < PY1 + 34)
              continue;
            c.fillStyle = crowd[(rnd() * crowd.length) | 0];
            c.globalAlpha = 0.22 + rnd() * 0.35;
            c.beginPath();
            c.arc(x, y, 2 + rnd() * 2.2, 0, TAU);
            c.fill();
          }
          c.globalAlpha = 1;
          c.fillStyle = "#2d2358";
          c.fillRect(PX0 - 16, PY0 - 30, PX1 - PX0 + 32, PY1 - PY0 + 60);
          const bw = (PX1 - PX0) / 10,
            bc = ["#fcd116", "#efeaff", "#ce1126", "#efeaff", "#3ddc84"];
          for (let i = 0; i < 10; i++) {
            c.fillStyle = bc[i % 5];
            c.globalAlpha = 0.9;
            c.fillRect(PX0 + i * bw + 2, PY0 - 26, bw - 4, 16);
            c.fillRect(PX0 + i * bw + 2, PY1 + 10, bw - 4, 16);
          }
          c.globalAlpha = 1;
          c.fillStyle = "#1b1438";
          c.font = '11px "Bowlby One",Impact,sans-serif';
          c.textAlign = "center";
          c.textBaseline = "middle";
          const ads = [
            "INPOSIBAL",
            "CHALE GOAL",
            "SHOW THEM MORALE",
            "AKWAABA",
            "INPOSIBAL",
          ];
          for (let i = 0; i < 10; i++) {
            const t = ads[i % 5];
            c.fillText(t, PX0 + i * bw + bw / 2, PY0 - 18);
            c.fillText(t, PX0 + i * bw + bw / 2, PY1 + 18);
          }
          const sw = (PX1 - PX0) / 12;
          for (let i = 0; i < 12; i++) {
            c.fillStyle = i % 2 ? "#2a8157" : "#2f8e60";
            c.fillRect(PX0 + i * sw, PY0, sw + 1, PY1 - PY0);
          }
          c.strokeStyle = "rgba(255,255,255,.85)";
          c.lineWidth = 3;
          c.strokeRect(PX0, PY0, PX1 - PX0, PY1 - PY0);
          c.beginPath();
          c.moveTo(CX, PY0);
          c.lineTo(CX, PY1);
          c.stroke();
          c.beginPath();
          c.arc(CX, CY, 84, 0, TAU);
          c.stroke();
          c.fillStyle = "rgba(255,255,255,.85)";
          c.beginPath();
          c.arc(CX, CY, 5, 0, TAU);
          c.fill();
          for (const left of [true, false]) {
            const x0 = left ? PX0 : PX1,
              s = left ? 1 : -1;
            c.strokeRect(left ? PX0 : PX1 - 170, CY - 150, 170, 300);
            c.strokeRect(left ? PX0 : PX1 - 64, CY - 84, 64, 168);
            c.beginPath();
            c.arc(x0 + s * 118, CY, 4, 0, TAU);
            c.fill();
            c.beginPath();
            c.arc(
              x0 + s * 118,
              CY,
              70,
              left ? -0.93 : Math.PI - 0.93,
              left ? 0.93 : Math.PI + 0.93,
              false,
            );
            c.stroke();
            c.fillStyle = "rgba(15,10,40,.55)";
            c.fillRect(left ? PX0 - GD : PX1, GY0, GD, GY1 - GY0);
            c.strokeStyle = "rgba(255,255,255,.28)";
            c.lineWidth = 1;
            for (let y = GY0; y <= GY1; y += 11) {
              c.beginPath();
              c.moveTo(left ? PX0 - GD : PX1, y);
              c.lineTo(left ? PX0 : PX1 + GD, y);
              c.stroke();
            }
            for (let k = 0; k <= GD; k += 11) {
              const x = left ? PX0 - GD + k : PX1 + k;
              c.beginPath();
              c.moveTo(x, GY0);
              c.lineTo(x, GY1);
              c.stroke();
            }
            c.strokeStyle = "#fff";
            c.lineWidth = 4;
            c.beginPath();
            c.moveTo(x0, GY0);
            c.lineTo(x0 - s * GD, GY0);
            c.lineTo(x0 - s * GD, GY1);
            c.lineTo(x0, GY1);
            c.stroke();
            c.strokeStyle = "rgba(255,255,255,.85)";
            c.lineWidth = 3;
          }
          c.fillStyle = "#fff";
          for (const x of [PX0, PX1])
            for (const y of [GY0, GY1]) {
              c.beginPath();
              c.arc(x, y, 6, 0, TAU);
              c.fill();
            }
        }
        function drawPlayer(p) {
          const t = teams[p.team],
            r = p.r;
          let oy = 0;
          if (state === "goal" && p.team === lastScorer && !p.gk)
            oy = -Math.abs(Math.sin(time * 9 + p.idx)) * 9;
          const wob = p.azonto > 0 ? Math.sin(time * 16) * r * 0.22 : 0,
            x = p.x + wob,
            y = p.y + oy;
          ctx.fillStyle = "rgba(0,0,0,.26)";
          ctx.beginPath();
          ctx.ellipse(p.x + 3, p.y + r * 0.5, r * 1.05, r * 0.8, 0, 0, TAU);
          ctx.fill();
          if (p.giant > 0) {
            ctx.strokeStyle = "rgba(192,139,255,.85)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, y, r + 7 + Math.sin(time * 8) * 2, 0, TAU);
            ctx.stroke();
          }
          if (p.azonto > 0) {
            ctx.strokeStyle = p.cut > 0 ? "#fff" : "rgba(61,220,132,.9)";
            ctx.lineWidth = p.cut > 0 ? 5 : 3;
            ctx.setLineDash([4, 6]);
            ctx.lineDashOffset = -time * 40;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r + 8, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
          }
          if (p.magnet > 0) {
            ctx.strokeStyle = "rgba(77,163,255,.8)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 6]);
            ctx.lineDashOffset = time * 30;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r + ball.r + 25, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
          }
          const px = -p.fy,
            py = p.fx,
            sw = Math.sin(p.phase + (p.azonto > 0 ? time * 10 : 0)) * r * 0.45;
          ctx.fillStyle = "#1b1030";
          ctx.beginPath();
          ctx.arc(
            x + px * r * 0.55 + p.fx * sw,
            y + py * r * 0.55 + p.fy * sw,
            r * 0.27,
            0,
            TAU,
          );
          ctx.fill();
          ctx.beginPath();
          ctx.arc(
            x - px * r * 0.55 - p.fx * sw,
            y - py * r * 0.55 - p.fy * sw,
            r * 0.27,
            0,
            TAU,
          );
          ctx.fill();
          if (p.stun > 0) ctx.globalAlpha = 0.8;
          ctx.fillStyle = p.gk ? "#f1efff" : t.color;
          ctx.strokeStyle = p.gk ? t.color : t.dark;
          ctx.lineWidth = Math.max(2, r * 0.16);
          ctx.beginPath();
          ctx.arc(x, y, r * 0.95, 0, TAU);
          ctx.fill();
          ctx.stroke();
          if (p.gk) {
            ctx.fillStyle = "#7be3a0";
            ctx.beginPath();
            ctx.arc(x + px * r * 1.02, y + py * r * 1.02, r * 0.26, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x - px * r * 1.02, y - py * r * 1.02, r * 0.26, 0, TAU);
            ctx.fill();
          }
          const hx = x + p.fx * r * 0.16,
            hy = y + p.fy * r * 0.16;
          ctx.fillStyle = "#1a1020";
          ctx.beginPath();
          ctx.arc(hx - p.fx * r * 0.08, hy - p.fy * r * 0.08, r * 0.52, 0, TAU);
          ctx.fill();
          ctx.fillStyle = p.skin;
          ctx.beginPath();
          ctx.arc(hx + p.fx * r * 0.1, hy + p.fy * r * 0.1, r * 0.43, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
          if (p.stun > 0) {
            ctx.fillStyle = "#ffe94d";
            for (let k = 0; k < 3; k++) {
              const a = time * 6 + (k * TAU) / 3;
              ctx.beginPath();
              ctx.arc(
                x + Math.cos(a) * r * 0.9,
                y - r * 0.2 + Math.sin(a) * r * 0.45,
                3.2,
                0,
                TAU,
              );
              ctx.fill();
            }
          }
          if (p.dash > 0) {
            const bx = x,
              by = y - r - 34;
            ctx.fillStyle = "#fff";
            rr(ctx, bx - 62, by - 15, 124, 28, 12);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(bx - 6, by + 12);
            ctx.lineTo(bx + 6, by + 12);
            ctx.lineTo(bx, by + 22);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#1b1030";
            ctx.font = "800 14px Figtree,system-ui,sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Circle! Circle!", bx, by);
          }
          if (!demo && p === teams[0].ctrl && t.recv === p && t.recvPt) {
            ctx.strokeStyle = "rgba(255,255,255,.85)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(t.recvPt[0], t.recvPt[1], 12, 0, TAU);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(t.recvPt[0] - 6, t.recvPt[1]);
            ctx.lineTo(t.recvPt[0] + 6, t.recvPt[1]);
            ctx.moveTo(t.recvPt[0], t.recvPt[1] - 6);
            ctx.lineTo(t.recvPt[0], t.recvPt[1] + 6);
            ctx.stroke();
          }
          if (!demo && p === teams[0].ctrl && state !== "ended") {
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#1b1030";
            ctx.lineWidth = 2;
            const by = y - r - 12 + Math.sin(time * 6) * 2;
            ctx.beginPath();
            ctx.moveTo(x - 8, by - 9);
            ctx.lineTo(x + 8, by - 9);
            ctx.lineTo(x, by + 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,.8)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(x, y, r + 5, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
            if (ball.owner === p && state === "play") {
              const pt = passTarget(p);
              if (pt) {
                ctx.strokeStyle = "rgba(255,255,255,.95)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(
                  pt.x,
                  pt.y,
                  pt.r + 9 + Math.sin(time * 8) * 1.5,
                  0,
                  TAU,
                );
                ctx.stroke();
              }
              const len = 60 + p.charge * 120;
              ctx.strokeStyle = "rgba(255,255,255,.55)";
              ctx.lineWidth = 3;
              ctx.setLineDash([3, 9]);
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(ball.x, ball.y);
              ctx.lineTo(ball.x + p.fx * len, ball.y + p.fy * len);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.lineCap = "butt";
              if (teams[p.team].rocket > 0) {
                ctx.strokeStyle = "rgba(255,90,54,.85)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(
                  x,
                  y,
                  r + 19,
                  -Math.PI / 2,
                  -Math.PI / 2 + (teams[p.team].rocket / 3) * TAU,
                );
                ctx.stroke();
              }
              if (p.charge > 0) {
                ctx.strokeStyle = p.charge >= 0.5 ? "#ff5a36" : "#ffc61a";
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(
                  x,
                  y,
                  r + 11,
                  -Math.PI / 2,
                  -Math.PI / 2 + p.charge * TAU,
                );
                ctx.stroke();
              }
            }
          }
        }
        function drawJuju() {
          for (const b of juju.balls) {
            if (b.done || juju.t < b.delay) continue;
            const gr = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, 34);
            gr.addColorStop(0, "rgba(200,140,255,.95)");
            gr.addColorStop(1, "rgba(120,40,200,0)");
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 34, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "#f1e0ff";
            ctx.strokeStyle = "#4b1a8a";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(b.x, b.y, ball.r + 2, 0, TAU);
            ctx.fill();
            ctx.stroke();
          }
        }
        function drawBall() {
          const x = ball.x,
            y = ball.y,
            r = ball.r;
          ctx.fillStyle = "rgba(0,0,0,.28)";
          ctx.beginPath();
          ctx.ellipse(x + 2, y + r * 0.6, r, r * 0.7, 0, 0, TAU);
          ctx.fill();
          if (ball.fire > 0) {
            const gr = ctx.createRadialGradient(x, y, 2, x, y, 30);
            gr.addColorStop(0, "rgba(255,120,70,.95)");
            gr.addColorStop(1, "rgba(180,30,20,0)");
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, TAU);
            ctx.fill();
          }
          if (!ball.owner)
            for (const p of ALL) {
              if (p.magnet <= 0 || hyp(p.x - x, p.y - y) > 220) continue;
              ctx.strokeStyle = "rgba(77,163,255,.7)";
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 8]);
              ctx.lineDashOffset = -time * 60;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(x, y);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.lineDashOffset = 0;
            }
          ctx.fillStyle = ball.fire > 0 ? "#ffd9c9" : "#fff";
          ctx.strokeStyle = "#241a47";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = ball.fire > 0 ? "#b3261e" : "#241a47";
          for (let k = 0; k < 3; k++) {
            const a = ball.rot + (k * TAU) / 3;
            ctx.beginPath();
            ctx.arc(
              x + Math.cos(a) * r * 0.5,
              y + Math.sin(a) * r * 0.5,
              r * 0.28,
              0,
              TAU,
            );
            ctx.fill();
          }
        }
        // Trotro rush telegraph: the lane flashes during the wind-up so defenders can step into it
        function drawLanes() {
          for (const t of teams) {
            const w = t.wind;
            if (!w || w.id !== "trotro") continue;
            const p = w.p,
              len = p.speed * 1.7 * 0.5 + 60,
              a = 0.22 + 0.2 * Math.sin(time * 30);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(w.dy, w.dx));
            ctx.fillStyle = "rgba(252,209,22," + a + ")";
            ctx.fillRect(0, -30, len, 60);
            ctx.fillStyle = "rgba(255,255,255,.9)";
            ctx.font = '18px "Bowlby One",Impact,sans-serif';
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("▶▶", len * 0.6, 0);
            ctx.restore();
          }
        }
        // wind-up cue: a ring closing in on whoever is about to use a power, with its name
        function drawCues() {
          for (const t of teams) {
            const w = t.wind;
            if (!w) continue;
            const p = w.p,
              def = PW[w.id],
              f = clamp(w.t / w.max, 0, 1);
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r + 6 + f * 40, 0, TAU);
            ctx.stroke();
            ctx.font = "800 15px Figtree,system-ui,sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = 4;
            ctx.strokeStyle = "rgba(20,12,40,.85)";
            ctx.strokeText(def.name, p.x, p.y - p.r - 30);
            ctx.fillStyle = def.color;
            ctx.fillText(def.name, p.x, p.y - p.r - 30);
          }
        }
        function drawFx() {
          for (const rg of rings) {
            const f = rg.life / rg.max;
            ctx.globalAlpha = 1 - f;
            ctx.strokeStyle = rg.color;
            ctx.lineWidth = 5 * (1 - f) + 1;
            ctx.beginPath();
            ctx.arc(rg.x, rg.y, lerp(rg.r0, rg.r1, f), 0, TAU);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          for (const q of parts) {
            const f = q.life / q.max;
            ctx.globalAlpha = Math.max(0, 1 - f);
            ctx.fillStyle = q.color;
            ctx.strokeStyle = q.color;
            if (q.kind === "flame") {
              ctx.globalCompositeOperation = "lighter";
              ctx.beginPath();
              ctx.arc(q.x, q.y, q.size * (1 - f), 0, TAU);
              ctx.fill();
              ctx.globalCompositeOperation = "source-over";
            } else if (q.kind === "confetti") {
              ctx.save();
              ctx.translate(q.x, q.y);
              ctx.rotate(q.rot);
              ctx.fillRect(-q.size, -q.size * 0.5, q.size * 2, q.size);
              ctx.restore();
            } else if (q.kind === "note") {
              ctx.font =
                "800 " + Math.round(q.size) + "px Figtree,system-ui,sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("\u266A", q.x, q.y);
            } else if (q.kind === "txt") {
              ctx.font = "800 " + q.size + "px Figtree,system-ui,sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.lineWidth = 3;
              ctx.strokeStyle = "rgba(20,12,40,.8)";
              ctx.strokeText(q.text, q.x, q.y);
              ctx.fillText(q.text, q.x, q.y);
            } else if (q.kind === "spark") {
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(q.x, q.y);
              ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04);
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.arc(q.x, q.y, q.size * (1 - f * 0.5), 0, TAU);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
        }
        // Dumsor: the user's off-ball runners sit in the dark; the ball, the carrier and the other team stay lit
        function drawDumsor(sx, sy) {
          let tm = null,
            wind = false;
          for (const t of teams) {
            if (t.dumsor > 0) tm = t;
            else if (t.wind && t.wind.id === "dumsor") {
              tm = t;
              wind = true;
            }
          }
          if (!tm) return;
          if (
            !darkLayer ||
            darkLayer.width !== canvas.width ||
            darkLayer.height !== canvas.height
          ) {
            darkLayer = document.createElement("canvas");
            darkLayer.width = canvas.width;
            darkLayer.height = canvas.height;
            dctx = darkLayer.getContext("2d");
          }
          const cs = canvas.width / W;
          let a = 0.88;
          if (wind) a = Math.sin(time * 55) > 0 ? 0.5 : 0.08;
          else if (tm.dumsor < 0.45)
            a *= ((Math.sin(tm.dumsor * 55) > 0 ? 1 : 0.35) * tm.dumsor) / 0.45;
          dctx.setTransform(1, 0, 0, 1, 0, 0);
          dctx.globalCompositeOperation = "source-over";
          dctx.clearRect(0, 0, darkLayer.width, darkLayer.height);
          dctx.fillStyle = "rgba(3,2,12," + a.toFixed(3) + ")";
          dctx.fillRect(0, 0, darkLayer.width, darkLayer.height);
          dctx.globalCompositeOperation = "destination-out";
          dctx.setTransform(cs, 0, 0, cs, sx * cs, sy * cs);
          const hole = (x, y, R) => {
            const g = dctx.createRadialGradient(x, y, R * 0.3, x, y, R);
            g.addColorStop(0, "rgba(0,0,0,1)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            dctx.fillStyle = g;
            dctx.beginPath();
            dctx.arc(x, y, R, 0, TAU);
            dctx.fill();
          };
          for (const p of teams[1 - tm.id].players) hole(p.x, p.y, 70 + p.r);
          for (const p of tm.players) if (p.gk) hole(p.x, p.y, 50);
          hole(ball.x, ball.y, 56);
          if (ball.owner) hole(ball.owner.x, ball.owner.y, 84);
          if (!demo && teams[0].ctrl)
            hole(teams[0].ctrl.x, teams[0].ctrl.y, 44);
          dctx.globalCompositeOperation = "source-over";
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(darkLayer, 0, 0);
        }
        // Kente wall: a woven band across the goal mouth that pockets around the ball and whips back
        function kenteDepth(t, y, live) {
          const span = GY1 - GY0,
            u = (y - GY0) / span,
            post = Math.sin(clamp(u, 0, 1) * Math.PI);
          let d = Math.sin(time * 4.2 + y * 0.07) * 2.2 * post;
          if (t.kd > 0) {
            const ky = clamp(t.ky, GY0 + 12, GY1 - 12),
              s = y < ky ? (y - GY0) / (ky - GY0) : (GY1 - y) / (GY1 - ky);
            d += t.kd * Math.pow(Math.sin(clamp(s, 0, 1) * Math.PI * 0.5), 1.5);
          }
          if (t.kw > 0) {
            const tau = 1.3 - t.kw,
              ky = clamp(t.ky, GY0 + 12, GY1 - 12),
              s = y < ky ? (y - GY0) / (ky - GY0) : (GY1 - y) / (GY1 - ky);
            d -= 46 * Math.exp(-3.6 * tau) * Math.cos(17 * tau) * Math.sin(clamp(s, 0, 1) * Math.PI * 0.5) *
              (live ? 0.5 : 1);
          }
          return d;
        }
        function drawKente() {
          for (const t of teams) {
            const winding = t.wind && t.wind.id === "kente",
              seq = kenteSeq && kenteSeq.tid === t.id,
              live = t.kente > 0;
            if (!winding && !seq && !live && t.kd <= 0 && t.kw <= 0) continue;
            const line = ownGoalX(t.id),
              sg = t.id === 0 ? 1 : -1;
            let a = 1,
              open = 1;
            if (winding) {
              const f = 1 - t.wind.t / t.wind.max;
              open = easeOut(f);
              a = 0.4 + 0.6 * f;
            } else if (live && t.kente < 1 && !seq)
              a = (Math.sin(t.kente * 40) > 0 ? 1 : 0.4) * Math.max(0.25, t.kente);
            else if (!live && !seq) a = Math.min(1, t.kw * 3);
            const N = 26,
              cy = (GY0 + GY1) / 2,
              half = ((GY1 - GY0) / 2) * open,
              stretch = clamp(t.kd / 58, 0, 1),
              th = 15 - stretch * 5,
              pts = [];
            for (let i = 0; i <= N; i++) {
              const y = cy - half + (2 * half * i) / N;
              pts.push([line - sg * kenteDepth(t, y, live), y]);
            }
            ctx.save();
            ctx.globalAlpha = a;
            // the pocket the cloth makes behind the line
            if (t.kd > 4) {
              ctx.fillStyle = "rgba(242,183,5," + (0.16 + stretch * 0.3).toFixed(3) + ")";
              ctx.beginPath();
              ctx.moveTo(line, GY0);
              for (const [x, y] of pts) ctx.lineTo(x, y);
              ctx.lineTo(line, GY1);
              ctx.closePath();
              ctx.fill();
            }
            ctx.shadowColor = stretch > 0.3 ? "#ffd166" : "rgba(34,179,94,.9)";
            ctx.shadowBlur = 10 + stretch * 26 + (seq && kenteSeq.ph === 1 ? Math.sin(time * 40) * 6 + 6 : 0);
            ctx.fillStyle = "#151515";
            ctx.beginPath();
            for (let i = 0; i <= N; i++) ctx.lineTo(pts[i][0] + (sg * th) / 2 + sg, pts[i][1]);
            for (let i = N; i >= 0; i--) ctx.lineTo(pts[i][0] - (sg * th) / 2 - sg, pts[i][1]);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // woven blocks: alternating strips with a contrasting thread down the middle
            for (let i = 0; i < N; i++) {
              const [x0, y0] = pts[i],
                [x1, y1] = pts[i + 1],
                c = KENTE[i % KENTE.length],
                h = th / 2;
              ctx.fillStyle = c;
              ctx.beginPath();
              ctx.moveTo(x0 + sg * h, y0);
              ctx.lineTo(x1 + sg * h, y1);
              ctx.lineTo(x1 - sg * h, y1);
              ctx.lineTo(x0 - sg * h, y0);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = i % 2 ? "#f2b705" : "#151515";
              const q = h * 0.35,
                my0 = lerp(y0, y1, 0.2),
                my1 = lerp(y0, y1, 0.8),
                mx0 = lerp(x0, x1, 0.2),
                mx1 = lerp(x0, x1, 0.8);
              ctx.beginPath();
              ctx.moveTo(mx0 + sg * q, my0);
              ctx.lineTo(mx1 + sg * q, my1);
              ctx.lineTo(mx1 - sg * q, my1);
              ctx.lineTo(mx0 - sg * q, my0);
              ctx.closePath();
              ctx.fill();
            }
            // tension: bright threads along the cloth while it is pulled tight
            if (stretch > 0.15) {
              ctx.strokeStyle = "rgba(255,240,200," + (stretch * 0.8).toFixed(3) + ")";
              ctx.lineWidth = 1.2;
              for (const off of [-th / 2, th / 2]) {
                ctx.beginPath();
                for (const [x, y] of pts) ctx.lineTo(x + sg * off, y);
                ctx.stroke();
              }
            }
            // knots tying it to the posts
            for (const y of [cy - half, cy + half]) {
              ctx.fillStyle = "#f2b705";
              ctx.beginPath();
              ctx.arc(line, y, 5.5, 0, TAU);
              ctx.fill();
              ctx.fillStyle = "#c8102e";
              ctx.beginPath();
              ctx.arc(line, y, 2.6, 0, TAU);
              ctx.fill();
            }
            ctx.restore();
          }
        }
        // cinematic framing during the catch: push in on the goal, letterbox, and a flash on the snap
        let kenteZoom = 0;
        function kenteCam() {
          const K = kenteSeq,
            want = state === "kente" && K ? (K.ph < 2 ? 1 : 0.15) : 0;
          kenteZoom += (want - kenteZoom) * (want > kenteZoom ? 0.06 : 0.14);
          if (kenteZoom < 0.002) kenteZoom = 0;
          return K ? K.tid : kenteZoom > 0 ? kenteLastTid : 0;
        }
        let kenteLastTid = 0;
        function drawKenteOverlay() {
          if (kenteZoom <= 0 && kenteFlash <= 0) return;
          const w = canvas.width,
            h = canvas.height;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (kenteZoom > 0) {
            const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(1, "rgba(8,4,20," + (0.55 * kenteZoom).toFixed(3) + ")");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            const bar = h * 0.085 * kenteZoom;
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, w, bar);
            ctx.fillRect(0, h - bar, w, bar);
          }
          if (kenteFlash > 0) {
            ctx.fillStyle = "rgba(255,236,170," + (0.55 * kenteFlash * kenteFlash).toFixed(3) + ")";
            ctx.fillRect(0, 0, w, h);
            kenteFlash = Math.max(0, kenteFlash - 0.06);
          }
          ctx.restore();
        }
        function render() {
          if (!pitchLayer) buildPitch();
          const cs = canvas.width / W;
          let sx = 0,
            sy = 0;
          if (shake > 0) {
            sx = rand(-1, 1) * shake;
            sy = rand(-1, 1) * shake;
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(sx * cs, sy * cs);
          const ktid = kenteCam();
          if (kenteSeq) kenteLastTid = kenteSeq.tid;
          if (kenteZoom > 0 && !reduceMotion) {
            const z = 1 + 0.22 * kenteZoom,
              fx = lerp(CX, ktid === 0 ? 0 : W, kenteZoom),
              fy = lerp(CY, teams[ktid].ky, kenteZoom * 0.6);
            ctx.translate(fx * cs, fy * cs);
            ctx.scale(z, z);
            ctx.translate(-fx * cs, -fy * cs);
          }
          ctx.drawImage(pitchLayer, 0, 0);
          ctx.scale(cs, cs);
          drawLanes();
          drawKente();
          const order = ALL.slice().sort((a, b) => a.y - b.y);
          if (ball.owner && ball.owner.y > ball.y) drawBall();
          for (const p of order) {
            drawPlayer(p);
            if (ball.owner === p && p.y <= ball.y) drawBall();
          }
          if (!ball.owner) drawBall();
          drawJuju();
          drawCues();
          drawFx();
          ctx.restore();
          drawDumsor(sx, sy);
          drawRewind();
          drawKenteOverlay();
        }

