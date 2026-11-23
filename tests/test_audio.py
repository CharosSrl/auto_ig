import tempfile
import unittest
from unittest import mock
import wave
from pathlib import Path

import numpy as np

from auto_ig import audio, formati, voce


class BattuteTest(unittest.TestCase):
    def test_ritmo(self):
        frasi = [(0.6, 4.2), (4.5, 5.5), (5.9, 10.3), (10.6, 12.0)]
        schede = [{"tipo": "gancio"}, {"tipo": "fatto"}, {"tipo": "dettaglio"}, {"tipo": "cta"}]
        bt = audio.battute(frasi, schede)
        self.assertEqual(bt[0], (0.0, "via"))                        # gancio dal fotogramma 0, senza boom (2026-11-23)
        self.assertIn((5.9, "rivela"), bt)
        tempi = [t for t, _ in bt]
        self.assertEqual(tempi, sorted(tempi))
        gap = np.diff(tempi)
        self.assertLessEqual(gap.max(), 3.0)                         # un cambio almeno ogni 3 s
        self.assertGreater(len(set(np.round(gap, 2))), 2)            # irregolare, niente metronomo
        self.assertEqual(audio.battute_param([(0, "boom"), (1.5, "punch")]), "0.00:boom,1.50:punch")


class MixTest(unittest.TestCase):
    def test_mix(self):
        with tempfile.TemporaryDirectory() as d:
            v = Path(d) / "voce.wav"
            with wave.open(str(v), "wb") as w:                      # 2 s di "voce" a 22050 Hz mono
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
                t = np.arange(44100) / 22050
                w.writeframes((np.sin(2 * np.pi * 220 * t) * 20000).astype(np.int16).tobytes())
            out = audio.mix(v, [(0.0, "boom"), (1.0, "punch"), (2.0, "rivela"), (3.0, "stacco")], 4.0, Path(d) / "mix.wav")
            with wave.open(str(out)) as w:
                self.assertEqual((w.getframerate(), w.getnchannels()), (48000, 2))
                self.assertAlmostEqual(w.getnframes() / 48000, 4.0, places=2)
            x = audio.leggi_wav(out)
            self.assertLessEqual(np.abs(x).max(), 0.98)               # niente clipping
            self.assertGreater(np.abs(x[int(3.05 * 48000):int(3.3 * 48000)]).max(), 0.01)   # whoosh dopo la voce


class SottotitoliCortiTest(unittest.TestCase):
    def test_pezzi_corti(self):
        w = voce.word_timings("Nel tuo armadio ci sono tre capi nati in guerra. L'ultimo è esplosivo!", 0, 4)
        g = voce.gruppi(w)
        self.assertTrue(all(len(x) <= 3 for x in g))
        self.assertEqual(sorted(j for x in g for j in x), list(range(len(w))))
        ass = voce.build_ass([voce.Sentence("Uno due tre quattro cinque", 0, 2, voce.word_timings("Uno due tre quattro cinque", 0, 2))], corti=True)
        self.assertNotIn("Uno due tre quattro", ass)


class FormatiCartoonTest(unittest.TestCase):
    def test_rehook_e_scena(self):
        data = {"formato": "curiosita", "resa": "2d", "copione": [
            {"testo": "a", "scheda": {"tipo": "gancio", "titolo": "x"}},
            {"testo": "b", "scheda": {"tipo": "rehook", "titolo": "Aspetta"}},
            {"testo": "c", "scheda": {"tipo": "fatto", "icona": "trench"}}]}
        self.assertEqual(formati.valida(data), [])
        self.assertEqual(formati.scena(data), "cartoon2d")



class RegoleAntonioTest(unittest.TestCase):
    """Mascotte solo su richiesta; hook corto; CTA unica con azione del formato."""
    def base(self, **kw):
        d = {"formato": "curiosita", "resa": "2d", "copione": [{"testo": "Il tuo trench è nato in trincea.",
             "scheda": {"tipo": "gancio", "titolo": "x"}}]}
        d.update(kw)
        return d

    def test_cta_segui_like(self):
        """Antonio, 2026-11-22: in tutti i video la CTA è "segui la pagina e metti like"."""
        for f in ("curiosita", "quiz", "storia"):
            riga = formati.copione(self.base(formato=f))[-1]
            self.assertEqual((riga["scheda"]["azione"], riga["testo"]), ("segui_like", "Segui la pagina e metti like!"))
        self.assertEqual(formati.copione(self.base(cta_azione="segui"))[-1]["scheda"]["bottone"], "Segui @cintre_official")
        self.assertTrue(formati.valida(self.base(cta_azione="boh")))

    def test_hook_troppo_lungo(self):
        lungo = self.base(copione=[{"testo": " ".join(["parola"] * 15), "scheda": {"tipo": "gancio"}}])
        self.assertTrue(any("hook troppo lungo" in e for e in formati.valida(lungo)))
        self.assertEqual(formati.valida(self.base()), [])

    def test_mascotte(self):
        self.assertTrue(formati.valida(self.base(mascotte="si")))
        self.assertEqual(formati.valida(self.base(mascotte=True)), [])

    @mock.patch("auto_ig.regole.errori", return_value=[])   # qui si prova altro, non le regole di Antonio
    def test_mascotte_spenta_di_default_nel_build(self, _r):
        from auto_ig import richieste
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "r"; f.mkdir()
            dati = self.base(titolo="t", scena="cartoon2d", colori={"sfondo": "#000000", "accento": "#ffffff"})
            dati["copione"][0]["scheda"]["foto"] = "x.jpg"           # curiosità 2D: foto dal fotogramma 0
            (f / "foto").mkdir(); (f / "foto" / "x.jpg").write_bytes(b"jpg")
            (f / "richiesta.yaml").write_text(yaml_dump(dati))
            calls = []
            def render(scene, params, seconds, out_dir, **kw):
                calls.append(params); (out_dir / "video.mp4").write_bytes(b"x")
            def speak(lines, wav, *a, **kw):
                wav.write_bytes(b"RIFF")
                return [voce.Sentence(t, i, i + 0.5, voce.word_timings(t, i, i + 0.5), tone)
                        for i, (t, tone) in enumerate(voce.normalize_lines(lines))], 3.0
            richieste.build(f, render_fn=render, speak_fn=speak)
            self.assertEqual(calls[0]["mascotte"], "0")


class QuizTest(unittest.TestCase):
    """Quiz ad alto ritmo: conto alla rovescia con tic, risposta che 'rivela', CTA commenta."""
    def test_battute_quiz(self):
        attesa = voce.Sentence("Tre. Due. Uno.", 6.0, 8.4, voce.word_timings("Tre. Due. Uno.", 6.0, 8.4))
        frasi = [(0.6, 3.0), (3.4, 5.6), attesa, (8.8, 11.0)]
        schede = [{"tipo": "gancio"}, {"tipo": "domanda"}, {"tipo": "domanda", "conto": 3}, {"tipo": "risposta", "giusta": 1}]
        bt = audio.battute(frasi, schede)
        tic = [t for t, k in bt if k == "tic"]
        self.assertEqual(tic, [round(w.start, 2) for w in attesa.words])       # un tic per numero detto
        self.assertFalse([t for t, k in bt if 6.0 <= t < 8.8 and k != "tic"])  # niente punch nel conto
        self.assertIn((8.8, "rivela"), bt)
        self.assertGreater(np.abs(audio.tic()).max(), 0)

    def test_voce_a_ritmo(self):
        """ritmo: 1.0 → una parola al secondo esatta (il conto alla rovescia), le altre righe come prima."""
        synth = lambda text, tone: (b"\0\0" * int(22050 * 0.3 * len(text.split())), 22050, 2, 1)
        with tempfile.TemporaryDirectory() as d:
            frasi, _ = voce.speak(["Quale città?", {"testo": "Tre. Due. Uno.", "ritmo": 1.0}], Path(d) / "v.wav", synth=synth)
        w = frasi[1].words
        self.assertEqual([x.text for x in w], ["Tre.", "Due.", "Uno."])
        self.assertAlmostEqual(w[1].start - w[0].start, 1.0, places=2)
        self.assertAlmostEqual(w[2].start - w[1].start, 1.0, places=2)
        self.assertAlmostEqual(frasi[1].end - frasi[1].start, 2.3, places=2)
        self.assertEqual(voce.ritmi(["a", {"testo": ""}, {"testo": "b", "ritmo": 1}]), [0.0, 1.0])

    def test_valida_quiz_e_cta(self):
        d = {"formato": "quiz", "resa": "2d", "copione": [
            {"testo": "I tuoi jeans portano il nome di una città.", "scheda": {"tipo": "gancio", "icona": "jeans"}},
            {"testo": "Quale?", "scheda": {"tipo": "domanda", "titolo": "?", "opzioni": ["Nîmes", "Genova", "Londra"]}},
            {"testo": "È Genova!", "scheda": {"tipo": "risposta", "titolo": "?", "opzioni": ["Nîmes", "Genova", "Londra"], "giusta": 1}}]}
        self.assertEqual(formati.valida(d), [])
        self.assertEqual(formati.scena(d), "cartoon2d")
        self.assertEqual(formati.copione(d)[-1]["scheda"]["azione"], "segui_like")   # Antonio, 2026-11-22: CTA fissa anche nei quiz
        d["copione"][2]["scheda"]["giusta"] = 3
        d["copione"][1]["scheda"]["opzioni"] = ["Nîmes", "Genova"]
        errs = formati.valida(d)
        self.assertTrue(any("3 opzioni" in e for e in errs) and any("giusta" in e for e in errs))


def yaml_dump(d):
    import yaml
    return yaml.safe_dump(d, allow_unicode=True)


if __name__ == "__main__":
    unittest.main()


class SuoniEventiTest(unittest.TestCase):
    """Un suono per ogni evento a schermo (skill regia-reel)."""

    def frasi(self):
        testi = [("Quanto è costato il logo?", 0.6, 3.0), ("A, B, o C?", 3.4, 4.6), ("Tre. Due. Uno.", 5.0, 7.5),
                 ("È la A: solo 35 dollari.", 7.9, 10.5), ("E la statua?", 10.9, 12.5)]
        return [voce.Sentence(x, a, b, voce.word_timings(x, a, b)) for x, a, b in testi]

    def schede(self):
        opz = ["35 dollari", "35 mila", "Un milione"]
        return [{"tipo": "gancio", "foto": "a.jpg", "opzioni": opz}, {"tipo": "domanda", "opzioni": opz},
                {"tipo": "domanda", "opzioni": opz, "conto": 3},
                {"tipo": "risposta", "opzioni": opz, "giusta": 0, "testo": "Solo 35 dollari!", "foto_risposta": "b.jpg"},
                {"tipo": "foto", "foto": "c.jpg"}]

    def test_eventi(self):
        fr, sk = self.frasi(), self.schede()
        ev = audio.suoni(fr, sk, audio.battute(fr, sk))
        nomi = lambda n: [e for e in ev if e[1] == n]                       # noqa: E731
        self.assertIn((0.0, "scatto", {}), ev)                              # la foto entra con lo scatto
        pops = nomi("pop")
        lettere = [w.start for w in fr[1].words if w.text.strip(",?") in ("A", "B", "C")]
        self.assertEqual([round(p[0], 2) for p in pops], [round(x, 2) for x in lettere])
        self.assertEqual([p[2]["opz"] for p in pops], [0, 1, 2])
        self.assertEqual([p[2]["semitoni"] for p in pops], [0, 2, 4])       # intonazione che sale A→B→C
        [r] = nomi("riser")
        self.assertAlmostEqual(r[0] + r[2]["durata"], fr[3].start, places=2)   # il riser esplode sulla risposta
        self.assertEqual(len(nomi("tic")), 3)
        self.assertTrue(any(abs(t - (fr[3].start + 0.5)) < 1e-6 for t, _, _ in nomi("tastiera")))
        scatti = [t for t, _, _ in nomi("scatto")]
        self.assertTrue(any(abs(t - (fr[3].start + 0.05)) < 1e-6 for t in scatti))   # foto_risposta
        self.assertTrue(any(abs(t - (fr[4].start + 0.05)) < 1e-6 for t in scatti))   # scheda foto
        self.assertEqual(audio.pop_param(ev).count(":"), 3)

    def test_campioni_e_ripiego(self):
        self.assertGreater(len(audio.campione("scatto")), 1000)            # campione CC0 nel repo
        with tempfile.TemporaryDirectory() as d:                            # cartella vuota: suono sintetico
            for n in audio.RIPIEGO:
                self.assertGreater(np.abs(audio.campione(n, Path(d))).max(), 0)

    def test_mix_con_eventi_voce_davanti(self):
        fr, sk = self.frasi(), self.schede()
        ev = audio.suoni(fr, sk, audio.battute(fr, sk))
        with tempfile.TemporaryDirectory() as d:
            v = Path(d) / "voce.wav"
            with wave.open(str(v), "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
                t = np.arange(int(13 * 22050)) / 22050
                w.writeframes((np.sin(2 * np.pi * 220 * t) * 20000).astype(np.int16).tobytes())
            x = audio.leggi_wav(audio.mix(v, [], 13.0, Path(d) / "mix.wav", musica=True, eventi=ev))
            self.assertLessEqual(np.abs(x).max(), 0.98)
            senza = audio.leggi_wav(audio.mix(v, [], 13.0, Path(d) / "m2.wav", musica=True, sfx=False))
            fx = x - senza
            self.assertLess(np.sqrt((fx ** 2).mean()), np.sqrt((senza ** 2).mean()))   # la voce resta davanti


class SuoniInfograficheTest(unittest.TestCase):
    def test_pop_su_nodo_timeline_e_puntini_mappa(self):
        from auto_ig import audio
        frasi = [(0.6, 3.0), (3.4, 6.0), (6.4, 10.0)]
        sk = [{"tipo": "gancio"}, {"tipo": "timeline", "attiva": 1}, {"tipo": "mappa"}]
        ev = audio.suoni(frasi, sk, [(0.0, "boom"), (3.4, "stacco"), (6.4, "stacco")])
        pop = [t for t, n, _ in ev if n == "pop"]
        self.assertIn(3.7, [round(t, 2) for t in pop])                    # nodo: 0,3 s dopo l'inizio della frase
        mappa = [t for t in pop if t >= 6.4]
        self.assertEqual(len(mappa), audio.MAPPA_PUNTI)                    # un pop per puntino, come la scena
        self.assertAlmostEqual(mappa[0], 6.7, places=2)
        self.assertAlmostEqual(mappa[-1], 6.4 + 0.3 + (3.6 - 0.6), places=2)

    def test_grafiche_vive_suonano_dal_fotogramma_0(self):
        """Gancio vivo (Antonio, 2026-11-19): la grafica si muove al fotogramma 0 e i suoni seguono lo stesso orologio."""
        from auto_ig import audio
        frasi = [(0.0, 3.0), (3.4, 7.0), (7.4, 10.0)]
        sk = [{"tipo": "gancio", "grafica": {"tipo": "contatore", "da": 0, "a": 3781, "durata": 2.2}},
              {"tipo": "radar", "esplode": 1.0},
              {"tipo": "scena2d", "attori": [{"azione": "sorpresa", "quando": 0.8, "dice": "BIKINI!"}]}]
        ev = audio.suoni(frasi, sk, [(0.0, "boom"), (3.4, "stacco"), (7.4, "stacco")])
        tic = [t for t, n, _ in ev if n == "tic" and t < 3.4]
        self.assertTrue(tic and min(tic) >= 0 and len(tic) < 12)              # anticipo 0.25: i primi tic sono già passati
        self.assertIn(round(2.2 - 0.25, 2), [t for t, n, _ in ev if n == "conferma"])
        self.assertIn(4.4, [t for t, n, _ in ev if n == "impatto"])            # lampo del radar
        self.assertTrue(any(n == "pop" and 3.4 <= t < 7.4 for t, n, _ in ev))  # ping
        self.assertIn(8.2, [t for t, n, _ in ev if n == "swish"])              # salto dell'omino

    def test_niente_boom_iniziale(self):
        """Antonio, 2026-11-23: "evita di fare quel boom iniziale, perché non funziona"."""
        from auto_ig import regole
        frasi = [(0.05, 3.0), (3.4, 7.0)]
        for sk0 in ({"tipo": "gancio"}, {"tipo": "gancio", "foto": "x.jpg"},
                    {"tipo": "gancio", "grafica": {"tipo": "confronto"}}):
            sk = [sk0, {"tipo": "fatto"}]
            bt = audio.battute(frasi, sk)
            self.assertNotIn("boom", [k for t, k in bt if t < 0.5])
            ev = audio.suoni(frasi, sk, bt)
            self.assertFalse([t for t, n, _ in ev if n == "impatto" and t < 0.5])
        self.assertFalse(any(t == 0 for t, *_ in audio._da_battute([(0.0, "via")])))
        d = {"formato": "curiosita", "resa": "2d"}
        self.assertIsNone(regole.errore_attacco(d, voce.LEAD_IN, []))
        self.assertIn("fotogramma 0", regole.errore_attacco(d, 0.6, []))
        self.assertIn("boom", regole.errore_attacco(d, 0.05, [(0.0, "impatto", {})]))
        self.assertLessEqual(voce.LEAD_IN, regole.MAX_ATTACCO)

    def test_ganci_nuovi_suonano(self):
        from auto_ig import audio
        ch = audio.suoni_grafica({"tipo": "chat", "messaggi": [{"da": "b", "testo": "x"}, {"da": "a", "testo": "y"}]}, 0, 5)
        self.assertEqual([round(t, 2) for t, n, _ in ch if n == "pop"], [0.45, 1.45])
        self.assertIn(1.45, [t for t, n, _ in audio.suoni_grafica({"tipo": "lente"}, 0, 5) if n == "conferma"])
        self.assertTrue(audio.suoni_grafica({"tipo": "confronto"}, 0, 5))

    def test_passi_dalla_distanza(self):
        """Skill animazione-personaggi-2d: un passo ogni PASSO px, non a tempo fisso (niente moonwalk)."""
        from auto_ig import audio
        corto = audio.tempi_passi({"azione": "cammina", "da": 100, "a": 400, "durata": 2})
        lungo = audio.tempi_passi({"azione": "cammina", "da": 100, "a": 900, "durata": 2})
        self.assertLess(len(corto), len(lungo))
        self.assertTrue(all(0 < t < 2 for t in lungo))

    def test_passi_coi_tacchi_piu_acuti(self):
        from auto_ig import audio
        piatto = audio.suoni_grafica({"tipo": "scena2d", "attori": [{"azione": "cammina", "durata": 2}]}, 0, 5)
        tacchi = audio.suoni_grafica({"tipo": "scena2d", "attori": [{"azione": "cammina", "durata": 2, "tacchi": "#c00"}]}, 0, 5)
        self.assertEqual(len(piatto), len(tacchi))
        self.assertGreater(tacchi[0][2]["semitoni"], piatto[0][2]["semitoni"])
