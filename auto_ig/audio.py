"""Audio ad alta energia per i reel: battute (cambi visivi), effetti sonori e base musicale, tutto a codice.

Le *battute* sono gli istanti in cui la scena cambia qualcosa (stacco, zoom, rivelazione). Si calcolano qui
una volta sola e vanno sia alla scena (parametro `battute`) sia al mix (effetti sonori sugli stessi istanti):
immagine e suono restano sincronizzati.

    battute(frasi, schede)                -> [(secondi, tipo), ...]  tipo: boom | stacco | punch | rivela
    mix(voce.wav, battute, durata, out)   -> wav stereo 48 kHz: voce + base (abbassata sotto la voce) + effetti

Nessun file esterno: niente copyright. Ritmo della ricerca (formati.yaml → ritmo_alto): un cambio ogni ~1,5–3 s,
a intervalli irregolari.
"""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SR = 48000
BPM = 116
# Livelli (ampiezza lineare, la voce va a ~0.9 di picco)
LIV_BASE = 0.16          # base musicale senza voce
DUCK = 0.6               # quanto si abbassa la base mentre la voce parla (0..1)
LIV_SFX = {"boom": 0.55, "stacco": 0.32, "punch": 0.22, "rivela": 0.3}
PASSO = (1.5, 2.3)       # distanza minima/massima tra due battute dentro una frase (s)


def _h(i: float) -> float:
    """Pseudo-casuale deterministico in [0,1) (uguale a quello delle scene)."""
    x = np.sin(i * 127.1 + 311.7) * 43758.5453
    return float(x - np.floor(x))


# --- Battute ------------------------------------------------------------------------------------
def battute(frasi: list, schede: list | None = None) -> list[tuple[float, str]]:
    """Istanti dei cambi visivi. `frasi` = oggetti con .start/.end (voce.Sentence) o tuple (start, end).
    Ogni frase apre con uno stacco (gancio/rehook: boom, dettaglio: rivela); dentro la frase un "punch"
    ogni 1,5–2,3 s (irregolare), mai a meno di 0,7 s dalla frase dopo."""
    tempi = [(f.start, f.end) if hasattr(f, "start") else (float(f[0]), float(f[1])) for f in frasi]
    schede = schede or [{}] * len(tempi)
    out: list[tuple[float, str]] = []
    for i, (a, b) in enumerate(tempi):
        tipo = (schede[i] or {}).get("tipo", "") if i < len(schede) else ""
        t0 = 0.0 if i == 0 else a                       # la prima battuta è al fotogramma 0
        out.append((round(t0, 2), {"gancio": "boom", "rehook": "boom", "dettaglio": "rivela"}.get(tipo, "stacco")))
        if tipo == "cta":
            continue
        fine = (tempi[i + 1][0] if i + 1 < len(tempi) else b + 0.6) - 0.7
        t, k = t0, 0
        while True:
            t += PASSO[0] + (PASSO[1] - PASSO[0]) * _h(i * 7 + k)
            if t > fine:
                break
            out.append((round(t, 2), "punch"))
            k += 1
    return out


def battute_param(bt: list[tuple[float, str]]) -> str:
    """Parametro URL per la scena: "0:boom,1.62:punch,..."."""
    return ",".join(f"{t:.2f}:{k}" for t, k in bt)


# --- Sintesi ------------------------------------------------------------------------------------
def _t(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def _env(n: int, att: float, dec: float) -> np.ndarray:
    """Inviluppo attacco lineare + decadimento esponenziale (in secondi)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(att, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - att, 0) / max(dec, 1e-4))


def _rumore(n: int, seme: int) -> np.ndarray:
    return np.random.default_rng(seme).uniform(-1, 1, n)


def _passabasso(x: np.ndarray, k: float) -> np.ndarray:
    """Filtro a un polo (k 0..1, più basso = più scuro). k può essere un array (filtro che si apre)."""
    y = np.empty_like(x)
    k = np.broadcast_to(np.asarray(k, dtype=float), x.shape)
    acc = 0.0
    for i in range(len(x)):
        acc += k[i] * (x[i] - acc)
        y[i] = acc
    return y


def whoosh(dur: float = 0.38, seme: int = 1) -> np.ndarray:
    """Soffio che sale e scende (stacchi)."""
    n = int(dur * SR)
    t = np.arange(n) / n
    forma = np.sin(np.pi * t) ** 2
    x = _passabasso(_rumore(n, seme), 0.03 + 0.25 * forma)
    return x / (np.abs(x).max() + 1e-9) * forma


def pop(seme: int = 2) -> np.ndarray:
    """"Pop" corto con glissando in su (comparsa di icone/zoom)."""
    t = _t(0.12)
    f = 420 + 900 * (t / t[-1])
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(t), 0.002, 0.035)
    return s + 0.15 * _rumore(len(t), seme) * _env(len(t), 0.001, 0.008)


def ding() -> np.ndarray:
    """Campanello brillante (rivelazioni)."""
    t = _t(1.1)
    e = _env(len(t), 0.003, 0.32)
    return sum(a * np.sin(2 * np.pi * f * t) for f, a in ((1318.5, 0.6), (1975.5, 0.3), (2637.0, 0.18), (3951.0, 0.08))) * e


def boom(seme: int = 3) -> np.ndarray:
    """Colpo grave con coda (gancio, rehook)."""
    t = _t(0.9)
    f = 38 + 90 * np.exp(-t / 0.05)
    corpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(t), 0.002, 0.28)
    crash = _passabasso(_rumore(len(t), seme), 0.35) * _env(len(t), 0.001, 0.12)
    return corpo + 0.5 * crash


SUONI = {"boom": lambda: boom(), "stacco": lambda: whoosh(), "punch": lambda: pop(), "rivela": lambda: ding()}


def _nota(f: float, dur: float, timbro: str = "pad") -> np.ndarray:
    t = _t(dur)
    if timbro == "basso":
        s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
        return s * _env(len(t), 0.005, dur * 0.5)
    # pad: tre sinusoidi leggermente stonate, attacco morbido
    s = sum(np.sin(2 * np.pi * f * d * t) for d in (0.997, 1.0, 1.004)) / 3
    a = np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.15, 0, 1)
    return s * a


def base(durata: float, bpm: int = BPM) -> np.ndarray:
    """Base pop leggera: cassa sui quarti, hi-hat in levare, basso e pad su Am–F–C–G (2 battute per accordo)."""
    n = int(durata * SR) + SR
    out = np.zeros(n)
    q = 60 / bpm                                       # durata di un quarto
    cassa = (np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-_t(0.3) / 0.03)) / SR) * _env(int(0.3 * SR), 0.001, 0.09))
    hat = _passabasso(_rumore(int(0.06 * SR), 9), 0.9)
    hat = (hat - _passabasso(hat, 0.2)) * _env(len(hat), 0.001, 0.015)
    accordi = [(220.0, (440.0, 523.25, 659.25)),       # Am
               (174.61, (349.23, 440.0, 523.25)),      # F
               (130.81, (392.0, 523.25, 659.25)),      # C
               (196.0, (392.0, 493.88, 587.33))]       # G

    def metti(x: np.ndarray, t: float, g: float = 1.0) -> None:
        i = int(t * SR)
        if i < n:
            m = min(len(x), n - i)
            out[i:i + m] += g * x[:m]

    k = 0
    while k * q < durata + q:
        t = k * q
        metti(cassa, t, 0.9)
        metti(hat, t + q / 2, 0.35)
        if k % 8 == 0:                                 # nuovo accordo ogni 2 battute (8 quarti)
            b, pad = accordi[(k // 8) % 4]
            metti(_nota(b / 2, q * 7.5, "basso"), t, 0.5)
            for f in pad:
                metti(_nota(f, q * 8), t, 0.12)
        k += 1
    return out[: int(durata * SR)]


# --- Mix ---------------------------------------------------------------------------------------
def leggi_wav(path: Path) -> np.ndarray:
    """Wav PCM 16 bit (mono o stereo, qualsiasi frequenza) -> mono float a 48 kHz."""
    with wave.open(str(path), "rb") as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(float) / 32768
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    if sr != SR and len(x):
        x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    return x


def scrivi_wav(path: Path, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(np.repeat(pcm, 2).tobytes())


def inviluppo(x: np.ndarray, finestra: float = 0.12) -> np.ndarray:
    """Volume della voce nel tempo (0..1), lisciato: guida l'abbassamento della base."""
    k = max(1, int(finestra * SR))
    e = np.convolve(np.abs(x), np.ones(k) / k, mode="same")
    return np.clip(e / (np.percentile(e, 95) + 1e-9), 0, 1)


def mix(voce_wav: Path, bt: list[tuple[float, str]], durata: float, out: Path,
        musica: bool = True, sfx: bool = True) -> Path:
    """Voce + base abbassata sotto la voce + effetti sulle battute. Normalizzato, senza clipping."""
    n = int(durata * SR)
    v = leggi_wav(voce_wav)[:n]
    v = np.pad(v, (0, n - len(v)))
    if np.abs(v).max() > 0:
        v = v / np.abs(v).max() * 0.9
    tot = v.copy()
    if musica:
        m = base(durata)
        m = m / (np.abs(m).max() + 1e-9) * LIV_BASE
        coda = np.clip((durata - np.arange(n) / SR) / 1.2, 0, 1)        # dissolvenza finale
        tot += m * (1 - DUCK * inviluppo(v)) * coda
    if sfx:
        cache = {}
        for t, tipo in bt:
            s = cache.setdefault(tipo, SUONI.get(tipo, SUONI["stacco"])())
            s = s / (np.abs(s).max() + 1e-9) * LIV_SFX.get(tipo, 0.25)
            i = int(t * SR)
            if i < n:
                m_ = min(len(s), n - i)
                tot[i:i + m_] += s[:m_]
    picco = np.abs(tot).max()
    if picco > 0.97:
        tot *= 0.97 / picco
    out.parent.mkdir(parents=True, exist_ok=True)
    scrivi_wav(out, tot)
    return out
