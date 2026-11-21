# Lezioni dai dati reali — Cintre (@cintre_official)

**PRIORITARIE.** Valgono per ogni reel e vincono su qualsiasi regola generica delle skill in `.claude/skills/`.
Vanno lette insieme a `brand-profile.md` e `voice.md` prima di scrivere copione, hook o caption.
Le regole sono ricavate dagli Insights di Instagram, non da blog o teorie. Dopo ogni gruppo di reel si chiedono
ad Antonio gli Insights (curva di visione, interazioni, pubblico) e si aggiorna questo file.

## Da dove vengono (16 novembre 2026)

Primi 4 reel 2D (scena `cartoon2d`, stesso modello grafico, stessa voce):

| Reel | Formato | Durata | Views | Ancora a 6 s | Like/view | Non follower |
|---|---|---|---|---|---|---|
| Quiz jeans ("I tuoi jeans hanno il nome di una città") | quiz | 24 s | **~1200** | **~43%** | 2,0% | ~98% |
| Quiz sposa in bianco | quiz | 27 s | ~200 | ~28% | 2,0% | 92-96% |
| Lusso nato dalla crisi (Chanel) | curiosità | 33 s | ~200 | ~22% | 2,0% | 92-96% |
| Lusso contro i nemici (Vuitton/Houdini) | curiosità | 35 s | ~200 | ~30% | 0% | 92-96% |

Altri dati utili:
- Le views arrivano per il 70-86% dalla Tab Reels.
- Salvataggi e follow sono a zero su tutti e quattro i reel.
- Il pubblico ha la stessa età in tutti e quattro: 13-17 anni ≈ 25%, sotto i 25 anni ≈ 60%.

## Le regole

1. **Vince il tempo di visione.** Il quiz sui jeans non è piaciuto di più: i like per view sono uguali agli altri.
   Ha vinto solo perché più persone sono rimaste fino alla risposta, e così Instagram l'ha mostrato a più
   non follower.
2. **Ogni reel parte da zero davanti a sconosciuti.** Il 92-98% di chi lo vede non ci segue. Decidono i primi secondi.
3. **L'apertura è il problema più grosso.** Tutti i reel perdono il 45-50% del pubblico nei primi 2 secondi.
   Per questo la domanda e le opzioni A/B/C vanno a schermo **dal primo fotogramma**, senza scheda-titolo
   d'apertura.
4. **Quiz, non lezione.** I reel "Lo sapevi?" con l'elenco di fatti crollano intorno al 10% già a 10 secondi.
   Per questo anche una curiosità tiene la risposta in sospeso fino alla fine (rehook, l'ultima è la più forte).
   **Ma il formato lo sceglie Antonio** (2026-11-19): se chiede "curiosità" si fa `formato: curiosita`, se chiede
   "quiz" si fa `formato: quiz`. Mai convertire da soli: se i dati suggeriscono altro, glielo si chiede prima.
   In ogni gruppo di reel si alternano i formati (quiz, "N cose", curiosità con suspense).
5. **Domanda con la risposta "conosciuta a metà".** La curiosità è massima quando chi guarda sente di poter
   sapere la risposta (Kang et al., 2009). Funziona bene una trappola che dà mezza ragione a chi sbaglia:
   per i jeans era Nîmes, che ha dato il nome al denim.
6. **Argomenti per il target Gen Z.** Il target dell'app sono adolescenti e giovani adulti, ed è anche il
   pubblico che Instagram ci porta.
   - Sì: capi e marchi che hanno davvero (jeans, sneakers, felpe, Converse, Nike, Levi's) e la loro vita
     (scuola, amici, genitori).
   - No: storia del lusso per adulti, matrimoni.
   - Sempre adatto ai minori: niente corpo, peso o insicurezze fisiche.
7. **Sotto i 25 secondi.**
8. **CTA.** Nei quiz l'invito a commentare porta qualche commento. "Mandalo a…" su un account nuovo non ha
   portato nulla. I follow sono a zero: aggiungere un motivo per seguire (es. "ogni giorno un quiz").
9. **Il punteggio dei ganci non basta.** Tutti e quattro gli hook avevano 12/12 e i risultati sono stati
   diversissimi. Il punteggio serve a scartare i ganci brutti, non a prevedere le views: giudicano i dati.
10. **Foto vere da Wikimedia Commons nei quiz e nelle curiosità** (richiesta di Antonio, 2026-11-16, da
    verificare con gli Insights). Ritratti storici, foto d'archivio, il capo originale: una foto vera dà
    credibilità e sorpresa.
    - Va usata come **premio** (scheda risposta o dettaglio), mai al posto della domanda e delle opzioni
      del primo fotogramma.
    - Solo immagini di pubblico dominio o CC0 (filtro già presente in `auto_ig/sources/wikimedia.py`),
      con il credito in `media/credits.json`.
    - Prima di usare la foto di una persona reale, verificare che sia davvero lei.
    - Niente immagini sessualizzate o centrate sul corpo.
    - Come si fa: `python -m auto_ig.richieste foto <cartella> "<ricerca in inglese>"` elenca i risultati;
      aggiungendo `<n> <nome>` scarica il risultato n in `<cartella>/foto/<nome>.jpg`, con il credito in
      `crediti.json`. Nel copione si usa `scheda: {tipo: foto, titolo, foto: <nome>.jpg, timbro, credito}`.
      Il credito va anche in caption.
    - Nei quiz il gancio porta `opzioni: [A, B, C]`, così domanda e opzioni sono a schermo dal fotogramma 0.
      Primo esempio: `richieste/2026-11-16-quiz-sneakers`.
11. **Linguaggio dei ragazzi + una parola forte vera nel gancio, solo se il fatto la contiene davvero (mai incollata)** (richiesta di Antonio, 2026-11-16, da verificare
    con gli Insights: percentuale ancora a 3 e a 6 s). Registro parlato, tu, sfida e non lezione.
    - Al massimo una parola forte (morte, guerra, bomba, vietato…), vera e nel contesto del fatto.
    - A schermo è censurata in automatico (`auto_ig/censura.py`: m*rte), la voce la dice intera.
    - Niente parolacce, niente sessuale, niente droghe: dal 2025 Instagram nasconde questi contenuti ai minori (13+).
    - Tutto il dettaglio è in `.claude/skills/linguaggio-giovani/SKILL.md`.
12. **Foto Wikimedia incorniciata e viva dal fotogramma 0, più immagini che scritte** (richiesta di Antonio,
    2026-11-16). L'obiettivo è sempre il massimo dell'attenzione.
    - Nei quiz e nelle curiosità 2D **la prima scheda ha sempre `foto`**: `richieste crea` si ferma se manca.
    - Nel quiz, domanda e risposta senza foto ereditano quella del gancio. `foto_risposta` la cambia quando arriva la risposta.
    - Cornice da preset (`cornice:` nella richiesta o nella scheda): `oro` (default nei quiz), `polaroid` (default
      nelle curiosità), `pellicola`, `nastro`.
    - La foto è "viva" (`auto_ig/video/preset/foto2d.js` → `fotoViva`):
      - ondeggia come una bandiera;
      - un riflesso di luce la attraversa;
      - fa glitch sulle battute forti;
      - nelle schede `foto` passa dal bianco e nero ai colori.
    - Le scritte a schermo sono minime, perché la voce dice già tutto:
      - titolo ≤ 7 parole, opzioni ≤ 4 (oltre arriva un avviso al build);
      - il "perché" della risposta solo se ≤ 5 parole;
      - sottotitoli `corti`.
    - Il gancio non deve svelare la risposta: va scelta una foto che incuriosisce, non una che risponde.
13. **Si deve capire al primo ascolto** (Antonio, 2026-11-17, sul Ray-Ban: "non si capisce niente, troppo veloce").
    - Voce a `velocita: 1.0`, mai 1.2, con `pausa: 0.4-0.5` tra le frasi.
    - Sottotitoli `blocco`, che sono il default: due righe ferme e grandi, la parola detta si accende man mano,
      quelle ancora da dire sono attenuate. Basta con i pezzi da 1-3 parole che scorrono.
    - Frasi intere da 6 a 14 parole, una sola idea. Niente frammenti telegrafici ("B. Ray, raggio. Fine.").
    - La risposta del quiz dice la lettera **e** il perché in una frase: "È la B: ray vuol dire raggio, ban vuol dire bloccare."
    - Se il video supera i 25 s, la prima cosa da togliere è la **trappola finale**, che non insegna niente.
      Poi si accorciano le frasi. La voce non si velocizza.

14. **Una storia, non un elenco; italiano naturale** (Antonio, 2026-11-19: "italiano stentato, cose sconnesse,
    frase iniziale forzata"). Le regole di scrittura sono in `CLAUDE.md`: una persona, un problema, una svolta,
    frasi legate da perché, ma, così; prima del render il copione si rilegge ad alta voce.

## Regole controllate dal codice

Dal 2026-11-19 queste regole non sono più solo scritte: `auto_ig/regole.py` blocca `richieste crea` se un reel 2D
(quiz o curiosità) non le rispetta. Le aveva chieste Antonio, e io le avevo saltate.
- formato uguale a quello chiesto da Antonio (campo `richiesta`);
- parola forte: **solo se è il cuore vero della storia** (Antonio, 2026-11-19: quando era obbligatoria produceva ganci
  forzati, sempre "guerra"). Se c'è, va detta e scritta censurata nel gancio. Se manca arriva un avviso: il motivo
  va scritto in `parola_forte_motivo` e detto ad Antonio;
- suoni accesi (`audio: {musica: true, sfx: true}`), voce `chirp3-aoede` a 1.0;
- durata sotto i 25 s, controllata prima del render.
Il build stampa la riga "regole: …": va riportata ad Antonio con ogni video. Se gli ultimi 4 reel hanno lo stesso
formato arriva un avviso, e va proposto un formato diverso.

## Ispirazioni esterne (da verificare)

Le regole qui sopra vengono dai nostri dati. Le ispirazioni da reel di altri creator stanno nella skill
`.claude/skills/regia-reel/SKILL.md`: suono per ogni evento a schermo, formato "N cose", caption-bigino da salvare e
mandare, finale che riparte, copertina, seguiti dei reel che vanno bene. Si usano solo dopo averle verificate con i nostri Insights.

## I due reel che sono andati molto bene (Antonio, 2026-11-21; Insights ancora da leggere)

| Reel | Gancio al fotogramma 0 | Ipotesi |
|---|---|---|
| Jeans e acqua (`2026-11-20-curiosita-jeans-acqua`) | `contatore`: il numero sale fino a 3.781 litri mentre la vasca si riempie | **Antonio: "alla gente piacciono un sacco i numeroni che crescono".** Il numero che sale è una mini-suspense: resti per vedere dove si ferma. Ed è un numero enorme ma concreto, su una cosa che hai addosso. |
| Uomini sui tacchi (`2026-11-21-curiosita-tacchi-uomini`) | `scena2d`: un uomo coi baffi cammina sui tacchi rossi | Ipotesi mie, da verificare: (1) immagine **strana e buffa** che si capisce in 1 s anche senza audio; (2) **ribalta un'idea che tutti hanno** ("i tacchi sono da donne"), quindi la risposta è conosciuta a metà (lezione 5) e invita a commentare e mandare; (3) storia con personaggi (cavaliere persiano → re → addio) invece di un elenco. |

Cosa hanno in comune:
- un **oggetto quotidiano** che chi guarda ha o conosce (jeans, tacchi);
- **un fatto che ribalta come lo vedi**, detto in una frase sola;
- un **gancio vivo e chiaro senza audio**, già in movimento al fotogramma 0.

Da fare:
- chiedere ad Antonio gli Insights dei due reel (views, % a 3 e 6 s, invii, commenti) e confrontarli con bikini e
  jeans-miniera, per capire quale ipotesi regge;
- **i numeroni** si possono usare anche senza liquidi: prezzi, anni, chilometri, pezzi venduti, con un `contatore`
  che non sia la vasca;
- **il ribaltamento** si prova su altri capi "di un genere" o "di una classe" che erano dell'altro (es. il rosa,
  la gonna, il trucco, verificando i fatti), sempre senza toccare corpo e insicurezze.
Nelle richieste il risultato si segna nel campo `esito:`.

**Antonio, 2026-11-21: "i numeri sono incredibili; le storie devono essere proprio, ma proprio strane per funzionare,
magari un argomento woke".**
- Il numero deve essere **incredibile**, non solo grande.
- La storia deve essere **stranissima**: se non fa dire "ma dai!", non va.
- Si cercano temi che ribaltano le norme di genere o di classe, come i tacchi.

Li raccontiamo come fatti storici verificati e curiosi, non come una presa di posizione politica e senza
attaccare nessuno. Il pubblico ha anche il 25% di minori: niente corpo, sesso o polemiche.
