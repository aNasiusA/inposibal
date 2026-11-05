"use strict";
        const $ = (id) => document.getElementById(id);
        const canvas = $("c"),
          ctx = canvas.getContext("2d"),
          frameEl = $("frame");
        const W = 1200,
          H = 700,
          PX0 = 70,
          PX1 = 1130,
          PY0 = 60,
          PY1 = 640,
          CX = 600,
          CY = 350,
          GY0 = 262,
          GY1 = 438,
          GD = 44,
          BR = 9,
          TAU = Math.PI * 2;
        const clamp = (v, a, b) => (v < a ? a : v > b ? b : v),
          lerp = (a, b, t) => a + (b - a) * t,
          rand = (a, b) => a + Math.random() * (b - a),
          hyp = Math.hypot;
        const norm = (x, y) => {
          const d = Math.hypot(x, y) || 1;
          return [x / d, y / d];
        };
        const reduceMotion = !!(
          window.matchMedia &&
          matchMedia("(prefers-reduced-motion: reduce)").matches
        );
        const attackDir = (t) => (t === 0 ? 1 : -1),
          ownGoalX = (t) => (t === 0 ? PX0 : PX1),
          oppGoalX = (t) => (t === 0 ? PX1 : PX0);

