// Generates the commentator's lines with ElevenLabs (voice "Callum", v3) into audio/cm/ and writes audio/cm/manifest.json.
// Idempotent: lines that already have an mp3 are skipped, so re-running only makes what is missing.
// usage: node tools/gen-audio.mjs [group ...]        (reads ELEVEN_LABS_API_KEY from ../.env; the key never ships to the site)
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {LINES} from './commentary.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]));
const KEY = env.ELEVEN_LABS_API_KEY;
const VOICE = 'N2lVS1w4EtoT3dr4eOWO'; // Callum
const OUT = path.join(ROOT, 'audio/cm');
fs.mkdirSync(OUT, {recursive: true});
const only = process.argv.slice(2);

const manifest = {};
let made = 0, chars = 0;
for (const [group, lines] of Object.entries(LINES)) {
  manifest[group] = [];
  for (let i = 0; i < lines.length; i++) {
    const id = `${group}-${i + 1}`, file = path.join(OUT, `${id}.mp3`);
    const text = lines[i];
    const spoken = text.replace(/\[[^\]]+\]\s*/g, '').trim();
    if (!fs.existsSync(file) && (!only.length || only.includes(group))) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
        method: 'POST', headers: {'xi-api-key': KEY, 'Content-Type': 'application/json'},
        body: JSON.stringify({text, model_id: 'eleven_v3', voice_settings: {stability: 0.0, similarity_boost: 0.75, style: 1.0, use_speaker_boost: true, speed: 1.08}}),
      });
      if (!res.ok) { console.error(`STOP at ${id}: ${res.status} ${(await res.text()).slice(0, 220)}`); break; }
      const raw = file + '.raw';
      fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_threshold=-48dB,areverse,loudnorm=I=-15:TP=-1.5:LRA=9', '-ac', '1', '-ar', '44100', '-b:a', '48k', file]);
      fs.rmSync(raw);
      made++; chars += text.length;
      console.log('made', id);
    }
    if (fs.existsSync(file)) {
      const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
      manifest[group].push({id, text: spoken, dur: +dur.toFixed(2)});
    }
  }
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
console.log(`done: ${made} new lines, ${chars} characters`);
