"""Chirp 3 HD: copione detto tutto di fila e diviso nelle battute dalle pause vere (nessuna chiamata di rete)."""
import io
import tempfile
import unittest
import wave
from pathlib import Path
from unittest import mock

import numpy as np

from auto_ig import voce

RATE = 24000


def audio(pezzi):
    """pezzi: [(secondi, suono?)] -> pcm int16 (suono = sinusoide, altrimenti silenzio)."""
    parti = []
    for sec, suono in pezzi:
        n = int(sec * RATE)
        parti.append(np.sin(np.arange(n) * 0.2) * 0.4 if suono else np.zeros(n))
    return (np.concatenate(parti) * 32767).astype("<i2").tobytes()


def wav(pcm):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm)
    return buf.getvalue()


class ConfiniTest(unittest.TestCase):
    def test_tre_frasi(self):
        # frase 1 con una pausetta interna corta (0,08 s), poi pause vere tra le battute
        pcm = audio([(0.1, 0), (0.8, 1), (0.08, 0), (0.7, 1), (0.35, 0), (1.0, 1), (0.4, 0), (0.9, 1), (0.1, 0)])
        t = voce.confini(pcm, RATE, [20, 12, 11])
        self.assertEqual(len(t), 3)
        self.assertAlmostEqual(t[0][0], 0.1, delta=0.03)
        self.assertAlmostEqual(t[1][0], 2.01, delta=0.05)
        self.assertAlmostEqual(t[2][0], 3.41, delta=0.05)
        self.assertAlmostEqual(t[2][1], 4.33, delta=0.03)

    def test_pause_che_non_bastano(self):
        pcm = audio([(0.1, 0), (2.0, 1), (0.1, 0)])
        self.assertIsNone(voce.confini(pcm, RATE, [10, 10]))


class SpeakTuttoTest(unittest.TestCase):
    def test_una_chiamata_e_tempi(self):
        pcm = audio([(0.05, 0), (1.0, 1), (0.4, 0), (1.2, 1), (0.05, 0)])
        chiamate = []

        def finto(nome, inp):
            chiamate.append((nome, inp))
            return wav(pcm)

        with tempfile.TemporaryDirectory() as d, mock.patch.object(voce, "_chirp_post", finto):
            frasi, durata = voce.speak(["Cosa succede?", "Nel freezer."], Path(d) / "v.wav", "chirp3-charon", 1.0)
            self.assertEqual(len(chiamate), 1)
            self.assertEqual(chiamate[0][1], {"markup": "Cosa succede? [pause short] Nel freezer."})
            self.assertAlmostEqual(frasi[0].start, voce.LEAD_IN, places=2)
            self.assertAlmostEqual(frasi[1].start - frasi[0].start, 1.38, delta=0.05)
            self.assertAlmostEqual(durata, frasi[1].end + voce.TAIL, places=2)

    def test_velocita_diversa_usa_frase_per_frase(self):
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.object(voce, "_chirp_tutto", side_effect=AssertionError("non deve")), \
                mock.patch.object(voce, "_chirp_synth", lambda n, t, s: (audio([(0.5, 1)]), RATE, 2, 1)):
            frasi, _ = voce.speak(["Uno.", "Due."], Path(d) / "v.wav", "chirp3-charon", 1.1)
            self.assertEqual(len(frasi), 2)


if __name__ == "__main__":
    unittest.main()
