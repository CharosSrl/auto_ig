"""Fonti di immagini con licenza libera. Ogni fonte espone search(query, n) -> list[ImageResult]."""
from __future__ import annotations

import os
from dataclasses import asdict, dataclass

USER_AGENT = "auto_ig/0.1 (personal Instagram scheduler)"


@dataclass
class ImageResult:
    source: str          # wikimedia | openverse | pixabay
    id: str
    url: str             # file a piena risoluzione
    thumbnail: str
    page_url: str        # pagina originale (per i crediti)
    creator: str
    license: str         # es. "cc0 1.0", "pdm 1.0", "pixabay"
    license_url: str
    width: int
    height: int
    title: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def search(query: str, n: int = 20, source: str = "auto") -> list[ImageResult]:
    """source: wikimedia | openverse | pixabay | auto.
    auto = Wikimedia (affidabile) + Openverse (se risponde) + Pixabay (se c'è la chiave)."""
    from . import openverse, pixabay, wikimedia
    single = {"wikimedia": wikimedia.search, "openverse": openverse.search, "pixabay": pixabay.search}
    if source in single:
        return single[source](query, n)
    results = wikimedia.search(query, n)
    try:
        results += openverse.search(query, n)
    except Exception as e:  # Openverse a volte va in timeout: non blocca la ricerca
        print(f"(Openverse non disponibile: {e.__class__.__name__}, continuo senza)")
    if os.environ.get("PIXABAY_API_KEY"):
        results += pixabay.search(query, n)
    return results
