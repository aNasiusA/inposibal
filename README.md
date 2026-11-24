# Inposibal

A fast arcade football game in the browser with Ghanaian-themed superpowers. Play against the CPU, take on a friend online, or learn each power in the Practice room.

**▶ Play it: [inposibal.anasiusa.dev](https://inposibal.anasiusa.dev)**. It works on desktop and phone, with nothing to install.

<!-- Add a gameplay GIF here: promo-video/out has recordings -->

## Powers

Before kick-off you pick a loadout of powers. Each one costs **Morale**, which you earn during the match.

| Power | What it does |
|---|---|
| **Shito shot** | Charge a shot past 50% and it burns straight through defenders, leaving them dizzy. |
| **Dumsor** | The lights go out for 3s and every opposing outfield player freezes. |
| **Trotro rush** | Barrel down a lane and flatten defenders in your way. |
| **Azonto skill** | Dance past tackles with sharp cuts. |
| **Obolo** | Win shoulder-to-shoulder battles and hold the ball under pressure, at the cost of speed. |
| **Ball magnet** | A sticky first touch that traps loose balls from further away. |
| **Sankofa** | Rewind. Send your team sprinting back, or reverse a goal you just conceded. |
| **Kente wall** | A cloth stretches across your goal. It catches a shot, fakes the goal, then snaps back and stuns the shooter. It also bounces powers back at whoever cast them. |

## Modes

- **Kick off**: a 2-minute match against a CPU opponent, with adjustable difficulty. The CPU uses its own powers.
- **Play online**: quick match against a random opponent, or create a room and share the 5-letter code with a friend.
- **Practice**: short scripted drills, one per power, that show when each power pays off.

## Controls

| Action | Keyboard |
|---|---|
| Move | WASD / arrow keys |
| Shoot (hold to charge) | Space / J |
| Pass | K / Shift / X |
| Slide tackle | L / Z |
| Switch player | Q / E |
| Use power | 1 · 2 · 3 |
| Pause / mute | Esc or P / M |

On a phone the game shows touch controls.

## How it's built

- **No framework, no build step.** It's plain JavaScript on a `<canvas>`, split into ordered modules in `js/`: physics and world, CPU AI, powers, commentary, audio, rendering, input and networking.
- **CPU AI** (`js/08-ai.js`) predicts where the ball will be, presses, marks and decides when to use its powers.
- **Live commentary** (`js/04-commentary.js`) reacts to what happens on the pitch.
- **Online play** runs through a relay built on Cloudflare Workers and Durable Objects (`server/`). It pairs players for quick match, keeps rooms and relays WebSocket messages between the two players.

## Run locally

```bash
# The game: any static server works
npx serve .

# Online relay (optional). On localhost the game uses it automatically.
cd server && npm install && npm run dev
```

See [`server/README.md`](server/README.md) to deploy the relay.
