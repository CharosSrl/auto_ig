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
   Una curiosità si trasforma in quiz: la risposta resta in sospeso fino alla fine.
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
