"""Regia frase per frase (Antonio, 2026-11-28): ogni animazione parte sulla parola vera detta dalla voce."""
import unittest

from auto_ig import audio, regia3d, voce


def frase(testo, a, b):
    return voce.Sentence(testo, a, b, voce.word_timings(testo, a, b))


class RegiaTest(unittest.TestCase):
    def setUp(self):
        self.frasi = [frase("Il velcro delle tue scarpe.", 0.05, 2.0), frase("Pieni di palline spinose, pure il cane!", 2.3, 5.0)]

    def righe(self):
        return [
            {"testo": "x", "scheda": {"scena3d": {"oggetti": [{"tipo": "scarpaVelcro", "azioni": [
                {"parola": "velcro", "fai": "apri", "suono": "strappo"}]}]}}},
            {"testo": "y", "scheda": {"scena3d": {
                "cast": [{"chi": "inventore", "azioni": [{"parola": "Spinose,", "posa": "strappa"}, {"parola": "gatto"}]}],
                "oggetti": [{"tipo": "palline", "parola": "palline", "n": 5, "suono": "pop"}],
                "camere": [{"tipo": "figura"}, {"parola": "cane", "dopo": -0.1, "tipo": "dettaglio", "suono": "swish"}]}}},
        ]

    def test_al_dai_tempi_veri_delle_parole(self):
        r = self.righe()
        avvisi = regia3d.risolvi(r, self.frasi)
        w = {x.text.strip(".,!").lower(): x.start for x in self.frasi[0].words + self.frasi[1].words}
        apri = r[0]["scheda"]["scena3d"]["oggetti"][0]["azioni"][0]
        self.assertAlmostEqual(apri["al"], w["velcro"] - 0.0, places=2)          # la frase 0 parte da 0
        sc = r[1]["scheda"]["scena3d"]
        self.assertAlmostEqual(sc["cast"][0]["azioni"][0]["al"], w["spinose"] - 2.3, places=2)
        self.assertAlmostEqual(sc["camere"][1]["al"], w["cane"] - 2.3 - 0.1, places=2)
        self.assertTrue(any("gatto" in a for a in avvisi))                      # parola che la voce non dice

    def test_suoni_sugli_stessi_istanti(self):
        r = self.righe()
        regia3d.risolvi(r, self.frasi)
        ev = regia3d.suoni(r, self.frasi)
        nomi = [n for _, n, _ in ev]
        self.assertEqual(nomi.count("pop"), 5)                                    # un pop per ogni pallina
        self.assertIn("strappo", nomi)
        t_swish = next(t for t, n, _ in ev if n == "swish")
        self.assertAlmostEqual(t_swish, 2.3 + r[1]["scheda"]["scena3d"]["camere"][1]["al"], places=3)

    def test_suoni_nuovi_sintetici(self):
        for nome in ("strappo", "bau"):
            x = audio.campione(nome)
            self.assertGreater(len(x), 1000)
            self.assertGreater(abs(x).max(), 0.1)


if __name__ == "__main__":
    unittest.main()
