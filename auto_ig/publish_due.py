"""Pubblica i post scaduti della coda. Usato da GitHub Actions e a mano.

    python -m auto_ig.publish_due --dry-run     # prova senza pubblicare
    python -m auto_ig.publish_due --max 1       # pubblica al massimo 1 post
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone

from . import queue
from .config import Config
from .ig_client import IGClient, IGError

# Margine di sicurezza sotto il limite ufficiale (100/24h, alcune doc dicono 50)
SAFE_DAILY_LIMIT = 25


def publish_post(client: IGClient, cfg: Config, post: queue.Post) -> str:
    urls = [cfg.media_url(m) for m in post.media]
    if post.type == "image":
        return client.post_image(urls[0], post.caption)
    if post.type == "reel":
        cover = post.extra.get("cover")
        return client.post_reel(urls[0], post.caption, cfg.media_url(cover) if cover else None)
    return client.post_carousel(urls, post.caption)


def make_client(cfg: Config, dry_run: bool = False) -> IGClient:
    return IGClient(cfg.access_token, cfg.ig_user_id, cfg.api_version,
                    host=cfg.api_host or None, dry_run=dry_run)


def publish_one(client: IGClient, cfg: Config, post: queue.Post, dry_run: bool = False) -> tuple[bool, str]:
    """Valida e pubblica un post; aggiorna lo stato del post (non in dry-run). Ritorna (ok, messaggio)."""
    try:
        if errs := post.validate():
            raise IGError("; ".join(errs))
        media_id = publish_post(client, cfg, post)
    except (IGError, ValueError, OSError) as e:
        if not dry_run:
            post.status, post.error = "error", str(e)
        return False, f"ERRORE post {post.id}: {e}"
    if dry_run:
        return True, f"[dry-run] post {post.id} OK: chiamate API corrette, niente pubblicato"
    post.status, post.ig_media_id, post.error = "published", media_id, None
    post.published_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return True, f"Post {post.id} pubblicato: id IG {media_id}"


def run(dry_run: bool = False, max_posts: int = 1, cfg: Config | None = None,
        client: IGClient | None = None, now: datetime | None = None,
        queue_path=queue.QUEUE_FILE) -> int:
    cfg = cfg or Config.from_env()
    posts = queue.load(queue_path)
    todo = queue.due(posts, now)[:max_posts]
    if not todo:
        print("Nessun post da pubblicare.")
        return 0
    if not dry_run and not (cfg.access_token and cfg.ig_user_id):
        print("ERRORE: IG_ACCESS_TOKEN e IG_USER_ID sono obbligatori (vedi .env.example)")
        return 2
    client = client or make_client(cfg, dry_run)

    if not dry_run:
        usage = client.publishing_limit().get("quota_usage", 0)
        print(f"Quota usata nelle ultime 24h: {usage}")
        if usage >= SAFE_DAILY_LIMIT:
            print("Limite di sicurezza raggiunto, rimando.")
            return 0

    failures = 0
    for post in todo:
        ok, msg = publish_one(client, cfg, post, dry_run)
        print(msg)
        failures += not ok

    if not dry_run:
        queue.save(posts, queue_path)
    return 1 if failures else 0


def main() -> None:
    ap = argparse.ArgumentParser(description="Pubblica i post scaduti della coda")
    ap.add_argument("--dry-run", action="store_true", help="non pubblica, stampa le chiamate")
    ap.add_argument("--max", type=int, default=1, help="massimo post per esecuzione (default 1)")
    args = ap.parse_args()
    sys.exit(run(dry_run=args.dry_run, max_posts=args.max))


if __name__ == "__main__":
    main()
