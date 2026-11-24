"""Regole di Antonio rese OBBLIGATORIE: `richieste crea` si ferma se un reel 2D (quiz/curiosità) non le rispetta.

Le note in memoria e in marca/lezioni.md si possono dimenticare; questi controlli no (Antonio, 2026-11-19:
"ho paura che rifarai questi errori in futuro"). Ogni regola qui sotto è una cosa che Antonio ha chiesto
esplicitamente; per cambiarla si cambia il codice e glielo si dice.

- formato: se Antonio ha scritto "curiosità" si fa una curiosità, se ha scritto "quiz" un quiz (mai convertire da soli);
- parola forte: SOLO se è il cuore vero della storia (Antonio, 2026-11-19: obbligarla produceva ganci forzati, sempre
  "guerra"). Se c'è, va detta e scritta censurata nel gancio (m*rte); se manca è un avviso, da dire ad Antonio con il motivo;
- suoni: effetti e base sempre accesi;
- voce: Aoede (chirp3-aoede) a velocità 1.2 (Antonio, 2026-11-24: "voce più veloce", ritmo da brainrot; prima 1.0);
- durata: sotto i 25 s (controllata dopo la voce, prima del render);
- attacco: la voce parla già al fotogramma 0 (≤ 0,15 s) e all'inizio non c'è nessun boom/impatto (Antonio, 2026-11-23:
  "appena comincia il video, la voce deve star quasi già parlando. Evita di fare quel boom iniziale").
La varietà dei formati è un avviso: se gli ultimi reel hanno tutti lo stesso formato, va proposto altro.
Anche la struttura è un avviso (studio del 2026-11-21): rehook a metà video, risposta per ultima, CTA ≤ 7 parole.
"""
from __future__ import annotations

import re
from pathlib import Path

from . import censura

FORMATI_REEL = ("quiz", "curiosita")
MAX_SECONDI = 25.0
VOCE = "chirp3-aoede"
VELOCITA = 1.2          # Antonio, 2026-11-24: "voce più veloce" (prima 1.0, regola del 17/11 superata)


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
    if abs(float(v.get("velocita", 1.0)) - VELOCITA) > 1e-6:
        errs.append(f"voce.velocita deve essere {VELOCITA} (Antonio, 2026-11-24: voce più veloce, ritmo da brainrot)")
    return errs


def errore_durata(data: dict, secondi: float) -> str | None:
    if si_applica(data) and secondi > MAX_SECONDI:
        return (f"il reel dura {secondi:.1f} s, oltre {MAX_SECONDI:.0f} s: accorcia le frasi o togli l'ultima "
                "(la voce resta a 1.2: non velocizzarla oltre)")
    return None


MAX_ATTACCO = 0.15       # secondi massimi di silenzio prima della voce


def errore_attacco(data: dict, inizio_voce: float, eventi: list | None = None) -> str | None:
    """Antonio, 2026-11-23: la voce parte da subito e niente boom iniziale (non funziona)."""
    if not si_applica(data):
        return None
    if inizio_voce > MAX_ATTACCO:
        return (f"la voce parte a {inizio_voce:.2f} s: deve parlare già al fotogramma 0 (≤ {MAX_ATTACCO} s, "
                "Antonio 2026-11-23); non alzare voce.LEAD_IN")
    if any(n == "impatto" and t < 0.5 for t, n, *_ in (eventi or [])):
        return "c'è un boom/impatto nei primi 0,5 s: Antonio (2026-11-23) non lo vuole, il video parte con la voce"
    return None


def avvisi(data: dict, folder: Path) -> list[str]:
    """Da dire ad Antonio: gancio senza parola forte; ultimi reel tutti dello stesso formato; stesso tipo di gancio
    o stesso argomento di uno degli ultimi 3 reel (varietà)."""
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
            prima.append(d)
        if len(prima) == 3:
            break
    if len(prima) == 3 and all(x.get("formato") == data.get("formato") for x in prima):
        out.append(f"ultimi 4 reel tutti '{data.get('formato')}': proponi ad Antonio un formato diverso")
    # VARIETÀ (Antonio, 2026-11-20: "le cose con i liquidi sono scontate… variegare il più possibile i contenuti")
    g = tipo_gancio(data)
    if g and any(tipo_gancio(x) == g for x in prima):
        out.append(f"gancio '{g}' già usato in uno degli ultimi 3 reel: scegline un altro tipo (chat, lente, confronto, "
                   "radar, scena2d, contatore…)")
    ripetuti = sorted(argomenti(data) & set().union(*(argomenti(x) for x in prima))) if prima else []
    if ripetuti:
        out.append(f"argomento già visto negli ultimi 3 reel ({', '.join(ripetuti)}): cambia tema")
    return out + avvisi_struttura(data)


def avvisi_struttura(data: dict) -> list[str]:
    """Struttura a domanda aperta (studio del 2026-11-21, regia-reel §12): gancio → attesa → rehook → attesa →
    risposta per ultima, poi solo una CTA breve. La gente se ne va appena ha la risposta."""
    righe = [r for r in (data.get("copione") or []) if isinstance(r, dict)]
    out = []
    if len(righe) >= 4:
        tipi = [str((r.get("scheda") or {}).get("tipo") or "") for r in righe]
        pos = [i for i, t in enumerate(tipi) if t == "rehook"]
        if not pos:
            out.append("struttura: manca il rehook a metà video (scheda rehook tra gancio e risposta, regia-reel §12)")
        elif pos[0] in (0, len(righe) - 1):
            out.append("struttura: il rehook va a metà video, non in testa o in coda (regia-reel §12)")
    cta = str(data.get("cta") or "")
    if len(cta.split()) > 7:
        out.append(f"CTA di {len(cta.split())} parole: dopo la risposta il video si chiude subito, tienila ≤ 7 parole")
    return out


def tipo_gancio(data: dict) -> str:
    """Tipo di grafica viva del gancio (o '' se il gancio è una foto/icona)."""
    _, sc = _gancio(data)
    g = sc.get("grafica")
    return str(g.get("tipo") or "") if isinstance(g, dict) else ""


_VUOTE = {"curiosità", "curiosita", "quiz", "storia", "così", "sono", "hanno", "erano", "perché", "questo", "questi",
          "quella", "quello", "tuoi", "tuo", "tue", "nostri", "venduti", "venduto", "inventati", "inventato", "colpa",
          "nome", "fatto", "fatti", "prima", "dopo", "come", "anche", "molto", "senza", "della", "delle", "degli"}


def argomenti(data: dict) -> set[str]:
    """Parole chiave del tema: campo `argomento` (stringa o lista) se c'è, sennò le parole forti del titolo."""
    a = data.get("argomento")
    if a:
        return {str(x).lower() for x in (a if isinstance(a, list) else [a])}
    parole = re.findall(r"[a-zà-ù']+", str(data.get("titolo") or "").lower())
    return {w.strip("'") for w in parole if len(w) >= 4 and w not in _VUOTE}


def riepilogo(data: dict, secondi: float) -> str:
    """Le regole applicate, da riportare ad Antonio."""
    detta, schermo = parola_forte(data)
    pf = f"{detta} → {schermo}" if detta else f"NO ({data.get('parola_forte_motivo', '')})"
    v = data.get("voce") or {}
    return (f"regole: formato {data.get('formato')} · parola forte {pf} · suoni sì · "
            f"voce {v.get('modello')} {float(v.get('velocita', 1.0)):.1f} · "
            f"narratore {'sì' if data.get('narratore') is not False else 'no'} · durata {secondi:.1f} s")
