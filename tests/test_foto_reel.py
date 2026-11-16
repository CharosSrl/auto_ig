"""Quiz e curiosità 2D: foto Wikimedia incorniciata dal fotogramma 0 (marca/lezioni.md regola 12)."""
import tempfile
import unittest
from pathlib import Path

import yaml

from auto_ig import richieste, voce


def _richiesta(foto=True, **kw):
    gancio = {"tipo": "gancio", "titolo": "Perché Ray-Ban?", "opzioni": ["A", "B", "C"]}
    if foto:
        gancio["foto"] = "x.jpg"
    d = {"titolo": "t", "formato": "quiz", "resa": "2d", "scena": "cartoon2d",
         "colori": {"sfondo": "#000000", "accento": "#ffffff"},
         "copione": [{"testo": "Perché Ray-Ban?", "scheda": gancio},
                     {"testo": "B.", "scheda": {"tipo": "risposta", "titolo": "Perché Ray-Ban?", "opzioni": ["A", "B", "C"], "giusta": 1}}]}
    d.update(kw)
    return d


def _build(d):
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / "r"; (f / "foto").mkdir(parents=True)
        (f / "foto" / "x.jpg").write_bytes(b"jpg")
        (f / "richiesta.yaml").write_text(yaml.safe_dump(d, allow_unicode=True))
        calls, logs = [], []

        def render(scene, params, seconds, out_dir, **kw):
            calls.append(params); (out_dir / "video.mp4").write_bytes(b"x")

        def speak(lines, wav, *a, **kw):
            wav.write_bytes(b"RIFF")
            return [voce.Sentence(t, i, i + 0.5, voce.word_timings(t, i, i + 0.5), tone)
                    for i, (t, tone) in enumerate(voce.normalize_lines(lines))], 3.0
        richieste.build(f, render_fn=render, speak_fn=speak, log=logs.append)
        return calls[0], logs


class FotoReelTest(unittest.TestCase):
    def test_senza_foto_iniziale_non_si_genera(self):
        with self.assertRaisesRegex(ValueError, "foto"):
            _build(_richiesta(foto=False))

    def test_con_foto_e_cornice(self):
        params, _ = _build(_richiesta(cornice="pellicola"))
        self.assertEqual(params["cornice"], "pellicola")

    def test_altri_formati_non_obbligati(self):
        d = _richiesta(foto=False, formato="storia")
        d["copione"] = [{"testo": "Ciao.", "scheda": {"tipo": "scena", "titolo": "x"}}]
        self.assertEqual(richieste._regole_foto(d), [])

    def test_avvisi_scritte_lunghe(self):
        d = _richiesta()
        d["copione"][0]["scheda"]["titolo"] = "Una domanda davvero troppo lunga da leggere a schermo"
        d["copione"][0]["scheda"]["opzioni"] = ["Dall'inventore che si chiamava Ray", "B", "C"]
        _, logs = _build(d)
        self.assertTrue(any("titolo" in l for l in logs))
        self.assertTrue(any("opzione" in l for l in logs))


if __name__ == "__main__":
    unittest.main()
