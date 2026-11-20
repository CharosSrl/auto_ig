"""Formati dei contenuti (storia, quiz, curiosità) e rese (2d): catalogo in formati.yaml.

Una richiesta con `formato` viene controllata contro il catalogo e riceve SEMPRE la call to action
come ultima frase (scheda `cta` nella resa 2d). Senza `formato` tutto resta come prima.

    python -m auto_ig.formati            # elenco formati, scalette e ricette
    python -m auto_ig.formati quiz 2d    # una ricetta sola
"""
from __future__ import annotations

import json
import sys
from functools import lru_cache
from pathlib import Path

import yaml

CATALOGO = Path(__file__).with_name("formati.yaml")
RESE = ("2d",)          # resa a schede 2D (scene schede2d e cartoon2d)
# Azione della call to action (formati.yaml → cta_azione): decide il cartello finale e il suo bottone.
AZIONI_CTA = {"salva_condividi": "Salva e invia", "segui": "Segui @teamupesportsofficial",
              "commenta": "Scrivilo nei commenti", "app": "Link in bio"}
MAX_PAROLE_HOOK = 14     # regola: ~12 parole; oltre 14 è un errore (formati.yaml → hook_e_cta)


@lru_cache(maxsize=1)
def _catalogo(mtime: float) -> dict:
    return yaml.safe_load(CATALOGO.read_text())


def catalogo() -> dict:
    """Catalogo da formati.yaml; si ricarica da solo se il file cambia (la UI resta accesa a lungo)."""
    return _catalogo(CATALOGO.stat().st_mtime)


def formato(nome: str) -> dict:
    f = catalogo()["formati"].get(nome)
    if not f:
        raise ValueError(f"formato '{nome}' inesistente ({', '.join(catalogo()['formati'])})")
    return f


def _scheda(riga) -> dict | None:
    return riga.get("scheda") if isinstance(riga, dict) else None


def _ha_cta(copione: list) -> bool:
    return bool(copione) and (_scheda(copione[-1]) or {}).get("tipo") == "cta"


def valida(data: dict) -> list[str]:
    """Errori della richiesta rispetto al formato (lista vuota = ok). Senza formato: nessun controllo."""
    nome = data.get("formato")
    if not nome:
        return []
    try:
        f = formato(str(nome))
    except ValueError as e:
        return [str(e)]
    errs = []
    resa = str(data.get("resa") or "")
    if resa not in RESE:
        errs.append(f"resa '{resa}' non valida ({' | '.join(RESE)})")
    elif not data.get("scena") and not f["rese"][resa]["scene"]:
        errs.append(f"{nome} {resa}: nessuna scena pronta, va creata (vedi la ricetta) e indicata in 'scena'")
    if resa == "2d":
        tipi = catalogo()["schede_2d"]
        for i, riga in enumerate(data.get("copione") or [], 1):
            s = _scheda(riga)
            if not s:
                errs.append(f"frase {i}: con resa 2d serve 'scheda'")
            elif s.get("tipo") not in tipi:
                errs.append(f"frase {i}: scheda '{s.get('tipo')}' sconosciuta ({', '.join(tipi)})")
            elif s.get("icona") and s["icona"] not in catalogo()["icone_2d"]:
                errs.append(f"frase {i}: icona '{s['icona']}' inesistente ({', '.join(catalogo()['icone_2d'])})")
            elif s["tipo"] in ("domanda", "risposta"):
                op = s.get("opzioni") or []
                if len(op) != 3:
                    errs.append(f"frase {i}: il quiz vuole 3 opzioni (A, B, C), trovate {len(op)}")
                if s["tipo"] == "risposta" and s.get("giusta") not in range(len(op)):
                    errs.append(f"frase {i}: 'giusta' deve essere l'indice dell'opzione giusta (0 = A, 1 = B, 2 = C)")
        prima = _scheda((data.get("copione") or [None])[0]) or {}
        if prima and prima.get("tipo") != "gancio":
            errs.append("la prima scheda deve essere il gancio")
    gancio = (data.get("copione") or [None])[0]
    testo = gancio.get("testo", "") if isinstance(gancio, dict) else str(gancio or "")
    if len(testo.split()) > MAX_PAROLE_HOOK and not testo.startswith("["):     # "[gancio] ..." = segnaposto
        errs.append(f"hook troppo lungo ({len(testo.split())} parole, max {MAX_PAROLE_HOOK}): l'hook va detto in 3 s")
    try:
        azione_cta(data)
    except ValueError as e:
        errs.append(str(e))
    return errs


def cta(data: dict) -> str:
    return str(data.get("cta") or formato(data["formato"])["cta"]).strip()


def copione(data: dict) -> list:
    """Copione da leggere: quello della richiesta + la CTA finale (se il formato c'è e manca già)."""
    righe = list(data.get("copione") or [])
    if not data.get("formato") or _ha_cta(righe):
        return righe
    az = azione_cta(data)
    return righe + [{"testo": cta(data), "tono": "felice",
                     "scheda": {"tipo": "cta", "titolo": cta(data), "azione": az, "bottone": AZIONI_CTA[az]}}]


def azione_cta(data: dict) -> str:
    """Azione della CTA: dalla richiesta (cta_azione) o dal formato; predefinita salva_condividi."""
    az = str(data.get("cta_azione") or formato(data["formato"]).get("cta_azione") or "salva_condividi")
    if az not in AZIONI_CTA:
        raise ValueError(f"cta_azione '{az}' non valida ({', '.join(AZIONI_CTA)})")
    return az


CAMPI_TESTO = ("titolo", "testo", "evidenzia", "opzioni", "timbro", "credito", "bottone")


def schede(righe: list, censura=None) -> str:
    """Parametro `schede` per le scene 2d: JSON con una scheda per frase (vuoto se nessuna).
    censura(testo) -> testo: applicata ai campi scritti a schermo (le parole forti diventano m*rte)."""
    s = [dict(_scheda(r) or {}) for r in righe]
    if censura:
        for sk in s:
            for k in CAMPI_TESTO:
                if isinstance(sk.get(k), str):
                    sk[k] = censura(sk[k])
                elif isinstance(sk.get(k), list):
                    sk[k] = [censura(x) if isinstance(x, str) else x for x in sk[k]]
    return json.dumps(s, ensure_ascii=False, separators=(",", ":")) if any(s) else ""


def scena(data: dict) -> str:
    """Scena da usare: quella scritta nella richiesta, altrimenti la prima pronta per formato e resa."""
    if data.get("scena") or not data.get("formato"):
        return str(data.get("scena") or "")
    scene = formato(data["formato"])["rese"][str(data.get("resa"))]["scene"]
    return scene[0] if scene else ""


def scheletro(nome: str, resa: str) -> list:
    """Copione segnaposto che segue la scaletta del formato (da riscrivere frase per frase)."""
    f = formato(nome)
    righe = []
    for passo in f["struttura"]:
        testo = f"[{passo['ruolo']}] {passo['guida']}"
        tipo = passo["ruolo"] if passo["ruolo"] in catalogo()["schede_2d"] else {"attesa": "domanda"}.get(passo["ruolo"], "scena")
        sk = {"tipo": tipo, "titolo": ""}
        if tipo in ("domanda", "risposta"):                 # quiz: segnaposto validi (3 opzioni, conto, giusta)
            sk["opzioni"] = ["A", "B", "C"]
            sk.update({"conto": 3} if passo["ruolo"] == "attesa" else {"giusta": 0} if tipo == "risposta" else {})
        righe.append({"testo": testo, "scheda": sk} if resa == "2d" else testo)
    return righe


def descrivi(nome: str | None = None, resa: str | None = None) -> str:
    c = catalogo()
    out = [] if nome else ["Regole comuni:"] + [f"  - {r}" for r in c["regole_comuni"]] + [""]
    for k, f in c["formati"].items():
        if nome and k != nome:
            continue
        out += [f"== {k}: {f['nome']} ({f['durata'][0]}-{f['durata'][1]} s) — {f['scopo']}", "  Scaletta:"]
        out += [f"    {p['ruolo']:10} {p['guida']}" for p in f["struttura"]]
        out += [f"    {'cta':10} {f['cta']} (aggiunta dal sistema)"]
        for r, v in f["rese"].items():
            if resa and r != resa:
                continue
            out += [f"  Resa {r} — scene: {', '.join(v['scene']) or '(da creare)'}"] + [f"    - {x}" for x in v["ricetta"]]
            if "cartoon2d" in v["scene"]:
                out += ["    Ritmo alto (cartoon2d):"] + [f"      · {x}" for x in c.get("ritmo_alto", [])]
        out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    print(descrivi(*(sys.argv[1:3] + [None, None])[:2]))
