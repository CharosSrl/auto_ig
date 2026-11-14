"""Voice-over: text-to-speech locale (Piper) + sottotitoli con parola evidenziata (ASS/libass).

Una frase del copione alla volta: la durata reale dell'audio dà il tempo della frase,
il tempo di ogni parola è stimato in proporzione alla sua lunghezza.
"""
from __future__ import annotations

import io
import re
import wave
from dataclasses import asdict, dataclass
from pathlib import Path

from .config import ROOT

VOICES_DIR = ROOT / ".voci"
DEFAULT_VOICE = "it_IT-paola-medium"
LEAD_IN = 0.6          # secondi di video prima che parli
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


def tts_text(text: str, pronuncia: dict | None = None) -> str:
    """Testo da far leggere alla voce (i sottotitoli restano invariati):
    - parole TUTTE MAIUSCOLE -> minuscole (enfasi a schermo, altrimenti Piper le compita: "MAI" = "emme a i");
    - pronuncia: {"Cintre": "Sèntr"} sostituisce parole intere solo nell'audio."""
    for word, say in (pronuncia or {}).items():
        text = re.sub(rf"\b{re.escape(word)}\b", say, text)
    return re.sub(r"\b[A-ZÀ-Ý]{2,}\b", lambda m: m.group(0).lower(), text)


def speak(lines, out_wav: Path, voice_name: str = DEFAULT_VOICE, speed: float = 1.0,
          synth=None, pronuncia: dict | None = None) -> tuple[list[Sentence], float]:
    """Sintetizza il copione in un unico wav. Ritorna (frasi con tempi, durata totale video consigliata).
    synth(testo, tono) -> (frames, rate, width, canali); di default Piper."""
    lines = normalize_lines(lines)
    if not lines:
        raise ValueError("Il copione è vuoto")
    if synth is None:
        voice = _load_voice(voice_name)
        synth = lambda text, tone: _synth(voice, text, speed, tone)   # noqa: E731
    chunks, sentences = [], []
    rate = width = channels = None
    t = LEAD_IN
    for text, tone in lines:
        frames, r, w, c = synth(tts_text(text, pronuncia), tone)
        if rate is None:
            rate, width, channels = r, w, c
            chunks.append(b"\0" * int(LEAD_IN * rate) * width * channels)
        dur = len(frames) / (rate * width * channels)
        sentences.append(Sentence(text, round(t, 3), round(t + dur, 3), word_timings(text, t, t + dur), tone))
        chunks.append(frames)
        chunks.append(b"\0" * int(PAUSE * rate) * width * channels)
        t += dur + PAUSE
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(width)
        wf.setframerate(rate)
        wf.writeframes(b"".join(chunks))
    return sentences, round(t - PAUSE + TAIL, 2)


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


def build_ass(sentences: list[Sentence], highlight: str = "#FFD166", text_color: str = "#FFFFFF",
              font: str = "DejaVu Sans", size: int = 90, margin_bottom: int = 560, corti: bool = False) -> str:
    """Una riga di dialogo per parola: la frase intera, con la parola detta colorata e un po' più grande.
    Il tono della frase cambia colore/grandezza; "arrabbiata" fa anche tremare la frase (±shake gradi).
    corti=True: invece della frase intera si vede solo il pezzo di 1-3 parole in corso (una riga, più grande):
    lascia spazio alla grafica (resa 2d ad alto ritmo).
    Margine basso ampio: resta sopra la zona che Instagram copre con la caption."""
    if corti:
        size = max(size, 104)
    base = ass_color(text_color)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Voce,{font},{size},{base},{base},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,5,2,2,80,80,{margin_bottom},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for s in sentences:
        tn = TONES.get(s.tone, TONES[""])
        hl, sc = ass_color(tn["highlight"] or highlight), tn["scale"]
        pezzo = {j: g for g in gruppi(s.words) for j in g} if corti else {}
        for i, w in enumerate(s.words):
            end = s.words[i + 1].start if i + 1 < len(s.words) else s.end + 0.25
            visibili = pezzo.get(i, range(len(s.words)))
            parts = [(r"{\c" + hl + rf"\fscx{sc}\fscy{sc}" + "}" + _esc(s.words[j].text) + r"{\c" + base + r"\fscx100\fscy100}")
                     if j == i else _esc(s.words[j].text) for j in visibili]
            shake = (r"{\frz" + str(tn["shake"] if i % 2 else -tn["shake"]) + "}") if tn["shake"] else ""
            lines.append(f"Dialogue: 0,{ass_time(w.start)},{ass_time(end)},Voce,,0,0,0,,{shake}{' '.join(parts)}")
    return head + "\n".join(lines) + "\n"


def timings_dict(sentences: list[Sentence]) -> list[dict]:
    return [asdict(s) for s in sentences]
