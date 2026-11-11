"""Pixabay (pixabay.com/api/docs): chiave gratuita in PIXABAY_API_KEY.
Licenza Pixabay Content License: uso libero, attribuzione non obbligatoria.
Nota: la API chiede di non fare hotlinking -> scarichiamo sempre il file in media/."""
from __future__ import annotations

import os

import requests

from . import USER_AGENT, ImageResult

API = "https://pixabay.com/api/"


def search(query: str, n: int = 20, min_width: int = 1080, session=None) -> list[ImageResult]:
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        raise RuntimeError("PIXABAY_API_KEY non impostata in .env")
    http = session or requests
    params = {"key": key, "q": query, "image_type": "photo", "safesearch": "true",
              "per_page": min(max(n, 3), 200), "min_width": min_width}
    resp = http.get(API, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    return [ImageResult(
        source="pixabay", id=str(h["id"]), url=h["largeImageURL"], thumbnail=h["previewURL"],
        page_url=h["pageURL"], creator=h.get("user") or "sconosciuto", license="pixabay",
        license_url="https://pixabay.com/service/license-summary/",
        width=h.get("imageWidth") or 0, height=h.get("imageHeight") or 0, title=h.get("tags", ""),
    ) for h in resp.json().get("hits", [])[:n]]
