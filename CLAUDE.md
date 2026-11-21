# auto_ig: reel di @cintre_official

Claude prepara le bozze dei contenuti. Antonio li approva e li mette in coda dalla UI: Claude non mette mai in coda.

## Prima di OGNI video (obbligatorio, in quest'ordine)

1. Leggi `marca/lezioni.md`: sono le regole ricavate dai dati, vincono su tutto.
2. Carica le skill `regia-reel` (suoni, formati, curva di retention, ganci a modello) e `linguaggio-giovani`.
   Se il reel ha personaggi o oggetti animati, carica anche `animazione-personaggi-2d` e `motion-design`
   (camminata giusta, anticipazione, easing; Antonio 2026-11-20: "sono importantissime").
3. Fai il formato che Antonio ha chiesto. "Curiosità" vuol dire curiosità, "quiz" vuol dire quiz. Se una lezione
   suggerisce altro, chiediglielo prima.
4. In ogni gruppo di video alterna i formati: quiz, "N cose", storia con suspense, gancio "Se sei…".
5. Scrivi il copione con le regole di scrittura qui sotto, poi rileggilo ad alta voce prima del render.
6. `richieste crea` controlla da solo:
   - formato;
   - parola forte, che è facoltativa: se c'è va anche a schermo, se manca arriva un avviso da girare ad Antonio con
     il motivo;
   - suoni;
   - voce Aoede a 1.0;
   - durata sotto i 25 s.

   Nel resoconto ad Antonio riporta la riga "regole: …" che stampa.
7. Usa solo fatti verificati, con la fonte annotata nella richiesta. Le foto vengono da Wikimedia e devono essere PD o CC0.

## Scrivere un copione che intrattiene (Antonio, 2026-11-19: "italiano stentato, cose sconnesse, gancio forzato")

- **È una storia, non un elenco.** Ogni frase nasce dalla precedente, con un perché, un ma o un così. Se togli una
  frase e il senso regge lo stesso, quella frase era scollegata.
- **Parla come un ragazzo di 20 anni a un amico.** Italiano naturale e completo. Niente frasi telegrafiche, niente
  termini che nessuno usa (le "ali" delle tasche), niente parole ripetute ("il taschino serviva per l'orologio da
  taschino").
- **Il gancio nasce dal fatto più sorprendente.** La parola forte si usa solo se è il cuore vero della storia, mai
  attaccata dopo. Varia le parole: non sempre "guerra".
- **Una persona, un problema, una svolta.** "I minatori strappavano le tasche → un sarto inventa i rivetti → non ha
  i soldi per il brevetto → scrive a Levi Strauss". Questo intrattiene, la lista di fatti no.
- **Prova finale:** se il copione, letto ad alta voce, non lo racconteresti a un amico, va riscritto.

## Struttura a domanda aperta (studio di Antonio, 2026-11-21: skill `regia-reel` §12-14)

La gente se ne va appena ha la risposta. Ogni reel segue quindi questo schema:
**gancio** (apre la domanda) → **attesa** (la rende più grande) → **rehook** a metà (scheda `rehook`) → **attesa**
(la storia si complica) → **risposta per ultima**. Dopo c'è solo la CTA, ≤ 7 parole. Il build avvisa se manca il
rehook o se la CTA è lunga.
- Prima di scrivere, pensa 3 strutture possibili e annota nella richiesta perché hai scelto quella.
- Dentro la frase, un oggetto nuovo per ogni nome concreto detto dalla voce (ogni 0,5-1,5 s). Transizioni disegnate,
  mai dissolvenze.
- Il ritmo cambia almeno una volta. Prima della risposta c'è un attimo di silenzio, poi il suono più forte del reel.

## Gancio vivo dal fotogramma 0 (obbligatorio; Antonio, 2026-11-20: il reel jeans/acqua "è andato bene")

Il primo fotogramma non è mai una foto ferma: è una grafica GIÀ IN MOVIMENTO, con titolo grande e senza intestazione.
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
