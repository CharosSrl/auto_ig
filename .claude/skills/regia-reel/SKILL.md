---
name: regia-reel
description: >-
  Regia, sound design e formati dei reel di Cintre: quale suono mettere su ogni evento a schermo (foto, opzioni,
  3-2-1, risposta), formato "N cose" accanto al quiz, caption-bigino da salvare e mandare, finale che riparte,
  copertina, seguiti dei reel che vanno bene. Usala quando progetti, scrivi o monti un reel per @cintre_official,
  insieme a linguaggio-giovani e marca/lezioni.md. Nasce dallo studio di due reel virali italiani sugli effetti sonori.
---

# Regia dei reel — Cintre

Questa skill dice **come si mostra e come si sente** un reel. Le regole su cosa dire stanno in `linguaggio-giovani`
e `marca/lezioni.md`.

> Queste sono **ispirazioni esterne, da verificare**. Vengono da 2 reel di creator italiani sul montaggio, non da
> reel di moda né dai nostri dati. Le nostre lezioni (`marca/lezioni.md`, basate sugli Insights di Cintre) vincono
> sempre. Dopo ogni batch si controlla negli Insights se una regola qui sotto ha aiutato.

## Le fonti (studiate il 2026-11-17)

| Reel | Account | Numeri | Perché è utile |
|---|---|---|---|
| [DZsS8QTTRXT](https://www.instagram.com/p/DZsS8QTTRXT/) | @michelemusiyevskyy_ (26,4K follower, personal brand strategist) | 15 s · 26,7K like · 1.167 commenti · 4.944 condivisioni (18% dei like) | Outlier: i suoi reel fanno di solito 2-30K views. Effetto giusto per ogni momento del montaggio + commento-parola-chiave. |
| [Dd0bRh-IdRD](https://www.instagram.com/p/Dd0bRh-IdRD/) | @stezzygram (4,4K follower, SMM) | 54 s · **134K views (30 volte i follower)** · 4,3K like · 1.350 condivisioni (31% dei like) | "4 effetti sonori più virali": lista numerata, ogni effetto dimostrato dal vivo, caption-bigino, "Salva questo Reel". |

Seconda tornata (studiati il 2026-11-19):

| Reel | Account | Numeri | Perché è utile |
|---|---|---|---|
| [DfrEJGFTZ7J](https://www.instagram.com/p/DfrEJGFTZ7J/) | @robertmckeaveney (464K follower, co-fondatore di un marchio di vestiti) | 28 s · 28,3K like · 194 commenti · **11,2K invii (40% dei like)** | Come leggere la curva di retention: 3 forme = 3 problemi (gancio, sviluppo, finale). |
| [Df2PFdyuyH8](https://www.instagram.com/p/Df2PFdyuyH8/) | @alibrandology (811 follower, agenzia, serie "Giorno 21/30") | 94 s · 130 like · 122 invii (94% dei like) · 1 giorno | 7 ganci a modello da riempire, in italiano. Utilità pura: quasi ogni like è anche un invio. |

Sono due account piccoli, eppure entrambi i reel sono arrivati quasi solo a chi non li seguiva. È la stessa cosa che
vediamo noi (lezione 2).

## 1. Il video fa quello che dice

Nei due reel nessun suono viene solo nominato: lo senti e lo vedi applicato nello stesso istante. Lo zoom secco
arriva sul boom, il pop mentre spunta lo sticker, il whoosh porta dentro il segnalibro che ti invita a salvare.
Chi guarda impara e prova piacere insieme.

**Per Cintre:** ogni fatto detto dalla voce va anche *visto*.
- Se diciamo "1942", compare il timbro 1942 sulla foto.
- Se diciamo "blocca i raggi", la foto si scurisce come una lente.
- Se diciamo "lui fondò la Puma", entra la scarpa Puma.

Se una frase non ha niente da far vedere, va riscritta o tolta.

## 2. Un suono per ogni cosa che succede a schermo

Ogni 1-2 secondi deve arrivare una piccola ricompensa per l'orecchio. Il suono **annuncia** l'evento visivo, non lo
copre e non va messo a caso.

| Evento nel reel 2D | Suono | Note |
|---|---|---|
| Entra la foto Wikimedia, o cambia sulla risposta | 📸 scatto fotografico + flash bianco breve | È il suono "nostro": le nostre sono foto vere |
| Compare un'opzione A / B / C | pop (uno per opzione, scalati) | Tono leggermente crescente A→B→C |
| Compare il titolo o un testo a schermo | tastiera (typing) | Solo sui titoli, mai sui sottotitoli parola per parola: stancherebbe |
| 3-2-1 | riser che sale per tutto il conto alla rovescia | Deve finire esattamente sul colpo della risposta |
| Timbro GIUSTA / rivelazione | boom + zoom secco (punch-in) | Il momento più forte del reel: uno solo |
| Movimento veloce, cornice che entra, transizione | whoosh | Per far sentire il movimento |
| Cartello CTA | pop morbido o ding | Chiusura, volume basso |

Volumi: la voce resta sempre davanti. Gli effetti si sentono ma non coprono le parole.

**Implementato (2026-11-18)** in `auto_ig/audio.py`:
- `suoni(frasi, schede, battute)` produce un evento sonoro per ogni cosa a schermo:
  - scatto al fotogramma 0 se il gancio ha la foto, e quando la foto cambia;
  - un pop per ogni lettera "A, B, C" detta dalla voce, con l'intonazione che sale;
  - tic più riser sul 3-2-1, che finisce esattamente sulla risposta;
  - impatto più conferma sulla rivelazione;
  - tastiera sul perché scritto;
  - whoosh sugli stacchi, swish leggero sui punch, pop morbido sulla CTA.
- `mix(..., eventi=...)` abbassa gli effetti di circa 6 dB mentre la voce parla.
- I campioni sono veri e CC0, in `auto_ig/sfx/` (crediti in `CREDITI.md`, conversione con `prepara.py`). Impatto e
  riser sono generati a codice. Se un file manca si usa il suono sintetico.
- La scena (`cartoon2d.html`) mostra quello che si sente: l'opzione rimbalza sul suo pop (parametro `pop`) e c'è un
  flash bianco sullo scatto.

Per far rimbalzare le opzioni, la domanda dopo il gancio va detta come "A, B, o C?": i pop si agganciano alle
lettere pronunciate. Se le lettere non ci sono, i pop cadono nel primo secondo della frase.

## 3. Struttura dichiarata dal fotogramma 0

- **Quiz** (il nostro formato vincente): domanda e opzioni A/B/C a schermo dal fotogramma 0, come dice la lezione 3.
- **Formato "N cose"**, da affiancare al quiz:
  - il numero va enorme dal fotogramma 0 ("4 capi che hai e che sono nati in guerra");
  - ogni punto ha il suo "1.", "2." grande;
  - chi guarda conosce la struttura e resta fino all'ultimo numero.

  Temi sempre da ragazzi: sneakers, felpe, jeans, scuola, marchi che hanno. Massimo 3-4 punti per stare sotto i 25 s.
- **Niente presentazioni.** Al fotogramma 0 si è già dentro il contenuto. Mai "Ciao ragazzi, oggi vi parlo di…".

## 4. Finale che riparte

L'ultimo fotogramma deve richiamare il primo: lo stesso titolo, la stessa foto, la stessa domanda. Così il video
ricomincia senza stacco e il tempo di visione supera il 100%.

**Per Cintre:** dopo la CTA, l'ultimo mezzo secondo torna sulla foto del gancio con la domanda. Da implementare.

## 5. Utilità da salvare e da mandare

Mandare un reel a un amico è il segnale che Instagram premia di più per arrivare a chi non ci segue. Nei due reel le
condivisioni sono il 18% e il 31% dei like. Si salva e si manda ciò che **serve** o che **ti fa fare bella figura**
con un amico.

- **Caption-bigino:** la caption ripete per iscritto la risposta e il perché. Chi guarda senza audio, o vuole
  ricordarsela, la trova lì. Aiuta anche la ricerca: le caption sono un segnale per la ricerca di Instagram.
- **Una CTA alla volta, legata all'utilità:**
  - "Salvalo per il prossimo quiz con gli amici";
  - "Mandalo a chi ha le Nike ai piedi".

  Il solo "Mandalo a…" senza un motivo non ha funzionato (lezione 8).
- Il commento "Tu cosa avevi detto?" resta la CTA del video. Salva e manda vanno in caption.

## 6. Copertina progettata

Stezzy ha una griglia riconoscibile: titolo enorme, font misti (bastone + corsivo), la sua faccia, gli stessi
occhiali. I suoi formati utili con un numero ("Top 3 agende", "Checklist", "Fai queste 3 cose") volano. Quelli solo
estetici, come il reel locale "East Market" (3,5K), no.

**Per Cintre:** la copertina (`video.jpg`) va progettata, non presa da un fotogramma a caso:
- foto incorniciata;
- titolo corto e grande nello stile di Cintre;
- sempre uguale nella struttura, così la griglia di @cintre_official si riconosce.

Il nostro "volto" non è una persona: è **la voce fissa di Cintre** (la voce "amica", 25 anni) più la cornice oro.

## 7. Seguiti dei reel che vanno bene

Dopo il successo Stezzy ha fatto subito "Effetti sonori a tema Halloween". Quando un nostro reel supera la media,
come il quiz jeans, si fa entro pochi giorni una variante con lo stesso schema e un tema vicino.

## 8. Commento con parola chiave → DM (solo se lo decide Antonio)

Michele ha fissato il commento "Commenta con 'Sound' e ti mando gli effetti audio" e ha ottenuto 1.167 commenti,
quasi tutti "Sound". Commenti e DM spingono la diffusione e intanto costruiscono una lista di contatti.

**Per Cintre è solo un'idea**, da proporre ad Antonio:
- serve uno strumento come ManyChat, e io non posso mandare messaggi;
- una parte del pubblico è minorenne, quindi nel DM va solo il link all'app o un contenuto utile, mai una richiesta
  di dati personali.

## 9. Leggere la curva di retention (da @robertmckeaveney)

La forma della curva negli Insights dice **dove** si perde il pubblico, e quindi cosa rifare:

| Forma della curva | Problema | Cosa si fa |
|---|---|---|
| Crollo nei primi 2-3 s, poi piatta | **Gancio** | Accendere subito una domanda; gancio su tutti i canali insieme (immagine, voce, testo, suono); partire da formati di gancio che funzionano già |
| Scende piano per tutto il video | **Sviluppo** | Rafforzare la domanda dopo averla posta; non tirarla per le lunghe; un rehook ogni pochi secondi |
| Tiene, poi cala prima della fine | **Finale (payoff)** | La risposta arriva troppo presto o delude: tenerla per ultima e farla valere |
| Ideale | — | Domanda → domanda rafforzata → risposta alla fine |

Lui mostra ogni curva sopra la testa con una X rossa e l'etichetta, e intanto la spiega. Anche qui il video fa
quello che dice.

**Per Cintre:**
- I nostri primi 4 reel crollavano del 45-50% nei primi 2 s (lezione 3): è un **problema di gancio**. Le
  contromosse sono già nelle regole (foto, domanda, opzioni, parola forte e suono al fotogramma 0). Ad ogni batch si
  guarda se il crollo diminuisce.
- **Rafforzare la domanda** dopo il gancio, nel quiz e nelle curiosità: "Quasi tutti sbagliano", "La terza è la
  peggiore". Il rehook non è più facoltativo.
- **Il finale.** Dopo la risposta noi mettiamo una frase in più e la CTA (circa 4-5 s). Se la curva cala prima della
  fine, è lì che si perde: in quel caso si accorcia la coda o si mette la risposta più tardi.
- Si chiede ad Antonio lo screenshot della curva di ogni reel e lo si classifica con questa tabella in
  `marca/lezioni.md`.

## 10. Ganci a modello (da @alibrandology)

Sette schemi da riempire. Ogni gancio è su una scheda grigia con "PRIMO GANCIO…" grande, e i segnaposto sono in
arancione. Il numero è a schermo, quindi la struttura si capisce subito (§3).

| # | Schema | Esempio per Cintre (vero, adatto ai minori) |
|---|---|---|
| 1 | È possibile [obiettivo] in [tempo]… | "È possibile capire l'età dei tuoi jeans in 3 secondi?" |
| 2 | Sono le [orario] e ho promesso a [persona] di [obiettivo] | Storie con l'app: "Sono le 7:40 e ho promesso a mia madre di non mettere la felpa" (formato storia) |
| 3 | Non so chi ha bisogno di sentirlo, ma… [pensiero] | "Non so chi ha bisogno di sentirlo, ma il taschino dei jeans non è per le monete" |
| 4 | [N] giorni fa ho [azione]… | Diario: "3 giorni fa ho chiesto a Cintre cosa mettermi…" |
| 5 | Ecco perché [azione/fatto]… | "Ecco perché le tue Converse hanno una firma" |
| 6 | Se sei [momento specifico]… | Identità: "Se sei a scuola con le Nike ai piedi, guarda il logo" |
| 7 | [Opinione a caldo] | "Opinione impopolare: …" (solo opinioni di stile innocue, mai sul corpo) |

- Gli schemi si combinano con la parola forte vera (regola obbligatoria). Esempio: "Non so chi ha bisogno di
  sentirlo, ma i tuoi jeans sono stati in guerra".
- Il 6 ("Se sei…") parla a un gruppo preciso, ed è quello che fa mandare il video ("è uguale a te").
- **Serie "Giorno N/30"**: dà un motivo per seguire. Da noi i follow sono a zero (lezione 8). Proposta per
  Antonio: "Quiz di moda — giorno 1/30" nel timbro e in caption.
- Copertina con 3 miniature e le views (2,4 Mln, 1,2 Mln, 1,4 Mln): è prova sociale al fotogramma 0. Da noi non
  si può ancora fare, perché non abbiamo numeri da mostrare, e numeri inventati non si usano mai.
- Limite: dura 94 s e ha 0 commenti, anche se in caption c'è la domanda. Funziona per salvare e mandare, non per i
  commenti. Noi restiamo sotto i 25 s.

## 11. Grafica a codice (spunto di Antonio, 2026-11-19)

La scena 2D è codice, quindi può disegnare qualunque grafica, animata e sincronizzata con la voce, senza cercare
foto: timeline, mappe con frecce, barre e contatori, schermo diviso prima/dopo, schemi causa → effetto, tabelle.
Va usata soprattutto quando manca un'immagine giusta, o quando una foto da sola non spiega il fatto.

Oggi le schede 2D sono: gancio, fatto, dettaglio, domanda, risposta, foto, rehook, cta. Le schede grafiche nuove
(`timeline`, `mappa`, `numero`, `confronto`, `schema`) vanno costruite in `cartoon2d.html` e nel catalogo
`formati.yaml`, una alla volta, provandole su un reel vero.

**Stato (2026-11-19):** `timeline` e `mappa` (USA) esistono già (`preset/infografica2d.js`) e ad Antonio sono piaciute.
Sono **obbligatorie anche nei quiz**: dopo la risposta, il perché si mostra con una grafica, per esempio una timeline
delle tappe o una mappa con la freccia. Da fare ancora: mappa Europa/Italia, contatore, prima/dopo, schema
causa → effetto, grafica dentro la schermata del quiz.

## Da non fare

- Effetti a raffica che coprono la voce, o un suono diverso per ogni parola.
- Promettere nel gancio qualcosa che il video non dà (bait-and-switch). Le regole di verità di `marca/lezioni.md`
  restano valide.
- Copiare lo stile o i contenuti di questi creator: si prendono i meccanismi, non le loro idee.
- Usare effetti o musiche protetti da copyright: solo CC0 o generati da noi.

## Checklist prima del render

1. Ogni frase della voce ha qualcosa da far *vedere*?
2. Ogni evento a schermo ha il suo suono, e ogni suono ha il suo evento?
3. La struttura (quiz A/B/C o "N cose") si capisce dal fotogramma 0?
4. Il finale richiama l'inizio?
5. La caption è un bigino con una sola CTA utile (salva o manda) più i crediti delle foto?
6. La copertina ha il titolo grande nello stile di sempre?
