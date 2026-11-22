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
