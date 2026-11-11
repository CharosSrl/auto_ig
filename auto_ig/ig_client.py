"""Wrapper minimale per l'API di pubblicazione Instagram.

Funziona con entrambi i percorsi Meta (stessi endpoint):
- Instagram Login -> token "IG..."  -> graph.instagram.com
- Facebook Login  -> token "EAA..." -> graph.facebook.com

Flusso: crea container -> attendi FINISHED -> media_publish.
Con dry_run=True nessuna chiamata di scrittura viene eseguita: si stampano e basta.
"""
from __future__ import annotations

import time
from typing import Callable

import requests

IG_HOST = "https://graph.instagram.com"
FB_HOST = "https://graph.facebook.com"


def host_for_token(token: str) -> str:
    return FB_HOST if token.startswith("EAA") else IG_HOST


class IGError(RuntimeError):
    pass


class IGClient:
    def __init__(self, access_token: str, ig_user_id: str, api_version: str = "v23.0",
                 host: str | None = None, dry_run: bool = False, session: requests.Session | None = None,
                 sleep: Callable[[float], None] = time.sleep, log: Callable[[str], None] = print):
        self.token = access_token
        self.user_id = ig_user_id
        self.host = host or host_for_token(access_token)
        self.base = f"{self.host}/{api_version}"
        self.dry_run = dry_run
        self.http = session or requests.Session()
        self.sleep = sleep
        self.log = log
        self._fake_id = 0

    # --- HTTP -----------------------------------------------------------
    def _request(self, method: str, path: str, params: dict | None = None, write: bool = False) -> dict:
        params = dict(params or {})
        if write and self.dry_run:
            self._fake_id += 1
            self.log(f"[dry-run] {method} {path} {params}")
            return {"id": f"dryrun-{self._fake_id}"}
        params["access_token"] = self.token
        url = path if path.startswith("http") else f"{self.base}/{path.lstrip('/')}"
        resp = self.http.request(method, url, params=params, timeout=60)
        try:
            data = resp.json()
        except ValueError:
            raise IGError(f"Risposta non JSON ({resp.status_code}): {resp.text[:200]}")
        if resp.status_code >= 400 or "error" in data:
            err = data.get("error", {})
            raise IGError(f"{err.get('message', resp.text[:200])} "
                          f"(code={err.get('code')}, subcode={err.get('error_subcode')})")
        return data

    # --- Container ------------------------------------------------------
    def create_image(self, image_url: str, caption: str = "", carousel_item: bool = False) -> str:
        p = {"image_url": image_url}
        if carousel_item:
            p["is_carousel_item"] = "true"
        else:
            p["caption"] = caption
        return self._request("POST", f"{self.user_id}/media", p, write=True)["id"]

    def create_video(self, video_url: str, caption: str = "", carousel_item: bool = False,
                     cover_url: str | None = None, share_to_feed: bool = True) -> str:
        if carousel_item:
            p = {"media_type": "VIDEO", "video_url": video_url, "is_carousel_item": "true"}
        else:
            p = {"media_type": "REELS", "video_url": video_url, "caption": caption,
                 "share_to_feed": str(share_to_feed).lower()}
            if cover_url:
                p["cover_url"] = cover_url
        return self._request("POST", f"{self.user_id}/media", p, write=True)["id"]

    def create_carousel(self, children: list[str], caption: str = "") -> str:
        if not 2 <= len(children) <= 10:
            raise IGError("Un carosello richiede da 2 a 10 elementi")
        p = {"media_type": "CAROUSEL", "children": ",".join(children), "caption": caption}
        return self._request("POST", f"{self.user_id}/media", p, write=True)["id"]

    def wait_ready(self, container_id: str, timeout: float = 300, every: float = 5) -> None:
        """Attende status_code=FINISHED (necessario soprattutto per i video)."""
        if self.dry_run:
            return
        waited = 0.0
        while True:
            status = self._request("GET", container_id, {"fields": "status_code,status"})
            code = status.get("status_code")
            if code == "FINISHED":
                return
            if code in ("ERROR", "EXPIRED"):
                raise IGError(f"Container {container_id} in stato {code}: {status.get('status')}")
            if waited >= timeout:
                raise IGError(f"Timeout in attesa del container {container_id} (ultimo stato {code})")
            self.sleep(every)
            waited += every

    def publish(self, container_id: str) -> str:
        return self._request("POST", f"{self.user_id}/media_publish",
                             {"creation_id": container_id}, write=True)["id"]

    # --- Alto livello ---------------------------------------------------
    def post_image(self, url: str, caption: str) -> str:
        cid = self.create_image(url, caption)
        self.wait_ready(cid)
        return self.publish(cid)

    def post_reel(self, url: str, caption: str, cover_url: str | None = None) -> str:
        cid = self.create_video(url, caption, cover_url=cover_url)
        self.wait_ready(cid, timeout=600)
        return self.publish(cid)

    def post_carousel(self, urls: list[str], caption: str) -> str:
        children = []
        for u in urls:
            is_video = u.lower().split("?")[0].endswith((".mp4", ".mov"))
            cid = self.create_video(u, carousel_item=True) if is_video else self.create_image(u, carousel_item=True)
            self.wait_ready(cid, timeout=600 if is_video else 120)
            children.append(cid)
        parent = self.create_carousel(children, caption)
        self.wait_ready(parent)
        return self.publish(parent)

    # --- Utilità --------------------------------------------------------
    def publishing_limit(self) -> dict:
        """Ritorna {'quota_usage': n, 'config': {...}} o {} se non disponibile."""
        data = self._request("GET", f"{self.user_id}/content_publishing_limit",
                             {"fields": "quota_usage,config"})
        items = data.get("data") or [{}]
        return items[0]

    def refresh_token(self) -> dict:
        """Rinnova il token long-lived Instagram Login (60 giorni).
        Per i token Facebook (EAA...) usare auto_ig.token_tool."""
        if self.host != IG_HOST:
            raise IGError("refresh_access_token vale solo per token Instagram Login")
        return self._request("GET", f"{IG_HOST}/refresh_access_token",
                             {"grant_type": "ig_refresh_token"})
