"""Prepara i campioni CC0 degli effetti sonori (vedi CREDITI.md) a partire dai pacchetti originali scaricati.

    python auto_ig/sfx/prepara.py <cartella con i pacchetti estratti>

Ogni file viene convertito in WAV mono 16 bit a 48 kHz. Il silenzio iniziale e finale viene tagliato
e il picco normalizzato a 0,9. Il risultato va in auto_ig/sfx/<nome>.wav, che audio.campione() usa al posto
dei suoni sintetici.
"""
from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np
import soundfile as sf

QUI = Path(__file__).resolve().parent
SR = 48000

# nome finale -> (file nel pacchetto, secondi massimi)
SORGENTI = {
    "scatto": ("photo.ogg", 0.9),                                           # OpenGameArt node/73696
    "pop": ("k_drop_002.wav", 0.25),                                        # Kenney Interface Sounds
    "tic": ("k_tick_004.wav", 0.1),                                         # Kenney Interface Sounds
    "conferma": ("k_confirmation_001.wav", 0.35),                           # Kenney Interface Sounds
    "pop_morbido": ("k_pluck_002.wav", 0.25),                               # Kenney Interface Sounds
    "whoosh": ("swishes/swishes/swish-9.wav", 0.3),                         # OpenGameArt swishes-sound-pack
    "swish": ("swishes/swishes/swish-13.wav", 0.15),                        # OpenGameArt swishes-sound-pack
    "tastiera": ("tastiera/Generated Typing/generated-006_faster.wav", 3.0),  # OpenGameArt keyboard-soundpack-1
}


def prepara(src: Path, nome: str, rel: str, max_sec: float) -> Path:
    x, sr = sf.read(src / rel, always_2d=True)
    x = x.mean(axis=1)
    if sr != SR:
        x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    soglia = 0.02 * np.abs(x).max()
    attivo = np.flatnonzero(np.abs(x) > soglia)
    if len(attivo):
        x = x[max(0, attivo[0] - int(0.002 * SR)): attivo[-1] + int(0.02 * SR)]
    x = x[: int(max_sec * SR)]
    coda = min(len(x), int(0.01 * SR))                    # dissolvenza di 10 ms: niente clic finale
    x[len(x) - coda:] *= np.linspace(1, 0, coda)
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    out = QUI / f"{nome}.wav"
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    return out


if __name__ == "__main__":
    src = Path(sys.argv[1])
    for nome, (rel, sec) in SORGENTI.items():
        p = prepara(src, nome, rel, sec)
        print(f"{p.name}: {p.stat().st_size // 1024} KB")
