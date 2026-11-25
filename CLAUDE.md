# auto_ig: reel di @cintre_official

Claude prepara le bozze dei contenuti. Antonio li approva e li mette in coda dalla UI: Claude non mette mai in coda.

## Prima di OGNI video (obbligatorio, in quest'ordine)

0. **Leggi TUTTA la cartella `scrittura/`** partendo da `scrittura/LEGGIMI.md` (Antonio, 2026-11-21: "focus assoluto
   sullo scripting… una cartella dedicata con tutte le regole che dovrai leggere ogni volta"). Il copione si scrive
   in `richieste/<cartella>/copione.json` (schema: `scrittura/copione.schema.json`), si controlla con
   `python -m auto_ig.copione controlla richieste/<cartella>` e il build si ferma se non rispetta le regole.
1. Leggi `marca/lezioni.md`: sono le regole ricavate dai dati, vincono su tutto.
2. Carica le skill `regia-reel` (suoni, formati, curva di retention, ganci a modello) e `linguaggio-giovani`.
   Se il reel ha personaggi o oggetti animati, carica anche `animazione-personaggi-2d` e `motion-design`
   (camminata giusta, anticipazione, easing; Antonio 2026-11-20: "sono importantissime") e `illustrazione-2d`
   per qualunque disegno nuovo o rifatto.
3. Fai il formato che Antonio ha chiesto. "Curiosità" vuol dire curiosità, "quiz" vuol dire quiz. Se una lezione
   suggerisce altro, chiediglielo prima.
4. In ogni gruppo di video alterna i formati: quiz, "N cose", storia con suspense, gancio "Se sei…".
5. Scrivi il copione in `copione.json` con le regole di `scrittura/`, poi rileggilo ad alta voce prima del render.
6. `richieste crea` controlla da solo:
   - formato;
   - parola forte, che è facoltativa: se c'è va anche a schermo, se manca arriva un avviso da girare ad Antonio con
     il motivo;
   - suoni;
   - voce maschile Charon a 1.0 (la dice la gruccia narratrice);
   - durata sotto i 25 s.

   Nel resoconto ad Antonio riporta la riga "regole: …" che stampa.
7. Usa solo fatti verificati, con la fonte annotata nella richiesta. Le foto vengono da Wikimedia e devono essere PD o CC0.

## Scalpore, brainrot, parolacce (Antonio, 2026-11-24: "migliorare l'hook in modo clamoroso")

"Voce più veloce, linguaggio per persone brainrottate, vanno bene anche tante parolacce. Devono esserci proprio temi
divisivi… senza scalpore la gente non si ferma a vedere i video." Regole in `scrittura/regole/10-scalpore.md`:
- voce maschile **Charon a 1.0**, naturale e con enfasi (Antonio, 2026-11-25: "metti la voce a 1x… troppo meccanico";
  prima Aoede 1.2): il build blocca le altre. Tutto il copione si sintetizza in una chiamata sola (`voce._chirp_tutto`);
- **facilissimo, da bambino piccolo** ("te lo devi ricordare sempre"): nella voce niente date (si dice prima, dopo,
  tanto tempo fa) né percentuali o numeri grandi (un botto, un casino, un sacco); parole semplici, frasi cortissime.
  Il numero vero solo a schermo e in caption. Il build si ferma su date e percentuali nella voce;
- gancio divisivo o scioccante, che prende posizione; campo `scalpore` obbligatorio nel copione e avviso se il gancio
  non ha una scossa nelle prime parole;
- slang e parolacce ammessi: la voce le dice intere, schermo e caption le censurano da soli (c*zzo);
- linee rosse che fermano il build: bestemmie, insulti a gruppi di persone o al corpo. Restano vietati sesso, droghe e
  fatti inventati: lo scalpore viene dal tono e dalla presa di posizione, non da falsi.

## Scrivere il copione (regole in `scrittura/`, fonte unica)

Tutte le regole di scrittura stanno in `scrittura/`: struttura a domanda aperta (gancio → attesa → rehook → attesa
→ risposta per ultima, CTA sempre "Segui la pagina e metti like!": Antonio, 2026-11-22), gancio, lingua da ragazzo di 20 anni, fatti con fonte, ritmo e durata, CTA e
caption, varietà, e il diario delle correzioni di Antonio (`regole/08-errori-di-antonio.md`). Le soglie misurabili
sono in `scrittura/regole.json` e le controlla `auto_ig/copione.py`. Ogni nuova correzione di Antonio sul copione va
subito nel diario (e, se si misura, in `regole.json`). Esempi veri: `scrittura/esempi/`.

## Gancio vivo dal fotogramma 0 (obbligatorio; Antonio, 2026-11-20: il reel jeans/acqua "è andato bene")

Il primo fotogramma non è mai una foto ferma: è una grafica GIÀ IN MOVIMENTO, con titolo grande e senza intestazione.
- **Niente barra di avanzamento in alto, mai** (Antonio, 2026-11-25: "leva per sempre la barra sopra ai video"):
  `C.barra` in `preset/cartoon2d.js` è vuota apposta e non va rimessa, in nessuna scena (2D o 3D).
- **Nei reel 3D (`blocchi3d`) niente titolo in alto**: solo sottotitoli a blocco, gruccia e cartello finale (Antonio,
  2026-11-25: "rimuovi il testo sopra, il dialogo sotto va più che bene"). `schermo` resta nel copione per caption
  e controlli, ma la scena 3D non lo disegna.
- **La voce parla già al fotogramma 0 e non c'è nessun boom iniziale** (Antonio, 2026-11-23: "appena comincia il video,
  la voce deve star quasi già parlando. Evita di fare quel boom iniziale, perché non funziona"). `voce.LEAD_IN` = 0,05 s;
  il build si ferma se la voce arriva dopo 0,15 s o c'è un impatto nei primi 0,5 s (`regole.errore_attacco`). Le prime
  2-3 parole del gancio sono già il colpo (mai un anno per primo).
- Si mette nella scheda del gancio: `grafica: {tipo: contatore | radar | scena2d | chat | lente | confronto, ...}`
  (vedi `formati.yaml`).
- Esempi:
  - un numero che sale con la vasca che si riempie;
  - un radar che pulsa su un luogo;
  - un omino che fa già qualcosa (cammina sui tacchi, salta, versa).
- Vale anche per i quiz. Se serve una grafica che non esiste, si costruisce in `infografica2d.js` /
  `personaggi2d.js`.
- **Varia sempre** (Antonio, 2026-11-20: "le cose con i liquidi sono scontate… variegare il più possibile i
  contenuti"). Ogni reel cambia tipo di gancio (`contatore`, `radar`, `scena2d`, `chat`, `lente`, `confronto`…),
  argomento e formato rispetto agli ultimi. Il build avvisa quando si ripetono: l'avviso va preso sul serio,
  non ignorato. La vasca che si riempie è già usata: non riproporla.
- **Una chat è sempre IDENTICA a WhatsApp** (Antonio, 2026-11-21: "se ci sta una chat rendila quanto più uguale a
  whatsapp"): intestazione verde, "sta scrivendo…", sfondo beige coi disegnini, fumetti verdi e bianchi con codina,
  ora e spunte blu, barra "Messaggio". È già così in `infografica2d.js` (`chat`): non tornare a uno stile "nostro",
  e mai logo o nome dell'app.

## Disegni belli: skill `illustrazione-2d` (Antonio, 2026-11-25: "devono essere bellissimi, accattivanti")

Ogni icona, oggetto o personaggio nuovo si fa con la skill `illustrazione-2d`:
- forma con curve vere prima di tutto;
- luce da una sola direzione, ombra a taglio netto, contorno colorato, riflessi con parsimonia;
- prova nel laboratorio `auto_ig/video/laboratorio/icone.html`, poi nel reel.

Si valuta con onestà e si rifà finché non è bello. Lo stile illustrato è automatico (`preset/stile2d.js`, `fs`), ma
non salva una sagoma brutta.

## Musica di sottofondo (Antonio, 2026-11-21: "le canzoni che metterai sempre in bg, ricordalo pure nel codice")

`richieste crea` sceglie da solo il brano dal formato, da `auto_ig/musica/catalogo.yaml` (studio del reel @viewcci
sui suoni per tipo di video): il quiz va con *L'estate* di Vivaldi (pubblico dominio); dove non c'è un file libero
resta la base a codice. Stampa anche le canzoni di tendenza protette: si dicono ad Antonio come suggerimento da
aggiungere dall'app, **mai scaricate né messe nel file** (Instagram silenzia il reel). `audio: {musica: <file>}`
forza un brano della cartella.

## Il narratore: la gruccia di Cintre (Antonio, 2026-11-21)

È la mascotte: una gruccia di legno con occhioni e labbra bordeaux. Mima la voce con labiale ed espressioni, in
basso a destra.
- **C'è in tutti i reel 2D di default** (`narratore: true`): labiale ed espressioni li calcola da solo `richieste
  crea`, dall'audio vero (`auto_ig/labiale.py`).
- Si toglie solo con `narratore: false`. `narratore: {lato: sinistra}` la sposta a sinistra quando l'angolo destro
  serve alla grafica.
- La modella Cintre è un'altra cosa e resta solo su richiesta (`mascotte: true`).
- Come è fatta e come si controlla: skill `animazione-personaggi-2d`, sezione "Il narratore".

## Grafica fatta a codice (spunto di Antonio, 2026-11-19)

Schemi, tabelle, timeline, mappe, grafici e confronti animati si possono disegnare direttamente nella scena
(canvas/three.js). Sfruttali al massimo, soprattutto quando non c'è una foto giusta da mettere.
- Una data o una sequenza diventa una timeline che si disegna mentre la voce parla (1871 → 1873 → oggi).
- Un luogo diventa una mappa con una freccia (Genova → Nîmes).
- Un numero diventa una barra o un contatore che sale.
- Un "prima e dopo" diventa uno schermo diviso a metà.
- Un perché diventa uno schema causa → effetto.

Anche qui vale "il video fa quello che dice" (regia-reel §1). Per ogni frase chiediti: "si può *mostrare*, invece
che scrivere?"

**Anche nei quiz (Antonio, 2026-11-19: "mi piace come fai questi grafici… è un must per le prossime volte").** Ogni
reel, quiz compreso, deve avere almeno una grafica a codice dove serve:
- dopo la risposta, la scheda che spiega il perché può essere una `timeline` o una `mappa`, al posto di un'icona o
  di una foto generica. Esempio: quiz jeans → mappa Genova → Nîmes;
- una grafica dentro la schermata del quiz (per esempio la risposta che diventa una mappa) va ancora costruita in
  `cartoon2d.html`. Proponila ad Antonio quando serve.
