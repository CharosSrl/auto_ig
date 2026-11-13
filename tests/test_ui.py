import io
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from auto_ig import queue
from auto_ig.config import Config
from auto_ig.sources import ImageResult
from auto_ig.ui import create_app, to_input, to_iso

RES = ImageResult("wikimedia", "42", "https://x/full.jpg", "https://x/t.jpg", "https://page", "Gorgo",
                  "Public domain", "", 3000, 2000, "Lago")


def fake_jpeg(*a, **k):
    buf = io.BytesIO()
    Image.new("RGB", (2000, 2000), (0, 80, 160)).save(buf, "JPEG")
    return buf.getvalue()


class FakeClient:
    def __init__(self):
        self.posted = []

    def post_image(self, url, caption):
        self.posted.append(url)
        return "IG123"

    def publishing_limit(self):
        return {"quota_usage": 3}


class TestUI(unittest.TestCase):
    def setUp(self):
        d = Path(tempfile.mkdtemp())
        self.qf, self.md = d / "queue.yaml", d / "media"
        self.md.mkdir()
        self.client = FakeClient()
        self.problemi, self.sincronizzati, self.github = [], [], {}
        self.cfg = Config("EAAtok", "123", "v23.0", "https://cdn.example/media/")
        app = create_app(self.qf, self.md, self.cfg, search_fn=lambda q, n, f: [RES],
                         client_factory=lambda cfg, dry_run=False: self.client, check_url=lambda u: True,
                         sync_fn=self.fake_sync, align_fn=lambda pid: list(self.problemi),
                         github_fn=lambda: dict(self.github))
        app.testing = True
        self.c = app.test_client()

    def fake_sync(self):
        self.sincronizzati.append(1)
        return "Sincronizzato: finto"

    def add(self):
        self.c.get("/cerca?q=lago")
        with mock.patch("auto_ig.images.download_bytes", fake_jpeg):
            return self.c.post("/aggiungi", data={"chiave": "wikimedia:42", "quando": "2026-12-01T18:00",
                                                  "caption": "Ciao", "crediti": "on"}, follow_redirects=True)

    def test_pages_render(self):
        for path in ("/cerca", "/coda", "/video", "/coda?quota=1"):
            self.assertEqual(self.c.get(path).status_code, 200, path)
        self.assertIn(b"Quota usata", self.c.get("/coda?quota=1").data)

    def test_search_add_publish_delete(self):
        r = self.add()
        self.assertIn("Aggiunto alla coda".encode(), r.data)
        [post] = queue.load(self.qf)
        self.assertEqual(post.caption, "Ciao\n\n📷 Gorgo via Wikimedia (Pubblico dominio)")
        self.assertTrue((self.md / post.media[0]).exists())

        # senza conferma non pubblica
        self.c.post(f"/coda/{post.id}/pubblica", data={})
        self.assertEqual(self.client.posted, [])
        self.c.post(f"/coda/{post.id}/pubblica", data={"confermo": "on"})
        self.assertEqual(self.client.posted, ["https://cdn.example/media/" + post.media[0]])
        self.assertEqual(queue.load(self.qf)[0].status, "published")
        self.assertEqual(self.sincronizzati, [1])          # dopo la pubblicazione va subito su GitHub

        self.c.post(f"/coda/{post.id}/elimina", data={"confermo": "on"})
        self.assertEqual(queue.load(self.qf), [])
        self.assertFalse((self.md / post.media[0]).exists())

    def test_edit_and_placeholder_base_url_blocks_publish(self):
        self.add()
        self.c.post("/coda/1/modifica", data={"quando": "2026-12-02T09:30", "caption": "Nuova"})
        p = queue.load(self.qf)[0]
        self.assertEqual((p.caption, to_input(p.when)), ("Nuova", "2026-12-02T09:30"))
        self.cfg.media_base_url = "https://raw.githubusercontent.com/UTENTE/REPO/main/media/"
        r = self.c.post("/coda/1/pubblica", data={"confermo": "on"}, follow_redirects=True)
        self.assertIn(b"MEDIA_BASE_URL", r.data)
        self.assertEqual(self.client.posted, [])

    def test_not_aligned_blocks_publish(self):
        self.add()
        self.problemi = ["su GitHub il post 1 risulta già pubblicato"]
        r = self.c.post("/coda/1/pubblica", data={"confermo": "on"}, follow_redirects=True)
        self.assertIn("non sono allineati".encode(), r.data)
        self.assertIn("già pubblicato".encode(), r.data)
        self.assertEqual(self.client.posted, [])
        self.assertEqual(queue.load(self.qf)[0].status, "pending")

    def test_orario_su_github(self):
        self.add()                                       # post 1, sul PC: 2026-12-01 18:00
        page = self.c.get("/coda?aggiorna=1").data.decode()
        self.assertIn("non ancora su GitHub", page)
        self.github = {"1": {"id": "1", "when": "2026-12-01T18:00+01:00", "status": "pending", "media": ["x.jpg"]}}
        page = self.c.get("/coda?aggiorna=1").data.decode()
        self.assertIn("01/12 alle 18:00", page)
        self.assertNotIn("diverso dal PC", page)
        self.github["1"]["when"] = "2026-12-02T09:00+01:00"   # orario cambiato su GitHub
        self.assertIn("diverso dal PC", self.c.get("/coda?aggiorna=1").data.decode())
        self.github["1"].update(status="published", published_at="2026-12-01T17:31:00+00:00")
        self.assertIn("✓ pubblicato", self.c.get("/coda?aggiorna=1").data.decode())

    def test_github_non_leggibile(self):
        def rotto():
            raise RuntimeError("rete assente")
        app = create_app(self.qf, self.md, self.cfg, github_fn=rotto)
        app.testing = True
        page = app.test_client().get("/coda").data.decode()
        self.assertIn("rete assente", page)

    def test_sync_button(self):
        r = self.c.post("/sincronizza", follow_redirects=True)
        self.assertIn("Sincronizzato: finto".encode(), r.data)

    def test_to_iso_roundtrip(self):
        self.assertEqual(to_input(to_iso("2026-07-01T18:00")), "2026-07-01T18:00")


if __name__ == "__main__":
    unittest.main()
