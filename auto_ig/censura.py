"""Parole forti censurate a schermo (m*rte), dette per intero dalla voce.

Dal 2026-11-24 (Antonio) anche le parolacce: la voce le dice per intero, a schermo escono censurate (c*zzo).
Bestemmie e insulti a gruppi di persone non si censurano: sono vietati (scrittura/regole.json "vietate_sempre").

Regola (skill .claude/skills/linguaggio-giovani): una parola forte, vera e nel suo contesto, fa da gancio; nelle scritte
animate (sottotitoli, schede, caption) si censura in stile "algospeak", la voce invece la pronuncia normalmente.
La voce non passa mai da qui: `voce.tts_text` riceve sempre il testo originale.
"""
from __future__ import annotations

import re
from typing import Callable, Iterable

# Parole intere (regex senza \b, confronto senza maiuscole). Niente radici libere: "mortadella" resta com'è.
PAROLE = [
    r"mort[eioa]", r"morire", r"muor[eio]", r"muoiono", r"moriva(?:no)?", r"morirono", r"morì",
    r"uccis[oaie]", r"uccide(?:re|va|vano)?", r"uccidono", r"uccise(?:ro)?",
    r"omicidi[oi]?", r"assassin[oaie]", r"cadaver[ei]", r"sangue",
    r"suicidi[oi]?",
    r"sess[oi]", r"sexy",
    r"drog[ae]", r"droghe",
    r"guerr[ae]", r"bomb[ae]", r"velen[oi]",
    # parolacce (Antonio, 2026-11-24: "vanno bene anche tante parolacce"): la voce le dice intere, a schermo c*zzo
    r"cazz[oi]", r"cazzat[ae]", r"cazzut[oaie]", r"sticazzi", r"incazz\w*",
    r"merd[ae]", r"merdos[oaie]", r"stronz[oaie]", r"stronzat[ae]",
    r"minchi[ae]", r"minchiat[ae]", r"coglion[ei]", r"coglionat[ae]", r"rompicoglioni",
    r"fottut[oaie]", r"fottere", r"fottiti", r"fott[eo]",
    r"vaffanculo", r"fanculo", r"cul[oi]", r"cagare", r"cagata", r"cacat[ae]", r"puttanat[ae]",
]

_VOCALI = "aeiouàèéìòóùAEIOUÀÈÉÌÒÓÙ"


def _stella(parola: str) -> str:
    """Prima lettera intatta, la prima vocale dopo diventa '*': morte -> m*rte, Sesso -> S*sso."""
    for i in range(1, len(parola)):
        if parola[i] in _VOCALI:
            return parola[:i] + "*" + parola[i + 1:]
    return parola[0] + "*" * (len(parola) - 1)


def compila(extra: Iterable[str] = ()) -> re.Pattern:
    parole = PAROLE + [re.escape(str(p)) for p in extra if str(p).strip()]
    return re.compile(r"(?<![\w*])(?:" + "|".join(parole) + r")(?![\w*])", re.IGNORECASE)


def censura(testo: str, extra: Iterable[str] = ()) -> str:
    """Censura le parole forti nel testo, lasciando punteggiatura, spazi e maiuscole."""
    return compila(extra).sub(lambda m: _stella(m.group(0)), str(testo))


def da_richiesta(data: dict) -> Callable[[str], str] | None:
    """Funzione di censura per la richiesta: campo `censura` assente/true = lista predefinita,
    lista = predefinita + quelle parole, false = nessuna censura (ritorna None)."""
    c = data.get("censura", True)
    if c is False:
        return None
    rx = compila(c if isinstance(c, list) else ())
    return lambda t: rx.sub(lambda m: _stella(m.group(0)), str(t))
