"""Regia frase per frase dei reel 3D (Antonio, 2026-11-28: "ogni frase deve avere una animazione ad-hoc").

Nel copione ogni cosa della `scena3d` (azioni del cast, oggetti, stacchi di camera) può partire su una parola detta:

    {"parola": "spinose"}            -> parte quando la voce dice "spinose"
    {"parola": "cane", "dopo": 0.2}  -> 0,2 s dopo

`risolvi` mette in ogni nodo `al` = secondi dall'inizio della frase, presi dai tempi VERI delle parole (whisper),
così la scena (blocchi3d.html) non deve indovinare niente. `suoni` trasforma i nodi con `suono` in effetti sonori
nello stesso istante (skill regia-reel §2: un suono per ogni cosa che succede a schermo).
"""
from __future__ import annotations

import re
import unicodedata

PASSO_PALLINE = 0.07      # = oggetti3d.js palline: una pallina parte ogni 0,07 s e vola 0,35 s
VOLO_PALLINE = 0.35


def _norm(w: str) -> str:
    w = unicodedata.normalize("NFD", w.lower())
    return re.sub(r"[^a-z0-9']", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))


def _nodi(x):
    """Tutti i dict dentro x (ricorsivo)."""
    if isinstance(x, dict):
        yield x
        for v in x.values():
            yield from _nodi(v)
    elif isinstance(x, list):
        for v in x:
            yield from _nodi(v)


def _inizi(sentences) -> list[float]:
    return [0.0] + [s.start for s in sentences[1:]]          # come blocchi3d.html: la frase 0 parte da 0


def _scena(riga) -> dict | None:
    sc = (riga.get("scheda") if isinstance(riga, dict) else None) or {}
    return sc.get("scena3d") if isinstance(sc.get("scena3d"), dict) else None


def risolvi(righe: list, sentences: list) -> list[str]:
    """Mette `al` in ogni nodo con `parola` (in place). -> avvisi per le parole che la voce non dice."""
    avvisi = []
    inizi = _inizi(sentences)
    for i, (r, s) in enumerate(zip(righe, sentences)):
        sc = _scena(r)
        if not sc:
            continue
        t0, dur = inizi[i], max(0.6, (inizi[i + 1] if i + 1 < len(inizi) else s.end) - inizi[i])
        parole = [(_norm(w.text), w.start) for w in (s.words or [])]
        for n in _nodi(sc):
            if "parola" not in n:
                continue
            cerca = _norm(str(n["parola"]))
            quale = int(n.get("volta", 1))                    # la seconda volta che la dice: "volta": 2
            trovate = [t for w, t in parole if w == cerca] or [t for w, t in parole if cerca and w.startswith(cerca)]
            if len(trovate) >= quale:
                n["al"] = round(max(0.0, trovate[quale - 1] - t0 + float(n.get("dopo", 0))), 3)
            else:
                n["al"] = round(dur * 0.5, 3)
                avvisi.append(f"frase {i + 1}: la voce non dice '{n['parola']}', l'animazione parte a metà frase")
    return avvisi


def suoni(righe: list, sentences: list) -> list[tuple[float, str, dict]]:
    """Effetti sonori dei nodi con `suono` (e `al` già risolto). Le palline: un 'pop' per ognuna che si attacca."""
    ev = []
    inizi = _inizi(sentences)
    for i, r in enumerate(righe[: len(sentences)]):
        sc = _scena(r)
        if not sc:
            continue
        for n in _nodi(sc):
            if not n.get("suono") or "al" not in n:
                continue
            t = inizi[i] + float(n["al"])
            o = {k: n[k] for k in ("liv", "semitoni") if k in n}
            if n.get("tipo") == "palline":
                passo = float(n.get("passo", PASSO_PALLINE))
                for j in range(int(n.get("n", 14))):
                    ev.append((round(t + j * passo + VOLO_PALLINE, 3), n["suono"], {"liv": 0.55, "semitoni": (j * 3) % 7}))
            else:
                ev.append((round(t, 3), n["suono"], o))
    return ev
