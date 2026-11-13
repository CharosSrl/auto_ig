import tempfile
import time
import unittest
from pathlib import Path

from auto_ig import queue, video
from auto_ig.config import Config
from auto_ig.ui import create_app


class TestVideoBasics(unittest.TestCase):
    def test_scenes_present(self):
        self.assertEqual(video.scenes(), ["armadio_infinito", "cintre_storia", "foglio_modella", "guardaroba", "oggetto", "particelle", "testo"])

    def test_ffmpeg_cmd_reels_specs(self):
        cmd = " ".join(video.ffmpeg_cmd(Path("x.mp4")))
        for part in ("libx264", "yuv420p", "-r 30", "aac", "+faststart"):
            self.assertIn(part, cmd)

    def test_ffmpeg_cmd_voice_has_exact_duration(self):
        cmd = video.ffmpeg_cmd(Path("x.mp4"), audio=Path("v.wav"), ass=Path("sottotitoli.ass"), seconds=6.5)
        self.assertIn("-t", cmd)
        self.assertEqual(cmd[cmd.index("-t") + 1], "6.500")
        self.assertIn("ass=sottotitoli.ass", " ".join(cmd))
        with self.assertRaises(ValueError):
            video.ffmpeg_cmd(Path("x.mp4"), ass=Path("nome con spazi.ass"))

    def test_quality_scaling_and_backends(self):
        alta = " ".join(video.ffmpeg_cmd(Path("x.mp4"), quality="alta"))
        bozza = " ".join(video.ffmpeg_cmd(Path("x.mp4"), quality="bozza"))
        self.assertIn("scale=1080:1920:flags=lanczos", alta)
        self.assertIn("-crf 18", alta)
        self.assertIn("-crf 21", bozza)
        self.assertEqual(list(video.BACKENDS)[-1], "cpu")             # SwiftShader sempre come ultima scelta

    def test_launch_falls_back_to_cpu(self):
        class Page:
            def __init__(self, gpu): self.gpu = gpu
            def evaluate(self, js): return self.gpu
            def close(self): pass
        class Browser:
            def __init__(self, gpu): self.gpu, self.closed = gpu, False
            def new_page(self): return Page(self.gpu)
            def close(self): self.closed = True
        class Chromium:
            def launch(self, channel, headless, args):
                if "--use-angle=vulkan" in args: raise RuntimeError("niente vulkan")
                return Browser("ANGLE (Google, SwiftShader)" if "--use-angle=gl" in args else "SwiftShader CPU")
        pw = type("PW", (), {"chromium": Chromium()})()
        log = []
        browser, name = video.launch_browser(pw, log.append)
        self.assertEqual(name, "cpu")
        self.assertTrue(any("gpu-vulkan" in m for m in log) and any("gpu-gl" in m for m in log))

    def test_render_validates(self):
        with self.assertRaises(ValueError):
            video.render("inesistente")
        with self.assertRaises(ValueError):
            video.render("testo", seconds=1)
        with self.assertRaises(ValueError):
            video.render("testo", seconds=5, quality="ultra")


class TestVideoUI(unittest.TestCase):
    def setUp(self):
        d = Path(tempfile.mkdtemp())
        self.qf, self.md = d / "queue.yaml", d / "media"
        self.md.mkdir()

        def fake_render(scene, params, seconds, out_dir, progress=None, **kw):
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


class TestGuardaroba(unittest.TestCase):
    """Coerenza del catalogo capi (preset/guardaroba.js) con costruttori e outfit del brand."""

    def setUp(self):
        import re
        self.re = re
        preset = Path(video.__file__).parent / "preset"
        self.capi_js = (preset / "guardaroba.js").read_text()
        self.brand_js = (preset / "brand.js").read_text()
        blocco = self.capi_js.split("export const CAPI = {", 1)[1].split("};", 1)[0]
        self.capi = dict(re.findall(r"^\s+(\w+):\s+\{[^}]*categoria: '(\w+)'", blocco, re.M))

    def test_ogni_capo_ha_un_costruttore(self):
        self.assertGreaterEqual(len(self.capi), 17)
        self.assertEqual(set(self.capi.values()), {"sopra", "sotto", "scarpe"})
        for capo in self.capi:
            self.assertRegex(self.capi_js, rf"\n\s+{capo}\(\) \{{", capo)

    def test_outfit_usano_capi_esistenti(self):
        for slot, capo in self.re.findall(r"(sopra|sotto|scarpe): '(\w+)'", self.brand_js):
            self.assertIn(capo, self.capi)
            self.assertEqual(self.capi[capo], slot)
