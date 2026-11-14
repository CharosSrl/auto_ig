import tempfile
import unittest
import wave
from pathlib import Path

import numpy as np

from auto_ig import audio, formati, voce


class BattuteTest(unittest.TestCase):
    def test_ritmo(self):
        frasi = [(0.6, 4.2), (4.5, 5.5), (5.9, 10.3), (10.6, 12.0)]
        schede = [{"tipo": "gancio"}, {"tipo": "fatto"}, {"tipo": "dettaglio"}, {"tipo": "cta"}]
        bt = audio.battute(frasi, schede)
        self.assertEqual(bt[0], (0.0, "boom"))                       # gancio dal fotogramma 0
        self.assertIn((5.9, "rivela"), bt)
        tempi = [t for t, _ in bt]
        self.assertEqual(tempi, sorted(tempi))
        gap = np.diff(tempi)
        self.assertLessEqual(gap.max(), 3.0)                         # un cambio almeno ogni 3 s
        self.assertGreater(len(set(np.round(gap, 2))), 2)            # irregolare, niente metronomo
        self.assertEqual(audio.battute_param([(0, "boom"), (1.5, "punch")]), "0.00:boom,1.50:punch")


class MixTest(unittest.TestCase):
    def test_mix(self):
        with tempfile.TemporaryDirectory() as d:
            v = Path(d) / "voce.wav"
            with wave.open(str(v), "wb") as w:                      # 2 s di "voce" a 22050 Hz mono
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
                t = np.arange(44100) / 22050
                w.writeframes((np.sin(2 * np.pi * 220 * t) * 20000).astype(np.int16).tobytes())
            out = audio.mix(v, [(0.0, "boom"), (1.0, "punch"), (2.0, "rivela"), (3.0, "stacco")], 4.0, Path(d) / "mix.wav")
            with wave.open(str(out)) as w:
                self.assertEqual((w.getframerate(), w.getnchannels()), (48000, 2))
                self.assertAlmostEqual(w.getnframes() / 48000, 4.0, places=2)
            x = audio.leggi_wav(out)
            self.assertLessEqual(np.abs(x).max(), 0.98)               # niente clipping
            self.assertGreater(np.abs(x[int(3.05 * 48000):int(3.3 * 48000)]).max(), 0.01)   # whoosh dopo la voce


class SottotitoliCortiTest(unittest.TestCase):
    def test_pezzi_corti(self):
        w = voce.word_timings("Nel tuo armadio ci sono tre capi nati in guerra. L'ultimo è esplosivo!", 0, 4)
        g = voce.gruppi(w)
        self.assertTrue(all(len(x) <= 3 for x in g))
        self.assertEqual(sorted(j for x in g for j in x), list(range(len(w))))
        ass = voce.build_ass([voce.Sentence("Uno due tre quattro cinque", 0, 2, voce.word_timings("Uno due tre quattro cinque", 0, 2))], corti=True)
        self.assertNotIn("Uno due tre quattro", ass)


class FormatiCartoonTest(unittest.TestCase):
    def test_rehook_e_scena(self):
        data = {"formato": "curiosita", "resa": "2d", "copione": [
            {"testo": "a", "scheda": {"tipo": "gancio", "titolo": "x"}},
            {"testo": "b", "scheda": {"tipo": "rehook", "titolo": "Aspetta"}},
            {"testo": "c", "scheda": {"tipo": "fatto", "icona": "trench"}}]}
        self.assertEqual(formati.valida(data), [])
        self.assertEqual(formati.scena(data), "cartoon2d")


if __name__ == "__main__":
    unittest.main()
