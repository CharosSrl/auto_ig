"""Regole di Antonio rese OBBLIGATORIE: `richieste crea` si ferma se un reel 2D (quiz/curiosità) non le rispetta.

Le note in memoria e in marca/lezioni.md si possono dimenticare; questi controlli no (Antonio, 2026-11-19:
"ho paura che rifarai questi errori in futuro"). Ogni regola qui sotto è una cosa che Antonio ha chiesto
esplicitamente; per cambiarla si cambia il codice e glielo si dice.

- formato: se Antonio ha scritto "curiosità" si fa una curiosità, se ha scritto "quiz" un quiz (mai convertire da soli);
- parola forte: SOLO se è il cuore vero della storia (Antonio, 2026-11-19: obbligarla produceva ganci forzati, sempre
  "guerra"). Se c'è, va detta e scritta censurata nel gancio (m*rte); se manca è un avviso, da dire ad Antonio con il motivo;
- suoni: effetti e base sempre accesi;
- voce: Aoede (chirp3-aoede) a velocità 1.0;
- durata: sotto i 25 s (controllata dopo la voce, prima del render).
La varietà dei formati è un avviso: se gli ultimi reel hanno tutti lo stesso formato, va proposto altro.
"""
from __future__ import annotations

import re
from pathlib import Path

from . import censura

FORMATI_REEL = ("quiz", "curiosita")
MAX_SECONDI = 25.0
VOCE = "chirp3-aoede"


def si_applica(data: dict) -> bool:
    return data.get("formato") in FORMATI_REEL and data.get("resa") == "2d"


def formato_chiesto(richiesta: str) -> str | None:
    """Il formato nominato da Antonio nella richiesta (parole sue), se ne nomina uno solo."""
    t = (richiesta or "").lower()
    trovati = {f for f, rx in (("curiosita", r"curiosit[àa]"), ("quiz", r"\bquiz"), ("storia", r"\bstori[ae]\b"))
               if re.search(rx, t)}
    return trovati.pop() if len(trovati) == 1 else None


def _gancio(data: dict) -> tuple[str, dict]:
    riga = (data.get("copione") or [None])[0]
    if isinstance(riga, dict):
        return str(riga.get("testo") or ""), (riga.get("scheda") or {})
    return str(riga or ""), {}


def parola_forte(data: dict) -> tuple[str, str]:
    """(parola detta nel gancio, come appare a schermo) oppure ("", "") se manca."""
    cz = censura.da_richiesta(data)
    if cz is None:
        return "", ""
    testo, _ = _gancio(data)
    m = censura.compila(data.get("censura") if isinstance(data.get("censura"), list) else ()).search(testo)
    return (m.group(0), cz(m.group(0))) if m else ("", "")


def errori(data: dict) -> list[str]:
    """Regole violate (prima del render). Lista vuota = si può andare."""
    if not si_applica(data):
        return []
    errs = []
    chiesto = formato_chiesto(str(data.get("richiesta") or ""))
    if chiesto and chiesto != data.get("formato"):
        errs.append(f"Antonio ha chiesto '{chiesto}' ma il formato è '{data.get('formato')}': si fa quello che ha "
                    "chiesto (se una lezione dice altro, glielo si chiede PRIMA)")
    detta, schermo = parola_forte(data)           # facoltativa: solo se è il cuore vero della storia (avvisi)
    if detta:
        _, sc = _gancio(data)
        scritto = " ".join(str(sc.get(k) or "") for k in ("titolo", "timbro", "testo")).lower()
        if detta.lower() not in scritto:
            errs.append(f"la parola forte '{detta}' è detta ma non scritta nel gancio (titolo o timbro): "
                        f"a schermo deve comparire censurata ({schermo})")
    au = data.get("audio") or {}
    if not (au.get("sfx") and au.get("musica")):
        errs.append("audio: {musica: true, sfx: true} (effetti a tempo con ogni evento, skill regia-reel)")
    v = data.get("voce") or {}
    if v.get("modello") != VOCE:
        errs.append(f"voce.modello deve essere {VOCE} (la voce di Cintre)")
    if float(v.get("velocita", 1.0)) != 1.0:
        errs.append("voce.velocita deve essere 1.0 (più veloce non si capisce, lezioni n. 13)")
    return errs


def errore_durata(data: dict, secondi: float) -> str | None:
    if si_applica(data) and secondi > MAX_SECONDI:
        return (f"il reel dura {secondi:.1f} s, oltre {MAX_SECONDI:.0f} s: accorcia le frasi o togli l'ultima "
                "(mai velocizzare la voce)")
    return None


def avvisi(data: dict, folder: Path) -> list[str]:
    """Da dire ad Antonio: gancio senza parola forte; ultimi reel tutti dello stesso formato."""
    if not si_applica(data):
        return []
    import yaml
    out = [] if parola_forte(data)[0] else [
        f"gancio senza parola forte: va bene se la storia non ne ha una vera ({data.get('parola_forte_motivo') or 'scrivi il motivo in parola_forte_motivo'}) — dillo ad Antonio"]
    prima = []
    for f in sorted(p for p in folder.parent.iterdir() if p.is_dir() and p.name < folder.name)[::-1]:
        try:
            d = yaml.safe_load((f / "richiesta.yaml").read_text()) or {}
        except (OSError, yaml.YAMLError):
            continue
        if si_applica(d):
            prima.append(d.get("formato"))
        if len(prima) == 3:
            break
    if len(prima) == 3 and all(x == data.get("formato") for x in prima):
        out.append(f"ultimi 4 reel tutti '{data.get('formato')}': proponi ad Antonio un formato diverso")
    return out


def riepilogo(data: dict, secondi: float) -> str:
    """Le regole applicate, da riportare ad Antonio."""
    detta, schermo = parola_forte(data)
    pf = f"{detta} → {schermo}" if detta else f"NO ({data.get('parola_forte_motivo', '')})"
    v = data.get("voce") or {}
    return (f"regole: formato {data.get('formato')} · parola forte {pf} · suoni sì · "
            f"voce {v.get('modello')} {float(v.get('velocita', 1.0)):.1f} · durata {secondi:.1f} s")
