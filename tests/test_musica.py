import unittest

from auto_ig import audio


class MusicaTest(unittest.TestCase):
    """Antonio, 2026-11-21: le canzoni di sottofondo vanno ricordate nel codice (catalogo da @viewcci)."""

    def test_quiz_usa_vivaldi_libero(self):
        f, tendenza = audio.scegli_brano({"formato": "quiz", "audio": {"musica": True}})
        self.assertEqual(f.name, "vivaldi_estate_presto.ogg")
        self.assertTrue(any(x["autore"] == "Antonio Vivaldi" for x in tendenza))
        x = audio.brano(f, 2.0)
        self.assertEqual(len(x), 2 * audio.SR)
        self.assertGreater(abs(x).max(), 0.01)

    def test_mai_file_protetti(self):
        cat = audio.catalogo()
        for tipo, info in cat["tipi"].items():
            for c in info["tendenza"]:
                if c["licenza"] == "protetta":
                    self.assertNotIn("file", c, f"{tipo}: {c['titolo']} è protetta, niente file")
            if info.get("file"):
                self.assertTrue((audio.MUSICA / info["file"]).exists())

    def test_curiosita_senza_file_libero_usa_la_base(self):
        f, tendenza = audio.scegli_brano({"formato": "curiosita", "audio": {"musica": True}})
        self.assertIsNone(f)
        self.assertEqual(len(tendenza), 3)


if __name__ == "__main__":
    unittest.main()
