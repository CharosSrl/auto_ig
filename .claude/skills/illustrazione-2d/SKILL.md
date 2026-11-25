---
name: illustrazione-2d
description: >-
  Come disegnare icone, oggetti e personaggi 2D BELLI nei reel di Cintre (canvas, preset grafica2d.js,
  personaggi2d.js, stile2d.js): luce da una sola direzione, ombra a taglio netto più satura, luce tinta, contorno del
  colore scurito, riflessi lucidi con parsimonia, grana, ombra a terra, sagome costruite con curve vere, occhi vivi.
  Con il laboratorio per confrontare vecchio e nuovo e il ciclo esperimento → valutazione. Usala SEMPRE quando crei o
  modifichi un'icona, un oggetto disegnato o un personaggio, insieme ad animazione-personaggi-2d e motion-design.
---

# Illustrazione 2D — Cintre

Nasce da Antonio, 2026-11-25: "i disegni sono veramente scarsi, di qualità veramente becera, devono essere
bellissimi, accattivanti… studiati come fare, fai degli esperimenti, valutali, fino a che non sai fare sempre meglio".

## Cosa ho imparato (studio del 2026-11-25)

Fonti lette:
- Kenney, *Improving 2D vector art*: luce, texture, errori comuni;
- Pocketzworld, guida materiali cel-shading: toni d'ombra e materiali;
- Creative Bloq, *Inject depth into flat colours*: letta in parte;
- MDN e web.dev: clip, compositing e ombre interne nel canvas;
- skill SVG pubbliche (svg-art): sistema coerente e un'idea per icona.

La parte più utile, però, sono stati i miei esperimenti nel laboratorio, qui sotto.

**Il salto di qualità viene per l'80% dalla FORMA e per il 20% dall'ombreggiatura.** Lo stile illustrato su una
sagoma brutta resta brutto: le Crocs a "pagnotta" e il tacco a "ciabatta" sono migliorati solo quando li ho ridisegnati.

### Forma e sagoma
- **Curve vere** (`bezierCurveTo`) e mai rettangoli per le cose morbide. Una scarpa ha punta a bulbo, collo che si
  stringe e intersuola con la punta che sale; una maglietta ha maniche inclinate, fianchi che stringono appena e
  orlo morbido.
- **La sagoma si riconosce da sola**, in nero pieno. Se da sola non dice "anfibio", nessun dettaglio la salva.
- **Proporzioni esagerate con criterio**: la punta più tonda, la suola più spessa, la cupola delle Crocs più alta.
  Il carattere sta nell'esagerazione di ciò che rende unico l'oggetto.
- **Pochi dettagli, ma quelli giusti**: lacci incrociati, occhielli, cucitura gialla, buchi in prospettiva, collo a
  costina. Ogni dettaglio deve dire "è proprio quell'oggetto". Niente rumore.
- **Volume dei dettagli**: un buco è scuro dentro con il labbro chiaro sotto; un occhiello ha l'anello chiaro e il
  centro scuro; un laccio ha un filo di luce sopra.
- **Pannelli dentro la sagoma**: si disegnano con `dentro(ctx, …)`, che ritaglia nella forma appena riempita (punta,
  tallone, fascia, righe). Alla fine si ripassa il contorno con `ripassa`. Così non sbordano mai.

### Luce e colore (fa tutto `stile2d.forma`, chiamata da `fs`)
- **Una sola luce, dall'alto a sinistra** (`LUCE`). Mai ombreggiatura su tutti i lati ("pillow shading").
- **Ombra a taglio netto** (cel) sul lato in basso a destra. Si ottiene con la sagoma meno sé stessa spostata verso
  la luce (offset 9). Il tono è **più saturo** (+12%) e **più scuro** (L × 0,8), con la tinta un po' verso il freddo.
  Sui gialli l'ombra va verso l'arancio, mai verso il marrone. Su bianchi e crema va un lilla freddo poco saturo:
  l'arancio sui bianchi sembra sporco, ed è stato l'errore del primo giro.
- **Luce tinta**, mai bianco puro: una mezzaluna in alto a sinistra, più chiara di circa il 38% verso il caldo.
- **Contorno del colore scurito** (L ≤ 0,2, tinta verso il viola) al posto del nero uguale per tutto. Sui bianchi va
  un prugna scurissimo.
- **Riflessi lucidi solo sui materiali lucidi** (pelle, gomma, vernice, metallo): uno o due per oggetto, `lucido()`
  morbido sulla parte più alta verso la luce e `lama()` netta lungo un bordo. Troppi riflessi fanno caos (Kenney).
- **Grana fine** (texture risograph) solo dentro l'icona, molto leggera (alfa 18). Se si vede "sporco" è troppa.
- **Ombra a terra**: un'ellisse sfumata sotto l'oggetto lo "appoggia", più un'ombra morbida sotto l'icona.

### Personaggi (omino di `personaggi2d.js`)
- **Occhi veri**: bianco, pupilla girata verso dove guarda e riflesso bianco. È la cosa che dà più vita.
- **Sopracciglia** che si alzano quando urla o si stupisce; **guance** rosate; **naso** con una curva nel tono
  d'ombra della pelle; **orecchio** sul lato dietro.
- **Capelli** come una calotta con un ciuffo che va in avanti, mai una mezzaluna. Niente punte che scendono sulla
  guancia: hanno fatto un triangolo nero sull'occhio.
- **Busto** con spalle tonde e vita che stringe appena. Braccia e gambe con ombra e luce lungo il tratto. I piedi
  sono **scarpe** con la suola chiara, non pallini.

## Il ciclo di lavoro (obbligatorio per ogni disegno nuovo o rifatto)

1. **Laboratorio**: `auto_ig/video/laboratorio/icone.html`.
   - Si serve con `python3 -m http.server 8765 --bind 127.0.0.1` dalla cartella `auto_ig/video`, in background.
   - Si fotografa con lo script Playwright: apre la pagina, aspetta il titolo `pronto` e salva lo screenshot di `#c`.
   - Parametri:
     - `?icone=anfibio,crocs&s=300`: sopra lo stile piatto, sotto quello illustrato;
     - `&solo=illustrato` mostra solo lo stile nuovo;
     - `&per=10` va a capo ogni 10 icone (per vederle tutte);
     - `&sfondo=%23…` e `&accento=%23…` provano i colori del reel;
     - `?omini=fermo,sorpresa,cammina,indica` mostra i personaggi.
2. **Valuta come un art director**, con onestà. Nella valutazione si scrive cosa non va, non che "è migliorato":
   - la sagoma si legge?
   - è chiaro di che oggetto si tratta?
   - la luce viene da una sola parte?
   - ci sono macchie sporche, sbavature o pezzi che sembrano altro (monocolo, triangolo)?
   - a 100 px si capisce ancora?
3. **Correggi e rifai la foto** finché non è bello. Ogni giro si confronta con il precedente.
4. **Prova nel reel vero** (striscia di fotogrammi): sfondo, scheda, lente e pila cambiano la resa.
5. **Scrivi qui sotto la lezione** se hai scoperto qualcosa di nuovo.

## Strumenti nel codice
- `preset/stile2d.js`:
  - `registra(ctx)`: un ctx che copia i tracciati in un Path2D;
  - `forma(ctx, colore)`: la forma illustrata;
  - `toni(colore)`: base, ombra, luce, linea;
  - `lucido()` e `lama()`;
  - `iconaIllustrata()`: offscreen, grana, ombre e cache per fotogramma.
- `preset/grafica2d.js`:
  - `STILE.illustrato` (true di default);
  - `fs()` diventa illustrata da sola;
  - `dentro()` e `ripassa()`;
  - costruttori riusabili: `scarpaSport({alta, punta, tallone, fascia, collo})` e `maglietta(colore, {righe, collo})`.
- Icona nuova: va in `ICONE` **e** in `formati.yaml → icone_2d`. Si guarda nel laboratorio prima del reel.

## Lezioni dal diario degli esperimenti
| Data | Esperimento | Esito |
|---|---|---|
| 2026-11-25 | Solo ombreggiatura automatica sulle icone vecchie | Meglio del piatto ma non basta: le sagome brutte restano brutte |
| 2026-11-25 | Grana alfa 34 | Sembra sporco sui fondi scuri → alfa 18, più rada |
| 2026-11-25 | Ombra offset 13, L × 0,74 | Fascia scura troppo pesante in basso → offset 9, L × 0,8 |
| 2026-11-25 | Ombra dei bianchi con il giro "caldo" | Macchie arancioni sulla marinière → bianchi con ombra lilla fredda |
| 2026-11-25 | Anfibio, Crocs, sneaker, Jordan, tacco, magliette ridisegnati con curve, pannelli e riflessi | Salto netto: oggetti riconoscibili e "da sticker" |
| 2026-11-25 | Omino: occhi con pupilla e riflesso, sopracciglia, guance, scarpe | Da stecchino a personaggio simpatico; ciuffo e orecchio corretti al secondo giro |
| 2026-11-25 | Trench ridisegnato (svasato ad A, maniche raglan, aletta, cintura con coda), nuove fiamma e anello (reel Burberry e Nike) | Leggibili a 100 px; trench nel contatore a pila si riconosce anche piccolo |
| 2026-11-25 | Avatar 3D a blocchi (`preset/blocchi/`): capelli a cupola sferica | La cupola finiva DENTRO la testa (si vedeva solo una riga) → calotta che segue la forma della testa gonfiata di 0,02-0,24, più alta sulla fronte per lasciare libere le sopracciglia |
| 2026-11-25 | Facce degli avatar: tratti in scala 1 | Illeggibili in figura intera → scala 1,7 (bocche ×1,3); palpebre con il ritaglio, non con una pezza color pelle (faceva una macchia chiara) |

## Da fare (in ordine di uso nei reel)
Ridisegnare con lo stesso metodo le icone ancora "vecchie di forma": mutande, zeppa, sughero, bambù, aereo, outfit
(figurino), armadio, telefono, lente, borsa (manico e chiusura), jeans (pieghe), sposa, staffa, poi il
narratore e i fondali di `scena2d`.

## Avatar 3D a blocchi (dal 2026-11-25, richiesta di Antonio: "personaggi tipo Roblox, componibili come i Lego")
- Codice in `auto_ig/video/preset/blocchi/`:
  - `corpo.js`: `creaAvatar(THREE, ricetta)`;
  - `facce.js`, `capelli.js`, `vestiti.js`, `scarpe.js`, `accessori.js`: i pezzi;
  - `pose.js`: 18 azioni;
  - `ambienti.js`: città, aula, cameretta, negozio, parco, tg;
  - `camera.js`: primo piano, quinta, campo largo, orbita…;
  - `ricette.js`: 9 personaggi pronti e `casuale(seed)` per le comparse.
- Laboratorio: `auto_ig/video/laboratorio/avatar.html?foglio=personaggi|capelli|facce|bocche|occhi|sopra|sotto|scarpe|accessori|pose|ambienti|casuali`.
- Lo stile "a blocchi" è un genere: niente asset, loghi, nomi o facce di Roblox. È tutto disegnato da noi.
