"""CLI: python -m auto_ig.video <scena> [--testo ...] [--colore #hex] [--accento #hex] [--durata 8]
                                    [--coda DATA_ISO --caption ...]"""
from __future__ import annotations

import argparse

from .. import queue
from . import render, scenes


def add_reel_to_queue(mp4: str, cover: str, when: str, caption: str,
                      queue_path=queue.QUEUE_FILE) -> queue.Post:
    posts = queue.load(queue_path)
    post = queue.Post(id=queue.next_id(posts), when=when, type="reel", media=[mp4],
                      caption=caption, extra={"cover": cover} if cover else {})
    if errs := post.validate():
        raise ValueError("; ".join(errs))
    posts.append(post)
    queue.save(posts, queue_path)
    return post


def main() -> None:
    ap = argparse.ArgumentParser(description="Render di una scena three.js in mp4 per Reels")
    ap.add_argument("scena", choices=scenes())
    ap.add_argument("--testo", default="")
    ap.add_argument("--colore", default="", help="sfondo, es. #1d3557")
    ap.add_argument("--accento", default="", help="colore principale, es. #e63946")
    ap.add_argument("--durata", type=float, default=8)
    ap.add_argument("--coda", metavar="DATA_ISO")
    ap.add_argument("--caption", default="")
    a = ap.parse_args()

    def progress(i, n):
        if i % 30 == 0 or i == n:
            print(f"\r{i}/{n} fotogrammi", end="", flush=True)

    mp4, cover = render(a.scena, {"testo": a.testo, "colore": a.colore, "accento": a.accento},
                        a.durata, progress=progress)
    print(f"\nSalvato media/{mp4} (copertina media/{cover})")
    if a.coda:
        post = add_reel_to_queue(mp4, cover, a.coda, a.caption)
        print(f"Aggiunto alla coda come post {post.id}")


if __name__ == "__main__":
    main()
