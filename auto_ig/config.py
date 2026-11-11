"""Configurazione: legge .env (se presente) e variabili d'ambiente."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEDIA_DIR = ROOT / "media"
QUEUE_FILE = ROOT / "schedule" / "queue.yaml"


def load_dotenv(path: Path = ROOT / ".env") -> None:
    """Parser minimale di .env: KEY=VALUE, ignora commenti. Non sovrascrive l'ambiente."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass
class Config:
    access_token: str
    ig_user_id: str
    api_version: str
    media_base_url: str
    api_host: str = ""   # vuoto = dedotto dal token (EAA -> facebook, IG -> instagram)

    @classmethod
    def from_env(cls) -> "Config":
        load_dotenv()
        return cls(
            access_token=os.environ.get("IG_ACCESS_TOKEN", ""),
            ig_user_id=os.environ.get("IG_USER_ID", ""),
            api_version=os.environ.get("IG_API_VERSION", "v23.0"),
            media_base_url=os.environ.get("MEDIA_BASE_URL", ""),
            api_host=os.environ.get("IG_API_HOST", ""),
        )

    def media_url(self, name: str) -> str:
        """Converte un nome file in media/ nell'URL pubblico; gli URL restano invariati."""
        if name.startswith(("http://", "https://")):
            return name
        if not self.media_base_url:
            raise ValueError("MEDIA_BASE_URL non impostato: serve un URL pubblico per i media")
        return self.media_base_url.rstrip("/") + "/" + name.lstrip("/")
