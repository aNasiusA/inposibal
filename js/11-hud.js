"use strict";
        /* ---------- HUD ---------- */
        const pbtn = {};
        let cpuIcons = [],
          cpuPepEl = null;
        function buildPowerBar() {
          const pl = $("powers");
          pl.innerHTML = "";
          for (const k in pbtn) delete pbtn[k];
          teams[0].loadout.forEach((id, i) => {
            const p = PW[id],
              b = document.createElement("button");
            b.type = "button";
            b.className = "pw";
            b.style.setProperty("--pc", p.color);
            b.setAttribute("aria-label", p.name + " (key " + (i + 1) + ")");
            b.innerHTML =
              p.icon +
              '<span class="fill"></span><span class="key">' +
              (i + 1) +
              '</span><span class="cost"></span><span class="nm">' +
              p.name +
              '</span><span class="cd"></span>';
            b.addEventListener("pointerdown", (e) => {
              e.preventDefault();
              initAudio();
              localPower(id);
            });
            pl.appendChild(b);
            pbtn[id] = {
              root: b,
              fill: b.querySelector(".fill"),
              cd: b.querySelector(".cd"),
              cost: b.querySelector(".cost"),
              last: -1,
              ready: null,
              on: null,
              poor: null,
              price: -1,
            };
          });
        }
        function buildCpuLoad() {
          const el = $("cpuLoad");
          el.innerHTML =
            "<span>" + (net.on ? net.oppName : "CPU") + "</span>" +
            teams[1].loadout
              .map(
                (id) =>
                  '<i data-id="' +
                  id +
                  '" style="--pc:' +
                  PW[id].color +
                  '" title="' +
                  PW[id].name +
                  '">' +
                  PW[id].icon +
                  "</i>",
              )
              .join("") +
            '<span class="cpep" title="CPU Morale"><b id="cpuPep"></b></span>';
          cpuIcons = [...el.querySelectorAll("i")];
          cpuPepEl = $("cpuPep");
        }
        function buildPicker() {
          const list = $("plist");
          list.innerHTML = "";
          POWERS.forEach((p) => {
            const b = document.createElement("button");
            b.type = "button";
            b.style.setProperty("--pc", p.color);
            b.dataset.id = p.id;
            b.innerHTML =
              '<span class="ic">' +
              p.icon +
              "</span><span><b>" +
              p.name +
              '</b><em class="meta">' +
              p.cat +
              " \u00b7 " +
              TIER[p.tier] +
              " Morale \u00b7 " +
              p.cd +
              "s cooldown</em><small>" +
              p.blurb +
              '</small></span><span class="tick"></span>';
            b.addEventListener("click", () => {
              showDesc(p.id);
              togglePick(p.id);
            });
            list.appendChild(b);
          });
          showDesc(POWERS[0].id);
          syncPicks();
        }
        let shownId = "";
        function showDesc(id) {
          const p = PW[id],
            d = $("pdesc");
          shownId = id;
          d.style.setProperty("--pc", p.color);
          d.innerHTML =
            "<b>" +
            p.name +
            "</b><em>" +
            p.cat +
            " \u00b7 " +
            TIER[p.tier] +
            " Morale \u00b7 " +
            p.cd +
            "s cooldown</em>" +
            p.blurb +
            (DRILLS[id]
              ? '<br><button class="btn alt" type="button" data-practice="' +
                id +
                '">Practice this power</button>'
              : "");
        }
        let pickMsgT = 0;
        function pickMsg(m) {
          $("pickCount").textContent = m;
          clearTimeout(pickMsgT);
          pickMsgT = setTimeout(syncPicks, 1900);
        }
        function togglePick(id) {
          const L = settings.loadout,
            i = L.indexOf(id);
          if (i >= 0) L.splice(i, 1);
          else if (L.length >= 3)
            return pickMsg("You have 3. Tap one to drop it.");
          else {
            const why = loadoutProblem([...L, id]);
            if (why) return pickMsg(why);
            L.push(id);
          }
          syncPicks();
          saveSettings();
        }
        function syncPicks() {
          const L = settings.loadout;
          document.querySelectorAll("#plist button").forEach((b) => {
            const i = L.indexOf(b.dataset.id);
            b.setAttribute("aria-pressed", String(i >= 0));
            b.querySelector(".tick").textContent = i >= 0 ? String(i + 1) : "";
          });
          $("pickCount").textContent = L.length + " of 3 picked";
          const ok = L.length === 3,
            bs = $("btnStart");
          bs.disabled = !ok;
          bs.textContent = ok ? "Kick off" : "Pick 3 powers";
          const mini = L.map(
            (id) => '<i style="--pc:' + PW[id].color + '" title="' + PW[id].name + '">' + PW[id].icon + "</i>",
          ).join("");
          $("homePow").innerHTML = mini;
          $("setupPowNames").textContent = L.map((id) => PW[id].name).join(" \u00b7 ") || "None picked";
        }
        const sH = $("sH"),
          sA = $("sA"),
          clockEl = $("clock");
        let lastClock = "";
        function fmt(s) {
          s = Math.max(0, Math.ceil(s));
          return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
        }
        function powerOn(t, id) {
          if (t.wind && t.wind.id === id) return true;
          switch (id) {
            case "shito":
              return t.rocket > 0;
            case "magnet":
              return t.players.some((q) => q.magnet > 0);
            case "obolo":
              return t.players.some((q) => q.giant > 0);
            case "dumsor":
              return t.dumsor > 0;
            case "azonto":
              return t.players.some((q) => q.azonto > 0);
            case "trotro":
              return t.players.some((q) => q.dash > 0);
            case "sankofa":
              return t.sankofa > 0;
            case "kente":
              return t.kente > 0 || !!(kenteSeq && kenteSeq.tid === t.id);
          }
          return false;
        }
        const pepFill = $("pepFill"),
          pepNum = $("pepNum");
        let lastPep = -1;
        let lastAct = "";
        function updateHUD() {
          if (demo) return;
          const t0 = teams[0],
            t1 = teams[1];
          const al = ball.owner && ball.owner === t0.ctrl ? "Pass" : "Press";
          if (al !== lastAct) {
            $("tAct").textContent = al;
            $("tShoot").textContent = al === "Pass" ? "Shoot" : "Slide";
            lastAct = al;
          }
          sH.textContent = t0.score;
          sA.textContent = t1.score;
          const c = sudden ? "Golden goal" : fmt(matchT);
          if (c !== lastClock) {
            clockEl.textContent = c;
            lastClock = c;
          }
          for (const id of t0.loadout) {
            const p = PW[id],
              b = pbtn[id];
            if (!b) continue;
            const cd = t0.pw[id],
              cdr = Math.ceil(cd);
            if (b.last !== cd) {
              b.fill.style.transform =
                "scaleY(" + (cd > 0 ? cd / p.cd : 0) + ")";
              b.last = cd;
            }
            const txt = cd > 0 ? String(cdr) : "";
            if (b.cd.textContent !== txt) b.cd.textContent = txt;
            const price = powerCost(t0, id);
            if (b.price !== price) {
              b.cost.textContent = price;
              b.price = price;
            }
            const poor = t0.morale < price;
            if (b.poor !== poor) {
              b.root.classList.toggle("poor", poor);
              b.poor = poor;
            }
            const ready = cd <= 0 && !poor;
            if (b.ready !== ready) {
              b.root.classList.toggle("ready", ready);
              b.ready = ready;
            }
            const on = powerOn(t0, id);
            if (b.on !== on) {
              b.root.classList.toggle("on", on);
              b.on = on;
            }
          }
          const pep = Math.floor(t0.morale);
          if (pep !== lastPep) {
            pepFill.style.transform = "scaleX(" + pep / MOR_MAX + ")";
            pepNum.textContent = "Morale " + pep;
            lastPep = pep;
          }
          if (cpuPepEl)
            cpuPepEl.style.transform = "scaleX(" + t1.morale / MOR_MAX + ")";
          for (const el of cpuIcons) {
            const id = el.dataset.id,
              cool = t1.pw[id] > 0 || t1.morale < powerCost(t1, id);
            if (el.classList.contains("cool") !== cool)
              el.classList.toggle("cool", cool);
          }
        }

