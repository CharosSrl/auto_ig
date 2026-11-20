"""Audio ad alta energia per i reel: battute (cambi visivi), effetti sonori e base musicale, tutto a codice.

Le *battute* sono gli istanti in cui la scena cambia qualcosa (stacco, zoom, rivelazione). Si calcolano qui
una volta sola e vanno sia alla scena (parametro `battute`) sia al mix (effetti sonori sugli stessi istanti):
immagine e suono restano sincronizzati.

    battute(frasi, schede)                -> [(secondi, tipo), ...]  tipo: boom | stacco | punch | rivela | tic
    mix(voce.wav, battute, durata, out)   -> wav stereo 48 kHz: voce + base (abbassata sotto la voce) + effetti

Nessun file esterno: niente copyright. Ritmo della ricerca (formati.yaml → ritmo_alto): un cambio ogni ~1,5–3 s,
a intervalli irregolari.
"""
from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

SR = 48000
BPM = 116
# Livelli (ampiezza lineare, la voce va a ~0.9 di picco)
LIV_BASE = 0.16          # base musicale senza voce
DUCK = 0.6               # quanto si abbassa la base mentre la voce parla (0..1)
LIV_SFX = {"boom": 0.55, "stacco": 0.32, "punch": 0.22, "rivela": 0.3, "tic": 0.4}
PASSO = (1.5, 2.3)       # distanza minima/massima tra due battute dentro una frase (s)


def _h(i: float) -> float:
    """Pseudo-casuale deterministico in [0,1) (uguale a quello delle scene)."""
    x = np.sin(i * 127.1 + 311.7) * 43758.5453
    return float(x - np.floor(x))


# --- Battute ------------------------------------------------------------------------------------
def battute(frasi: list, schede: list | None = None) -> list[tuple[float, str]]:
    """Istanti dei cambi visivi. `frasi` = oggetti con .start/.end (voce.Sentence) o tuple (start, end).
    Ogni frase apre con uno stacco (gancio/rehook: boom, dettaglio: rivela); dentro la frase un "punch"
    ogni 1,5–2,3 s (irregolare), mai a meno di 0,7 s dalla frase dopo.
    Quiz: la risposta apre con "rivela"; una domanda con `conto: N` (l'attesa) ha N "tic" equidistanti
    sulla frase (il conto alla rovescia, unica battuta regolare) e nessun punch."""
    tempi = [(f.start, f.end) if hasattr(f, "start") else (float(f[0]), float(f[1])) for f in frasi]
    schede = schede or [{}] * len(tempi)
    out: list[tuple[float, str]] = []
    for i, (a, b) in enumerate(tempi):
        sk = (schede[i] or {}) if i < len(schede) else {}
        tipo = sk.get("tipo", "")
        t0 = 0.0 if i == 0 else a                       # la prima battuta è al fotogramma 0
        conto = int(sk.get("conto") or 0)
        if conto > 0:                                   # conto alla rovescia: N tic sulla frase
            parole = getattr(frasi[i], "words", None) or []
            if len(parole) == conto:                    # "Tre. Due. Uno." → un tic su ogni numero detto
                out += [(round(0.0 if i == 0 and k == 0 else w.start, 2), "tic") for k, w in enumerate(parole)]
            else:
                out += [(round(t0 + (b - t0) * k / conto, 2), "tic") for k in range(conto)]
            continue
        out.append((round(t0, 2), {"gancio": "boom", "rehook": "boom", "dettaglio": "rivela",
                                   "risposta": "rivela"}.get(tipo, "stacco")))
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


def tic() -> np.ndarray:
    """Clic secco da orologio (conto alla rovescia del quiz)."""
    t = _t(0.09)
    return np.sin(2 * np.pi * 2400 * t) * _env(len(t), 0.0005, 0.012) + 0.6 * _rumore(len(t), 7) * _env(len(t), 0.0003, 0.004)


SUONI = {"boom": lambda: boom(), "stacco": lambda: whoosh(), "punch": lambda: pop(), "rivela": lambda: ding(), "tic": lambda: tic()}


def riser(dur: float = 2.5) -> np.ndarray:
    """Tensione che sale (3-2-1): rumore che si apre + tono in glissando, crescendo fino alla fine."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    f = 180 * 2 ** (2.2 * k)                                        # sale di ~2 ottave
    tono = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.35 + 0.65 * k)
    soffio = _passabasso(_rumore(n, 11), 0.02 + 0.3 * k ** 2)
    x = (0.55 * tono + 0.8 * soffio / (np.abs(soffio).max() + 1e-9)) * k ** 1.6
    x[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))       # stacco netto sul colpo
    return x


def _tastiera_sintetica(dur: float = 1.0) -> np.ndarray:
    out = np.zeros(int(dur * SR))
    t, k = 0.0, 0
    while t < dur - 0.05:
        s = tic() * (0.5 + 0.5 * _h(k))
        i = int(t * SR)
        out[i:i + len(s)] += s[: len(out) - i]
        t += 0.06 + 0.07 * _h(k + 50)
        k += 1
    return out


# --- Campioni CC0 (auto_ig/sfx, vedi CREDITI.md) con ripiego sintetico -----------------------------
SFX_DIR = Path(__file__).resolve().parent / "sfx"
RIPIEGO = {"scatto": lambda: np.pad(tic(), (0, int(0.2 * SR) - len(tic()))) + 0.6 * whoosh(0.2), "pop": lambda: pop(), "tic": lambda: tic(),
           "conferma": lambda: ding(), "pop_morbido": lambda: pop(), "whoosh": lambda: whoosh(),
           "swish": lambda: whoosh(0.15), "tastiera": lambda: _tastiera_sintetica(3.0),
           "impatto": lambda: boom(), "riser": lambda: riser()}
# livelli (ampiezza di picco) per suono: la voce resta davanti (~0.9)
LIV_SUONI = {"scatto": 0.45, "impatto": 0.5, "whoosh": 0.26, "swish": 0.12, "pop": 0.3, "tic": 0.35,
             "riser": 0.22, "conferma": 0.24, "tastiera": 0.2, "pop_morbido": 0.25}


def campione(nome: str, cartella: Path | None = None) -> np.ndarray:
    """Suono `nome`: il campione CC0 in auto_ig/sfx se c'è, sennò la versione sintetica."""
    p = (cartella or SFX_DIR) / f"{nome}.wav"
    if p.exists() and nome not in ("impatto", "riser"):
        return leggi_wav(p)
    return RIPIEGO.get(nome, RIPIEGO["whoosh"])()


def _intona(x: np.ndarray, semitoni: float) -> np.ndarray:
    """Alza/abbassa l'intonazione ricampionando (più acuto = più corto)."""
    if not semitoni:
        return x
    r = 2 ** (semitoni / 12)
    return np.interp(np.arange(0, len(x) - 1, r), np.arange(len(x)), x)


def _parola(w: str) -> str:
    return "".join(c for c in w.lower() if c.isalnum())


# --- Suoni a eventi ---------------------------------------------------------------------------------
MAPPA_PUNTI = 8                                                          # = infografica2d.js MAPPA_PUNTI


def suoni(frasi: list, schede: list | None, bt: list[tuple[float, str]]) -> list[tuple[float, str, dict]]:
    """Un suono per ogni cosa che succede a schermo (skill regia-reel). -> [(secondi, nome, opzioni)].
    opzioni: liv (moltiplica il livello), semitoni, durata (tagli/riser), opz (indice opzione A/B/C per la scena)."""
    tempi = [(f.start, f.end) if hasattr(f, "start") else (float(f[0]), float(f[1])) for f in frasi]
    schede = schede or [{}] * len(tempi)
    sk = lambda i: (schede[i] or {}) if i < len(schede) else {}          # noqa: E731
    inizi = [0.0] + [a for a, _ in tempi[1:]]
    ev: list[tuple[float, str, dict]] = []
    # 1. le battute visive (stacchi, punch, tic, rivelazioni) con il suono giusto
    for t, k in bt:
        i = max(j for j, a in enumerate(inizi) if a <= t + 1e-6)
        tipo = sk(i).get("tipo", "")
        if t < 1e-6 and i == 0:
            if sk(0).get("foto"):                                         # la foto vera entra con lo scatto
                ev += [(0.0, "scatto", {}), (0.0, "impatto", {"liv": 0.5})]
            else:
                ev.append((0.0, "impatto", {}))
        elif k == "tic":
            ev.append((t, "tic", {}))
        elif k == "punch":
            ev.append((t, "swish", {}))
        elif k == "boom":
            ev.append((t, "impatto", {}))
        elif k == "rivela":
            ev.append((t, "impatto", {"liv": 0.8} if tipo == "risposta" else {"liv": 0.5}))
            ev.append((t + 0.15, "conferma", {}))                         # la spunta / il dettaglio che compare
        elif tipo == "cta":
            ev.append((t, "pop_morbido", {}))
        else:
            ev.append((t, "whoosh", {}))
    # 2. eventi delle schede
    for i, (a, b) in enumerate(tempi):
        s, t0 = sk(i), inizi[i]
        tipo = s.get("tipo", "")
        if i > 0 and (tipo == "foto" or (tipo == "risposta" and s.get("foto_risposta"))):
            ev.append((t0 + 0.05, "scatto", {}))
        if tipo == "domanda" and s.get("opzioni") and not s.get("conto"):
            parole = getattr(frasi[i], "words", None) or []
            lettere = [w.start for w in parole if _parola(w.text) in ("a", "b", "c")]
            ts = lettere[:3] if len(lettere) >= 3 else [t0 + 0.1 + 0.3 * n for n in range(min(3, len(s["opzioni"])))]
            ev += [(round(x, 2), "pop", {"semitoni": 2 * n, "opz": n}) for n, x in enumerate(ts)]
        if s.get("conto"):
            primo = next((t for t, k in bt if k == "tic" and t >= t0 - 1e-6), t0)
            fine = tempi[i + 1][0] if i + 1 < len(tempi) else b
            if fine - primo > 0.3:
                ev.append((primo, "riser", {"durata": fine - primo}))
        if tipo == "timeline":                                            # il nodo nuovo arriva sulla linea
            ev.append((t0 + 0.3, "pop", {"semitoni": 2 * min(int(s.get("attiva") or 0), 6)}))
        if tipo == "mappa":                                               # un pop per ogni puntino che si accende
            d = max(0.8, (b - a) - 0.6)                                   # stessa formula di infografica2d.tempiPuntini
            ev += [(round(t0 + 0.3 + d * j / (MAPPA_PUNTI - 1), 2), "pop", {"semitoni": j % 5, "liv": 0.6})
                   for j in range(MAPPA_PUNTI)]
        g = s.get("grafica") if tipo == "gancio" and isinstance(s.get("grafica"), dict) else s
        fine_i = inizi[i + 1] if i + 1 < len(inizi) else b
        ev += suoni_grafica(g, t0, fine_i, anticipo=float(g.get("anticipo", 0.25 if g.get("tipo") == "contatore" else 0.6)) if g is not s else 0.0)
        if tipo == "risposta" and s.get("testo") and len(str(s["testo"]).split()) <= 5:
            n = len(str(s["testo"]).split())
            ev.append((t0 + 0.5, "tastiera", {"durata": n * 0.05 + 0.25}))
    return sorted(ev, key=lambda e: e[0])


RADAR_PERIODO = 0.9                                                      # = infografica2d.js RADAR_PERIODO


def tempi_contatore(durata: float = 2.2, n: int = 12) -> list[float]:
    """= infografica2d.js tempiContatore: i tic rallentano come il numero (easing cubico)."""
    return [durata * (1 - (1 - (j + 1) / (n + 1)) ** (1 / 3)) for j in range(n)]


PASSO_OMINO = 150                                                        # = personaggi2d.js PASSO (px a scala 1)


def tempi_passi(a: dict) -> list[float]:
    """Istanti dei passi di un omino che cammina (= personaggi2d.js: spostamento easeInOut, un passo ogni PASSO px,
    tallone a terra a metà passo). Senza da/a cammina sul posto: fase = t·7 → un passo ogni π/7 s."""
    durata = float(a.get("durata", 2))
    if a.get("a") is None:
        return [j * math.pi / 7 for j in range(int(durata / (math.pi / 7)))]
    tot = abs(float(a["a"]) - float(a.get("da", a.get("x", 540))))
    passo = PASSO_OMINO * float(a.get("s", 1))
    out, j = [], 0
    while (d := passo * (j + 0.5)) < tot:
        e = d / tot                                                      # e = 0.5 - 0.5 cos(πk) → k
        out.append(durata * math.acos(1 - 2 * e) / math.pi)
        j += 1
    return out


def suoni_grafica(g: dict, t0: float, t1: float, anticipo: float = 0.0) -> list[tuple[float, str, dict]]:
    """Suoni delle grafiche vive (contatore, radar, scena con personaggi), scheda a sé o dentro il gancio.
    anticipo: la grafica del gancio parte già avanti (fotogramma 0 in movimento), i suoni seguono lo stesso orologio."""
    tipo, ev = g.get("tipo", ""), []
    metti = lambda u, nome, o=None: ev.append((round(t0 + u - anticipo, 2), nome, o or {})) if t0 + u - anticipo >= 0 and t0 + u - anticipo < t1 else None  # noqa: E731
    if tipo == "contatore":
        d = float(g.get("durata", 2.2))
        for j, u in enumerate(tempi_contatore(d)):
            metti(u, "tic", {"semitoni": j % 6, "liv": 0.6})
        metti(d, "conferma")
        metti(d, "impatto", {"liv": 0.4})
    elif tipo == "radar":
        k = 0
        while (u := k * RADAR_PERIODO + (anticipo % RADAR_PERIODO)) < t1 - t0 + anticipo:
            metti(u, "pop", {"semitoni": 9, "liv": 0.45})
            k += 1
        if float(g.get("esplode", -1)) >= 0:
            metti(float(g["esplode"]), "impatto", {"liv": 1.0})
    elif tipo == "chat":                                                 # ding a ogni messaggio (= CHAT_INIZIO/PASSO)
        for j, m in enumerate(g.get("messaggi") or []):
            metti(0.45 + j * 1.0, "pop", {"semitoni": 7 if (m or {}).get("da") == "a" else 3, "liv": 0.9})
    elif tipo == "lente":                                                # scorre, si ferma (= LENTE_ARRIVO), cerchio
        metti(0.05, "whoosh", {"liv": 0.6, "durata": 1.1})
        metti(1.3, "tic", {"semitoni": 4})
        metti(1.45, "conferma")
    elif tipo == "confronto":                                            # tendina (= CONFRONTO_CENTRO)
        metti(0.0, "swish", {"liv": 2.0})
        metti(0.55, "pop", {"semitoni": 2})
    elif tipo == "scena2d":
        for a in g.get("attori") or []:
            az = a.get("azione")
            if az == "cammina":
                acuto = 10 if a.get("tacchi") else 0                             # tacchi: toc-toc più secco
                for j, u in enumerate(tempi_passi(a)):
                    metti(u, "tic", {"semitoni": -5 + acuto + 2 * (j % 2), "liv": 0.5 + 0.3 * bool(acuto)})
            elif az == "sorpresa":
                q = float(a.get("quando", 0))
                metti(q, "swish", {"liv": 2.0, "semitoni": 5})
                metti(q + 0.1, "pop_morbido", {"semitoni": 7})
            elif az == "versa":
                metti(0.1, "whoosh", {"durata": 1.0, "liv": 0.8, "semitoni": -6})
            elif az == "disegna":
                metti(0.2, "tastiera", {"durata": 0.8, "liv": 0.6})
            if a.get("dice"):
                metti(float(a.get("quando", 0)) + 0.15, "pop", {"semitoni": 4})
    return ev


def pop_param(ev: list[tuple[float, str, dict]]) -> str:
    """Parametro per la scena: "1.20:0,1.45:1,1.70:2" (istante del pop -> opzione che rimbalza)."""
    return ",".join(f"{t:.2f}:{o['opz']}" for t, n, o in ev if n == "pop" and "opz" in o)


def _da_battute(bt: list[tuple[float, str]]) -> list[tuple[float, str, dict]]:
    """Compatibilità: eventi sonori dalle sole battute (scene senza schede)."""
    m = {"boom": "impatto", "stacco": "whoosh", "punch": "swish", "rivela": "conferma", "tic": "tic"}
    return [(t, m.get(k, "whoosh"), {}) for t, k in bt]


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
        musica: bool = True, sfx: bool = True, eventi: list | None = None) -> Path:
    """Voce + base abbassata sotto la voce + effetti sonori. Normalizzato, senza clipping.
    `eventi` = suoni(...) (un suono per evento a schermo); se manca, si ricavano dalle battute."""
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
        cache: dict[str, np.ndarray] = {}
        fx = np.zeros(n)
        for t, nome, o in (eventi if eventi is not None else _da_battute(bt)):
            if nome == "riser":
                s = riser(max(0.3, float(o.get("durata", 2.5))))
            else:
                s = cache.setdefault(nome, campione(nome))
                if o.get("durata"):
                    s = s[: int(float(o["durata"]) * SR)].copy()
                    c = min(len(s), int(0.03 * SR))
                    s[len(s) - c:] *= np.linspace(1, 0, c)
            s = _intona(s, o.get("semitoni", 0))
            s = s / (np.abs(s).max() + 1e-9) * LIV_SUONI.get(nome, 0.25) * o.get("liv", 1.0)
            i = int(t * SR)
            if 0 <= i < n:
                m_ = min(len(s), n - i)
                fx[i:i + m_] += s[:m_]
        tot += fx * (1 - 0.5 * inviluppo(v))             # sotto la voce gli effetti scendono di ~6 dB
    picco = np.abs(tot).max()
    if picco > 0.97:
        tot *= 0.97 / picco
    out.parent.mkdir(parents=True, exist_ok=True)
    scrivi_wav(out, tot)
    return out
