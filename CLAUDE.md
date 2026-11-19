# auto_ig: reel di @cintre_official

Claude prepara le bozze dei contenuti. Antonio li approva e li mette in coda dalla UI: Claude non mette mai in coda.

## Prima di OGNI video (obbligatorio, in quest'ordine)

1. Leggi `marca/lezioni.md`: sono le regole ricavate dai dati, vincono su tutto.
2. Carica le skill `regia-reel` (suoni, formati, curva di retention, ganci a modello) e `linguaggio-giovani`.
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
