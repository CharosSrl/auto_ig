"""Richieste di contenuti: una sottocartella per richiesta, con copione e risultati.

    richieste/<AAAA-MM-GG>-<titolo>/
        richiesta.yaml      # cosa fare: scena, colori, voce, copione, pubblicazione
        out/                # risultati generati
            voce.wav  sottotitoli.ass  tempi.json  video.mp4  video.jpg

    Tutta la cartella richieste/ resta solo in locale (.gitignore): su GitHub va solo ciò che entra in media/.

    python -m auto_ig.richieste nuova "Nuova collezione"     # crea cartella + richiesta.yaml da compilare
    python -m auto_ig.richieste crea <cartella>              # voce + sottotitoli + video
    python -m auto_ig.richieste coda <cartella> [--quando ISO] [--caption "..."]   # in coda come BOZZA
    python -m auto_ig.richieste lista
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import date
from pathlib import Path
from typing import Callable

import yaml

from . import queue, voce
from .config import MEDIA_DIR, ROOT
from .images import slugify

REQ_DIR = ROOT / "richieste"
STATES = ("da_fare", "generato", "in_coda", "scartato")

TEMPLATE = """# Richiesta di contenuto — compilata da Claude su indicazione di Antonio.
titolo: {titolo}
stato: da_fare            # da_fare | generato | in_coda | scartato
richiesta: {richiesta}    # cosa ha chiesto Antonio, parole sue

# Video sotto la voce: scena three.js (testo | oggetto | particelle | ...) e colori
scena: {scena}
colori:
  sfondo: "{sfondo}"
  accento: "{accento}"      # anche colore della parola evidenziata
testo_scena: ""           # testo fisso della scena (vuoto = nessuno; per 'testo' usa il titolo)

# Voce (Piper, locale) e copione: una riga = una frase detta e mostrata a schermo
voce:
  modello: it_IT-paola-medium
  velocita: 1.0           # 0.8 più lenta, 1.2 più veloce
  # pronuncia: {{Cintre: "Sèntr"}}   # solo audio: come leggere certe parole
copione:                  # riga semplice, oppure {{testo: "...", tono: arrabbiata|felice}}
{copione}

# Pubblicazione (facoltativa): usata da "coda", entra sempre come BOZZA
pubblicazione:
  quando: ""              # es. 2026-11-20T18:00+01:00
  caption: {caption}
"""


def _q(text: str) -> str:
    return json.dumps(text, ensure_ascii=False)       # stringa YAML sicura (JSON è YAML valido)


def new(title: str, lines: list[str] | None = None, scene: str = "particelle", bg: str = "#000000",
        accent: str = "#d4af37", caption: str = "", request: str = "", base: Path = REQ_DIR,
        day: date | None = None) -> Path:
    folder = base / f"{(day or date.today()).isoformat()}-{slugify(title, 50)}"
    if folder.exists():
        raise FileExistsError(f"Esiste già: {folder}")
    lines = lines or ["Prima frase del copione.", "Seconda frase."]
    folder.mkdir(parents=True)
    (folder / "richiesta.yaml").write_text(TEMPLATE.format(
        titolo=_q(title), richiesta=_q(request), scena=scene, sfondo=bg, accento=accent,
        copione="\n".join(f"  - {_q(l)}" for l in lines), caption=_q(caption)))
    return folder


def load(folder: Path) -> dict:
    data = yaml.safe_load((folder / "richiesta.yaml").read_text()) or {}
    errs = []
    try:
        if not voce.normalize_lines(data.get("copione")):
            errs.append("copione vuoto")
    except ValueError as e:
        errs.append(str(e))
    if data.get("stato", "da_fare") not in STATES:
        errs.append(f"stato non valido ({', '.join(STATES)})")
    for k in ("sfondo", "accento"):
        try:
            voce.ass_color(str((data.get("colori") or {}).get(k, "")))
        except ValueError:
            errs.append(f"colore {k} non valido")
    if errs:
        raise ValueError(f"{folder.name}: " + "; ".join(errs))
    return data


def set_state(folder: Path, state: str) -> None:
    """Aggiorna solo la riga 'stato:' (conserva i commenti del file)."""
    if state not in STATES:
        raise ValueError(state)
    f = folder / "richiesta.yaml"
    f.write_text(re.sub(r"^stato:\s*\S+", f"stato: {state}", f.read_text(), count=1, flags=re.M))


def outputs(folder: Path) -> dict:
    out = folder / "out"
    return {k: out / n for k, n in
            {"wav": "voce.wav", "ass": "sottotitoli.ass", "tempi": "tempi.json",
             "mp4": "video.mp4", "jpg": "video.jpg"}.items()}


def build(folder: Path, render_fn=None, speak_fn=voce.speak,
          progress: Callable[[int, int], None] | None = None) -> Path:
    """Voce + sottotitoli + video. Ritorna il percorso del video."""
    if render_fn is None:
        from .video import render as render_fn
    data = load(folder)
    o = outputs(folder)
    o["wav"].parent.mkdir(exist_ok=True)
    v = data.get("voce") or {}
    kw = {"pronuncia": v["pronuncia"]} if v.get("pronuncia") else {}
    sentences, seconds = speak_fn(data["copione"], o["wav"],
                                  v.get("modello", voce.DEFAULT_VOICE), float(v.get("velocita", 1.0)), **kw)
    colors = data["colori"]
    o["ass"].write_text(voce.build_ass(sentences, highlight=colors["accento"]))
    o["tempi"].write_text(json.dumps(voce.timings_dict(sentences), indent=2, ensure_ascii=False))
    scene_text = data.get("testo_scena") or (data.get("titolo", "") if data["scena"] == "testo" else "")
    render_fn(data["scena"], {"testo": scene_text, "colore": colors["sfondo"], "accento": colors["accento"],
                              "voce": "1", "fine": f"{seconds:.2f}",
                              # inizio di ogni frase: le scene a più atti si sincronizzano con la voce
                              "atti": ",".join(f"{x.start:.2f}" for x in sentences)},
              max(3.0, seconds), o["mp4"].parent, progress=progress, audio=o["wav"], ass=o["ass"], name="video")
    set_state(folder, "generato")
    return o["mp4"]


def enqueue(folder: Path, when: str | None = None, caption: str | None = None, status: str = "draft",
            media_dir: Path = MEDIA_DIR, queue_path: Path = queue.QUEUE_FILE) -> queue.Post:
    """Copia video e copertina in media/ e li mette in coda (di default come BOZZA)."""
    from .video.__main__ import add_reel_to_queue
    data = load(folder)
    o = outputs(folder)
    if not o["mp4"].exists():
        raise FileNotFoundError("Video non ancora generato: esegui prima 'crea'")
    pub = data.get("pubblicazione") or {}
    when = when or pub.get("quando")
    if not when:
        raise ValueError("Manca la data di pubblicazione (--quando o pubblicazione.quando)")
    caption = caption if caption is not None else (pub.get("caption") or "")
    name = f"reel-{folder.name}"
    shutil.copy2(o["mp4"], media_dir / f"{name}.mp4")
    cover = ""
    if o["jpg"].exists():
        shutil.copy2(o["jpg"], media_dir / f"{name}.jpg")
        cover = f"{name}.jpg"
    post = add_reel_to_queue(f"{name}.mp4", cover, str(when), caption, queue_path, status=status)
    set_state(folder, "in_coda")
    return post


def all_requests(base: Path = REQ_DIR) -> list[tuple[Path, dict | None, str]]:
    """[(cartella, dati o None, errore)] dalla più recente."""
    out = []
    for f in sorted(base.glob("*/richiesta.yaml"), reverse=True):
        try:
            out.append((f.parent, load(f.parent), ""))
        except Exception as e:
            out.append((f.parent, None, str(e)))
    return out


def resolve(name: str, base: Path = REQ_DIR) -> Path:
    p = Path(name)
    folder = (p if p.is_dir() else base / name).resolve()
    if not (folder / "richiesta.yaml").exists():
        raise SystemExit(f"Richiesta non trovata: {name}")
    return folder


def main() -> None:
    ap = argparse.ArgumentParser(description="Richieste di contenuti con voice-over")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("nuova"); a.add_argument("titolo")
    b = sub.add_parser("crea"); b.add_argument("cartella")
    c = sub.add_parser("coda"); c.add_argument("cartella"); c.add_argument("--quando"); c.add_argument("--caption")
    sub.add_parser("lista")
    args = ap.parse_args()

    if args.cmd == "nuova":
        print(f"Creata {new(args.titolo).relative_to(ROOT)}/richiesta.yaml")
    elif args.cmd == "crea":
        def prog(i, n):
            if i % 30 == 0 or i == n:
                print(f"\r{i}/{n} fotogrammi", end="", flush=True)
        mp4 = build(resolve(args.cartella), progress=prog)
        print(f"\nVideo: {mp4.relative_to(ROOT)}")
    elif args.cmd == "coda":
        post = enqueue(resolve(args.cartella), args.quando, args.caption)
        print(f"In coda come BOZZA {post.id} per {post.when} (da approvare nella UI)")
    else:
        for folder, data, err in all_requests():
            print(f"{folder.name:45} {data['stato'] if data else 'ERRORE: ' + err}")


if __name__ == "__main__":
    main()
