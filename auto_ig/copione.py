"""Copione in JSON (Antonio, 2026-11-21: "focus assoluto sullo scripting con dei file json ad-hoc").

    richieste/<cartella>/copione.json   # le parole del reel + il ragionamento (fatti, strutture, ganci)
    richieste/<cartella>/richiesta.yaml # grafica, voce, colori, audio (come prima)

Le regole stanno in scrittura/ (LEGGIMI.md, regole/, regole.json, copione.schema.json): vanno lette PRIMA di
scrivere. Qui le si controlla a macchina; `richieste crea` fonde il JSON nella richiesta e si ferma sugli errori.

    python -m auto_ig.copione controlla richieste/<cartella>   # errori e avvisi, senza render
    python -m auto_ig.copione nuovo richieste/<cartella>       # copione.json vuoto dal modello
    python -m auto_ig.copione da-yaml richieste/<cartella>     # stampa il copione di una richiesta vecchia in JSON
"""
from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path

from .config import ROOT

SCRITTURA = ROOT / "scrittura"
NOME = "copione.json"


def regole() -> dict:
    return json.loads((SCRITTURA / "regole.json").read_text())


def carica(cartella: Path) -> dict:
    return json.loads((Path(cartella) / NOME).read_text())


def parole(t: str) -> list[str]:
    return re.findall(r"[0-9a-zà-öø-ÿ']+", str(t or "").lower())


def stima_secondi(c: dict, r: dict | None = None) -> float:
    """Durata stimata (voce Aoede 1.0): parole / velocità + pause + coda. Il build misura quella vera."""
    s = (r or regole())["secondi"]
    testi = [b.get("voce", "") for b in c.get("battute") or []] + [c.get("cta", "")]
    n = sum(len(str(t).split()) for t in testi)
    return n / s["parole_al_secondo"] + s["pausa"] * (len(testi) - 1) + s["coda"]


# --- controllo dello schema (a mano: niente dipendenze) ------------------------------------------
def _schema(c: dict, r: dict) -> list[str]:
    errs = []
    richiesti = {"idea": str, "formato": str, "fatti": list, "strutture_valutate": list, "ganci_valutati": list,
                 "parola_forte": dict, "battute": list, "cta": str, "caption": str, "autocontrollo": dict}
    for k, tipo in richiesti.items():
        if k not in c:
            errs.append(f"manca '{k}' (scrittura/copione.schema.json)")
        elif not isinstance(c[k], tipo):
            errs.append(f"'{k}' deve essere {tipo.__name__}")
    if c.get("formato") not in (None, "curiosita", "quiz", "storia"):
        errs.append("formato: curiosita | quiz | storia")
    for i, b in enumerate(c.get("battute") or [], 1):
        if not isinstance(b, dict) or not str(b.get("voce") or "").strip():
            errs.append(f"battuta {i}: serve 'voce'")
        elif b.get("ruolo") not in r["ruoli"]:
            errs.append(f"battuta {i}: ruolo '{b.get('ruolo')}' non valido ({' | '.join(r['ruoli'])})")
    return errs


def controlla(c: dict) -> tuple[list[str], list[str]]:
    """(errori, avvisi). Errori = il copione va riscritto (il build si ferma). Avvisi = da valutare e dire ad Antonio."""
    r = regole()
    errs = _schema(c, r)
    if errs:
        return errs, []
    av = []
    P = r["parole"]
    bt = c["battute"]
    ruoli = [b["ruolo"] for b in bt]
    # struttura a domanda aperta (01-struttura)
    if not r["battute"]["min"] <= len(bt) <= r["battute"]["max"]:
        errs.append(f"{len(bt)} battute: ne servono da {r['battute']['min']} a {r['battute']['max']} (05-ritmo)")
    if ruoli[0] != "gancio":
        errs.append("la prima battuta deve avere ruolo 'gancio' (01-struttura)")
    if ruoli[-1] != "risposta":
        errs.append("l'ultima battuta deve essere la 'risposta': la gente se ne va appena ce l'ha (01-struttura)")
    if ruoli.count("risposta") > 1:
        errs.append("una sola 'risposta', per ultima: le altre battute aumentano la voglia di sapere (01-struttura)")
    pos = [i for i, x in enumerate(ruoli) if x == "rehook"]
    if not pos:
        errs.append("manca il 'rehook' a metà video (01-struttura)")
    elif pos[0] in (0, len(bt) - 1):
        errs.append("il rehook va a metà, non in testa né in coda (01-struttura)")
    if c["formato"] == "quiz" and "conto" not in ruoli:
        av.append("quiz senza 'conto' (Tre. Due. Uno.) prima della risposta")
    # gancio (02-gancio)
    g = bt[0]
    if len(g["voce"].split()) > P["gancio_max"]:
        errs.append(f"gancio di {len(g['voce'].split())} parole (max {P['gancio_max']}): si deve dire in 3 s (02-gancio)")
    # attenzione (09-attenzione, studio 2026-11-22): prima parola = contenuto; scena concreta (numero, nome, anno)
    inizio = re.sub(r"^[\W_]+", "", g["voce"].lower())
    for a in r.get("aperture_vietate", []):
        if re.match(rf"{re.escape(a)}(?![\w'])", inizio):
            errs.append(f"il gancio apre con '{a}': troppo vago, la prima parola deve essere già contenuto (09-attenzione)")
    concrete = set(r.get("oggetti_concreti", [])) | set(r.get("numeri_in_lettere", []))
    nome_proprio = re.search(r"(?<![.?!:])\s[A-ZÀ-Ý][\w'’-]+", g["voce"])   # maiuscola non a inizio frase
    if not (re.search(r"\d", g["voce"]) or nome_proprio or any(w in concrete or w.endswith("mila")
                                                                for w in parole(g["voce"]))):
        av.append("gancio senza appiglio concreto (numero, anno, nome, marchio, luogo, capo da indossare): concreto "
                  "sulla scena, muto sull'esito (09-attenzione)")
    scelti = [x for x in c["ganci_valutati"] if x.get("scelto")]
    if len(c["ganci_valutati"]) < r["ganci_valutati_min"]:
        errs.append(f"ganci_valutati: almeno {r['ganci_valutati_min']}, con il perché (02-gancio)")
    if len(scelti) != 1:
        errs.append("ganci_valutati: esattamente uno con scelto: true")
    elif scelti[0].get("testo", "").strip() != g["voce"].strip():
        av.append("il gancio scelto in ganci_valutati non è uguale alla voce della prima battuta")
    if any(not str(x.get("perche") or "").strip() for x in c["ganci_valutati"]):
        errs.append("ganci_valutati: ogni gancio ha il suo 'perche'")
    st = c["strutture_valutate"]
    if len(st) != r["strutture_valutate"] or sum(bool(x.get("scelta")) for x in st) != 1:
        errs.append(f"strutture_valutate: esattamente {r['strutture_valutate']}, una con scelta: true (01-struttura)")
    pf = c["parola_forte"]
    if not str(pf.get("perche") or "").strip():
        errs.append("parola_forte: scrivi il perché (c'è perché è il cuore vero / non c'è perché…)")
    if pf.get("parola"):
        w = str(pf["parola"]).lower()
        if w not in g["voce"].lower():
            errs.append(f"parola forte '{pf['parola']}' non detta nel gancio (02-gancio)")
        scritto = " ".join(str(x) for x in (g.get("schermo"), (g.get("scheda") or {}).get("titolo"),
                                             (g.get("scheda") or {}).get("timbro")) if x).lower()
        if w not in scritto:
            errs.append(f"parola forte '{pf['parola']}' non scritta a schermo nel gancio ('schermo')")
    # lingua (03-lingua)
    vietate = [re.compile(rf"(?<![\w']){re.escape(v)}(?![\w'])", re.I) for v in r["vietate"]]
    vuote = set(r["parole_vuote_ripetizione"])
    testi = [(f"battuta {i}", b["voce"]) for i, b in enumerate(bt, 1)] + \
            [(f"schermo {i}", b.get("schermo") or "") for i, b in enumerate(bt, 1)] + [("cta", c["cta"])]
    for dove, t in testi:
        for rx in vietate:
            if m := rx.search(t):
                errs.append(f"{dove}: '{m.group(0)}' è vietato (03-lingua: niente tono da prof, marketing o slang no)")
    for i, b in enumerate(bt, 1):
        n = len(b["voce"].split())
        if b["ruolo"] not in ("rehook", "conto") and not P["battuta_min"] <= n <= P["battuta_max"]:
            av.append(f"battuta {i}: {n} parole (frasi intere da {P['battuta_min']} a {P['battuta_max']}, 03-lingua)")
        ripetute = sorted({w for w in parole(b["voce"]) if len(w) > 3 and w not in vuote
                           and parole(b["voce"]).count(w) > 1})
        if ripetute:
            av.append(f"battuta {i}: parola ripetuta ({', '.join(ripetute)}) (03-lingua)")
        if len(str(b.get("schermo") or "").split()) > P["schermo_max"]:
            errs.append(f"battuta {i}: 'schermo' oltre {P['schermo_max']} parole (05-ritmo)")
    fissa = r.get("cta_obbligatoria")
    if fissa and c["cta"].strip() != fissa:
        errs.append(f"CTA '{c['cta']}': in tutti i video è '{fissa}' (Antonio, 2026-11-22; 06-cta-e-caption)")
    if len(c["cta"].split()) > P["cta_max"]:
        errs.append(f"CTA di {len(c['cta'].split())} parole (max {P['cta_max']}, 06-cta)")
    # fatti e fonti (04-fatti)
    fatti = c["fatti"]
    for j, f in enumerate(fatti):
        if not str(f.get("fonte") or "").strip():
            errs.append(f"fatto {j}: manca la fonte (04-fatti)")
    for i, b in enumerate(bt, 1):
        if b["ruolo"] in r["ruoli_senza_fatto"]:
            continue
        k = b.get("fatto")
        if not isinstance(k, int) or not 0 <= k < len(fatti):
            errs.append(f"battuta {i} ({b['ruolo']}): indica il 'fatto' su cui si basa (indice in fatti[], 04-fatti)")
    # durata (05-ritmo)
    tot = sum(len(t.split()) for t in [b["voce"] for b in bt] + [c["cta"]])
    sec = stima_secondi(c, r)
    if sec > r["secondi"]["max"]:
        errs.append(f"durata stimata {sec:.1f} s ({tot} parole): oltre {r['secondi']['max']:.0f} s, accorcia (05-ritmo)")
    elif tot > P["totale_max"]:
        av.append(f"{tot} parole in tutto: rischi di superare i 25 s (05-ritmo)")
    # caption (06)
    if not c["caption"].strip():
        errs.append("caption vuota (06-cta-e-caption)")
    elif g["voce"].split()[0].lower() not in c["caption"][:200].lower():
        av.append("la caption dovrebbe aprire con il gancio (06-cta-e-caption)")
    # autocontrollo
    a = c["autocontrollo"]
    if a.get("letto_ad_alta_voce") is not True or not str(a.get("lo_racconterei_a_un_amico") or "").strip():
        errs.append("autocontrollo: rileggi ad alta voce e scrivi perché lo racconteresti a un amico (03-lingua)")
    return errs, av


# --- dal JSON alla richiesta ----------------------------------------------------------------------
def _tipo(ruolo: str, formato: str) -> str:
    return {"gancio": "gancio", "rehook": "rehook", "domanda": "domanda", "conto": "domanda",
            "risposta": "risposta" if formato == "quiz" else "fatto"}.get(ruolo, "fatto")


def in_richiesta(c: dict, data: dict) -> dict:
    """La richiesta con le parole prese dal copione: copione, cta, caption, pronuncia, parola forte, formato."""
    d = copy.deepcopy(data)
    fmt = c.get("formato") or d.get("formato") or ""
    d.setdefault("formato", fmt)
    if c.get("richiesta_antonio") and not d.get("richiesta"):
        d["richiesta"] = c["richiesta_antonio"]
    righe = []
    for b in c.get("battute") or []:
        sc = copy.deepcopy(b.get("scheda") or {})
        sc.setdefault("tipo", _tipo(b.get("ruolo", ""), fmt))
        if b.get("schermo"):
            sc.setdefault("titolo", b["schermo"])
        if b.get("evidenzia"):
            sc.setdefault("evidenzia", b["evidenzia"])
        riga = {"testo": b.get("voce", ""), "scheda": sc}
        for k in ("ritmo", "tono"):
            if b.get(k) is not None:
                riga[k] = b[k]
        righe.append(riga)
    d["copione"] = righe
    d["cta"] = c.get("cta") or d.get("cta", "")
    pub = dict(d.get("pubblicazione") or {})
    if c.get("caption"):
        pub["caption"] = c["caption"]
    d["pubblicazione"] = pub
    if c.get("pronuncia"):
        d["voce"] = {**(d.get("voce") or {}), "pronuncia": {**((d.get("voce") or {}).get("pronuncia") or {}),
                                                            **c["pronuncia"]}}
    pf = c.get("parola_forte") or {}
    if pf.get("parola"):
        if "censura" in c:
            d["censura"] = c["censura"]
        elif "censura" not in d:
            d["censura"] = [str(pf["parola"]).lower()]
    else:
        d["parola_forte_motivo"] = pf.get("perche", "")
    return d


def da_richiesta(data: dict) -> dict:
    """Copione di una richiesta YAML vecchia → scheletro JSON (ruoli dedotti; fatti e ragionamento da compilare)."""
    righe = [r if isinstance(r, dict) else {"testo": r} for r in data.get("copione") or []]
    bt = []
    for i, r in enumerate(righe):
        sc = copy.deepcopy(r.get("scheda") or {})
        t = sc.get("tipo")
        ruolo = ("gancio" if i == 0 else "rehook" if t == "rehook" else "conto" if sc.get("conto")
                 else "domanda" if t == "domanda" else "risposta" if t == "risposta" or i == len(righe) - 1 else "attesa")
        b = {"ruolo": ruolo, "voce": r.get("testo", "")}
        if sc.get("titolo"):
            b["schermo"] = sc.pop("titolo")
        if sc.get("evidenzia"):
            b["evidenzia"] = sc.pop("evidenzia")
        if ruolo not in ("rehook", "conto", "domanda"):
            b["fatto"] = 0
        for k in ("ritmo", "tono"):
            if r.get(k) is not None:
                b[k] = r[k]
        if sc.get("tipo") == {"gancio": "gancio", "rehook": "rehook"}.get(ruolo):
            sc.pop("tipo")
        if sc:
            b["scheda"] = sc
        bt.append(b)
    pf = data.get("parola_forte_motivo")
    return {"idea": str(data.get("titolo") or ""), "formato": data.get("formato") or "",
            "richiesta_antonio": data.get("richiesta") or "",
            "fatti": [{"fatto": "", "fonte": ""}], "strutture_valutate": [], "ganci_valutati": [],
            "parola_forte": {"parola": None, "perche": pf} if pf else {"parola": "", "perche": ""},
            "battute": bt, "cta": data.get("cta") or "", "caption": (data.get("pubblicazione") or {}).get("caption", ""),
            "pronuncia": (data.get("voce") or {}).get("pronuncia") or {},
            "autocontrollo": {"letto_ad_alta_voce": False, "lo_racconterei_a_un_amico": ""}}


MODELLO = {
    "idea": "la storia in una riga: perché fa dire 'ma dai!'",
    "formato": "curiosita",
    "richiesta_antonio": "",
    "fatti": [{"fatto": "", "fonte": "", "url": ""}],
    "strutture_valutate": [{"schema": "", "scelta": True, "perche": ""}, {"schema": "", "scelta": False, "perche": ""},
                           {"schema": "", "scelta": False, "perche": ""}],
    "ganci_valutati": [{"testo": "", "scelto": True, "perche": ""}, {"testo": "", "scelto": False, "perche": ""},
                       {"testo": "", "scelto": False, "perche": ""}],
    "parola_forte": {"parola": None, "perche": ""},
    "battute": [{"ruolo": "gancio", "voce": "", "schermo": "", "evidenzia": "", "fatto": 0, "scheda": {"grafica": {}}},
                {"ruolo": "attesa", "voce": "", "schermo": "", "fatto": 0, "scheda": {"tipo": "scena2d"}},
                {"ruolo": "rehook", "voce": "", "schermo": ""},
                {"ruolo": "attesa", "voce": "", "schermo": "", "fatto": 0, "scheda": {"tipo": "scena2d"}},
                {"ruolo": "risposta", "voce": "", "schermo": "", "fatto": 0, "scheda": {"tipo": "confronto"}}],
    "cta": "",
    "caption": "",
    "pronuncia": {},
    "autocontrollo": {"letto_ad_alta_voce": False, "lo_racconterei_a_un_amico": ""},
}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m auto_ig.copione", description=__doc__.split("\n")[0])
    ap.add_argument("azione", choices=["controlla", "nuovo", "da-yaml"])
    ap.add_argument("cartella", type=Path)
    a = ap.parse_args(argv)
    f = a.cartella / NOME
    if a.azione == "nuovo":
        if f.exists():
            print(f"esiste già: {f}")
            return 1
        f.write_text(json.dumps(MODELLO, ensure_ascii=False, indent=2) + "\n")
        print(f"creato {f} — prima leggi scrittura/LEGGIMI.md")
        return 0
    if a.azione == "da-yaml":
        import yaml
        print(json.dumps(da_richiesta(yaml.safe_load((a.cartella / "richiesta.yaml").read_text()) or {}),
                         ensure_ascii=False, indent=2))
        return 0
    c = carica(a.cartella)
    errs, av = controlla(c)
    for e in errs:
        print(f"ERRORE: {e}")
    for x in av:
        print(f"avviso: {x}")
    print(f"durata stimata {stima_secondi(c):.1f} s · {'da riscrivere' if errs else 'ok'}")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
