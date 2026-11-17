import tempfile
import unittest
from datetime import date
from pathlib import Path

from auto_ig import queue, richieste, voce
from auto_ig.config import Config
from auto_ig.ui import create_app


def fake_speak(lines, out_wav, model, speed, pronuncia=None, pausa=voce.PAUSE):
    out_wav.write_bytes(b"RIFF")
    t, sents = 0.6, []
    for l, tone in voce.normalize_lines(lines):
        sents.append(voce.Sentence(l, t, t + 1.5, voce.word_timings(l, t, t + 1.5), tone))
        t += 1.85
    return sents, t + 1


class Base(unittest.TestCase):
    def setUp(self):
        d = Path(tempfile.mkdtemp())
        self.base, self.md, self.qf = d / "richieste", d / "media", d / "q.yaml"
        self.md.mkdir()
        self.calls = []

    def render(self, scene, params, seconds, out_dir, progress=None, audio=None, ass=None, name=None, **kw):
        self.calls.append(dict(scene=scene, params=params, seconds=seconds, audio=audio, ass=ass, name=name, **kw))
        (out_dir / f"{name}.mp4").write_bytes(b"mp4")
        (out_dir / f"{name}.jpg").write_bytes(b"jpg")
        return f"{name}.mp4", f"{name}.jpg"

    def make(self, **kw):
        return richieste.new("Nuova collezione!", ["Il tuo armadio parla di te.", "Questo è Cintre."],
                             base=self.base, day=date(2026, 11, 20), request="reel oro su nero", **kw)


class TestVoce(unittest.TestCase):
    def test_word_timings_cover_sentence(self):
        ws = voce.word_timings("Scegli pochi capi, ma bene.", 1.0, 3.0)
        self.assertEqual([w.text for w in ws], ["Scegli", "pochi", "capi,", "ma", "bene."])
        self.assertEqual(ws[0].start, 1.0)
        self.assertAlmostEqual(ws[-1].end, 3.0, places=2)
        self.assertTrue(all(a.end <= b.start + 1e-6 for a, b in zip(ws, ws[1:])))

    def test_ass_highlights_one_word_per_event(self):
        s = [voce.Sentence("Ciao a tutti", 0.5, 2.0, voce.word_timings("Ciao a tutti", 0.5, 2.0))]
        ass = voce.build_ass(s, "#D4AF37")
        events = [l for l in ass.splitlines() if l.startswith("Dialogue:")]
        self.assertEqual(len(events), 3)
        self.assertIn(r"{\c&H0037AFD4", events[1].split("a", 1)[0] + events[1])    # BGR di #D4AF37
        self.assertIn("0:00:00.50", events[0])
        self.assertEqual(voce.ass_color("#112233"), "&H00332211")
        with self.assertRaises(ValueError):
            voce.ass_color("rosso")

    def test_speak_concatenates_with_timings(self):
        rate = 22050
        synth = lambda text, tone: (b"\x01\x00" * int(rate * 0.1 * len(text.split())), rate, 2, 1)
        out = Path(tempfile.mkdtemp()) / "v.wav"
        sents, total = voce.speak(["uno due", "tre"], out, synth=synth)
        self.assertEqual(sents[0].start, voce.LEAD_IN)
        self.assertAlmostEqual(sents[0].end - sents[0].start, 0.2, places=2)
        self.assertAlmostEqual(sents[1].start, sents[0].end + voce.PAUSE, places=2)
        self.assertAlmostEqual(total, sents[1].end + voce.TAIL, places=2)
        self.assertTrue(out.exists())


class TestToni(unittest.TestCase):
    def test_normalize_and_angry_style(self):
        lines = voce.normalize_lines(["Ciao.", {"testo": "Basta!", "tono": "Arrabbiata"}, {"testo": " "}])
        self.assertEqual(lines, [("Ciao.", ""), ("Basta!", "arrabbiata")])
        with self.assertRaises(ValueError):
            voce.normalize_lines([{"testo": "x", "tono": "triste"}])
        s = [voce.Sentence("Basta adesso!", 0.5, 2.0, voce.word_timings("Basta adesso!", 0.5, 2.0), "arrabbiata"),
             voce.Sentence("Che bello.", 2.5, 3.5, voce.word_timings("Che bello.", 2.5, 3.5), "")]
        ev = [l for l in voce.build_ass(s, "#E8C4C0").splitlines() if l.startswith("Dialogue:")]
        self.assertIn(r"{\frz-3}", ev[0])
        self.assertIn(r"{\frz3}", ev[1])
        self.assertIn("&H00303BFF", ev[0])          # rosso #FF3B30 in BGR
        self.assertIn("&H00C0C4E8", ev[2])          # accento normale
        self.assertNotIn("frz", ev[2])


class TestPronuncia(unittest.TestCase):
    def test_tts_text(self):
        self.assertEqual(voce.tts_text("Non sapevo MAI cosa mettermi!"), "Non sapevo mai cosa mettermi!")
        self.assertEqual(voce.tts_text("Cintre. Ciao Cintrella", {"Cintre": "Sèntr"}), "Sèntr. Ciao Cintrella")
        heard = []
        voce.speak(["Basta COSÌ"], Path(tempfile.mkdtemp()) / "v.wav",
                   synth=lambda text, tone: (heard.append(text) or (b"\x00\x00" * 2205, 22050, 2, 1)))
        self.assertEqual(heard, ["Basta così"])


class TestRichieste(Base):
    def test_new_build_enqueue(self):
        f = self.make()
        self.assertEqual(f.name, "2026-11-20-nuova-collezione")
        d = richieste.load(f)
        self.assertEqual((d["stato"], d["scena"], d["richiesta"]), ("da_fare", "particelle", "reel oro su nero"))
        self.assertIn("# Richiesta di contenuto", (f / "richiesta.yaml").read_text())

        richieste.build(f, render_fn=self.render, speak_fn=fake_speak)
        c = self.calls[0]
        self.assertEqual((c["scene"], c["name"]), ("particelle", "video"))
        self.assertEqual(c["params"]["atti"], "0.60,2.45")
        self.assertEqual(c["quality"], "alta")
        self.assertAlmostEqual(c["seconds"], 0.6 + 1.85 * 2 + 1)
        self.assertTrue(c["ass"].read_text().count("Dialogue:") >= 8)
        self.assertEqual(richieste.load(f)["stato"], "generato")
        self.assertIn("# Richiesta di contenuto", (f / "richiesta.yaml").read_text())   # commenti conservati

        with self.assertRaises(ValueError):                    # manca la data
            richieste.enqueue(f, media_dir=self.md, queue_path=self.qf)
        post = richieste.enqueue(f, "2026-11-21T18:00+01:00", "Cap", media_dir=self.md, queue_path=self.qf)
        self.assertEqual((post.status, post.type, post.media), ("draft", "reel", ["reel-2026-11-20-nuova-collezione.mp4"]))
        self.assertTrue((self.md / "reel-2026-11-20-nuova-collezione.jpg").exists())
        self.assertEqual(richieste.load(f)["stato"], "in_coda")

    def test_invalid_request(self):
        f = self.make()
        (f / "richiesta.yaml").write_text("titolo: x\ncopione: []\ncolori: {sfondo: nero, accento: '#fff000'}\n")
        with self.assertRaises(ValueError):
            richieste.load(f)

    def test_ui_lists_and_enqueues(self):
        f = self.make()
        richieste.build(f, render_fn=self.render, speak_fn=fake_speak)
        app = create_app(self.qf, self.md, Config("", "", "v23.0", "https://cdn/media/"), github_fn=lambda: {}, sync_fn=lambda: "",
                         req_dir=self.base)
        app.testing = True
        c = app.test_client()
        page = c.get("/video").data.decode()
        self.assertIn("Nuova collezione!", page)
        self.assertEqual(c.get(f"/richieste/{f.name}/video.mp4").status_code, 200)
        self.assertEqual(c.get(f"/richieste/{f.name}/richiesta.yaml").status_code, 404)
        self.assertEqual(c.get("/richieste/..%2F..%2Fetc/video.mp4").status_code, 404)
        c.post(f"/richieste/{f.name}/coda", data={"quando": "2026-11-22T18:00", "caption": "Ciao"})
        [p] = queue.load(self.qf)
        self.assertEqual((p.status, p.caption), ("pending", "Ciao"))
        c.post(f"/richieste/{f.name}/scarta", data={})
        self.assertEqual(richieste.load(f)["stato"], "in_coda")


if __name__ == "__main__":
    unittest.main()


class TestFoto(Base):
    YAML = ("titolo: x\nstato: da_fare\nscena: cartoon2d\ncolori: {sfondo: '#6d1a36', accento: '#e8c4c0'}\n"
            "copione:\n  - testo: Eccola, del 1916.\n    scheda: {tipo: foto, titolo: Keds, foto: keds.jpg}\n")

    def test_foto_mancante_poi_copiata_per_il_render(self):
        from auto_ig.video import VIDEO_DIR
        f = self.make()
        (f / "richiesta.yaml").write_text(self.YAML)
        with self.assertRaisesRegex(ValueError, "keds.jpg"):
            richieste.load(f)
        (f / "foto").mkdir()
        (f / "foto" / "keds.jpg").write_bytes(b"jpg")
        visto = []
        def render(*a, **kw):
            visto.append((VIDEO_DIR / "_foto" / "keds.jpg").read_bytes())
            return self.render(*a, **kw)
        richieste.build(f, render_fn=render, speak_fn=fake_speak)
        self.assertEqual(visto, [b"jpg"])                     # durante il render la foto è servita
        self.assertFalse((VIDEO_DIR / "_foto").exists())      # dopo, tolta
        self.assertIn('"foto":"keds.jpg"', self.calls[0]["params"]["schede"])

    def test_cerca_e_scarica(self):
        from auto_ig.sources import ImageResult
        f = self.make()
        res = ImageResult("wikimedia", "1", "u", "t", "p", "Daderot", "CC0", "", 3000, 2000, "Keds 1916")
        self.assertEqual(richieste.foto(f, "keds", search_fn=lambda q: [res]), [res])
        out = richieste.foto(f, "keds", 1, "Keds 1916!", search_fn=lambda q: [res], download_fn=lambda r, d: d)
        self.assertEqual(out, f / "foto" / "keds-1916.jpg")
        with self.assertRaises(ValueError):
            richieste.foto(f, "keds", 2, search_fn=lambda q: [res])


class TestRimettiInCoda(Base):
    def test_post_eliminato_si_rimette_in_coda(self):
        f = self.make()
        richieste.build(f, render_fn=self.render, speak_fn=fake_speak)
        richieste.enqueue(f, "2026-11-21T18:00+01:00", "Cap", media_dir=self.md, queue_path=self.qf)
        app = create_app(self.qf, self.md, Config("", "", "v23.0", "https://cdn/media/"), github_fn=lambda: {},
                         sync_fn=lambda: "", req_dir=self.base)
        app.testing = True
        c = app.test_client()
        self.assertNotIn("Metti in coda</button>", c.get("/video").data.decode())   # è in coda
        self.qf.write_text("[]\n")                                                  # post eliminato
        self.assertIn("Metti in coda</button>", c.get("/video").data.decode())


class TestChirp(unittest.TestCase):
    def test_chirp_chiave_in_header_e_cache(self):
        import base64, io, os, wave
        from unittest import mock
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000)
            w.writeframes((b"\x00\x40" * 2400) + (b"\x00\x00" * 240))
        chiamate = []

        def post(url, headers=None, json=None, timeout=None):
            chiamate.append((url, headers, json))
            return mock.Mock(status_code=200, json=lambda: {"audioContent": base64.b64encode(buf.getvalue()).decode()})

        d = Path(tempfile.mkdtemp())
        with mock.patch.object(voce, "CACHE_DIR", d), mock.patch.dict(os.environ, {"GOOGLE_TTS_API_KEY": "k"}), \
                mock.patch("requests.post", post):
            sents, _ = voce.speak(["Ciao a tutti.", "Ciao a tutti."], d / "v.wav", voice_name="chirp3-aoede")
        self.assertEqual(len(chiamate), 1)                                   # seconda frase uguale: dalla cache
        url, headers, body = chiamate[0]
        self.assertNotIn("k", url.split("?")[-1] if "?" in url else "")      # la chiave non va nell'URL
        self.assertEqual(headers["X-Goog-Api-Key"], "k")
        self.assertEqual(body["voice"]["name"], "it-IT-Chirp3-HD-Aoede")
        self.assertEqual(len(sents), 2)
