"""Scarica immagini libere, le adatta a Instagram (JPEG 1080x1350) e salva i crediti.

    python -m auto_ig.images cerca "montagna"                 # elenco numerato
    python -m auto_ig.images scarica "montagna" 3              # scarica il risultato n.3
    python -m auto_ig.images scarica "montagna" 3 --coda "2026-11-15T18:00:00+01:00" --caption "..."
"""
from __future__ import annotations

import argparse
import io
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image, ImageOps

from . import queue
from .config import MEDIA_DIR, load_dotenv
from .sources import USER_AGENT, ImageResult, search

FEED_SIZE = (1080, 1350)            # 4:5, il formato verticale più grande nel feed
MAX_BYTES = 40 * 1024 * 1024        # non scaricare file enormi
CREDITS_FILE = MEDIA_DIR / "credits.json"
Image.MAX_IMAGE_PIXELS = 100_000_000


def slugify(text: str, maxlen: int = 40) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()   # à -> a
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:maxlen].strip("-") or "img"


def fit_to_feed(img: Image.Image, size: tuple[int, int] = FEED_SIZE) -> Image.Image:
    """Ritaglio al rapporto di `size` e ridimensionamento; output RGB."""
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.convert("RGBA").split()[-1])
        img = bg
    # centro un po' alto: nei ritratti i volti stanno di solito nella parte superiore
    return ImageOps.fit(img, size, Image.LANCZOS, centering=(0.5, 0.4))


def download_bytes(url: str, session=None) -> bytes:
    http = session or requests
    resp = http.get(url, headers={"User-Agent": USER_AGENT}, timeout=60, stream=True)
    resp.raise_for_status()
    buf = io.BytesIO()
    for chunk in resp.iter_content(64 * 1024):
        buf.write(chunk)
        if buf.tell() > MAX_BYTES:
            raise ValueError("file troppo grande")
    return buf.getvalue()


def load_credits(path: Path = CREDITS_FILE) -> dict:
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_credit(filename: str, res: ImageResult, path: Path = CREDITS_FILE) -> None:
    credits = load_credits(path)
    credits[filename] = {
        "source": res.source, "id": res.id, "title": res.title, "creator": res.creator,
        "page_url": res.page_url, "original_url": res.url,
        "license": res.license, "license_url": res.license_url,
        "downloaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    path.write_text(json.dumps(credits, indent=2, ensure_ascii=False))


def license_label(lic: str) -> str:
    low = lic.lower()
    if low.startswith(("pdm", "pd ", "public domain")) or low == "pd":
        return "Pubblico dominio"
    if low.startswith("cc0"):
        return "CC0"
    if low.startswith("pixabay"):
        return "Licenza Pixabay"
    return lic


def credit_line(filename: str, path: Path = CREDITS_FILE) -> str:
    """Riga di credito da accodare alla caption (es. '📷 Mario Rossi via Openverse (CC0)')."""
    c = load_credits(path).get(filename)
    if not c:
        return ""
    lic = license_label(c["license"])
    who = c.get("creator") or ""
    who = "" if who.lower() in ("", "sconosciuto", "unknown", "unknown author") else who + " "
    return f"📷 {who}via {c['source'].capitalize()} ({lic})"


def save_result(res: ImageResult, media_dir: Path = MEDIA_DIR, session=None) -> str:
    """Scarica, converte e salva. Ritorna il nome file dentro media/."""
    raw = download_bytes(res.url, session)
    with Image.open(io.BytesIO(raw)) as img:
        out = fit_to_feed(img)
    name = f"{res.source}-{slugify(res.title or res.id)}-{res.id[:8]}.jpg"
    media_dir.mkdir(parents=True, exist_ok=True)
    out.save(media_dir / name, "JPEG", quality=90, optimize=True, progressive=True)
    save_credit(name, res, media_dir / "credits.json")
    return name


def add_to_queue(filename: str, when: str, caption: str, with_credit: bool = True,
                 queue_path: Path = queue.QUEUE_FILE, credits_path: Path = CREDITS_FILE,
                 status: str = "pending") -> queue.Post:
    posts = queue.load(queue_path)
    if with_credit and (line := credit_line(filename, credits_path)):
        caption = f"{caption}\n\n{line}".strip()
    post = queue.Post(id=queue.next_id(posts), when=when, type="image", media=[filename], caption=caption,
                      status=status)
    if errs := post.validate():
        raise ValueError("; ".join(errs))
    posts.append(post)
    queue.save(posts, queue_path)
    return post


def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser(description="Immagini libere per Instagram")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("cerca")
    a.add_argument("query")
    a.add_argument("--fonte", default="auto", choices=["auto", "wikimedia", "openverse", "pixabay"])
    b = sub.add_parser("scarica")
    b.add_argument("query")
    b.add_argument("numero", type=int, help="numero mostrato da 'cerca'")
    b.add_argument("--fonte", default="auto", choices=["auto", "wikimedia", "openverse", "pixabay"])
    b.add_argument("--coda", metavar="DATA_ISO", help="aggiunge alla coda come BOZZA con questa data")
    b.add_argument("--caption", default="")
    args = ap.parse_args()

    results = search(args.query, 20, args.fonte)
    if args.cmd == "cerca":
        for i, r in enumerate(results, 1):
            print(f"{i:2}. [{r.source}] {r.title[:50]!r} — {r.creator} — {r.license} — "
                  f"{r.width}x{r.height}\n    {r.page_url}")
        if not results:
            print("Nessun risultato (prova termini in inglese).")
        return

    if not 1 <= args.numero <= len(results):
        raise SystemExit(f"Numero non valido: ci sono {len(results)} risultati")
    name = save_result(results[args.numero - 1])
    print(f"Salvato media/{name}")
    if args.coda:
        post = add_to_queue(name, args.coda, args.caption, status="draft")   # da CLI/chat: sempre bozza
        print(f"Aggiunto alla coda come BOZZA {post.id} per {post.when} (da approvare nella UI)")


if __name__ == "__main__":
    main()
