import json
import struct
import tempfile
import unittest
import wave
from pathlib import Path
from types import SimpleNamespace as N

from auto_ig import formati, labiale


def wav_con_pausa(path: Path, rate=24000):
    """1 s di voce (sinusoide), 0,5 s di silenzio, 1 s di voce."""
    import math
    camp = [int(9000 * math.sin(2 * math.pi * 220 * i / rate)) for i in range(rate)]
    dati = camp + [0] * (rate // 2) + camp
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(struct.pack(f"<{len(dati)}h", *dati))


class FonemiTest(unittest.TestCase):
    def test_regole_italiane(self):
        f = lambda w: [x for x, _ in labiale.fonemi(w)]   # noqa: E731
        self.assertEqual(f("chiesa"), ["k", "i", "e", "s", "a"])
        self.assertEqual(f("gnomo"), ["J", "o", "m", "o"])
        self.assertEqual(f("figlio"), ["f", "i", "L", "o"])
        self.assertEqual(f("scena"), ["S", "e", "n", "a"])
        self.assertEqual(f("cielo")[0], "tS")
        self.assertEqual(f("Lìvai"), ["l", "i", "v", "a", "i"])
        self.assertEqual(f("tacchi"), ["t", "a", "k", "i"])          # doppia = un fonema più lungo, h muta

    def test_accento_e_numeri(self):
        self.assertGreater(labiale.fonemi("così")[-1][1], labiale.fonemi("cosi")[-1][1])
        self.assertEqual(labiale.numero(76000), "settantaseimila")
        self.assertEqual(labiale.numero(3781), "tremilasettecentottantuno")
        self.assertEqual(labiale.numero(1873), "milleottocentosettantatre")

    def test_bocche(self):
        v = [b for b, _ in labiale.bocche("Mamma, fuori!")]
        self.assertEqual(v[:4], ["M", "A", "M", "A"])
        self.assertIn("X", v)                        # la virgola chiude la bocca
        self.assertEqual(v[-5:], ["F", "U", "O", "L", "E"])


class TracciaTest(unittest.TestCase):
    def test_pausa_vera_chiude_la_bocca(self):
        d = Path(tempfile.mkdtemp())
        wav_con_pausa(d / "v.wav")
        frasi = [N(text="Mamma mia che bella sera, davvero bella", start=0.0, end=2.5)]
        tr = labiale.traccia(d / "v.wav", frasi, [{"testo": "x", "scheda": {"tipo": "gancio"}}], [(0.0, "boom")])
        b = tr["b"]
        in_pausa = lambda t: max((c for c in b if c[0] <= t), key=lambda c: c[0])[1]   # noqa: E731
        self.assertEqual(in_pausa(1.25), "X")
        self.assertNotEqual(in_pausa(0.5), "X")
        self.assertNotEqual(in_pausa(2.0), "X")
        self.assertEqual(len(tr["e"]), 75)                      # 2,5 s a 30 fps, un carattere per fotogramma
        self.assertEqual(tr["e"][38], "0")                      # silenzio = energia zero
        self.assertEqual(tr["x"][0], [0.0, "sorpresa"])         # gancio
        self.assertEqual(tr["c"], [[0.0, "boom"]])
        json.loads(labiale.param(tr))

    def test_wav_finto_non_rompe(self):
        d = Path(tempfile.mkdtemp())
        (d / "v.wav").write_bytes(b"RIFF")
        tr = labiale.traccia(d / "v.wav", [N(text="Ciao a tutti?", start=0.6, end=1.6)], ["Ciao a tutti?"])
        self.assertEqual(tr["x"][0][1], "curiosa")
        self.assertTrue(len(tr["b"]) > 2)


class CampoNarratoreTest(unittest.TestCase):
    def test_di_default_nei_reel_2d(self):
        base = {"formato": "curiosita", "resa": "2d", "copione": []}
        self.assertTrue(formati.narratore(base))
        self.assertFalse(formati.narratore({**base, "narratore": False}))
        self.assertFalse(formati.narratore({**base, "resa": "3d"}))
        self.assertTrue(formati.narratore({**base, "narratore": {"lato": "sinistra"}}))

    def test_validazione(self):
        base = {"formato": "curiosita", "resa": "2d",
                "copione": [{"testo": "Ciao.", "scheda": {"tipo": "gancio", "titolo": "Ciao"}}]}
        msg = lambda d: [e for e in formati.valida(d) if "narratore" in e]   # noqa: E731
        self.assertFalse(msg({**base, "narratore": {"lato": "sinistra", "s": 0.9}}))
        self.assertTrue(msg({**base, "narratore": "forse"}))
        self.assertTrue(msg({**base, "narratore": {"lato": "sopra"}}))


if __name__ == "__main__":
    unittest.main()
