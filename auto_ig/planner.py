"""Palinsesto: riempie i giorni liberi della coda con BOZZE secondo schedule/plan.yaml.

    python -m auto_ig.planner            # genera le bozze mancanti
    python -m auto_ig.planner --mostra   # elenca solo i giorni liberi

Le bozze (status "draft") non vengono mai pubblicate: vanno approvate nella UI (Coda → Approva).
La rotazione (ricerca, frase, scena, colori, tipo) dipende dalla data: è stabile e prevedibile.
"""
from __future__ import annotations

import argparse
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Callable

import yaml

from . import images, queue
from .config import MEDIA_DIR, QUEUE_FILE, ROOT

PLAN_FILE = ROOT / "schedule" / "plan.yaml"
USED_FILE = ROOT / "schedule" / "usati.txt"     # immagini già usate (fonte:id), per non ripeterle
WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]


def load_plan(path: Path = PLAN_FILE) -> dict:
    plan = yaml.safe_load(path.read_text())
    h, m = map(int, str(plan.get("orario", "18:00")).split(":"))
    plan["_time"] = time(h, m)
    return plan


def local_tz():
    return datetime.now().astimezone().tzinfo


def pick(items: list, k: int):
    return items[k % len(items)]


def free_slots(plan: dict, posts: list[queue.Post], now: datetime | None = None) -> list[datetime]:
    """Date/ore del palinsesto nei prossimi giorni senza alcun post già presente."""
    tz = local_tz()
    now = now or datetime.now(tz)
    taken = {p.when_dt().astimezone(tz).date() for p in posts if p.status != "error"}
    days = set(plan.get("giorni") or WEEKDAYS)
    out = []
    # La finestra parte da oggi se c'è ancora tempo (>= 30 min), altrimenti da domani.
    first = now.date()
    if datetime.combine(first, plan["_time"], tzinfo=tz) - now < timedelta(minutes=30):
        first += timedelta(days=1)
    for d in range(int(plan.get("giorni_avanti", 7))):
        day: date = first + timedelta(days=d)
        if WEEKDAYS[day.weekday()] not in days or day in taken:
            continue
        out.append(datetime.combine(day, plan["_time"], tzinfo=tz))
    return out


def label(when: datetime) -> str:
    return f"{WEEKDAYS[when.weekday()]} {when:%d/%m %H:%M}"


def caption_for(text: str, plan: dict, credit: str = "") -> str:
    parts = [text.strip(), plan.get("hashtag", "").strip()]
    if credit:
        parts.append(credit)
    return "\n\n".join(p for p in parts if p)


def load_used(path: Path) -> set[str]:
    return {l.strip() for l in path.read_text().splitlines() if l.strip()} if path.exists() else set()


def image_draft(plan: dict, k: int, used: set[str], search_fn, media_dir: Path) -> tuple[list[str], str, dict]:
    cfg = plan["immagini"]
    terms = cfg["ricerche"]
    for j in range(len(terms)):
        term = pick(terms, k + j)
        try:
            results = search_fn(term, 20, cfg.get("fonte", "wikimedia"))
        except Exception:
            continue
        for r in results:
            key = f"{r.source}:{r.id}"
            if key in used:
                continue
            try:
                name = images.save_result(r, media_dir)
            except Exception:
                continue
            used.add(key)
            credit = images.credit_line(name, media_dir / "credits.json") if cfg.get("crediti", True) else ""
            return [name], caption_for(pick(cfg["caption"], k), plan, credit), {"ricerca": term, "fonte_id": key}
    raise RuntimeError("nessuna immagine nuova trovata per le ricerche del palinsesto")


def reel_draft(plan: dict, k: int, render_fn, media_dir: Path) -> tuple[list[str], str, dict]:
    cfg = plan["reel"]
    bg, accent = pick(cfg["colori"], k)
    text = pick(cfg["testi"], k)
    scene = pick(cfg["scene"], k)
    mp4, cover = render_fn(scene, {"testo": text, "colore": bg, "accento": accent},
                           float(cfg.get("durata", 8)), media_dir)
    return [mp4], caption_for(pick(cfg["caption"], k), plan), {"cover": cover, "scena": scene}


def generate(plan_path: Path = PLAN_FILE, queue_path: Path = QUEUE_FILE, media_dir: Path = MEDIA_DIR,
             used_path: Path = USED_FILE, search_fn=None, render_fn=None, now: datetime | None = None,
             log: Callable[[str], None] = print) -> list[queue.Post]:
    """Crea le bozze mancanti, salvando la coda dopo ognuna. Ritorna le bozze create."""
    if search_fn is None:
        from .sources import search as search_fn
    if render_fn is None:
        from .video import render as render_fn
    plan = load_plan(plan_path)
    used = load_used(used_path)
    created = []
    slots = free_slots(plan, queue.load(queue_path), now)
    if not slots:
        log("Nessun giorno libero: il palinsesto è già pieno.")
    for n, when in enumerate(slots, 1):
        k = when.date().toordinal()
        kind = pick(plan.get("alternanza", ["image"]), k)
        log(f"[{n}/{len(slots)}] {label(when)}: {kind}...")
        try:
            if kind == "reel":
                media, caption, extra = reel_draft(plan, k, render_fn, media_dir)
            else:
                media, caption, extra = image_draft(plan, k, used, search_fn, media_dir)
        except Exception as e:
            log(f"   saltato: {e}")
            continue
        posts = queue.load(queue_path)             # ricarico: la coda può essere cambiata nel frattempo
        post = queue.Post(id=queue.next_id(posts), when=when.isoformat(timespec="minutes"), type=kind,
                          media=media, caption=caption, status="draft",
                          extra={k2: v for k2, v in extra.items() if k2 == "cover"})
        posts.append(post)
        queue.save(posts, queue_path)
        used_path.write_text("\n".join(sorted(used)) + "\n")
        created.append(post)
        log(f"   bozza {post.id} creata ({', '.join(media)})")
    return created


def main() -> None:
    ap = argparse.ArgumentParser(description="Genera bozze dal palinsesto")
    ap.add_argument("--mostra", action="store_true", help="mostra solo i giorni liberi")
    a = ap.parse_args()
    if a.mostra:
        plan = load_plan()
        for w in free_slots(plan, queue.load()):
            print(f"{label(w)}  →  {pick(plan.get('alternanza', ['image']), w.date().toordinal())}")
        return
    created = generate()
    print(f"Fatto: {len(created)} bozze. Approvale nella pagina Coda, poi Sincronizza.")


if __name__ == "__main__":
    main()
