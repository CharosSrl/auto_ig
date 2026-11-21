# Scrittura dei copioni — da leggere PRIMA di ogni video

Antonio, 2026-11-21: "focus assoluto sullo scripting con dei file json ad-hoc… una cartella dedicata con tutte le
regole che dovrai leggere ogni volta". Questa cartella è la fonte unica delle regole di **scrittura**. Grafica,
suoni e animazione restano nelle skill `regia-reel`, `animazione-personaggi-2d` e `motion-design`.

## Ordine di lettura (ogni volta, tutto)
1. `regole/08-errori-di-antonio.md`: le correzioni di Antonio, per non ripetere gli errori.
2. `regole/01-struttura.md` → `07-varieta.md`, in ordine.
3. `../marca/lezioni.md`: i dati degli Insights. Se una lezione nuova contraddice una regola qui, vince la lezione
   e si aggiorna la regola.
4. Un esempio in `esempi/` dello stesso formato.

## Flusso di lavoro
1. **Idea**: il fatto deve far dire "ma dai!" (stranissimo, numero incredibile, ribaltamento).
2. **Fatti**: ognuno con la sua fonte in `fatti[]`. Quello che non è verificato non si dice.
3. **3 strutture** in `strutture_valutate[]`: se ne sceglie una e si scrive il perché.
4. **Almeno 3 ganci** (meglio 5) in `ganci_valutati[]`: se ne sceglie uno e si scrive il perché degli scartati.
5. **Battute** in `battute[]`: ognuna con il suo `ruolo` (gancio → attesa → rehook → attesa → risposta) e il
   `fatto` su cui si basa.
6. **Autocontrollo**: rileggere ad alta voce e compilare `autocontrollo`.
7. `python -m auto_ig.copione controlla richieste/<cartella>`: errori = si riscrive; avvisi = si valutano e si dicono
   ad Antonio.
8. `python -m auto_ig.richieste crea richieste/<cartella>`: il build rifà gli stessi controlli e si ferma se ci sono
   errori.

## File
- `copione.schema.json`: i campi del `copione.json` (che sta nella cartella della richiesta, accanto a
  `richiesta.yaml`). In `richiesta.yaml` restano scena, colori, voce, audio e cornice. Le parole stanno solo nel JSON.
- `regole.json`: le soglie controllate a macchina da `auto_ig/copione.py`.
- `regole/`: le regole con il perché e gli esempi prima → dopo.
- `esempi/`: copioni veri, con la nota sul perché funzionano o no.

**Quando Antonio corregge un copione** si aggiunge subito una riga a `regole/08-errori-di-antonio.md`, e se la
correzione si può misurare anche una soglia in `regole.json`.
