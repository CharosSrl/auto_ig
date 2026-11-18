import tempfile
import unittest
from pathlib import Path

import yaml

from auto_ig import regole


def reel(**kw):
    d = {"richiesta": "creiamo due video curiosità per domani", "formato": "curiosita", "resa": "2d",
         "audio": {"musica": True, "sfx": True}, "voce": {"modello": "chirp3-aoede", "velocita": 1.0},
         "copione": [{"testo": "I tuoi jeans sono andati in guerra.",
                      "scheda": {"tipo": "gancio", "titolo": "Jeans in guerra", "foto": "x.jpg"}}]}
    d.update(kw)
    return d


class RegoleTest(unittest.TestCase):
    def test_reel_in_regola(self):
        self.assertEqual(regole.errori(reel()), [])
        self.assertIn("guerra → g*erra", regole.riepilogo(reel(), 22.0))

    def test_curiosita_chiesta_e_quiz_fatto(self):
        """L'errore del 2026-11-19: Antonio chiede curiosità, arriva un quiz."""
        e = regole.errori(reel(formato="quiz"))
        self.assertTrue(any("ha chiesto 'curiosita'" in x for x in e))
        self.assertEqual(regole.formato_chiesto("Generami due video quiz per domani."), "quiz")
        self.assertIsNone(regole.formato_chiesto("un quiz o una curiosità, scegli tu"))

    def test_parola_forte_obbligatoria_e_scritta(self):
        senza = reel(copione=[{"testo": "Chi era il Chuck delle tue Converse?",
                               "scheda": {"tipo": "gancio", "titolo": "Chi era Chuck?"}}])
        self.assertTrue(any("parola forte" in x for x in regole.errori(senza)))
        solo_voce = reel(copione=[{"testo": "I tuoi jeans sono andati in guerra.",
                                   "scheda": {"tipo": "gancio", "titolo": "I tuoi jeans"}}])
        self.assertTrue(any("non scritta" in x for x in regole.errori(solo_voce)))
        self.assertTrue(any("motivo" in x for x in regole.errori(dict(senza, parola_forte=False))))
        self.assertEqual(regole.errori(dict(senza, parola_forte=False, parola_forte_motivo="Antonio: no")), [])

    def test_suoni_voce_durata(self):
        e = regole.errori(reel(audio={"musica": True, "sfx": False}, voce={"modello": "qwen3-vivian", "velocita": 1.2}))
        self.assertEqual(len(e), 3)
        self.assertIsNotNone(regole.errore_durata(reel(), 26.9))
        self.assertIsNone(regole.errore_durata(reel(), 24.2))

    def test_non_si_applica_fuori_dai_reel_2d(self):
        self.assertEqual(regole.errori({"formato": "storia", "resa": "3d"}), [])
        self.assertEqual(regole.errori({"titolo": "x"}), [])

    def test_avviso_varieta(self):
        base = Path(tempfile.mkdtemp())
        for i in range(1, 5):
            (base / f"2026-11-1{i}-x").mkdir()
            (base / f"2026-11-1{i}-x" / "richiesta.yaml").write_text(yaml.safe_dump(reel(formato="quiz")))
        self.assertTrue(regole.avvisi(reel(formato="quiz"), base / "2026-11-14-x"))
        self.assertFalse(regole.avvisi(reel(), base / "2026-11-14-x"))


if __name__ == "__main__":
    unittest.main()
