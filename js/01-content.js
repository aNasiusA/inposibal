"use strict";
        /* ---------- content ---------- */
        const POWERS = [
          {
            id: "shito",
            name: "Shito shot",
            cat: "Attacking",
            tier: "medium",
            cd: 7,
            wind: 0.25,
            color: "#ff5a36",
            blurb:
              "Arms your next shot for a 3s window. Charge it past 50% and it flies hot. It burns straight through anyone in its path, leaving them dizzy for 2.5s. Keepers can still parry it. You move slowly while charging.",
            icon: '<svg viewBox="0 0 24 24"><path d="M15.5 6.2c-3.6.2-7.5 3.4-9.6 8.4-1.4 3.4-.9 6.3.9 6.9 2.3.8 5.8-1.6 8.7-5.4 2.4-3.2 3.4-6.3 2.9-8.4-.6-1-1.7-1.6-2.9-1.5z"/><path d="M16.2 6.4c.2-1.7 1.1-3 2.8-3.8l.8 1.3c-1.2.6-1.8 1.4-1.9 2.6z"/></svg>',
          },
          {
            id: "dumsor",
            name: "Dumsor",
            cat: "Disruption",
            tier: "heavy",
            cd: 10,
            wind: 0.4,
            color: "#ffd166",
            blurb:
              "The lights flicker, then go off for 3s. Every opposing outfield player freezes on the spot while you run free.",
            icon: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-4.2 12.6V17h8.4v-2.4A7 7 0 0 0 12 2zM8.8 18.5h6.4V20a2 2 0 0 1-2 2h-2.4a2 2 0 0 1-2-2z"/><path d="M3 3l18 18" stroke="#1a1030" stroke-width="4" stroke-linecap="round"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
          },
          {
            id: "obolo",
            name: "Obolo",
            cat: "Defending",
            tier: "medium",
            cd: 7,
            wind: 0.25,
            color: "#c08bff",
            blurb:
              "Chop well and carry the weight for 4s. You win shoulder-to-shoulder tackles and hold the ball under pressure, but you run slower and turn wider.",
            icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="6" r="3.6"/><path d="M3 21.5c0-6.2 4-10.5 9-10.5s9 4.3 9 10.5z"/></svg>',
          },
          {
            id: "magnet",
            name: "Ball magnet",
            cat: "Defending",
            tier: "light",
            cd: 6,
            wind: 0.2,
            color: "#4da3ff",
            blurb:
              "A sticky first touch for 2.5s. You trap loose and fast balls from further away. It does nothing against a dribbler.",
            icon: '<svg viewBox="0 0 24 24"><path d="M3.5 3h5.5v9a3 3 0 0 0 6 0V3h5.5v9a8.5 8.5 0 0 1-17 0z"/></svg>',
          },
          {
            id: "trotro",
            name: "Trotro rush",
            cat: "Movement",
            tier: "light",
            cd: 5,
            wind: 0.35,
            color: "#f5f1e6",
            blurb:
              "Needs the ball. Your lane flashes, then you burst straight down it with no steering. Every opponent in the path is flattened and left dazed.",
            icon: '<svg viewBox="0 0 24 24"><path d="M1.5 7.5A2.5 2.5 0 0 1 4 5h11.5l4.2 4.5 2.8 1.3V17h-2.1a2.6 2.6 0 0 0-5.1 0H8.9a2.6 2.6 0 0 0-5.1 0H1.5z"/><circle cx="6.3" cy="17.6" r="2"/><circle cx="17.8" cy="17.6" r="2"/></svg>',
          },
          {
            id: "sankofa",
            name: "Sankofa",
            cat: "Recovery",
            tier: "medium",
            cd: 8,
            wind: 0.2,
            color: "#e0b04a",
            blurb:
              "Go back and fetch it. Use it in your half without the ball and your team sprints back goal-side for 2s. Use it right after conceding and the goal is reversed: the score is wiped and you restart with the ball.",
            icon: '<svg viewBox="0 0 24 24"><path d="M11.5 5.5v13L2.5 12zM21.5 5.5v13l-9-6.5z"/></svg>',
          },
          {
            id: "azonto",
            name: "Azonto skill",
            cat: "Dribbling",
            tier: "medium",
            cd: 7,
            wind: 0.2,
            color: "#3ddc84",
            blurb:
              "Needs the ball. For 1.8s every sharp cut bursts you away, and a tackle timed into a cut misses. Slides from behind still win.",
            icon: '<svg viewBox="0 0 24 24"><path d="M8.5 4.6L20 2v13.2a3 3 0 1 1-2.2-2.9V6.9l-7.1 1.6v9.7a3 3 0 1 1-2.2-2.9z"/></svg>',
          },
        ];
        const PW = Object.fromEntries(POWERS.map((p) => [p.id, p]));
        const TIER = { light: 15, medium: 25, heavy: 40 },
          MOR_START = 60,
          MOR_MAX = 100,
          LOCK = 0.6,
          REPEAT = 8,
          DR_WIN = 6;
        const DIFF = {
          chill: {
            speed: 0.84,
            react: 0.45,
            acc: 0.5,
            shootRange: 320,
            gkErr: 48,
            tackle: 0.1,
            slide: 0.05,
            slideHit: 0.4,
            moraleUse: 0.5,
            powerTick: 1.4,
            powerGap: 4,
            timing: 0.35,
          },
          pro: {
            speed: 0.93,
            react: 0.28,
            acc: 0.74,
            shootRange: 400,
            gkErr: 26,
            tackle: 0.18,
            slide: 0.12,
            slideHit: 0.55,
            moraleUse: 0.7,
            powerTick: 1,
            powerGap: 3,
            timing: 0.6,
          },
          legend: {
            speed: 1,
            react: 0.14,
            acc: 0.9,
            shootRange: 470,
            gkErr: 10,
            tackle: 0.28,
            slide: 0.22,
            slideHit: 0.7,
            moraleUse: 0.9,
            powerTick: 0.7,
            powerGap: 2,
            timing: 0.85,
          },
        };
        const settings = {
          diff: "pro",
          len: 120,
          loadout: ["shito", "dumsor", "trotro"],
          name: "",
          music: true,
          voice: true,
        };
        let muted = false;
        try {
          const s = JSON.parse(localStorage.getItem("wildpitch") || "{}");
          if (DIFF[s.diff]) settings.diff = s.diff;
          if ([60, 120, 240].includes(s.len)) settings.len = s.len;
          muted = !!s.muted;
          if (typeof s.name === "string") settings.name = s.name.slice(0, 14);
          if (s.music === false) settings.music = false;
          if (s.voice === false) settings.voice = false;
          if (Array.isArray(s.loadout)) {
            const l = [...new Set(s.loadout.filter((id) => PW[id]))].slice(
              0,
              3,
            );
            if (l.length === 3 && !loadoutProblem(l)) settings.loadout = l;
          }
        } catch (e) {}
        const saveSettings = () => {
          try {
            localStorage.setItem(
              "wildpitch",
              JSON.stringify({
                diff: settings.diff,
                len: settings.len,
                name: settings.name,
                music: settings.music,
                voice: settings.voice,
                muted,
                loadout: settings.loadout,
              }),
            );
          } catch (e) {}
        };
        function loadoutProblem(L) {
          if (L.filter((id) => PW[id].tier === "heavy").length > 1)
            return "Only one heavy power allowed.";
          if (L.length === 3 && L.every((id) => PW[id].cat === PW[L[0]].cat))
            return "Mix at least two categories.";
          return "";
        }
        function randomLoadout() {
          for (;;) {
            const ids = POWERS.map((p) => p.id);
            for (let i = ids.length - 1; i > 0; i--) {
              const j = (Math.random() * (i + 1)) | 0;
              [ids[i], ids[j]] = [ids[j], ids[i]];
            }
            const l = ids.slice(0, 3);
            if (!loadoutProblem(l)) return l;
          }
        }

