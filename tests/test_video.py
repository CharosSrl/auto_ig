import tempfile
import time
import unittest
from pathlib import Path

from auto_ig import queue, video
from auto_ig.config import Config
from auto_ig.ui import create_app


class TestVideoBasics(unittest.TestCase):
    def test_scenes_present(self):
        self.assertEqual(video.scenes(), ["oggetto", "particelle", "testo"])

    def test_ffmpeg_cmd_reels_specs(self):
        cmd = " ".join(video.ffmpeg_cmd(Path("x.mp4")))
        for part in ("libx264", "yuv420p", "-r 30", "aac", "+faststart"):
            self.assertIn(part, cmd)

    def test_render_validates(self):
        with self.assertRaises(ValueError):
            video.render("inesistente")
        with self.assertRaises(ValueError):
            video.render("testo", seconds=1)


class TestVideoUI(unittest.TestCase):
    def setUp(self):
        d = Path(tempfile.mkdtemp())
        self.qf, self.md = d / "queue.yaml", d / "media"
        self.md.mkdir()

        def fake_render(scene, params, seconds, out_dir, progress=None):
            self.params = params
            (out_dir / f"reel-{scene}-1.mp4").write_bytes(b"mp4")
            (out_dir / f"reel-{scene}-1.jpg").write_bytes(b"jpg")
            progress and progress(1, 1)
            return f"reel-{scene}-1.mp4", f"reel-{scene}-1.jpg"

        app = create_app(self.qf, self.md, Config("", "", "v23.0", "https://cdn/media/"),
                         render_fn=fake_render, sync_fn=lambda: "")
        app.testing = True
        self.c = app.test_client()

    def wait(self):
        for _ in range(50):
            if b"in corso" not in self.c.get("/video").data:
                return
            time.sleep(0.05)

    def test_render_add_and_delete(self):
        self.c.post("/video/render", data={"scena": "testo", "testo": "Ciao", "colore": "#000000",
                                           "accento": "#ffffff", "durata": "5"})
        self.wait()
        self.assertEqual(self.params["testo"], "Ciao")
        page = self.c.get("/video").data
        self.assertIn(b"reel-testo-1.mp4", page)

        self.c.post("/video/aggiungi", data={"video": "reel-testo-1.mp4", "quando": "2026-12-01T18:00", "caption": "R"})
        [p] = queue.load(self.qf)
        self.assertEqual((p.type, p.media, p.extra), ("reel", ["reel-testo-1.mp4"], {"cover": "reel-testo-1.jpg"}))
        self.assertIn("Nessuno.".encode(), self.c.get("/video").data)          # non più tra i "pronti"
        self.assertIn(b"reel-testo-1.jpg", self.c.get("/coda").data)              # copertina in coda

        self.c.post(f"/coda/{p.id}/elimina", data={"confermo": "on"})
        self.assertFalse((self.md / "reel-testo-1.mp4").exists())
        self.assertFalse((self.md / "reel-testo-1.jpg").exists())

    def test_bad_input_and_static_whitelist(self):
        r = self.c.post("/video/render", data={"scena": "testo", "durata": "999"}, follow_redirects=True)
        self.assertIn("non valida".encode(), r.data)
        self.assertEqual(self.c.get("/video/s/scenes/testo.html").status_code, 200)
        self.assertEqual(self.c.get("/video/s/__init__.py").status_code, 404)
        self.assertEqual(self.c.get("/video/s/scenes/../__init__.py").status_code, 404)


if __name__ == "__main__":
    unittest.main()
