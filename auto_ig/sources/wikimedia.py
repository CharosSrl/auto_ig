"""Wikimedia Commons: senza chiave, filtriamo SOLO pubblico dominio e CC0."""
from __future__ import annotations

import html
import re

import requests

from . import USER_AGENT, ImageResult

API = "https://commons.wikimedia.org/w/api.php"
FREE = {"pd", "cc0"}


def _clean(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def search(query: str, n: int = 20, min_width: int = 1080, session=None, max_pages: int = 4) -> list[ImageResult]:
    http = session or requests
    out: list[ImageResult] = []
    offset = 0
    for _ in range(max_pages):
        params = {
            "action": "query", "format": "json", "formatversion": "2",
            "generator": "search", "gsrsearch": f"{query} filetype:bitmap", "gsrnamespace": "6",
            "gsrlimit": "50", "gsroffset": str(offset),
            "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "3000", "iiurlheight": "1500",
            "iiextmetadatafilter": "License|LicenseShortName|LicenseUrl|Artist|ObjectName",
        }
        resp = http.get(API, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        for p in sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0)):
            ii = (p.get("imageinfo") or [{}])[0]
            meta = ii.get("extmetadata", {})
            lic = (meta.get("License", {}).get("value") or "").lower()
            if lic not in FREE or ii.get("mime") not in ("image/jpeg", "image/png", "image/webp") \
                    or (ii.get("width") or 0) < min_width or (ii.get("height") or 0) < 1350:
                continue
            title = _clean(meta.get("ObjectName", {}).get("value")) or p["title"].removeprefix("File:")
            out.append(ImageResult(
                source="wikimedia", id=str(p["pageid"]),
                url=ii.get("thumburl") or ii["url"],          # max 3000x1500: basta per 1080x1350
                thumbnail=ii.get("thumburl") or ii["url"], page_url=ii.get("descriptionurl", ""),
                creator=_clean(meta.get("Artist", {}).get("value"))[:80] or "sconosciuto",
                license=meta.get("LicenseShortName", {}).get("value") or lic,
                license_url=meta.get("LicenseUrl", {}).get("value") or "",
                width=ii.get("width") or 0, height=ii.get("height") or 0, title=title,
            ))
            if len(out) >= n:
                return out
        offset = data.get("continue", {}).get("gsroffset")
        if offset is None:
            break
    return out
