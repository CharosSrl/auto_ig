"""Richieste di contenuti: una sottocartella per richiesta, con copione e risultati.

    richieste/<AAAA-MM-GG>-<titolo>/
        richiesta.yaml      # cosa fare: scena, colori, voce, copione, pubblicazione
        out/                # risultati generati
            voce.wav  sottotitoli.ass  tempi.json  video.mp4  video.jpg  (mix.wav se c'è audio: musica/sfx)

    Tutta la cartella richieste/ resta solo in locale (.gitignore): su GitHub va solo ciò che entra in media/.

    python -m auto_ig.richieste nuova "Nuova collezione" [--formato curiosita --resa 2d]   # cartella + richiesta.yaml
    python -m auto_ig.richieste crea <cartella>              # voce + sottotitoli + video
    python -m auto_ig.richieste coda <cartella> [--quando ISO] [--caption "..."]   # in coda come BOZZA
    python -m auto_ig.richieste lista
    python -m auto_ig.richieste foto <cartella> "<ricerca>"            # cerca su Wikimedia (solo PD/CC0)
    python -m auto_ig.richieste foto <cartella> "<ricerca>" 3 keds-1916 # scarica il n.3 in <cartella>/foto/keds-1916.jpg

    Foto delle schede 2D (tipo foto, campo foto: "keds-1916.jpg"): stanno in <cartella>/foto/ con crediti.json;
    durante il render vengono copiate in auto_ig/video/_foto/ (servita dal server locale), poi tolte.
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

from . import audio, censura, formati, queue, regole, voce
from .config import MEDIA_DIR, ROOT
from .images import slugify

REQ_DIR = ROOT / "richieste"
STATES = ("da_fare", "generato", "in_coda", "scartato")

TEMPLATE = """# Richiesta di contenuto — compilata da Claude su indicazione di Antonio.
titolo: {titolo}
stato: da_fare            # da_fare | generato | in_coda | scartato
richiesta: {richiesta}    # cosa ha chiesto Antonio, parole sue

# Formato (auto_ig/formati.yaml: scaletta, ricetta 3d/2d, CTA). Vuoto = richiesta libera senza CTA automatica.
formato: {formato}        # storia | quiz | curiosita
resa: {resa}              # 3d (modella Cintre e preset) | 2d (grafica a schede)
cta: ""                   # vuoto = CTA del formato; viene aggiunta SEMPRE come ultima frase. UNA sola, legata al video
mascotte: false           # modella Cintre (3D/2D): true SOLO se Antonio la chiede

# Video sotto la voce: scena three.js (testo | oggetto | particelle | schede2d | ...) e colori
scena: {scena}
colori:
  sfondo: "{sfondo}"
  accento: "{accento}"      # anche colore della parola evidenziata
testo_scena: ""           # testo fisso della scena (vuoto = nessuno; per 'testo' usa il titolo)
qualita: alta             # alta (supersampling 2x, ombre) | bozza (veloce, per provare)
sottotitoli: blocco       # blocco (2 righe ferme, parole evidenziate man mano: default) | interi | corti (1-3 parole)
audio: {{musica: {audio}, sfx: {audio}}}   # base musicale e effetti sonori generati a codice (auto_ig/audio.py)

# Voce (locale) e copione: una riga = una frase detta e mostrata a schermo
voce:
  modello: chirp3-aoede   # la voce di Cintre: Google Chirp 3 HD (GOOGLE_TTS_API_KEY nel .env, gratis fino a 1M car./mese)
                          # | qwen3-vivian (Qwen3-TTS locale, lenta) | it_IT-paola-medium (Piper, istantanea)
  velocita: 1.0           # 1.0 nei reel: più veloce non si capisce (lezioni n. 13)
  pausa: 0.5              # silenzio tra le frasi (default 0.35)
  # pronuncia: {{Cintre: "Sèntr"}}   # solo audio: come leggere certe parole
# cornice: oro            # cornice della foto: polaroid | oro | pellicola | nastro (default: quiz oro, curiosità polaroid)
# censura: true           # parole forti (morte, guerra...) censurate a schermo e in caption (m*rte), intere nella voce;
                          # lista = parole in più da censurare | false = nessuna censura
copione:                  # riga semplice, oppure {{testo: "...", tono: arrabbiata|felice, scheda: {{tipo: ..., titolo: ...}}}}
{copione}

# Pubblicazione (facoltativa): usata da "coda", entra sempre come BOZZA
pubblicazione:
  quando: ""              # es. 2026-11-20T18:00+01:00
  caption: {caption}
"""


def _q(text: str) -> str:
    return json.dumps(text, ensure_ascii=False)       # stringa YAML sicura (JSON è YAML valido)


def new(title: str, lines: list | None = None, scene: str = "particelle", bg: str = "#000000",
        accent: str = "#d4af37", caption: str = "", request: str = "", base: Path = REQ_DIR,
        day: date | None = None, formato: str = "", resa: str = "") -> Path:
    folder = base / f"{(day or date.today()).isoformat()}-{slugify(title, 50)}"
    if folder.exists():
        raise FileExistsError(f"Esiste già: {folder}")
    if formato:                      # scaletta e scena dal catalogo dei formati
        resa = resa or "2d"
        lines = lines or formati.scheletro(formato, resa)
        scene = formati.scena({"formato": formato, "resa": resa}) or scene
        f = formati.formato(formato)
        caption = caption or f"\n\n{f['cta']}\n\n{f['hashtag']}"
        if (bg, accent) == ("#000000", "#d4af37"):   # colori del brand Cintre
            bg, accent = "#6d1a36", "#e8c4c0"
    lines = lines or ["Prima frase del copione.", "Seconda frase."]
    folder.mkdir(parents=True)
    (folder / "richiesta.yaml").write_text(TEMPLATE.format(
        titolo=_q(title), richiesta=_q(request), scena=scene, sfondo=bg, accento=accent,
        formato=formato or '""', resa=resa or '""', audio="true" if resa == "2d" else "false",
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
    errs += formati.valida(data)
    for i, riga in enumerate(data.get("copione") or [], 1):
        nome = ((riga.get("scheda") if isinstance(riga, dict) else None) or {}).get("foto")
        if nome and not (folder / "foto" / str(nome)).is_file():
            errs.append(f"frase {i}: foto '{nome}' mancante in foto/ (scaricala con: python -m auto_ig.richieste foto)")
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


FORMATI_CON_FOTO = ("quiz", "curiosita")   # marca/lezioni.md regola 12: foto Wikimedia dal fotogramma 0


GRAFICHE_VIVE = ("contatore", "radar", "scena2d")


def _regole_foto(data: dict) -> list[str]:
    """Quiz e curiosità in 2D: la prima scheda deve avere una foto (incorniciata e viva dal fotogramma 0)."""
    if data.get("formato") not in FORMATI_CON_FOTO or data.get("resa") != "2d":
        return []
    righe = data.get("copione") or []
    prima = righe[0] if righe else None
    scheda = ((prima.get("scheda") if isinstance(prima, dict) else None) or {})
    # Gancio vivo (Antonio, 2026-11-19): al posto della foto va bene una grafica in movimento dal fotogramma 0.
    viva = isinstance(scheda.get("grafica"), dict) and scheda["grafica"].get("tipo") in GRAFICHE_VIVE
    if not scheda.get("foto") and not viva:
        return ["la prima frase deve avere una foto (scheda.foto) o una grafica viva (scheda.grafica: contatore, "
                "radar, scena2d): nei quiz e nelle curiosità 2D al fotogramma 0 c'è già qualcosa — la foto si cerca "
                "con: python -m auto_ig.richieste foto <cartella> \"<ricerca>\""]
    return []


def avvisi_testo(data: dict) -> list[str]:
    """Scritte a schermo troppo lunghe (non blocca: la voce dice già tutto, a schermo poche parole)."""
    out = []
    for i, riga in enumerate(data.get("copione") or [], 1):
        sc = ((riga.get("scheda") if isinstance(riga, dict) else None) or {})
        if len(str(sc.get("titolo") or "").split()) > 7:
            out.append(f"frase {i}: titolo a schermo oltre 7 parole")
        for o in sc.get("opzioni") or []:
            if len(str(o).split()) > 4:
                out.append(f"frase {i}: opzione '{o}' oltre 4 parole")
    return out


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
             "mp4": "video.mp4", "jpg": "video.jpg", "mix": "mix.wav"}.items()}


def build(folder: Path, render_fn=None, speak_fn=voce.speak,
          progress: Callable[[int, int], None] | None = None, log: Callable[[str], None] = lambda m: None) -> Path:
    """Voce + sottotitoli + video. Ritorna il percorso del video."""
    if render_fn is None:
        from .video import render as render_fn
    data = load(folder)
    if errs := _regole_foto(data) + regole.errori(data):   # regole di Antonio: obbligatorie, non promemoria
        raise ValueError(f"{folder.name}: " + "; ".join(errs))
    for a in dict.fromkeys(avvisi_testo(data) + regole.avvisi(data, folder)):
        log(f"avviso: {a}")
    o = outputs(folder)
    o["wav"].parent.mkdir(exist_ok=True)
    v = data.get("voce") or {}
    kw = {"pronuncia": v["pronuncia"]} if v.get("pronuncia") else {}
    if v.get("pausa") is not None:
        kw["pausa"] = float(v["pausa"])           # secondi di silenzio tra una frase e l'altra
    righe = formati.copione(data)                 # + call to action finale, se c'è il formato
    sentences, seconds = speak_fn(righe, o["wav"],
                                  v.get("modello", voce.DEFAULT_VOICE), float(v.get("velocita", 1.0)), **kw)
    colors = data["colori"]
    cz = censura.da_richiesta(data)               # parole forti: m*rte a schermo, intere nella voce
    # il cartello CTA ha già la sua scritta: niente sottotitoli doppi sotto
    sub = [x for x, r in zip(sentences, righe) if not (isinstance(r, dict) and (r.get("scheda") or {}).get("tipo") == "cta")]
    o["ass"].write_text(voce.build_ass(sub, highlight=colors["accento"], corti=data.get("sottotitoli") == "corti",
                                       blocco=data.get("sottotitoli", "blocco") == "blocco", censura=cz))
    o["tempi"].write_text(json.dumps(voce.timings_dict(sentences), indent=2, ensure_ascii=False))
    scene_text = data.get("testo_scena") or (data.get("titolo", "") if formati.scena(data) == "testo" else "")
    _prepara_foto(folder)
    if data.get("formato"):
        seconds += 1.0                             # la CTA resta a schermo un po' dopo la voce
    if err := regole.errore_durata(data, seconds):  # prima del render: non si perde tempo su un reel troppo lungo
        raise ValueError(f"{folder.name}: {err}")
    if regole.si_applica(data):
        log(regole.riepilogo(data, seconds))
    sk = [(r.get("scheda") if isinstance(r, dict) else None) or {} for r in righe]
    bt = audio.battute(sentences, sk)              # cambi visivi: stessi istanti per scena ed effetti sonori
    ev = audio.suoni(sentences, sk, bt)            # un suono per ogni evento a schermo (skill regia-reel)
    au = data.get("audio") or {}
    traccia = o["wav"]
    if au.get("musica") or au.get("sfx"):
        traccia = audio.mix(o["wav"], bt, max(3.0, seconds), o["mix"], musica=bool(au.get("musica")), sfx=bool(au.get("sfx")),
                           eventi=ev)
    render_fn(formati.scena(data), {"testo": scene_text, "colore": colors["sfondo"], "accento": colors["accento"],
                              "voce": "1", "fine": f"{seconds:.2f}", "schede": formati.schede(righe, cz),
                              "formato": data.get("formato") or "",
                              # inizio di ogni frase: le scene a più atti si sincronizzano con la voce
                              "atti": ",".join(f"{x.start:.2f}" for x in sentences),
                              "fini": ",".join(f"{x.end:.2f}" for x in sentences),   # bocca che parla
                              "battute": audio.battute_param(bt),
                              "pop": audio.pop_param(ev),        # opzione A/B/C che rimbalza sul suo pop
                              "outfit": str(data.get("outfit") or ""),
                              "cornice": str(data.get("cornice") or ""),   # preset cornice della foto (foto2d.js)
                              "mascotte": "1" if data.get("mascotte") is True else "0"},
              max(3.0, seconds), o["mp4"].parent, progress=progress, audio=traccia, ass=o["ass"], name="video",
              quality=str(data.get("qualita") or "alta"), log=log)
    from .video import VIDEO_DIR
    shutil.rmtree(VIDEO_DIR / "_foto", ignore_errors=True)
    set_state(folder, "generato")
    return o["mp4"]


def _prepara_foto(folder: Path) -> None:
    """Copia <richiesta>/foto/*.jpg|png in auto_ig/video/_foto/ (la cartella è svuotata prima: niente foto
    di altre richieste)."""
    from .video import VIDEO_DIR
    dest = VIDEO_DIR / "_foto"
    shutil.rmtree(dest, ignore_errors=True)
    src = folder / "foto"
    if not src.is_dir():
        return
    dest.mkdir(parents=True)
    for f in src.iterdir():
        if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
            shutil.copy2(f, dest / f.name)


def foto(folder: Path, query: str, numero: int | None = None, nome: str = "", search_fn=None,
         download_fn=None) -> list | Path:
    """Senza numero: risultati Wikimedia (solo PD/CC0). Con numero: scarica quel risultato in foto/<nome>.jpg."""
    from .images import scarica_foto
    from .sources import wikimedia
    search_fn = search_fn or (lambda q: wikimedia.search(q, 20, min_width=800, min_height=600))
    results = search_fn(query)
    if numero is None:
        return results
    if not 1 <= numero <= len(results):
        raise ValueError(f"Numero non valido: ci sono {len(results)} risultati")
    res = results[numero - 1]
    dest = folder / "foto" / f"{slugify(nome or res.title or res.id)}.jpg"
    return (download_fn or scarica_foto)(res, dest)


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
    cz = censura.da_richiesta(data)               # stesso stile del video: m*rte anche in caption
    if cz:
        caption = cz(caption)
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
    a.add_argument("--formato", choices=list(formati.catalogo()["formati"]), default="")
    a.add_argument("--resa", choices=formati.RESE, default="")
    b = sub.add_parser("crea"); b.add_argument("cartella")
    c = sub.add_parser("coda"); c.add_argument("cartella"); c.add_argument("--quando"); c.add_argument("--caption")
    sub.add_parser("lista")
    d = sub.add_parser("foto"); d.add_argument("cartella"); d.add_argument("ricerca")
    d.add_argument("numero", type=int, nargs="?"); d.add_argument("nome", nargs="?", default="")
    args = ap.parse_args()

    if args.cmd == "nuova":
        print(f"Creata {new(args.titolo, formato=args.formato, resa=args.resa).relative_to(ROOT)}/richiesta.yaml")
    elif args.cmd == "crea":
        def prog(i, n):
            if i % 30 == 0 or i == n:
                print(f"\r{i}/{n} fotogrammi", end="", flush=True)
        mp4 = build(resolve(args.cartella), progress=prog, log=lambda m: print("\n" + m))
        print(f"\nVideo: {mp4.relative_to(ROOT)}")
    elif args.cmd == "coda":
        post = enqueue(resolve(args.cartella), args.quando, args.caption)
        print(f"In coda come BOZZA {post.id} per {post.when} (da approvare nella UI)")
    elif args.cmd == "foto":
        out = foto(resolve(args.cartella), args.ricerca, args.numero, args.nome)
        if isinstance(out, Path):
            print(f"Salvata {out.relative_to(ROOT)} (credito in {out.parent.relative_to(ROOT)}/crediti.json)")
        else:
            for i, r in enumerate(out, 1):
                print(f"{i:2}. {r.title[:70]!r} — {r.creator[:30]} — {r.license} — {r.width}x{r.height}\n    {r.page_url}")
            if not out:
                print("Nessun risultato PD/CC0 (prova termini in inglese).")
    else:
        for folder, data, err in all_requests():
            print(f"{folder.name:45} {data['stato'] if data else 'ERRORE: ' + err}")


if __name__ == "__main__":
    main()
