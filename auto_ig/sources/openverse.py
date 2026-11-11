"""Openverse (api.openverse.org): senza chiave, solo CC0 e Public Domain Mark.
Limite anonimo: 20 richieste/minuto, 200/giorno, max 20 risultati per pagina."""
from __future__ import annotations

import time

import requests

from . import USER_AGENT, ImageResult

API = "https://api.openverse.org/v1/images/"
LICENSES = "cc0,pdm"     # solo pubblico dominio: nessun obbligo di attribuzione


def search(query: str, n: int = 20, min_width: int = 1080, session=None) -> list[ImageResult]:
    http = session or requests
    params = {"q": query, "license": LICENSES, "page_size": 20}
    for attempt in range(2):     # l'API a volte risponde 502/504: riprova
        resp = http.get(API, params=params, headers={"User-Agent": USER_AGENT}, timeout=25)
        if getattr(resp, "status_code", 200) < 500:
            break
        time.sleep(2 * (attempt + 1))
    resp.raise_for_status()
    out = []
    for r in resp.json().get("results", []):
        if (r.get("width") or 0) < min_width or r.get("license") not in ("cc0", "pdm"):
            continue
        out.append(ImageResult(
            source="openverse", id=r["id"], url=r["url"], thumbnail=r.get("thumbnail") or r["url"],
            page_url=r.get("foreign_landing_url") or "", creator=r.get("creator") or "sconosciuto",
            license=f"{r['license']} {r.get('license_version') or ''}".strip(),
            license_url=r.get("license_url") or "", width=r.get("width") or 0,
            height=r.get("height") or 0, title=r.get("title") or "",
        ))
        if len(out) >= n:
            break
    return out
