# Practice Room: plan

## Why
Playtesters find the game too hard and don't use their powers. They don't know what each power does or when it pays off. A match is the wrong place to learn that: Morale is scarce, the CPU is pressing, and nobody wants to waste 25 Morale on a guess.

Goal: every power can be tried in a short, scripted situation where it is obviously the right move, and the player sees it work in under 30 seconds.

## The experience
1. Player opens **Practice** from the menu, or taps **Practice this power** on a power in the picker.
2. A drill loads. The pitch is set up so the power is the answer (examples below). Morale is full, cooldowns are zero, no clock, no CPU powers.
3. A **coach card** (top centre, under the HUD) gives one instruction at a time. The relevant power button pulses and the key hint shows.
4. The drill detects success and says why it worked ("3 defenders frozen, you walked it in"). **Again** / **Next power** / **Back**.
5. Fail states reset the scene instantly. No game-over screens.

## Drills (one per power)

| Power | Setup | Steps | Success |
|---|---|---|---|
| **Shito shot** | You on the ball at the edge of the box. One defender and the keeper in the shooting lane. | 0. (Optional) take a normal shot and watch it get blocked. 1. Press `1`. 2. Hold Space until the charge ring turns orange (50%+). 3. Release. | Ball ignites and burns through the defender, or scores. |
| **Dumsor** | You on the ball near halfway, 3 defenders closing in. | 1. Press the power. 2. Lights go out, they freeze. 3. Run to goal and shoot inside the 3s. | Goal scored during the freeze. |
| **Trotro rush** | You on the ball, a wall of 3 defenders between you and goal. | 1. Aim at the gap. 2. Press the power, then ride the lane. | 2+ defenders flattened, then a shot. |
| **Azonto skill** | A tackler chases you down the wing. | 1. Press the power. 2. Make a sharp cut (60°+) as the tackler lunges. | 2 tackles dodged. |
| **Obolo** | Two defenders pressing you in the middle. | 1. Press the power. 2. Hold the ball. | Keep possession for 5s after activating. |
| **Ball magnet** | A coach "ball machine" fires 3 fast loose balls near you. | 1. Press the power. 2. Run into the balls. | Trap 2 or more. |
| **Sankofa** | Part A: the CPU is running at your goal while you are out of position. Part B: a scripted CPU goal. | A. Press the power; your team sprints back. B. When the goal lands, press the power during the GOAL! window. | Part A: shot stopped or ball won. Part B: goal reversed and the score is back to 0-0. |

Sankofa's second use (reversing a goal) is the most valuable and the least discoverable, so it gets its own part rather than a footnote.

## What the code already gives us
The game is split into `index.html` (markup), `css/style.css` and ordered scripts in `js/` (the practice room lives in `js/07-practice.js`), all sharing one global scope. Relevant pieces:
- `POWERS`, `powerCost`, `usePower`, `landPower` (~line 287, 603-660): power definitions and activation.
- `setupKickoff(kt)` (~line 372): sets players and ball for a scene. A drill scene is a variant of this.
- `startMatch` / `startDemo` / `toMenu` (~line 484): how modes start and stop. `demo=false` plus a drill flag gives a real-input scene.
- `update` / `playUpdate` (~line 870): the match clock, `aiPowers`, and `checkGoal` live here. These are what a drill has to switch off.
- `aiControl` (~line 690): CPU behaviour. Drills need per-player roles (hold position, press, chase, frozen dummy).
- `shoot`, `resolveTackles`, `take`, `goalScored`: where success events fire.
- `buildPowerBar`, `updateHUD`, `#menu`, `#plist`/`#pdesc`: where the pulse, coach card and Practice entry points go.
- A `/*__TEST_HOOK__*/` exists at the end of the script. A drill harness can use the same approach for automated checks.

## Implementation

### Phase 1: framework and the Shito drill (prove the idea)
- Add `drill = {id, step, t, done}` state and a `DRILLS` table: `{id, title, setup(), steps:[{text, hint, done()}], onEvent?}`.
- `startDrill(id)`: like `startMatch` but with `matchT` frozen, `endMatch` and kickoff-restart suppressed, `aiPowers` skipped, team 0 loadout `[id, ...]`, Morale pinned at max, cooldown reset after each attempt.
- Scene setup: place players and ball from a spec (`you`, `defenders:[{x,y,role}]`, `ball`). Roles: `hold`, `press`, `chase`, `frozen`.
- Gate the goal flow: in drill mode `goalScored` calls `drillOnGoal()` (check success, show result, reset) and skips the GOAL! celebration and kickoff.
- Coach card DOM (`#coach`) with step text, key hint, and result buttons. Power button pulse via a CSS class on `#powers .pw`. Works with the existing touch layout and `--u` scaling.
- Event hooks (`drillEvent(name, data)`) called from `landPower`, `shoot`, the Shito burn branch, `goalScored`: no-ops outside drills.
- Pause, quit-to-menu and the blur-auto-pause behave as in a match.

### Phase 2: remaining six drills
Order by how often playtesters probably skip them and by effort: Dumsor, Trotro, Azonto, Obolo, Ball magnet, Sankofa (A then B). Sankofa B needs a scripted CPU goal and the existing rewind path (`reverseGoal`, `startRewind`). Ball magnet needs a ball-feeder helper.

### Phase 3: entry points and nudges
- **Menu**: a `Practice` button under Kick off, opening a small drill list with a check mark for completed drills (`localStorage`, same `wildpitch` key family).
- **Picker**: a `Practice this power` button in `#pdesc`, so the player tries a power right when they consider picking it.
- **First launch**: if the player has not completed any drill, show a one-line prompt on Kick off ("New here? 30s practice"). Skippable, never blocks.
- **Unpicked-power nudge** (cheap, targets the actual complaint): in a real match, if a power has been ready and affordable for ~20s and unused, pulse its button once.
- **Drill end**: after the last drill, return to the menu with a "Ready" state.

### Phase 4: playtest and tune
- Same friends, same difficulty. Compare the end-screen "Powers used" count before and after, and ask whether they know when to use each power.
- Tune drill difficulty (too easy teaches nothing, too hard recreates the problem). Each drill should be passable in 1-3 attempts.

## Risks and decisions
- **File size / complexity**: everything is in one file. A `DRILLS` table plus about 150 lines of harness should fit, but keep drill code in one clearly labelled section.
- **AI interference**: `aiControl` is built for open play. Drill roles must override it cleanly, not fight it. Easiest is a `p.role` check at the top of `aiControl`.
- **Sankofa B timing**: the 2.2-2.6s goal window is tight for a first-timer. Consider a slowed `timeScale` in the drill.
- **Scope**: seven drills is the full set. If time is short, ship Shito, Dumsor and Sankofa first (the ones with the least obvious payoff), then add the rest.

## Open questions
1. Should a drill be required before the power can be picked, or always optional? Recommendation: optional, with nudges.
2. Do you want the optional "normal shot gets blocked first" beat in the Shito drill? It shows why the power matters, at the cost of 10 seconds.
3. Should drill completion carry a reward (a badge on the power in the picker), or is the check mark enough?
