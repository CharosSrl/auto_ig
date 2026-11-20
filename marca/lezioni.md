# Lezioni sui reel — TeamUp Esports (@teamupesportsofficial)

**PRIORITARIE.** Valgono per ogni reel e vincono su qualsiasi regola generica delle skill in `.claude/skills/`.
Vanno lette insieme a `brand-profile.md` e `voice.md` prima di scrivere copione, hook o caption.

## Da dove vengono

Le regole qui sotto sono quelle di **formato** ricavate dagli Insights dei primi reel 2D del progetto (novembre
2026, account precedente, stesso motore grafico e stessa voce). Gli argomenti e il pubblico erano diversi, quindi
**vanno riverificate sui reel di TeamUp**: dopo ogni gruppo di reel si chiedono ad Antonio gli Insights (curva di
visione, % ancora a 3 e a 6 s, interazioni, pubblico) e si aggiorna questo file con una tabella dei nostri dati.

## Le regole

1. **Vince il tempo di visione.** Un reel non va meglio perché piace di più, ma perché più persone restano fino
   alla risposta: così Instagram lo mostra a più non follower.
2. **Ogni reel parte da zero davanti a sconosciuti.** Su un account nuovo oltre il 90% di chi guarda non ci segue.
   Decidono i primi secondi.
3. **L'apertura è il problema più grosso.** Nei primi 2 secondi se ne va circa metà del pubblico. Per questo la
   domanda e le opzioni A/B/C vanno a schermo **dal primo fotogramma**, senza scheda-titolo d'apertura.
4. **Quiz, non lezione.** I reel "Lo sapevi?" con l'elenco di fatti crollano già a 10 secondi. Una curiosità si
   trasforma in quiz: la risposta resta in sospeso fino alla fine.
5. **Domanda con la risposta "conosciuta a metà".** La curiosità è massima quando chi guarda sente di poter sapere
   la risposta (Kang et al., 2009). Funziona bene una trappola che dà mezza ragione a chi sbaglia.
6. **Argomenti per chi gioca.** Giochi che hanno davvero installati, tornei che guardano, situazioni che vivono
   (solo queue, il duo, il quinto che manca, la LAN, il rank).
   - No: storia dei videogiochi per adulti nostalgici, hardware da appassionati, business degli esports.
   - Sempre adatto ai minori: niente scommesse, skin gambling, casse premio, violenza grafica, tossicità.
7. **Sotto i 25 secondi.**
8. **CTA.** Nei quiz l'invito a commentare porta commenti. "Mandalo a…" su un account nuovo rende poco: meglio
   un destinatario preciso ("al tuo duo"). Per i follow serve un motivo per seguire (es. "ogni giorno un quiz").
9. **Il punteggio dei ganci non basta.** Ganci con lo stesso punteggio hanno avuto risultati diversissimi. Il
   punteggio serve a scartare i ganci brutti, non a prevedere le views: giudicano i dati.
10. **Foto vere quando ci sono.** Una foto vera (arena, evento, hardware storico) dà credibilità e sorpresa.
    - Per gli esports le foto libere sono poche: la foto è **consigliata, non obbligatoria**. Senza foto si usano
      le icone (`richieste crea` avvisa e basta).
    - Va usata come **premio** (scheda risposta o dettaglio) o nel gancio, mai al posto di domanda e opzioni.
    - Solo immagini di pubblico dominio o CC0 (filtro già presente in `auto_ig/sources/wikimedia.py`),
      con il credito in `media/credits.json` e in caption. Mai screenshot di giochi o loghi di team e tornei.
    - Prima di usare la foto di una persona reale (pro player, caster), verificare che sia davvero lei.
    - Come si fa: `python -m auto_ig.richieste foto <cartella> "<ricerca in inglese>"` elenca i risultati;
      aggiungendo `<n> <nome>` scarica il risultato n in `<cartella>/foto/<nome>.jpg`, con il credito in
      `crediti.json`. Nel copione si usa `scheda: {tipo: foto, titolo, foto: <nome>.jpg, timbro, credito}`.
    - Cornice da preset (`cornice:` nella richiesta o nella scheda): `oro` (default nei quiz), `polaroid` (default
      nelle curiosità), `pellicola`, `nastro`. La foto è "viva" (`preset/foto2d.js` → `fotoViva`).
    - Il gancio non deve svelare la risposta: va scelta una foto che incuriosisce, non una che risponde.
11. **Linguaggio dei ragazzi + una parola forte vera nel gancio** (da verificare con gli Insights: % ancora a 3 e
    a 6 s). Registro parlato, tu, sfida e non lezione.
    - Al massimo una parola forte (morte, guerra, bomba, vietato, bannato…), vera e nel contesto del fatto.
    - A schermo è censurata in automatico (`auto_ig/censura.py`: m*rte), la voce la dice intera.
    - Niente parolacce, niente sessuale, niente droghe, niente scommesse: Instagram nasconde questi contenuti ai minori.
    - Tutto il dettaglio è in `.claude/skills/linguaggio-giovani/SKILL.md`.
12. **Scritte minime, più immagini che testo.** La voce dice già tutto:
    - titolo ≤ 7 parole, opzioni ≤ 4 (oltre arriva un avviso al build);
    - il "perché" della risposta solo se ≤ 5 parole.
13. **Si deve capire al primo ascolto.**
    - Voce a `velocita: 1.0`, mai 1.2, con `pausa: 0.4-0.5` tra le frasi.
    - Sottotitoli `blocco`, che sono il default: due righe ferme e grandi, la parola detta si accende man mano.
    - Frasi intere da 6 a 14 parole, una sola idea. Niente frammenti telegrafici.
    - La risposta del quiz dice la lettera **e** il perché in una frase: "È la B: in Valorant si gioca cinque contro cinque."
    - Se il video supera i 25 s, la prima cosa da togliere è la **trappola finale**, che non insegna niente.
      Poi si accorciano le frasi. La voce non si velocizza.

## Ispirazioni esterne (da verificare)

Le ispirazioni da reel di altri creator stanno nella skill `.claude/skills/regia-reel/SKILL.md`: suono per ogni
evento a schermo, formato "N cose", caption-bigino da salvare e mandare, finale che riparte, copertina, seguiti dei
reel che vanno bene. Si usano solo dopo averle verificate con i nostri Insights.
