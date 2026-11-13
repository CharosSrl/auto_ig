import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

import yaml

from auto_ig import formati, richieste
from auto_ig.video import SCENES_DIR

GRAFICA = SCENES_DIR.parent / "preset" / "grafica2d.js"


def curiosita(**kw):
    d = {"formato": "curiosita", "resa": "2d", "copione": [
        {"testo": "Tre curiosità.", "scheda": {"tipo": "gancio", "titolo": "3 curiosità", "icona": "lampadina"}},
        {"testo": "Uno: il tacco.", "scheda": {"tipo": "fatto", "numero": 1, "titolo": "Il tacco", "icona": "tacco"}},
    ]}
    d.update(kw)
    return d


class TestCatalogo(unittest.TestCase):
    def test_ogni_formato_ha_scaletta_cta_e_due_rese(self):
        for nome, f in formati.catalogo()["formati"].items():
            self.assertTrue(f["cta"] and f["struttura"] and f["hashtag"], nome)
            self.assertEqual(set(f["rese"]), set(formati.RESE), nome)
            for resa, r in f["rese"].items():
                self.assertTrue(r["ricetta"], f"{nome} {resa}")
                for s in r["scene"]:
                    self.assertTrue((SCENES_DIR / f"{s}.html").exists(), s)

    def test_icone_del_catalogo_esistono_nel_preset(self):
        js = GRAFICA.read_text()
        corpo = js[js.index("export const ICONE"):]
        for nome in formati.catalogo()["icone_2d"]:
            self.assertRegex(corpo, rf"\n  {nome}\(ctx", nome)

    def test_tipi_di_scheda_gestiti_dalla_scena(self):
        html = (SCENES_DIR / "schede2d.html").read_text()
        for tipo in formati.catalogo()["schede_2d"]:
            self.assertRegex(html, rf"\n    {tipo}\(s, u", tipo)

    def test_descrivi(self):
        self.assertIn("Resa 2d", formati.descrivi("quiz", "2d"))


class TestRegole(unittest.TestCase):
    def test_cta_aggiunta_sempre_una_volta(self):
        righe = formati.copione(curiosita())
        self.assertEqual(len(righe), 3)
        self.assertEqual(righe[-1]["scheda"]["tipo"], "cta")
        self.assertEqual(righe[-1]["testo"], formati.formato("curiosita")["cta"])
        self.assertEqual(len(formati.copione({**curiosita(), "copione": righe})), 3)   # già presente: non raddoppia
        self.assertEqual(formati.copione(curiosita(cta="Scarica Cintre!"))[-1]["testo"], "Scarica Cintre!")

    def test_senza_formato_nulla_cambia(self):
        d = {"copione": ["a", "b"], "scena": "testo"}
        self.assertEqual(formati.copione(d), ["a", "b"])
        self.assertEqual(formati.valida(d), [])
        self.assertEqual(formati.schede(["a"]), "")

    def test_validazione(self):
        self.assertEqual(formati.valida(curiosita()), [])
        self.assertIn("inesistente", " ".join(formati.valida(curiosita(formato="ricetta"))))
        self.assertIn("resa", " ".join(formati.valida(curiosita(resa="4d"))))
        d = curiosita(); d["copione"].append("senza scheda")
        self.assertIn("serve 'scheda'", " ".join(formati.valida(d)))
        d = curiosita(); d["copione"][1]["scheda"]["icona"] = "drago"
        self.assertIn("icona 'drago'", " ".join(formati.valida(d)))
        d = curiosita(); d["copione"].reverse()
        self.assertIn("gancio", " ".join(formati.valida(d)))
        self.assertIn("va creata", " ".join(formati.valida(curiosita(resa="3d", copione=["x"]))))
        self.assertEqual(formati.valida(curiosita(resa="3d", copione=["x"], scena="armadio_infinito")), [])

    def test_schede_e_scena(self):
        s = json.loads(formati.schede(formati.copione(curiosita())))
        self.assertEqual([x["tipo"] for x in s], ["gancio", "fatto", "cta"])
        self.assertEqual(formati.scena(curiosita()), "schede2d")


class TestRichiesta(unittest.TestCase):
    def test_nuova_con_formato_e_build(self):
        base = Path(tempfile.mkdtemp())
        f = richieste.new("Quiz moda", base=base, day=date(2026, 11, 20), formato="quiz", resa="2d")
        data = yaml.safe_load((f / "richiesta.yaml").read_text())
        self.assertEqual((data["formato"], data["resa"], data["scena"]), ("quiz", "2d", "schede2d"))
        self.assertEqual([r["scheda"]["tipo"] for r in data["copione"]], ["gancio", "domanda", "domanda", "risposta", "commenta"])
        self.assertIn("#cintre", data["pubblicazione"]["caption"])
        richieste.load(f)                                     # lo scheletro è già valido

        calls = []
        def render(scene, params, seconds, out_dir, name=None, **kw):
            calls.append((scene, params, seconds)); (out_dir / f"{name}.mp4").write_bytes(b"x")
        def speak(lines, wav, *a, **kw):
            from auto_ig import voce
            wav.write_bytes(b"RIFF")
            return [voce.Sentence(t, i, i + 0.5, voce.word_timings(t, i, i + 0.5), tone)
                    for i, (t, tone) in enumerate(voce.normalize_lines(lines))], 7.0
        richieste.build(f, render_fn=render, speak_fn=speak)
        scene, params, seconds = calls[0]
        self.assertEqual(scene, "schede2d")
        self.assertEqual(len(params["atti"].split(",")), 6)   # 5 frasi + CTA
        self.assertEqual(json.loads(params["schede"])[-1]["tipo"], "cta")
        self.assertEqual(seconds, 8.0)                        # la CTA resta a schermo un secondo in più


if __name__ == "__main__":
    unittest.main()
