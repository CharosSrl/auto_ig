---
name: animazione-personaggi-2d
description: Come animare bene personaggi e oggetti 2D disegnati a codice nei reel di Cintre (canvas, preset personaggi2d.js e infografica2d.js) - ciclo di camminata corretto (pose, ginocchia, braccia opposte, piedi che non scivolano), anticipazione, schiacciamento all'atterraggio, inerzia, easing, oggetti che entrano con arco e rimbalzo, ambiente sempre vivo. Usala SEMPRE quando crei o modifichi un'azione di un omino, un oggetto animato o un gancio vivo, insieme a motion-design e regia-reel.
---

# Animazione di personaggi e oggetti 2D (Cintre)

Nasce da Antonio, 2026-11-20: "installati delle skill per disegnare bene i personaggi e le cose animate… sono
importantissime", dopo un omino che "sembra che cammina al contrario". Il codice è in
`auto_ig/video/preset/personaggi2d.js` (omini e oggetti) e `infografica2d.js` (grafiche). Tempi ed easing generali
sono nella skill `motion-design`. Altri riferimenti sui principi sono in `riferimenti/`, tratti da
dylantarre/animation-principles (MIT).

## Convenzioni del nostro omino

- Gli angoli si misurano da "dritto in giù". **Positivo = in avanti**, cioè verso dove guarda (`verso`: 1 destra, -1 sinistra).
- Ogni arto è `[spalla/anca, gomito/ginocchio]`. Il secondo angolo è relativo al primo.
- **Il ginocchio piega solo all'indietro**, quindi il secondo angolo della gamba è ≤ 0.
- **Il gomito piega solo in avanti**, quindi il secondo angolo del braccio è ≥ 0.

  Il contrario fa sembrare il personaggio un uccello che cammina all'indietro: è stato l'errore del 2026-11-20.
- **Braccio davanti** (`lb`) e braccio dietro (`rb`): un gesto che si deve vedere (indica, saluta, versa) va fatto
  con il braccio davanti. Quello dietro è coperto dal busto.

## Ciclo di camminata (4 pose, ogni passo)

1. **Contatto**: gambe aperte, tallone avanti che tocca terra, ginocchio dietro un po' piegato. Il braccio opposto
   alla gamba avanti è in avanti.
2. **Abbassamento**: il peso scende sulla gamba avanti e il corpo è nel punto **più basso**.
3. **Passaggio**: la gamba dietro passa sotto il corpo con il ginocchio molto piegato (il piede si alza). Le braccia
   sono lungo i fianchi.
4. **Sollevamento**: la gamba d'appoggio spinge e il corpo è nel punto **più alto**.

Regole:
- **Braccia opposte alle gambe**: gamba sinistra avanti = braccio sinistro indietro.
- **Il corpo sale e scende due volte per ciclo**, una per passo (`|sin|` della fase), di 8-14 px.
- **I piedi non scivolano.** La fase si calcola dallo **spazio percorso**: `fase = distanza / lunghezzaPasso · π`,
  non dal tempo. Se il personaggio si sposta più veloce di quanto muove le gambe, fa il moonwalk.
- **Guarda dove va**: se si sposta da `da` ad `a`, `verso = sign(a − da)`.
- **Testa e cappello in leggero ritardo** (inerzia), con un'inclinazione in avanti di pochi gradi.
- Easing all'inizio e alla fine dello spostamento: parte e si ferma, non va a velocità costante.

## Principi applicati (i 12 di Disney, quelli che servono a noi)

- **Anticipazione**: prima di saltare il personaggio si abbassa per 0.1-0.15 s; prima di lanciare porta il braccio
  indietro.
- **Schiacciamento e allungamento**: in volo il personaggio si allunga, all'atterraggio si schiaccia per 0.1 s
  (scala Y 0.85, X 1.1) e poi torna. Il volume resta costante.
- **Inerzia e sovrapposizione**: capelli, cappello, fumetti e oggetti in mano arrivano dopo il corpo e oscillano
  un poco prima di fermarsi.
- **Archi**: mani, oggetti lanciati ed entrate seguono curve, mai linee rette.
- **Easing, mai lineare**: entrata = decelera (easeOut), uscita = accelera, attraversamento = easeInOut. Il rimbalzo
  (`pop`) solo per gli oggetti piccoli che "arrivano".
- **Azione secondaria**: mentre parla il personaggio respira (busto ±4 px) e sbatte gli occhi. Una scena non è
  mai ferma.
- **Staging**: un'azione principale per volta, quella che dice la voce in quel momento. Il resto è più piccolo o
  più lento.
- **Tempi**: entrata di un oggetto 0.3-0.45 s, gesto 0.4-0.6 s, salto 0.45 s, ciclo di camminata 0.7-0.9 s per
  due passi.

## Oggetti e grafiche

- Gli oggetti entrano dall'alto o di lato con un arco e un piccolo rimbalzo, poi hanno un movimento ambiente
  lento (galleggiano, ruotano di 1-2°).
- Ogni cosa che compare ha il suo suono (skill `regia-reel` §2) nello stesso istante.
- **Varietà**: la vasca che si riempie (contatore con liquido) è già stata usata. Antonio la trova "scontata".
  Per ogni reel scegli un tipo di grafica diverso dagli ultimi (il build lo segnala).
- **Un oggetto per parola chiave** (studio del 2026-11-21, @ilprof.ai, skill `regia-reel` §13): dentro una frase
  ogni nome concreto detto dalla voce fa entrare il suo oggetto, con `dopo:` al secondo in cui viene detto. Il centro
  dello schermo cambia ogni 0,5-1,5 s, ma un oggetto solo alla volta è protagonista (staging).
- **Transizioni fatte con il disegno**, mai la dissolvenza: un cerchio che si allarga e diventa il fondo nuovo, un
  oggetto che si trasforma nel successivo, cose che cadono in un imbuto. Nessun fotogramma vuoto nel mezzo.
- **Chat = WhatsApp** (Antonio, 2026-11-21): la grafica `chat` deve sembrare in tutto e per tutto WhatsApp (colori
  #008069 / #efeae2 / #d9fdd3, codina sul primo fumetto del gruppo, ora e doppia spunta blu, "sta scrivendo…",
  messaggio mio scritto lettera per lettera nella barra e poi inviato). Senza logo né nome. Ogni interfaccia di app
  che disegniamo va copiata dal vero il più fedelmente possibile: chi guarda la riconosce al volo.
- **Nei momenti chiave il soggetto occupa almeno 1/3 dell'altezza** dello spazio grafico. Niente colore su colore
  simile (rosso su bordeaux).

## Da lemo-opuscar `DIRECTOR.md` (riassunto con parole nostre, 2026-11-21)

- Fra una posa e l'altra si passa sempre con keyframe ed easing. Mai cambiare posa di colpo dentro un `if`, salvo un
  pop comico voluto di un fotogramma.
- Un oggetto tenuto in mano sta fra i palmi. Un oggetto che rotola gira di `distanza / raggio`.
- Le espressioni si controllano alla dimensione finale, guardando le sopracciglia: "preoccupato" e "arrabbiato"
  differiscono solo per il loro verso.
- Le azioni nuove si provano su un foglio grande (allungarsi, alzare, correre, inginocchiarsi) prima di metterle in
  un reel.

## Il narratore: la gruccia di Cintre (Antonio, 2026-11-21)

La mascotte è una gruccia di legno con gancio dorato, occhioni e labbra bordeaux. Parla in basso a destra in tutti
i reel 2D.
- Codice: `preset/narratore.js` (disegno e animazione) e `auto_ig/labiale.py` (traccia dall'audio).
- Foglio modello: `scenes/foglio_narratore.html`.

**Labiale**
- Ci sono 9 bocche:
  - `X` riposo;
  - `M` m/b/p, chiusa (si deve SEMPRE vedere);
  - `F` f/v;
  - `A`, `E` (anche per la i), `O`, `U`;
  - `L` l/t/d/n/r, con la lingua;
  - `S` s/z/c/g/k, con i denti.
- Il testo diventa fonemi con regole italiane. Le parole di `pronuncia` vengono lette come le dice la voce e i
  numeri in lettere.
- I fonemi si spalmano solo sul tempo in cui la voce si sente davvero: l'energia del wav si misura ogni 10 ms.
  Così le pause chiudono la bocca.
- In ogni fotogramma vince la M, poi la vocale più lunga. La bocca anticipa di 40 ms e passa da una forma
  all'altra in 75 ms.
- L'apertura è modulata dall'energia.

**Espressioni**: gancio → sorpresa, `?` → curiosa, `!` o parola forte → wow, rehook → furba, CTA → felice (con
un inchino). Le altre frasi alternano neutra e felice. Sui colpi (boom/rivela) fa anticipazione, salto e
schiacciamento all'atterraggio.

**Vita**:
- respiro e battito di ciglia ogni 2-5 s, più uno a inizio frase;
- saccadi dello sguardo verso titolo e grafica;
- schiacciamento e allungamento sugli accenti della voce;
- il gancio dorato oscilla in ritardo (follow-through).

**Posizione**: centro circa (815, 1598), scala 0.8. Sta sotto i sottotitoli, a sinistra delle icone di Instagram e
sopra la caption.
- `narratore: {lato: sinistra}` lo sposta a sinistra.
- `narratore: false` lo toglie.

**Controllo**:
- striscia di 8 fotogrammi ravvicinati sulla bocca: le forme devono cambiare e chiudersi nelle pause;
- frame 0 già vivo;
- nessuna sovrapposizione.

## Checklist prima del render

1. Strip di 8 fotogrammi ravvicinati, a 0.1 s di distanza, di ogni azione nuova. Si controlla che:
   - ginocchia e gomiti pieghino dalla parte giusta;
   - le braccia siano opposte alle gambe;
   - il personaggio guardi dove va;
   - i piedi non scivolino.
2. Al fotogramma 0 il personaggio è già a metà azione (gancio vivo).
3. Niente sovrapposizioni con titolo, timbro e sottotitoli (blocco ASS: fascia ~1290-1480 px; sotto, 1500-1700, c'è
   il narratore a destra).
4. Ogni azione visibile ha il suo suono.
