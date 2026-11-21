"""Labiale ed espressioni del narratore (la gruccia di Cintre), calcolati dal copione e dall'audio vero.

Antonio, 2026-11-21: una gruccia narratrice in basso a destra che "simula con il labiale e le espressioni ciò che
viene detto". Chirp 3 HD non dà i tempi delle parole, quindi:
1. il testo italiano (quasi fonetico) diventa fonemi con regole, poi una delle 9 bocche (visemi):
   X riposo · M m/b/p chiusa · F f/v sul labbro · A a · E e/i larga · O o tonda · U u a bacio ·
   L l/t/d/n/r lingua sui denti · S s/z/c/g/k denti;
2. dal wav si misura l'energia ogni 10 ms e si trovano i tratti parlati;
3. dentro ogni frase i fonemi si spalmano SOLO sul tempo con voce (le pause sulle virgole chiudono la bocca),
   in proporzione alla durata tipica di ogni fonema; la bocca anticipa di 40 ms (coarticolazione).
Il risultato è il parametro `narratore` della scena (preset/narratore.js → caricaTraccia).
"""
from __future__ import annotations

import json
import re
import unicodedata
import wave
from pathlib import Path

import numpy as np

from . import censura, voce

FPS = 30
HOP = 0.01                 # analisi dell'energia ogni 10 ms
ANTICIPO = 0.04            # la bocca si forma un attimo prima del suono
PAUSA_MIN = 0.18           # silenzio più lungo di così dentro una frase = bocca a riposo

_ACCENTI = str.maketrans("àáèéìíòóùú", "aaeeiioouu")
VOCALI = set("aeiou")
# fonema -> bocca
VISEMA = {"a": "A", "e": "E", "i": "E", "o": "O", "u": "U", "w": "U", "j": "E",
          "p": "M", "b": "M", "m": "M", "f": "F", "v": "F",
          "t": "L", "d": "L", "n": "L", "l": "L", "r": "L",
          "s": "S", "z": "S", "tS": "S", "dZ": "S", "S": "S", "k": "S", "g": "S", "J": "S", "L": "L"}
# durata relativa tipica (vocali più lunghe, accentate ancora di più)
_DURATA = {"vocale": 1.0, "accento": 1.45, "cons": 0.7, "M": 0.85, "doppia": 1.35}

_UNITA = ["zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci", "undici",
          "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove"]
_DECINE = ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"]


def numero(n: int) -> str:
    """Un intero in lettere, come lo legge la voce (76000 -> settantaseimila)."""
    if n < 20:
        return _UNITA[n]
    if n < 100:
        d, u = divmod(n, 10)
        dec = _DECINE[d][:-1] if u in (1, 8) else _DECINE[d]
        return dec + (_UNITA[u] if u else "")
    if n < 1000:
        c, r = divmod(n, 100)
        resto = numero(r) if r else ""
        return ("cento" if c == 1 else _UNITA[c] + "cento")[: -1 if resto.startswith("o") else None] + resto
    if n < 1_000_000:
        m, r = divmod(n, 1000)
        return ("mille" if m == 1 else numero(m) + "mila") + (numero(r) if r else "")
    m, r = divmod(n, 1_000_000)
    return ("unmilione" if m == 1 else numero(m) + "milioni") + (numero(r) if r else "")


def fonemi(parola: str) -> list[tuple[str, float]]:
    """Fonemi (con durata relativa) di una parola italiana. Regole: c/g dolci e duri, ch/gh, gn, gli, sc, qu,
    h muta, doppie, accenti (vocale accentata = più lunga). Le cifre sono lette una per una."""
    p = parola.lower()
    if re.fullmatch(r"[\d.,]+", p) and re.search(r"\d", p):
        intero = re.sub(r"[.,]\d{1,2}$", "", p).replace(".", "").replace(",", "")
        return fonemi(numero(int(intero))) if intero.isdigit() and int(intero) < 10**9 else []
    accentate = {i for i, c in enumerate(p) if c in "àáèéìíòóùú"}
    s = p.translate(_ACCENTI)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if "a" <= c <= "z")
    accentate = {i for i in accentate if i < len(s)}
    out: list[tuple[str, float]] = []
    i, n = 0, len(s)

    def nx(k=1):
        return s[i + k] if i + k < n else ""

    while i < n:
        c = s[i]
        dur = _DURATA["cons"]
        if c in VOCALI:
            out.append((c, _DURATA["accento"] if i in accentate else _DURATA["vocale"]))
            i += 1
            continue
        if c == "h":                                    # muta
            i += 1
            continue
        doppia = nx() == c
        if doppia:
            dur = _DURATA["doppia"]
            i += 1                                      # la doppia è un fonema lungo
        if c == "c" or c == "g":
            dolce, duro = ("tS", "k") if c == "c" else ("dZ", "g")
            if c == "g" and nx() == "n":
                out.append(("J", _DURATA["cons"])); i += 2; continue
            if c == "g" and nx() == "l" and nx(2) == "i":
                out.append(("L", _DURATA["cons"]))
                i += 3 if nx(3) in VOCALI else 2        # "figlio": la i non si sente; "gli": la i resta
                continue
            if nx() == "h":
                out.append((duro, dur)); i += 2; continue
            if nx() in ("e", "i"):
                out.append((dolce, dur))
                i += 2 if nx() == "i" and nx(2) in VOCALI else 1   # "cia/gio": la i non si sente
                continue
            out.append((duro, dur)); i += 1; continue
        if c == "s" and nx() == "c":
            if nx(2) in ("e", "i"):
                out.append(("S", _DURATA["cons"]))
                i += 3 if nx(2) == "i" and nx(3) in VOCALI else 2
                continue
            out.append(("s", _DURATA["cons"])); i += 1; continue
        if c == "q":
            out += [("k", dur), ("w", _DURATA["cons"] * 0.6)]
            i += 2 if nx() == "u" else 1
            continue
        if c == "x":
            out += [("k", dur), ("s", dur)]; i += 1; continue
        if c in "jy":
            out.append(("j", _DURATA["cons"])); i += 1; continue
        if c == "k":
            out.append(("k", dur)); i += 1; continue
        if c in "pbm":
            dur = max(dur, _DURATA["M"])
        out.append((c, dur))
        i += 1
    return out


def bocche(testo: str) -> list[tuple[str, float]]:
    """Sequenza di (bocca, peso) per una frase; la punteggiatura interna diventa una breve bocca a riposo."""
    out: list[tuple[str, float]] = []
    for tok in re.findall(r"[\wÀ-ÿ'.,]+|[,;:…—–-]", testo):
        if re.fullmatch(r"[,;:…—–-]", tok):
            out.append(("X", 0.6))
            continue
        for w in re.split(r"'", tok):
            fin = re.search(r"[,;:]$", w)
            for f, d in fonemi(w.strip(".,")):
                out.append((VISEMA.get(f, "S"), d))
            if fin:
                out.append(("X", 0.6))
    return out


def energia(wav: Path) -> tuple[np.ndarray, float]:
    """RMS ogni HOP secondi (mono, 0..1) e durata del wav."""
    try:
        with wave.open(str(wav), "rb") as w:
            rate, ch, width, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
            raw = w.readframes(n)
    except (EOFError, wave.Error, OSError):          # wav mancante o finto (test): niente energia, tempi dalle frasi
        return np.zeros(0), 0.0
    dt = {1: np.int8, 2: np.int16, 4: np.int32}[width]
    x = np.frombuffer(raw, dtype=dt).astype(np.float32) / float(np.iinfo(dt).max)
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    hop = max(1, int(rate * HOP))
    m = len(x) // hop
    rms = np.sqrt((x[: m * hop].reshape(m, hop) ** 2).mean(axis=1)) if m else np.zeros(0)
    rms = np.convolve(rms, np.ones(3) / 3, mode="same") if len(rms) > 3 else rms
    return rms, len(x) / rate


def tratti_parlati(rms: np.ndarray, a: float, b: float) -> list[tuple[float, float]]:
    """Tratti con voce tra a e b (secondi): soglia relativa al picco della frase, buchi < 80 ms chiusi."""
    i0, i1 = max(0, int(a / HOP)), min(len(rms), int(np.ceil(b / HOP)))
    seg = rms[i0:i1]
    if not len(seg) or seg.max() <= 1e-6:
        return [(a, b)] if b > a else []
    on = seg > max(0.12 * seg.max(), 0.004)
    runs, k = [], 0
    while k < len(on):
        if on[k]:
            j = k
            while j < len(on) and on[j]:
                j += 1
            runs.append([k, j])
            k = j
        else:
            k += 1
    fusi: list[list[int]] = []
    for r in runs:
        if fusi and (r[0] - fusi[-1][1]) * HOP < 0.08:
            fusi[-1][1] = r[1]
        else:
            fusi.append(r)
    out = [((i0 + x) * HOP, (i0 + y) * HOP) for x, y in fusi if (y - x) * HOP >= 0.05]
    return out or [(a, b)]


def labiale(sentences, rms: np.ndarray, pronuncia: dict | None = None) -> list[list]:
    """Cue [[t, bocca], ...] per tutto il video: per ogni frase i fonemi sono spalmati sul solo tempo parlato."""
    cue: list[list] = [[0.0, "X"]]
    for s in sentences:
        seq = [(v, w) for v, w in bocche(voce.tts_text(s.text, pronuncia)) if w > 0]
        tratti = tratti_parlati(rms, s.start, s.end)
        tot_v = sum(b - a for a, b in tratti)
        tot_w = sum(w for _, w in seq)
        if not seq or tot_v <= 0:
            continue

        def reale(pos):                                 # posizione nel tempo parlato -> tempo vero
            for a, b in tratti:
                if pos <= b - a + 1e-9:
                    return a + pos
                pos -= b - a
            return tratti[-1][1]

        acc = 0.0
        for v, w in seq:
            cue.append([reale(acc / tot_w * tot_v), v])
            acc += w
        # pause vere dentro la frase: bocca a riposo
        for (a1, b1), (a2, _b2) in zip(tratti, tratti[1:]):
            if a2 - b1 >= PAUSA_MIN:
                cue.append([b1 + 0.02, "X"])
                cue.append([a2 - 1e-3, None])           # segnaposto: si riprende la bocca in corso
        cue.append([tratti[-1][1], "X"])
    return _pulisci(cue)


def _pulisci(cue: list[list]) -> list[list]:
    """Dai fonemi (anche più corti di un fotogramma) a una bocca per fotogramma, poi solo i cambi.
    In ogni fotogramma vince la chiusura M (le labbra che si toccano si devono vedere), poi la vocale che occupa
    più tempo, poi la consonante più lunga. Tutto anticipato di ANTICIPO (coarticolazione)."""
    cue.sort(key=lambda c: c[0])
    seg, ultima = [], "X"                     # segnaposto None: riprende la bocca che era in corso
    for t, v in cue:
        if v is None:
            v = ultima
        elif v != "X":
            ultima = v
        seg.append((max(0.0, t - ANTICIPO), v))
    fine = seg[-1][0] + 1 / FPS if seg else 0.0
    out: list[list] = []
    for f in range(int(np.ceil(fine * FPS)) + 1):
        a, b = (f - 0.5) / FPS, (f + 0.5) / FPS
        quota: dict[str, float] = {}
        for k, (t, v) in enumerate(seg):
            t2 = seg[k + 1][0] if k + 1 < len(seg) else t + 1 / FPS
            ov = min(b, t2) - max(a, t)
            if ov > 0:
                quota[v] = quota.get(v, 0.0) + ov
        if not quota:
            v = out[-1][1] if out else "X"
        elif "M" in quota and quota["M"] >= 0.25 / FPS:
            v = "M"
        else:
            voc = {k: q for k, q in quota.items() if k in "AEOU"}
            v = max(voc or quota, key=(voc or quota).get)
        if not out or out[-1][1] != v:
            out.append([round(max(0.0, f / FPS), 3), v])
    return out


def espressioni(sentences, righe, parole_forti=None) -> list[list]:
    """Un'espressione per frase: gancio sorpresa, ? curiosa, ! o parola forte wow, rehook furba, CTA felice."""
    forti = parole_forti or censura.compila()
    out, alterna = [], ["neutra", "felice"]
    for k, (s, r) in enumerate(zip(sentences, righe)):
        tipo = ((r.get("scheda") if isinstance(r, dict) else None) or {}).get("tipo", "")
        testo = s.text.strip()
        if tipo == "cta":
            e = "felice"
        elif tipo == "rehook":
            e = "furba"
        elif tipo == "gancio":
            e = "sorpresa"
        elif tipo == "risposta":
            e = "wow"
        elif "?" in testo:
            e = "curiosa"
        elif testo.endswith("!") or forti.search(testo):
            e = "wow"
        else:
            e = alterna[k % 2]
        out.append([round(0.0 if k == 0 else s.start - 0.15, 3), e])
    return out


def traccia(wav: Path, sentences, righe, battute=None, pronuncia: dict | None = None, opzioni=None) -> dict:
    """Parametro `narratore` della scena: bocche, energia per fotogramma (base36), espressioni, colpi, posizione."""
    rms, durata = energia(wav)
    durata = max(durata, max((s.end for s in sentences), default=0.0))
    nf = int(np.ceil(durata * FPS))
    # energia per fotogramma: massimo dei campioni a 10 ms del fotogramma, normalizzata sul 95° percentile
    passo = 1 / FPS / HOP
    fr = np.array([rms[int(i * passo): max(int(i * passo) + 1, int((i + 1) * passo))].max(initial=0.0)
                   for i in range(nf)]) if len(rms) else np.zeros(0)
    ref = float(np.percentile(fr[fr > 0], 95)) if (fr > 0).any() else 1.0
    q = np.clip(np.round(fr / max(ref, 1e-6) * 35), 0, 35).astype(int)
    e = "".join("0123456789abcdefghijklmnopqrstuvwxyz"[v] for v in q)
    opz = opzioni if isinstance(opzioni, dict) else {}
    return {"v": 1, "fps": FPS, "b": labiale(sentences, rms, pronuncia), "e": e,
            "x": espressioni(sentences, righe),
            "c": [[round(t, 2), k] for t, k in (battute or []) if k in ("boom", "rivela")],
            "f": [round(s.start, 2) for s in sentences],
            "lato": str(opz.get("lato") or "destra"), "s": float(opz.get("s") or 1.0)}


def param(tr: dict) -> str:
    return json.dumps(tr, separators=(",", ":"), ensure_ascii=False)
