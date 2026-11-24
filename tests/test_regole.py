import tempfile
import unittest
from pathlib import Path

import yaml

from auto_ig import regole


def reel(**kw):
    d = {"richiesta": "creiamo due video curiosità per domani", "formato": "curiosita", "resa": "2d",
         "audio": {"musica": True, "sfx": True}, "voce": {"modello": "chirp3-aoede", "velocita": 1.2},
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

    def test_parola_forte_facoltativa_ma_se_ce_va_scritta(self):
        """Antonio, 2026-11-19: obbligatoria produceva ganci forzati. Ora: solo se vera, e allora anche a schermo."""
        senza = reel(copione=[{"testo": "Chi era il Chuck delle tue Converse?",
                               "scheda": {"tipo": "gancio", "titolo": "Chi era Chuck?"}}])
        self.assertEqual(regole.errori(senza), [])
        self.assertTrue(any("senza parola forte" in x for x in regole.avvisi(senza, Path(tempfile.mkdtemp()) / "x")))
        self.assertIn("NO", regole.riepilogo(senza, 20.0))
        solo_voce = reel(copione=[{"testo": "I tuoi jeans sono andati in guerra.",
                                   "scheda": {"tipo": "gancio", "titolo": "I tuoi jeans"}}])
        self.assertTrue(any("non scritta" in x for x in regole.errori(solo_voce)))

    def test_suoni_voce_durata(self):
        e = regole.errori(reel(audio={"musica": True, "sfx": False}, voce={"modello": "qwen3-vivian", "velocita": 1.0}))
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
        self.assertTrue(any("formato diverso" in x for x in regole.avvisi(reel(formato="quiz"), base / "2026-11-14-x")))
        self.assertFalse(regole.avvisi(reel(), base / "2026-11-14-x"))

    def test_avviso_stesso_gancio_e_argomento(self):
        """Antonio, 2026-11-20: liquidi 'scontati', variare il più possibile: stesso gancio o tema = avviso."""
        base = Path(tempfile.mkdtemp())
        vecchio = reel(titolo="Curiosità: quanta acqua si beve un paio di jeans")
        vecchio["copione"][0]["scheda"]["grafica"] = {"tipo": "contatore"}
        (base / "2026-11-20-a").mkdir()
        (base / "2026-11-20-a" / "richiesta.yaml").write_text(yaml.safe_dump(vecchio, allow_unicode=True))
        nuovo = reel(titolo="Curiosità: jeans trovati in miniera")
        nuovo["copione"][0]["scheda"]["grafica"] = {"tipo": "contatore"}
        av = regole.avvisi(nuovo, base / "2026-11-21-b")
        self.assertTrue(any("gancio 'contatore'" in x for x in av))
        self.assertTrue(any("jeans" in x and "argomento" in x for x in av))
        diverso = reel(titolo="Curiosità: i tacchi erano da uomini")
        diverso["copione"][0]["scheda"]["grafica"] = {"tipo": "chat"}
        self.assertFalse([x for x in regole.avvisi(diverso, base / "2026-11-21-b") if "gancio" in x or "argomento" in x])

    def test_avviso_struttura_rehook_e_cta(self):
        """Studio del 2026-11-21 (@viewcci): gancio → attesa → rehook → attesa → risposta per ultima, CTA breve."""
        riga = lambda tipo: {"testo": "x", "scheda": {"tipo": tipo, "titolo": "x"}}
        senza = reel(copione=[riga("gancio"), riga("scena2d"), riga("scena2d"), riga("confronto")])
        self.assertTrue(any("manca il rehook" in x for x in regole.avvisi_struttura(senza)))
        in_coda = reel(copione=[riga("gancio"), riga("scena2d"), riga("scena2d"), riga("rehook")])
        self.assertTrue(any("a metà video" in x for x in regole.avvisi_struttura(in_coda)))
        giusta = reel(copione=[riga("gancio"), riga("scena2d"), riga("rehook"), riga("scena2d"), riga("confronto")],
                      cta="Mandalo a chi si veste di viola!")
        self.assertEqual(regole.avvisi_struttura(giusta), [])
        lunga = reel(cta="Salvalo e mandalo subito a tutti quelli che amano la moda!")
        self.assertTrue(any("CTA di" in x for x in regole.avvisi_struttura(lunga)))


if __name__ == "__main__":
    unittest.main()
