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

        with tempfile.TemporaryDirectory() as d, mock.patch.object(voce, "_chirp_post", finto), \
                mock.patch.object(voce, "allinea_whisper", lambda wav, frasi: frasi):
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


class ParoleSullAudioTest(unittest.TestCase):
    def test_pause_vere_e_consonanti(self):
        # "La mattina dopo?" 0,9 s con una chiusura da consonante (0,1 s) | pausa 0,3 | "Le rimetti." 0,6 | pausa 0,3 | "Ancora umide." 0,7
        pcm = audio([(0.5, 1), (0.1, 0), (0.3, 1), (0.3, 0), (0.6, 1), (0.3, 0), (0.7, 1)])
        w = voce.parole_sull_audio("La mattina dopo? Le rimetti. Ancora umide.", 0.0, 2.8, pcm, RATE)
        inizio = {x.text: x.start for x in w}
        self.assertAlmostEqual(inizio["Le"], 1.18, delta=0.05)
        self.assertAlmostEqual(inizio["Ancora"], 2.08, delta=0.05)

    def test_confine_senza_pausa_si_salta(self):
        # tre pezzi ma una sola pausa vera: si aggancia il confine atteso più vicino (dopo "cinque:")
        pcm = audio([(1.0, 1), (0.4, 0), (1.0, 1)])
        w = voce.parole_sull_audio("Uno due tre. Quattro cinque: sei sette otto.", 0.0, 2.4, pcm, RATE)
        inizio = {x.text: x.start for x in w}
        self.assertAlmostEqual(inizio["sei"], 1.38, delta=0.05)
        self.assertEqual(len(w), 8)


class WhisperTest(unittest.TestCase):
    def test_tempi_veri_e_interpolazione(self):
        W = lambda w, a, b: mock.Mock(word=" " + w, start=a, end=b)   # noqa: E731
        seg = mock.Mock(words=[W("Sudi", 3.66, 4.0), W("e", 4.76, 4.9), W("la", 5.06, 5.2), W("sera", 5.22, 5.4),
                               W("mollili.", 5.6, 6.0), W("La", 6.34, 6.5), W("mattina", 6.58, 6.9), W("dopo?", 6.94, 7.3)])
        finto = mock.Mock(transcribe=lambda *a, **k: ([seg], None))
        frasi = [voce.Sentence(t, 0, 1, voce.word_timings(t, 0, 1)) for t in ["Sudi… e la sera le molli lì.", "La mattina dopo?"]]
        with mock.patch.object(voce, "_whisper", lambda: finto):
            out = voce.allinea_whisper(Path("x.wav"), frasi)
        self.assertAlmostEqual(out[0].start, 3.66)
        self.assertAlmostEqual(out[1].start, 6.34)                  # la frase parte dove la voce la dice davvero
        le, molli, li = out[0].words[4:]
        self.assertTrue(5.4 <= le.start < molli.start < li.start < 6.34)   # non riconosciute: interpolate
        self.assertAlmostEqual(out[1].end, 7.3)

    def test_pochi_riconoscimenti_tiene_la_stima(self):
        seg = mock.Mock(words=[mock.Mock(word=" boh", start=0.1, end=0.2)])
        finto = mock.Mock(transcribe=lambda *a, **k: ([seg], None))
        frasi = [voce.Sentence("Uno due tre.", 0, 1, voce.word_timings("Uno due tre.", 0, 1))]
        with mock.patch.object(voce, "_whisper", lambda: finto):
            self.assertIs(voce.allinea_whisper(Path("x.wav"), frasi), frasi)


if __name__ == "__main__":
    unittest.main()
