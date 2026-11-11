"""Coda dei post in schedule/queue.yaml."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import yaml

from .config import QUEUE_FILE

TYPES = ("image", "reel", "carousel")
STATUSES = ("draft", "pending", "published", "error")   # draft = bozza, mai pubblicata


@dataclass
class Post:
    id: str
    when: str                      # ISO 8601, es. "2026-11-12T18:00:00+01:00"
    type: str                      # image | reel | carousel
    media: list[str]               # nomi file in media/ o URL
    caption: str = ""
    status: str = "pending"
    ig_media_id: str | None = None
    error: str | None = None
    published_at: str | None = None
    extra: dict = field(default_factory=dict)   # es. cover per i reel

    def when_dt(self) -> datetime:
        dt = datetime.fromisoformat(self.when)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    def validate(self) -> list[str]:
        errs = []
        if self.type not in TYPES:
            errs.append(f"tipo '{self.type}' non valido ({', '.join(TYPES)})")
        if self.status not in STATUSES:
            errs.append(f"stato '{self.status}' non valido")
        try:
            self.when_dt()
        except ValueError:
            errs.append(f"data '{self.when}' non in formato ISO")
        n = len(self.media)
        if self.type in ("image", "reel") and n != 1:
            errs.append(f"{self.type} richiede 1 media (trovati {n})")
        if self.type == "carousel" and not 2 <= n <= 10:
            errs.append(f"carousel richiede 2-10 media (trovati {n})")
        if len(self.caption) > 2200:
            errs.append("caption oltre 2200 caratteri")
        if self.caption.count("#") > 30:
            errs.append("più di 30 hashtag")
        return errs


def load(path: Path = QUEUE_FILE) -> list[Post]:
    if not path.exists():
        return []
    data = yaml.safe_load(path.read_text()) or {}
    posts = []
    for raw in data.get("posts") or []:
        raw = dict(raw)
        raw["when"] = raw["when"].isoformat() if isinstance(raw.get("when"), datetime) else str(raw["when"])
        raw["id"] = str(raw["id"])
        posts.append(Post(**raw))
    return posts


def save(posts: list[Post], path: Path = QUEUE_FILE) -> None:
    header = ("# Coda dei post. Modificabile a mano o dall'interfaccia.\n"
              "# type: image | reel | carousel\n"
              "# media: nomi file dentro media/ (o URL completi https://...)\n"
              "# status: draft (bozza, non si pubblica) | pending | published | error\n")
    body = yaml.safe_dump({"posts": [asdict(p) for p in posts]}, allow_unicode=True, sort_keys=False)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(header + body)


def due(posts: list[Post], now: datetime | None = None) -> list[Post]:
    """Post in attesa con orario già passato, dal più vecchio."""
    now = now or datetime.now(timezone.utc)
    ready = [p for p in posts if p.status == "pending" and p.when_dt() <= now]
    return sorted(ready, key=lambda p: p.when_dt())


def next_id(posts: list[Post]) -> str:
    nums = [int(p.id) for p in posts if p.id.isdigit()]
    return str(max(nums, default=0) + 1)
