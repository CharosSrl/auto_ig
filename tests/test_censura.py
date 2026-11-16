import json
import unittest

from auto_ig import censura, formati, voce


class CensuraTest(unittest.TestCase):
    def test_parola_forte(self):
        self.assertEqual(censura.censura("La morte del corsetto."), "La m*rte del corsetto.")
        self.assertEqual(censura.censura("Nati per la GUERRA!"), "Nati per la G*ERRA!")
        self.assertEqual(censura.censura("Morte, sesso e bombe"), "M*rte, s*sso e b*mbe")

    def test_parole_innocue_restano(self):
        for t in ("mortadella", "Sessione", "bombetta", "morbido", "Guerrini"):
            self.assertEqual(censura.censura(t), t)

    def test_gia_censurata_non_cambia(self):
        self.assertEqual(censura.censura("m*rte"), "m*rte")

    def test_extra_e_disattivata(self):
        cz = censura.da_richiesta({"censura": ["scandalo"]})
        self.assertEqual(cz("Uno scandalo e una morte"), "Uno sc*ndalo e una m*rte")
        self.assertIsNone(censura.da_richiesta({"censura": False}))
        self.assertEqual(censura.da_richiesta({})("morto"), "m*rto")

    def test_schede_censurate_foto_no(self):
        righe = [{"testo": "Nati per la guerra.", "scheda": {"tipo": "gancio", "titolo": "Nati per la guerra",
                                                         "evidenzia": "guerra", "opzioni": ["Morte", "Sole"],
                                                         "foto": "guerra.jpg"}}]
        sk = json.loads(formati.schede(righe, censura.censura))[0]
        self.assertEqual((sk["titolo"], sk["evidenzia"], sk["opzioni"]), ("Nati per la g*erra", "g*erra", ["M*rte", "Sole"]))
        self.assertEqual(sk["foto"], "guerra.jpg")
        self.assertEqual(righe[0]["scheda"]["titolo"], "Nati per la guerra")   # la richiesta non cambia

    def test_sottotitoli_censurati_voce_intera(self):
        words = [voce.Word("La", 0, .2), voce.Word("morte", .2, .6)]
        s = voce.Sentence("La morte", 0, .6, words, "")
        self.assertIn("m*rte", voce.build_ass([s], censura=censura.censura))
        self.assertNotIn("morte", voce.build_ass([s], censura=censura.censura))
        self.assertEqual(voce.tts_text("La morte"), "La morte")


if __name__ == "__main__":
    unittest.main()
