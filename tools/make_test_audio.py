"""Generate test audio for the automated browser test.

Writes a mono 16-bit WAV containing repeated plucked low-E notes (82.41 Hz) with a
realistic harmonic stack and decay. Chrome can be pointed at it with
--use-file-for-fake-audio-capture so the whole microphone -> pitch -> judge path
runs without a guitar.

Run: python tools/make_test_audio.py
"""
import math
import os
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", "fixtures")
os.makedirs(OUT, exist_ok=True)

SR = 48000
F0 = 82.4069  # E2
DUR = 14.0
NOTE_EVERY = 0.857  # quarter note at 70 BPM
DECAY = 0.0125  # per-harmonic decay rate scale

n = int(SR * DUR)
samples = [0.0] * n

t_next = 0.0
while t_next < DUR:
    start = int(t_next * SR)
    length = int(min(0.78, DUR - t_next) * SR)
    for i in range(length):
        t = i / SR
        env = math.exp(-t * 2.6) * min(1.0, t / 0.004)
        s = 0.0
        for h in range(1, 11):
            fh = F0 * h * math.sqrt(1 + 7e-5 * h * h)
            if fh > SR / 2 - 1000:
                break
            s += (h ** -1.15) * math.exp(-t * DECAY * h) * math.sin(2 * math.pi * fh * t + h * 0.6)
        idx = start + i
        if idx < n:
            samples[idx] += s * env * 0.32
    t_next += NOTE_EVERY

# Light noise floor so the silence gate has something realistic to reject.
seed = 12345
for i in range(n):
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
    samples[i] += ((seed / 4294967296.0) * 2 - 1) * 0.0012

peak = max(1e-9, max(abs(x) for x in samples))
scale = 0.85 / peak
frames = bytearray()
for x in samples:
    v = int(max(-1.0, min(1.0, x * scale)) * 32767)
    frames += struct.pack("<h", v)

path = os.path.join(OUT, "lowE-loop.wav")
with wave.open(path, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(bytes(frames))

print(f"wrote {path}  {DUR}s  {n} samples  {os.path.getsize(path)} bytes")
