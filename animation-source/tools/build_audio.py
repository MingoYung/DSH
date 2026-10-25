"""Build DSH Awakening's 22-second master, with the ORIGINAL character voice.

Run: python tools/build_audio.py  (requires NumPy)
No network access, source separation, TTS, or time stretching occurs here.

audio/character-original.wav is the complete original audio decoded/resampled
from lxj5820/dsh-boot-animation's assets/videos/1.mp4 (MIT, upstream license
shipped in the enclosing project). Input WAV: 48 kHz, 16-bit, stereo, 8.064 s.
Pinned source: https://raw.githubusercontent.com/lxj5820/dsh-boot-animation/
1a97e3b06c584b29d32747b22d8791480627fdd6/assets/videos/1.mp4
"""
from pathlib import Path
import json
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
DURATION = 22.0
TAIL_START = 13.6
TAIL_GAIN_DB = 0.5
SOURCE = ROOT / 'audio' / 'character-original.wav'
DEST = ROOT / 'audio' / 'awakening-master.wav'
REPORT = ROOT / 'audio' / 'audio-report.json'
RNG = np.random.default_rng(2026102502)
intro = np.zeros((round(TAIL_START * SR), 2), dtype=np.float64)


def times(duration):
    return np.arange(round(duration * SR), dtype=np.float64) / SR


def envelope(t, attack=.012, decay=.18):
    return (1 - np.exp(-t / attack)) ** 2 * np.exp(-t / decay)


def noise(duration, low=500, high=6500):
    t = times(duration)
    raw = RNG.standard_normal(len(t))
    f = np.fft.rfftfreq(len(t), 1 / SR)
    rolloff = (1 - np.exp(-(f / low)**4)) * np.exp(-(f / high)**4)
    filtered = np.fft.irfft(np.fft.rfft(raw) * rolloff, n=len(t))
    return filtered / max(np.std(filtered), 1e-12)


def point(duration, frequency, decay=.08):
    t = times(duration)
    carrier = np.sin(2 * np.pi * frequency * t)
    carrier += .11 * np.sin(2 * np.pi * 2.009 * frequency * t + .19)
    return carrier * envelope(t, .004, decay)


def air(duration):
    t = times(duration)
    contour = np.sin(np.pi * t / duration)**2.5
    return contour * (.18 * noise(duration, 700, 7000) + .11 * noise(duration, 140, 1400))


def place(onset, samples, gain=1.0, pan=0.0, reflections=False):
    left = samples * np.sqrt((1 - pan) / 2)
    right = samples * np.sqrt((1 + pan) / 2)
    stereo = np.column_stack((left, right)) * gain
    start = round(onset * SR)
    n = min(len(stereo), len(intro) - start)
    if n > 0:
        intro[start:start+n] += stereo[:n]
    if reflections:
        for delay, attenuation in [(.041, .10), (.079, .045)]:
            pos = start + round(delay * SR)
            n = min(len(stereo), len(intro) - pos)
            if n > 0:
                intro[pos:pos+n] += stereo[:n, ::-1] * attenuation


# 0.45: restrained system power pulse, no sustained music bed.
t = times(.65)
power = np.sin(2*np.pi*(72*t+19*t*t))*envelope(t,.020,.105)
power += .045*noise(.65,180,2200)*envelope(t,.025,.13)
place(.45,power,.27,pan=-.02)

# 2.20: the whale silhouette is traced, a short directional air gesture.
place(2.20,air(.75),.28,pan=-.16)
place(2.31,point(.35,1620,.044),.035,pan=.13)

# 4.50: logo completion, one clear glass-like acknowledgement.
place(4.50,point(.7,1174,.13),.105,pan=.03,reflections=True)

# 6.80: tiny, dry type-setting contacts, deliberately below the main accents.
for offset,freq,gain,pan in [(0,1560,.047,-.17),(.11,1740,.036,.06),(.23,2080,.025,.16)]:
    place(6.80+offset,point(.20,freq,.024),gain,pan)

# 8.70: controlled decomposition into points; short, spacious, non-musical.
place(8.70,air(.72),.16,pan=.10)
for offset,freq,gain,pan in [(0,2280,.026,-.25),(.14,2640,.019,.20),(.29,1860,.020,-.06)]:
    place(8.74+offset,point(.30,freq,.046),gain,pan)

# 11.80 -> 13.60: a single release carrying the logo's light into the video.
# Its final envelope reaches zero EXACTLY at the character start. Nothing
# synthesized, echoed, or reverberated is added after the handoff boundary.
release = air(TAIL_START - 11.80)
place(11.80,release,.205,pan=0)

# Preserve authentic silence between events and ample prelude headroom.
intro -= np.mean(intro,axis=0,keepdims=True)
fade = np.linspace(0,1,round(.010*SR))
intro[:len(fade)] *= fade[:,None]
intro[-len(fade):] *= fade[::-1,None]
intro_peak = max(float(np.max(np.abs(intro))),1e-12)
intro *= 10**(-8.0/20)/intro_peak

with wave.open(str(SOURCE),'rb') as inp:
    assert inp.getframerate()==SR and inp.getnchannels()==2 and inp.getsampwidth()==2
    original_pcm = np.frombuffer(inp.readframes(inp.getnframes()),dtype='<i2').reshape(-1,2).copy()

tail_gain = 10**(TAIL_GAIN_DB/20)
tail_pcm = np.rint(original_pcm.astype(np.float64)*tail_gain).astype(np.int32)
assert np.max(np.abs(tail_pcm)) < 32767, 'Original voice would clip'
master_pcm = np.zeros((round(DURATION*SR),2),dtype='<i2')
master_pcm[:len(intro)] = np.rint(intro*32767).astype('<i2')
tail_onset = round(TAIL_START*SR)
assert tail_onset+len(tail_pcm)<=len(master_pcm)
master_pcm[tail_onset:tail_onset+len(tail_pcm)] = tail_pcm.astype('<i2')

# This equality proves that no decorative layer was mixed over the character
# source; only the requested +0.5 dB gain was applied, without rescheduling.
assert np.array_equal(master_pcm[tail_onset:tail_onset+len(tail_pcm)],tail_pcm.astype('<i2'))
DEST.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(DEST),'wb') as out:
    out.setnchannels(2);out.setsampwidth(2);out.setframerate(SR)
    out.writeframes(master_pcm.tobytes())

peak = float(np.max(np.abs(master_pcm.astype(np.float64)/32768)))
report = {
    'master':DEST.name,
    'duration_seconds':len(master_pcm)/SR,
    'sample_rate':SR,'channels':2,'sample_width_bits':16,
    'sample_peak_dbfs':float(20*np.log10(peak)),
    'character_source':SOURCE.name,
    'character_start_seconds':TAIL_START,
    'character_duration_seconds':len(original_pcm)/SR,
    'character_end_seconds':TAIL_START+len(original_pcm)/SR,
    'character_gain_db':TAIL_GAIN_DB,
    'character_time_stretch':False,
    'character_samples_unmixed_after_uniform_gain':True,
    'new_effects_after_character_start':False,
    'tts_or_source_separation':False,
    'original_effect_onsets_seconds':[.45,2.20,4.50,6.80,8.70,11.80],
    'handoff_seconds':TAIL_START,
    'synthesized_audio_ends_by_seconds':TAIL_START,
    'manual_listening_performed':False,
    'voice_wording_evidence':'User reports welcome-back speech. Model audio input unavailable; no claimed transcription.',
    'file_bytes':DEST.stat().st_size
}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
