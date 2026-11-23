"""Voice-over: text-to-speech locale (Piper) + sottotitoli con parola evidenziata (ASS/libass).

Una frase del copione alla volta: la durata reale dell'audio dà il tempo della frase,
il tempo di ogni parola è stimato in proporzione alla sua lunghezza.
"""
from __future__ import annotations

import hashlib
import io
import os
import re
import subprocess
import wave
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path

from .config import ROOT

VOICES_DIR = ROOT / ".voci"
DEFAULT_VOICE = "it_IT-paola-medium"
LEAD_IN = 0.05         # la voce parla già al fotogramma 0 (Antonio, 2026-11-23: "appena comincia il video, la voce
                       # deve star quasi già parlando"). Non alzarlo: il silenzio iniziale fa scrollare via.
PAUSE = 0.35           # pausa tra una frase e l'altra
TAIL = 1.0             # secondi di video dopo l'ultima parola

# Tono per frase. Piper non "recita": la rabbia si rende con ritmo, variabilità e testo.
TONES = {
    "": {"speed": 1.0, "noise": None, "noise_w": None, "highlight": None, "scale": 108, "shake": 0},
    "arrabbiata": {"speed": 1.13, "noise": 0.85, "noise_w": 1.0, "highlight": "#FF3B30", "scale": 116, "shake": 3},
    "felice": {"speed": 0.96, "noise": 0.75, "noise_w": 0.9, "highlight": None, "scale": 112, "shake": 0},
}


@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class Sentence:
    text: str
    start: float
    end: float
    words: list[Word]
    tone: str = ""


def word_timings(text: str, start: float, end: float) -> list[Word]:
    """Distribuisce [start, end] sulle parole in base alla lunghezza (+ pausa per la punteggiatura)."""
    words = text.split()
    if not words:
        return []
    weights = [len(re.sub(r"\W", "", w)) + 2 + (3 if re.search(r"[,;:.!?…]$", w) else 0) for w in words]
    total, t, out = sum(weights), start, []
    for w, k in zip(words, weights):
        d = (end - start) * k / total
        out.append(Word(w, round(t, 3), round(t + d, 3)))
        t += d
    return out


def _load_voice(name: str):
    from piper import PiperVoice
    path = VOICES_DIR / f"{name}.onnx"
    if not path.exists():
        raise FileNotFoundError(f"Voce {name} non trovata in {VOICES_DIR} (scaricala da huggingface.co/rhasspy/piper-voices)")
    return PiperVoice.load(str(path))


# --- Qwen3-TTS (Apache 2.0): voce più naturale, più lenta (~10x il tempo reale su CPU) ----------
# modello: "qwen3-vivian" (o un altro speaker: serena, ryan, aiden, ...). Le frasi già sintetizzate
# finiscono in .voci/cache: rifare un video dopo una modifica grafica non rigenera la voce.
QWEN_REPO = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
CACHE_DIR = VOICES_DIR / "cache"


def is_qwen(name: str) -> bool:
    return str(name).startswith("qwen3")


@lru_cache(maxsize=1)
def _qwen_model():
    import torch
    from qwen_tts import Qwen3TTSModel
    torch.set_num_threads(os.cpu_count() or 4)
    return Qwen3TTSModel.from_pretrained(QWEN_REPO, device_map="cpu", dtype=torch.float32)


def _atempo(pcm: bytes, rate: int, speed: float) -> bytes:
    """Velocità senza cambiare l'intonazione (ffmpeg atempo); PCM 16 bit mono."""
    if abs(speed - 1.0) < 0.01:
        return pcm
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "-",
                        "-filter:a", f"atempo={min(max(speed, 0.5), 2.0)}", "-f", "s16le", "-"],
                       input=pcm, capture_output=True, check=True)
    return p.stdout


def _qwen_synth(speaker: str, text: str, speed: float) -> tuple[bytes, int, int, int]:
    """Frase letta da Qwen3 (dalla cache se già fatta). La velocità si applica dopo la cache: cambiarla è istantaneo."""
    key = hashlib.sha1(f"{QWEN_REPO}|{speaker}|{text}".encode()).hexdigest()[:20]
    cached = CACHE_DIR / f"{key}.wav"
    if not cached.exists():
        import numpy as np
        import torch
        torch.manual_seed(int(key[:8], 16))             # stessa frase = stessa lettura
        wavs, rate = _qwen_model().generate_custom_voice(text=text, language="Italian", speaker=speaker)
        a = np.clip(np.asarray(wavs[0], dtype=np.float32), -1, 1)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with wave.open(str(cached), "wb") as wf:
            wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(rate)
            wf.writeframes((a * 32767).astype("<i2").tobytes())
    with wave.open(str(cached), "rb") as rf:
        pcm, rate = rf.readframes(rf.getnframes()), rf.getframerate()
    return _atempo(_trim(pcm, rate), rate, speed), rate, 2, 1


# --- Google Cloud TTS, voci Chirp 3 HD (madrelingua italiane) ------------------------------------
# modello: "chirp3-aoede" (la voce di Cintre, scelta da Antonio il 2026-11-18) o un'altra voce Chirp 3 HD.
# Chiave in .env: GOOGLE_TTS_API_KEY (limitata alla sola Text-to-Speech API). Gratis fino a 1M caratteri/mese;
# le frasi già fatte stanno in .voci/cache e non consumano caratteri.
CHIRP_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"


def is_chirp(name: str) -> bool:
    return str(name).startswith("chirp3")


def _chirp_synth(voce_nome: str, text: str, speed: float) -> tuple[bytes, int, int, int]:
    """Frase letta da Chirp 3 HD (dalla cache se già fatta); la velocità si applica dopo, come per Qwen."""
    nome = f"it-IT-Chirp3-HD-{voce_nome.capitalize()}"
    key = hashlib.sha1(f"{nome}|{text}".encode()).hexdigest()[:20]
    cached = CACHE_DIR / f"chirp-{key}.wav"
    if not cached.exists():
        import base64
        import requests
        from .config import load_dotenv
        load_dotenv()
        api_key = os.environ.get("GOOGLE_TTS_API_KEY", "")
        if not api_key:
            raise RuntimeError("Manca GOOGLE_TTS_API_KEY nel .env (voce Chirp 3 HD)")
        r = requests.post(CHIRP_URL, headers={"X-Goog-Api-Key": api_key},     # la chiave mai nell'URL
                          json={"input": {"text": text}, "voice": {"languageCode": "it-IT", "name": nome},
                                "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000}}, timeout=60)
        if r.status_code != 200:
            raise RuntimeError(f"Google TTS {r.status_code}: {r.text[:200]}")
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(base64.b64decode(r.json()["audioContent"]))       # WAV (LINEAR16 con intestazione)
    with wave.open(str(cached), "rb") as rf:
        pcm, rate = rf.readframes(rf.getnframes()), rf.getframerate()
    return _atempo(_trim(pcm, rate), rate, speed), rate, 2, 1


def _trim(pcm: bytes, rate: int, soglia: float = 0.02, prima: float = 0.03, dopo: float = 0.08) -> bytes:
    """Toglie il silenzio ai bordi (Qwen ne lascia ~0,4 s prima e ~0,55 s dopo ogni frase): ritmo da Reel."""
    import numpy as np
    a = np.frombuffer(pcm, "<i2")
    voce = np.flatnonzero(np.abs(a) > soglia * 32768)
    if not len(voce):
        return pcm
    i, j = max(0, voce[0] - int(prima * rate)), min(len(a), voce[-1] + int(dopo * rate))
    return a[i:j].tobytes()


def _synth(voice, text: str, speed: float, tone: str = "") -> tuple[bytes, int, int, int]:
    """Ritorna (frames PCM, sample rate, sample width, canali) per una frase."""
    from piper import SynthesisConfig
    tn = TONES.get(tone, TONES[""])
    cfg = SynthesisConfig(length_scale=1.0 / max(speed * tn["speed"], 0.3),
                          noise_scale=tn["noise"], noise_w_scale=tn["noise_w"])
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        voice.synthesize_wav(text, wf, syn_config=cfg)
    buf.seek(0)
    with wave.open(buf, "rb") as rf:
        return rf.readframes(rf.getnframes()), rf.getframerate(), rf.getsampwidth(), rf.getnchannels()


def normalize_lines(lines) -> list[tuple[str, str]]:
    """Copione -> [(testo, tono)]. Una riga è "testo" oppure {testo: ..., tono: arrabbiata|felice}."""
    out = []
    for l in lines or []:
        text, tone = (l.get("testo", ""), l.get("tono") or "") if isinstance(l, dict) else (l, "")
        text, tone = str(text).strip(), str(tone).strip().lower()
        if tone not in TONES:
            raise ValueError(f"tono '{tone}' non valido ({', '.join(t for t in TONES if t)})")
        if text:
            out.append((text, tone))
    return out


def ritmi(lines) -> list[float]:
    """Per ogni riga di normalize_lines: `ritmo` in secondi (0 = parlato normale). Con ritmo le parole sono
    sintetizzate una alla volta e cadono esattamente ogni `ritmo` secondi (es. il conto "Tre. Due. Uno." del quiz)."""
    out = []
    for l in lines or []:
        text = l.get("testo", "") if isinstance(l, dict) else l
        if str(text).strip():
            out.append(float(l.get("ritmo") or 0) if isinstance(l, dict) else 0.0)
    return out


def tts_text(text: str, pronuncia: dict | None = None) -> str:
    """Testo da far leggere alla voce (i sottotitoli restano invariati):
    - parole TUTTE MAIUSCOLE -> minuscole (enfasi a schermo, altrimenti Piper le compita: "MAI" = "emme a i");
    - pronuncia: {"Cintre": "Sèntr"} sostituisce parole intere solo nell'audio."""
    for word, say in (pronuncia or {}).items():
        text = re.sub(rf"\b{re.escape(word)}\b", say, text)
    return re.sub(r"\b[A-ZÀ-Ý]{2,}\b", lambda m: m.group(0).lower(), text)


def speak(lines, out_wav: Path, voice_name: str = DEFAULT_VOICE, speed: float = 1.0,
          synth=None, pronuncia: dict | None = None, pausa: float = PAUSE) -> tuple[list[Sentence], float]:
    """Sintetizza il copione in un unico wav. Ritorna (frasi con tempi, durata totale video consigliata).
    synth(testo, tono) -> (frames, rate, width, canali); di default Piper."""
    passi = ritmi(lines)
    lines = normalize_lines(lines)
    if not lines:
        raise ValueError("Il copione è vuoto")
    if synth is None and is_chirp(voice_name):
        nome = voice_name.partition("-")[2] or "aoede"
        synth = lambda text, tone: _chirp_synth(nome, text, speed)    # noqa: E731
    elif synth is None and is_qwen(voice_name):
        speaker = voice_name.partition("-")[2] or "vivian"
        synth = lambda text, tone: _qwen_synth(speaker, text, speed)   # noqa: E731
    elif synth is None:
        voice = _load_voice(voice_name)
        synth = lambda text, tone: _synth(voice, text, speed, tone)   # noqa: E731
    chunks, sentences = [], []
    rate = width = channels = None
    t = LEAD_IN
    for (text, tone), passo in zip(lines, passi):
        pezzi = [synth(tts_text(p, pronuncia), tone) for p in text.split()] if passo > 0 else [synth(tts_text(text, pronuncia), tone)]
        if rate is None:
            rate, width, channels = pezzi[0][1:]
            chunks.append(b"\0" * int(LEAD_IN * rate) * width * channels)
        fr = width * channels
        if passo > 0:                                   # una parola ogni `passo` secondi, tempi esatti
            words, frames, q = [], b"", t
            for k, (f, *_ ) in enumerate(pezzi):
                d = len(f) / (rate * fr)
                words.append(Word(text.split()[k], round(q, 3), round(q + d, 3)))
                vuoto = max(0, int(passo * rate) - len(f) // fr) if k < len(pezzi) - 1 else 0
                frames += f + b"\0" * vuoto * fr
                q += max(d, passo)
            dur = len(frames) / (rate * fr)
        else:
            frames = pezzi[0][0]
            dur = len(frames) / (rate * fr)
            words = word_timings(text, t, t + dur)
        sentences.append(Sentence(text, round(t, 3), round(t + dur, 3), words, tone))
        chunks.append(frames)
        chunks.append(b"\0" * int(pausa * rate) * width * channels)
        t += dur + pausa
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(width)
        wf.setframerate(rate)
        wf.writeframes(b"".join(chunks))
    return sentences, round(t - pausa + TAIL, 2)


# --- Sottotitoli ASS ------------------------------------------------------
def ass_color(hex_color: str) -> str:
    """'#RRGGBB' -> '&H00BBGGRR' (formato colori ASS)."""
    h = hex_color.lstrip("#")
    if not re.fullmatch(r"[0-9a-fA-F]{6}", h):
        raise ValueError(f"colore non valido: {hex_color}")
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def ass_time(t: float) -> str:
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "(").replace("}", ")")


def gruppi(words: list[Word], max_parole: int = 3, max_lettere: int = 14) -> list[list[int]]:
    """Indici delle parole divisi in pezzi corti (max 3 parole e ~14 lettere: una riga sola;
    si va a capo dopo la punteggiatura)."""
    out, cur = [], []
    for i, w in enumerate(words):
        if cur and len(" ".join(words[j].text for j in cur + [i])) > max_lettere:
            out.append(cur)
            cur = []
        cur.append(i)
        if len(cur) >= max_parole or re.search(r"[.,:;!?…]$", w.text):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def pagine(words: list[Word], max_riga: int = 20, max_pagina: int = 38) -> list[tuple[list[int], int]]:
    """Divide la frase in pagine da max 2 righe (~20 lettere a riga, ~38 a pagina) per i sottotitoli a blocco.
    Si chiude la pagina preferibilmente dopo la punteggiatura. Ritorna [(indici, k)] con k = indice (nella pagina)
    della prima parola della seconda riga (k = len -> una riga sola); le righe sono bilanciate."""
    lun = lambda ix: len(" ".join(words[j].text for j in ix))   # noqa: E731
    out, cur = [], []
    for i, w in enumerate(words):
        if cur and lun(cur + [i]) > max_pagina:
            out.append(cur); cur = []
        cur.append(i)
        if re.search(r"[.!?…:]$", w.text) and lun(cur) >= 12 or (re.search(r"[,;]$", w.text) and lun(cur) >= 24):
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    res = []
    for ix in out:
        k = len(ix)
        if lun(ix) > max_riga and len(ix) > 1:
            k = min(range(1, len(ix)), key=lambda c: max(lun(ix[:c]), lun(ix[c:])))
        res.append((ix, k))
    return res


def build_ass(sentences: list[Sentence], highlight: str = "#FFD166", text_color: str = "#FFFFFF",
              font: str = "DejaVu Sans", size: int = 90, margin_bottom: int = 560, corti: bool = False,
              censura=None, blocco: bool = False) -> str:
    """Una riga di dialogo per parola: la frase intera, con la parola detta colorata e un po' più grande.
    Il tono della frase cambia colore/grandezza; "arrabbiata" fa anche tremare la frase (±shake gradi).
    corti=True: invece della frase intera si vede solo il pezzo di 1-3 parole in corso (una riga, più grande):
    lascia spazio alla grafica (resa 2d ad alto ritmo).
    Margine basso ampio: resta sopra la zona che Instagram copre con la caption.
    censura(testo) -> testo: parole forti censurate a schermo (m*rte); la voce non cambia.
    blocco=True (default dei reel): un blocco fermo di max 2 righe (pagine()); le parole già dette sono bianche,
    quella detta ora è nel colore accento, quelle ancora da dire sono attenuate: si legge al ritmo della voce."""
    cz = censura or (lambda t: t)
    outline, shadow = 5, 2
    if corti:
        size = max(size, 104)
    elif blocco:
        size, margin_bottom, outline, shadow = 76, 440, 6, 3
    base = ass_color(text_color)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Voce,{font},{size},{base},{base},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{outline},{shadow},2,70,70,{margin_bottom},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for s in sentences:
        tn = TONES.get(s.tone, TONES[""])
        hl, sc = ass_color(tn["highlight"] or highlight), tn["scale"]
        if blocco:
            for ix, k in pagine(s.words):
                for i in ix:
                    end = s.words[i + 1].start if i + 1 < len(s.words) else s.end + 0.25
                    parts = []
                    for n, j in enumerate(ix):
                        t = _esc(cz(s.words[j].text))
                        if j == i:
                            t = r"{\c" + hl + rf"\fscx{sc}\fscy{sc}" + "}" + t + r"{\c" + base + r"\fscx100\fscy100}"
                        elif j > i:
                            t = r"{\1a&H8C&\3a&H90&\4a&HC8&}" + t + r"{\1a&H00&\3a&H00&\4a&H00&}"
                        parts.append(("\\N" if n == k and n else "") + t)
                    txt = " ".join(parts).replace(" \\N", "\\N")
                    lines.append(f"Dialogue: 0,{ass_time(s.words[i].start)},{ass_time(end)},Voce,,0,0,0,,{txt}")
            continue
        pezzo = {j: g for g in gruppi(s.words) for j in g} if corti else {}
        for i, w in enumerate(s.words):
            end = s.words[i + 1].start if i + 1 < len(s.words) else s.end + 0.25
            visibili = pezzo.get(i, range(len(s.words)))
            parts = [(r"{\c" + hl + rf"\fscx{sc}\fscy{sc}" + "}" + _esc(cz(s.words[j].text)) + r"{\c" + base + r"\fscx100\fscy100}")
                     if j == i else _esc(cz(s.words[j].text)) for j in visibili]
            shake = (r"{\frz" + str(tn["shake"] if i % 2 else -tn["shake"]) + "}") if tn["shake"] else ""
            lines.append(f"Dialogue: 0,{ass_time(w.start)},{ass_time(end)},Voce,,0,0,0,,{shake}{' '.join(parts)}")
    return head + "\n".join(lines) + "\n"


def timings_dict(sentences: list[Sentence]) -> list[dict]:
    return [asdict(s) for s in sentences]
