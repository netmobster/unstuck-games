// Copy Orbis audio into public/audio. SFX sources are full Suno tracks, but the original
// player never seeks past 60s and plays ≤5s slices — so SFX are trimmed losslessly at an
// MP3 frame boundary to the first SFX_SECONDS. Music is copied untouched (it streams).
//
//   bun run scripts/prepare-audio.ts <path-to-lumina-orbits/src/assets>
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SFX_SECONDS = 66;
const src = process.argv[2];
if (!src) throw new Error("usage: prepare-audio.ts <lumina-orbits/src/assets>");
const out = join(import.meta.dir, "..", "public", "audio");
mkdirSync(out, { recursive: true });

const BITRATES: Record<string, number[]> = {
  v1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  v2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function trimMp3(buf: Buffer, seconds: number): { bytes: Buffer; kbps: number; duration: number } {
  let pos = 0;
  if (buf.toString("latin1", 0, 3) === "ID3") {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    pos = 10 + size;
  }
  const start = pos;
  let t = 0, kbps = 0;
  while (pos + 4 <= buf.length && t < seconds) {
    if (buf[pos] !== 0xff || (buf[pos + 1] & 0xe0) !== 0xe0) { pos++; continue; }
    const version = (buf[pos + 1] >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[pos + 1] >> 1) & 3; // 1 = Layer III
    const brIdx = buf[pos + 2] >> 4;
    const srIdx = (buf[pos + 2] >> 2) & 3;
    const padding = (buf[pos + 2] >> 1) & 1;
    if (version === 1 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) { pos++; continue; }
    const bitrate = BITRATES[version === 3 ? "v1" : "v2"][brIdx] * 1000;
    const rate = RATES[version][srIdx];
    const samples = version === 3 ? 1152 : 576;
    const len = Math.floor((samples / 8) * bitrate / rate) + padding;
    kbps = bitrate / 1000;
    t += samples / rate;
    pos += len;
  }
  return { bytes: buf.subarray(start, Math.min(pos, buf.length)), kbps, duration: t };
}

// sfx-attach.mp3 (enemy latch) is skipped: enemies are cut from v1.
for (const name of ["sfx-merge.mp3", "sfx-collision.mp3"]) {
  const r = trimMp3(readFileSync(join(src, name)), SFX_SECONDS);
  writeFileSync(join(out, name), r.bytes);
  console.log(`${name}: ${r.kbps}kbps, trimmed to ${r.duration.toFixed(1)}s, ${(r.bytes.length / 1e6).toFixed(2)} MB`);
}
copyFileSync(join(src, "geyserlight-sonar.mp3"), join(out, "music.mp3"));
console.log(`music.mp3: ${(statSync(join(out, "music.mp3")).size / 1e6).toFixed(2)} MB (untouched, streamed)`);
