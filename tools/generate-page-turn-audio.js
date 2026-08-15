// Deterministically generates the short, self-owned page-turn WAV used by the ebook.
const fs = require('fs');
const path = require('path');
const sampleRate = 22050;
const duration = 0.72;
const sampleCount = Math.floor(sampleRate * duration);
const dataSize = sampleCount * 2;
const out = Buffer.alloc(44 + dataSize);
out.write('RIFF', 0); out.writeUInt32LE(36 + dataSize, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20);
out.writeUInt16LE(1, 22); out.writeUInt32LE(sampleRate, 24); out.writeUInt32LE(sampleRate * 2, 28);
out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(dataSize, 40);
let seed = 0x6a773ca9;
let smooth = 0;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed / 0xffffffff) * 2 - 1; };
for (let i = 0; i < sampleCount; i++) {
  const t = i / sampleRate;
  const noise = random();
  smooth = smooth * .72 + noise * .28;
  const sweep = Math.sin(2 * Math.PI * (360 + 720 * t) * t) * .13;
  const firstLeaf = Math.exp(-Math.pow((t - .24) / .16, 2));
  const settling = Math.exp(-Math.pow((t - .49) / .12, 2)) * .42;
  const attack = Math.min(1, t / .025);
  const release = Math.min(1, (duration - t) / .09);
  const envelope = Math.max(0, attack * release) * (firstLeaf + settling);
  const sample = Math.max(-1, Math.min(1, (smooth * .78 + noise * .22 + sweep) * envelope * .48));
  out.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
}
const target = path.join(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'page-turn.wav'), out);
