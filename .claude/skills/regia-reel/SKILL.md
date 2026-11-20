---
name: regia-reel
description: >-
  Regia, sound design e formati dei reel di TeamUp Esports: quale suono mettere su ogni evento a schermo (foto, opzioni,
  3-2-1, risposta), formato "N cose" accanto al quiz, caption-bigino da salvare e mandare, finale che riparte,
  copertina, seguiti dei reel che vanno bene. Usala quando progetti, scrivi o monti un reel per @teamupesportsofficial,
  insieme a linguaggio-giovani e marca/lezioni.md. Nasce dallo studio di due reel virali italiani sugli effetti sonori.
---

# Regia dei reel — TeamUp Esports

Questa skill dice **come si mostra e come si sente** un reel. Le regole su cosa dire stanno in `linguaggio-giovani`
e `marca/lezioni.md`.

> Queste sono **ispirazioni esterne, da verificare**. Vengono da 2 reel di creator italiani sul montaggio, non da
> reel di esports né dai nostri dati. Le nostre lezioni (`marca/lezioni.md`) vincono
> sempre. Dopo ogni batch si controlla negli Insights se una regola qui sotto ha aiutato.

## Le fonti (studiate il 2026-11-17)

| Reel | Account | Numeri | Perché è utile |
|---|---|---|---|
| [DZsS8QTTRXT](https://www.instagram.com/p/DZsS8QTTRXT/) | @michelemusiyevskyy_ (26,4K follower, personal brand strategist) | 15 s · 26,7K like · 1.167 commenti · 4.944 condivisioni (18% dei like) | Outlier: i suoi reel fanno di solito 2-30K views. Effetto giusto per ogni momento del montaggio + commento-parola-chiave. |
| [Dd0bRh-IdRD](https://www.instagram.com/p/Dd0bRh-IdRD/) | @stezzygram (4,4K follower, SMM) | 54 s · **134K views (30 volte i follower)** · 4,3K like · 1.350 condivisioni (31% dei like) | "4 effetti sonori più virali": lista numerata, ogni effetto dimostrato dal vivo, caption-bigino, "Salva questo Reel". |

Sono due account piccoli, eppure entrambi i reel sono arrivati quasi solo a chi non li seguiva. È la stessa cosa che
succede a ogni account nuovo (lezione 2).

## 1. Il video fa quello che dice

Nei due reel nessun suono viene solo nominato: lo senti e lo vedi applicato nello stesso istante. Lo zoom secco
arriva sul boom, il pop mentre spunta lo sticker, il whoosh porta dentro il segnalibro che ti invita a salvare.
Chi guarda impara e prova piacere insieme.

**Per TeamUp:** ogni fatto detto dalla voce va anche *visto*.
- Se diciamo "1972", compare il timbro 1972 sulla foto o sull'icona.
- Se diciamo "cinque contro cinque", entra l'icona squadra.
- Se diciamo "montepremi", entra il trofeo; se diciamo "in diretta", il bollino LIVE.

Se una frase non ha niente da far vedere, va riscritta o tolta.

## 2. Un suono per ogni cosa che succede a schermo

Ogni 1-2 secondi deve arrivare una piccola ricompensa per l'orecchio. Il suono **annuncia** l'evento visivo, non lo
copre e non va messo a caso.

| Evento nel reel 2D | Suono | Note |
|---|---|---|
| Entra la foto Wikimedia, o cambia sulla risposta | 📸 scatto fotografico + flash bianco breve | Solo quando c'è una foto vera |
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

- **Quiz** (il formato principale): domanda e opzioni A/B/C a schermo dal fotogramma 0, come dice la lezione 3.
- **Formato "N cose"**, da affiancare al quiz:
  - il numero va enorme dal fotogramma 0 ("3 record esports che sembrano finti");
  - ogni punto ha il suo "1.", "2." grande;
  - chi guarda conosce la struttura e resta fino all'ultimo numero.

  Temi sempre da chi gioca: i giochi che hanno installati, tornei che guardano, situazioni di squadra. Massimo 3-4
  punti per stare sotto i 25 s.
- **Niente presentazioni.** Al fotogramma 0 si è già dentro il contenuto. Mai "Ciao ragazzi, oggi vi parlo di…".

## 4. Finale che riparte

L'ultimo fotogramma deve richiamare il primo: lo stesso titolo, la stessa foto, la stessa domanda. Così il video
ricomincia senza stacco e il tempo di visione supera il 100%.

**Per TeamUp:** dopo la CTA, l'ultimo mezzo secondo torna sulla foto del gancio con la domanda. Da implementare.

## 5. Utilità da salvare e da mandare

Mandare un reel a un amico è il segnale che Instagram premia di più per arrivare a chi non ci segue. Nei due reel le
condivisioni sono il 18% e il 31% dei like. Si salva e si manda ciò che **serve** o che **ti fa fare bella figura**
con un amico.

- **Caption-bigino:** la caption ripete per iscritto la risposta e il perché. Chi guarda senza audio, o vuole
  ricordarsela, la trova lì. Aiuta anche la ricerca: le caption sono un segnale per la ricerca di Instagram.
- **Una CTA alla volta, legata all'utilità:**
  - "Salvalo per il prossimo quiz con gli amici";
  - "Mandalo al tuo duo prima della prossima ranked".

  Il solo "Mandalo a…" senza un motivo non ha funzionato (lezione 8).
- Il commento "Tu cosa avevi detto?" resta la CTA del video. Salva e manda vanno in caption.

## 6. Copertina progettata

Stezzy ha una griglia riconoscibile: titolo enorme, font misti (bastone + corsivo), la sua faccia, gli stessi
occhiali. I suoi formati utili con un numero ("Top 3 agende", "Checklist", "Fai queste 3 cose") volano. Quelli solo
estetici, come il reel locale "East Market" (3,5K), no.

**Per TeamUp:** la copertina (`video.jpg`) va progettata, non presa da un fotogramma a caso:
- icona o foto grande al centro;
- titolo corto e grande nello stile TeamUp (viola e ciano, simbolo a doppio chevron);
- sempre uguale nella struttura, così la griglia di @teamupesportsofficial si riconosce.

Il nostro "volto" non è una persona: è **la voce fissa del brand** più la palette viola/ciano e il simbolo.

## 7. Seguiti dei reel che vanno bene

Dopo il successo Stezzy ha fatto subito "Effetti sonori a tema Halloween". Quando un nostro reel supera la media,
si fa entro pochi giorni una variante con lo stesso schema e un tema vicino (stesso gioco, o stesso schema su un altro gioco).

## 8. Commento con parola chiave → DM (solo se lo decide Antonio)

Michele ha fissato il commento "Commenta con 'Sound' e ti mando gli effetti audio" e ha ottenuto 1.167 commenti,
quasi tutti "Sound". Commenti e DM spingono la diffusione e intanto costruiscono una lista di contatti.

**Per TeamUp è solo un'idea**, da proporre ad Antonio:
- serve uno strumento come ManyChat, e io non posso mandare messaggi;
- una parte del pubblico è minorenne, quindi nel DM va solo il link all'app o un contenuto utile, mai una richiesta
  di dati personali.

## Da non fare

- Effetti a raffica che coprono la voce, o un suono diverso per ogni parola.
- Promettere nel gancio qualcosa che il video non dà (bait-and-switch). Le regole di verità di `marca/lezioni.md`
  restano valide.
- Copiare lo stile o i contenuti di questi creator: si prendono i meccanismi, non le loro idee.
- Usare effetti o musiche protetti da copyright: solo CC0 o generati da noi. Niente suoni presi dai giochi
  (sono di chi li ha fatti), niente screenshot o loghi di giochi, team e tornei.

## Checklist prima del render

1. Ogni frase della voce ha qualcosa da far *vedere*?
2. Ogni evento a schermo ha il suo suono, e ogni suono ha il suo evento?
3. La struttura (quiz A/B/C o "N cose") si capisce dal fotogramma 0?
4. Il finale richiama l'inizio?
5. La caption è un bigino con una sola CTA utile (salva o manda) più i crediti delle foto?
6. La copertina ha il titolo grande nello stile di sempre?
