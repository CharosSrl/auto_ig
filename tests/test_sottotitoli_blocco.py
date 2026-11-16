"""Sottotitoli a blocco (default dei reel): 2 righe ferme, parole evidenziate man mano; voce con pausa."""
import tempfile
import unittest
from pathlib import Path

from auto_ig import censura, voce

FRASE = "I tuoi Ray-Ban sono andati in guerra. Ma da dove viene il nome del marchio che porti?"


def _frase(t=FRASE):
    return voce.Sentence(t, 0.0, 4.0, voce.word_timings(t, 0.0, 4.0))


class BloccoTest(unittest.TestCase):
    def test_pagine_max_due_righe(self):
        s = _frase()
        pag = voce.pagine(s.words)
        self.assertEqual(sorted(j for ix, _ in pag for j in ix), list(range(len(s.words))))   # ogni parola una volta
        for ix, k in pag:
            righe = [ix[:k], ix[k:]]
            self.assertLessEqual(len([r for r in righe if r]), 2)
            self.assertLessEqual(len(" ".join(s.words[j].text for j in ix)), 38)
        self.assertTrue(s.words[pag[0][0][-1]].text.endswith("."))      # si va a capo dopo il punto

    def test_parola_corrente_e_future_attenuate(self):
        ass = voce.build_ass([_frase()], highlight="#FFD166", blocco=True)
        righe = [l for l in ass.splitlines() if l.startswith("Dialogue")]
        self.assertEqual(len(righe), len(FRASE.split()))                # un evento per parola
        primo = righe[0]
        self.assertIn(r"{\c&H0066D1FF", primo)                          # parola detta ora: accento
        self.assertIn(r"\1a&H8C&", primo)                               # quelle da dire: attenuate
        self.assertIn(r"\N", primo)                                     # due righe esplicite
        self.assertNotIn(r"\1a&H8C&", righe[6].split(r"\N")[0])         # fine pagina: già dette piene
        self.assertIn(",76,", ass)                                      # carattere grande del blocco

    def test_censura_nel_blocco(self):
        ass = voce.build_ass([_frase()], blocco=True, censura=censura.censura)
        self.assertIn("g*erra", ass)
        self.assertNotIn("guerra", ass)

    def test_pausa_tra_frasi(self):
        synth = lambda text, tone: (b"\x00\x00" * 22050, 22050, 2, 1)   # noqa: E731  (1 s per frase)
        with tempfile.TemporaryDirectory() as d:
            a, _ = voce.speak(["uno", "due"], Path(d) / "a.wav", synth=synth)
            b, _ = voce.speak(["uno", "due"], Path(d) / "b.wav", synth=synth, pausa=0.6)
        self.assertAlmostEqual(b[1].start - a[1].start, 0.6 - voce.PAUSE, places=2)


if __name__ == "__main__":
    unittest.main()
