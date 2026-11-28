import copy
import json
import tempfile
import unittest
from pathlib import Path

import yaml

from auto_ig import copione, richieste
from auto_ig.config import ROOT

ESEMPIO = json.loads((ROOT / "scrittura" / "esempi" / "curiosita-prada-nonno.json").read_text())


def buono():
    c = copy.deepcopy(ESEMPIO)
    c.pop("_nota", None)
    return c


class CopioneTest(unittest.TestCase):
    """Antonio, 2026-11-21: copione in JSON, regole in scrittura/ controllate a macchina."""

    def test_esempio_prada_passa(self):
        errs, av = copione.controlla(buono())
        self.assertEqual(errs, [])
        self.assertLess(copione.stima_secondi(buono()), 25)

    def errori(self, c):
        return " | ".join(copione.controlla(c)[0])

    def test_struttura(self):
        c = buono()
        c["battute"] = [b for b in c["battute"] if b["ruolo"] != "rehook"]
        self.assertIn("rehook", self.errori(c))
        c = buono()
        c["battute"].append(dict(c["battute"][1]))          # dopo la risposta: la risposta non è ultima
        self.assertIn("risposta", self.errori(c))

    def test_gancio_lingua_cta(self):
        c = buono()
        c["battute"][0]["voce"] = "Oggi parliamo di Prada e del suo fondatore che aveva vietato alle donne di lavorare lì."
        e = self.errori(c)
        self.assertIn("gancio di", e)
        self.assertIn("oggi parliamo", e.lower())
        c = buono()
        c["cta"] = "Salvalo e mandalo subito a tutti quelli che amano Prada"
        self.assertIn("CTA di", self.errori(c))
        c["cta"] = "Mandalo a chi ama Prada!"            # Antonio, 2026-11-22: solo "segui e metti like"
        self.assertIn("Segui la pagina e metti like!", self.errori(c))
        errs, av = copione.controlla(c, cta_fissa=False)  # video già fatto prima della regola: solo avviso
        self.assertFalse(any("Segui la pagina" in e for e in errs))
        self.assertTrue(any("Segui la pagina" in a for a in av))

    def test_attenzione(self):
        """Studio 2026-11-22 (scrittura/regole/09-attenzione.md): niente aperture vaghe, gancio concreto."""
        c = buono()
        c["battute"][0]["voce"] = "Ci hai mai fatto caso a questa punta?"
        self.assertIn("apre con 'ci hai mai fatto caso'", self.errori(c))
        c["battute"][0]["voce"] = "Ladies, guardate la vostra camicia."
        self.assertIn("ladies", self.errori(c))
        c = buono()
        c["battute"][0]["voce"] = "questa storia è davvero strana. Nessuno la conosce, eppure è vera."
        self.assertTrue(any("appiglio concreto" in a for a in copione.controlla(c)[1]))
        self.assertFalse(any("appiglio concreto" in a for a in copione.controlla(buono())[1]))

    def test_fatti_e_ragionamento(self):
        c = buono()
        c["fatti"][0]["fonte"] = ""
        c["battute"][1].pop("fatto")
        c["strutture_valutate"] = c["strutture_valutate"][:2]
        c["autocontrollo"]["letto_ad_alta_voce"] = False
        e = self.errori(c)
        for pezzo in ("manca la fonte", "battuta 2", "strutture_valutate", "autocontrollo"):
            self.assertIn(pezzo, e)

    def test_scalpore_e_linee_rosse(self):
        """Antonio, 2026-11-24: scalpore, slang e parolacce sì; bestemmie e insulti a gruppi mai."""
        c = buono()
        c.pop("scalpore")
        self.assertIn("scalpore", self.errori(c))
        self.assertTrue(any("scalpore" in a for a in copione.controlla(c, cta_fissa=False)[1]))   # video vecchio
        c = buono()
        c["battute"][1]["voce"] = "Bro, il nonno di Miuccia era un genio del cazzo, ma tipo davvero."
        self.assertNotIn("vietato", self.errori(c))
        c["battute"][1]["voce"] = "Porco dio, il nonno vietava le donne."
        self.assertIn("vietato SEMPRE", self.errori(c))
        c = buono()
        c["battute"][0]["voce"] = "Prada aveva un nonno con una regola sulle donne."
        self.assertTrue(any("senza scossa" in a for a in copione.controlla(c)[1]))
        c["battute"][0]["voce"] = "Prada ti frega da cent'anni, e il nonno era peggio."
        self.assertFalse(any("senza scossa" in a for a in copione.controlla(c)[1]))

    def test_facilissimo_niente_date_e_percentuali(self):
        """Antonio, 2026-11-24: 'quando dici le date dici prima, dopo; l'80% è un botto'."""
        for frase in ("Nel 1927 i negozi lo consigliano ai maschi.", "L'80% delle vendite va alle signore.",
                      "Negli anni quaranta cambia tutto, bro.", "Le compra il cinquanta per cento delle signore."):
            c = buono()
            c["battute"][1]["voce"] = frase
            self.assertIn("brainrot", self.errori(c), frase)
        c = buono()
        c["battute"][1]["voce"] = "Prima era dei maschi, poi un botto di negozi lo cambia."
        self.assertNotIn("brainrot", self.errori(c))

    def test_tono_per_battuta(self):
        """Antonio, 2026-11-28: voce gemini-charon, ogni battuta col suo tono."""
        c = buono()
        for b in c["battute"]:
            b["tono"] = "normale"
        c["battute"][0].pop("tono")
        errs, av = copione.controlla(c)
        self.assertTrue(any("battuta 1: manca 'tono'" in x for x in av), av)
        self.assertFalse(any("battuta 2: manca 'tono'" in x for x in av))
        c["battute"][0]["tono"] = "isterica"
        self.assertIn("tono 'isterica' non valido", self.errori(c))

    def test_regia_frase_per_frase_3d(self):
        """Antonio, 2026-11-28: nel 3D ogni frase ha la sua animazione sulle parole."""
        c = buono()
        for b in c["battute"]:
            b["scheda"] = {"scena3d": {"cast": [{"chi": "tu", "azioni": [{"parola": b["voce"].split()[0], "posa": "indica"}]}]}}
        self.assertNotIn("animazione sulle parole", self.errori(c))
        c["battute"][2]["scheda"] = {"scena3d": {"set": "parco"}}
        self.assertIn("battuta 3: nessuna animazione sulle parole", self.errori(c))

    def test_parola_forte_detta_e_scritta(self):
        c = buono()
        c["battute"][0]["schermo"] = "Donne in Prada?"
        self.assertIn("non scritta a schermo", self.errori(c))

    def test_in_richiesta_e_load(self):
        d = copione.in_richiesta(buono(), {"formato": "curiosita", "resa": "2d"})
        self.assertEqual(d["copione"][0]["scheda"]["tipo"], "gancio")
        self.assertEqual(d["copione"][2]["scheda"]["tipo"], "rehook")
        self.assertEqual(d["copione"][0]["scheda"]["titolo"], "Donne in Prada? Vietato")
        self.assertEqual(d["censura"], ["vietato"])
        self.assertEqual(d["voce"]["pronuncia"]["Miuccia"], "Miùccia")
        # load(): il JSON entra nella richiesta, e un copione sbagliato blocca
        cart = Path(tempfile.mkdtemp()) / "2026-11-30-x"
        cart.mkdir()
        (cart / "richiesta.yaml").write_text(yaml.safe_dump({
            "titolo": "x", "formato": "curiosita", "resa": "2d", "scena": "cartoon2d",
            "colori": {"sfondo": "#1d2b24", "accento": "#a8e0b8"}}))
        (cart / "copione.json").write_text(json.dumps(buono(), ensure_ascii=False))
        self.assertEqual(richieste.load(cart)["copione"][4]["testo"], ESEMPIO["battute"][4]["voce"])
        rotto = buono()
        rotto["cta"] = "uno due tre quattro cinque sei sette otto"
        (cart / "copione.json").write_text(json.dumps(rotto, ensure_ascii=False))
        with self.assertRaises(ValueError):
            richieste.load(cart)


if __name__ == "__main__":
    unittest.main()
