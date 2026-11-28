# 12 · Regia frase per frase (reel 3D)

Antonio, 2026-11-28: "dettaglialo al massimo, ogni frase deve avere una animazione ad-hoc". Dopo il reel del velcro
(`richieste/2026-11-28-velcro-cane-3d`) ha detto: "fallo diventare il nuovo standard".

## La regola
- **Ogni battuta ha la sua animazione, fatta per quella frase.** Quello che la voce dice si vede nello stesso istante:
  - "si apre" → la striscia si apre;
  - "palline spinose" → le palline volano e si attaccano;
  - "pure il cane" → primo piano del cane coperto di palline.
- **L'animazione parte sulla parola detta.** Nella `scena3d` ogni azione, oggetto o stacco di camera ha
  `"parola": "spinose"`, più `"dopo": 0.2` se deve partire un attimo dopo e `"volta": 2` se la parola è ripetuta.
  `auto_ig/regia3d.py` legge i tempi veri delle parole (whisper) e ci mette `al`. Se la voce non dice quella parola,
  il build stampa "avviso regia".
- **Ogni animazione ha il suo suono**: `"suono"` nello stesso nodo (strappo, bau, pop, swish, whoosh, tic,
  pop_morbido, scatto, conferma). Vale la skill `regia-reel` §2.
- **Almeno due cose per frase**: un'azione del personaggio o di un oggetto e uno stacco di camera (`camere`). Lo
  stacco cambia inquadratura ogni 1,5-3 s, sempre nella stessa storia (09-attenzione).
- **Il finale richiama il fotogramma 0**: stesso oggetto, stessa inquadratura. Così il video riparte da capo.
- `copione controlla` si ferma se una battuta 3D non ha nessuna `parola`.

## Cosa c'è già (preset/blocchi)
- **Pose** (`cast[].azioni: [{parola, posa, espr, sguardo}]`): fermo, parla, cammina, corre, indica, conserte,
  facepalm, salta, gira, balla, saluta, spallucce, telefono, pensa, maniFianchi, seduto, esulta, disperato, ride,
  piegato, strappa, guardaGiu, triste, mostra.

  Camminata da → a, con `parte: {parola}` per scegliere quando parte.
- **Oggetti** (`oggetti: [{tipo, id, dove, entra:{parola, come: pop|cade|vola}, azioni:[{parola, fai}]}]`):
  - `cane` (abbaia, scuoti, siede, triste; cammina con da → a);
  - `palline` (volano e si attaccano a `verso: [avatar o id]`);
  - `pallina`;
  - `microscopio` (`accendi`);
  - `ganci` (`aggancia`, `tira`);
  - `scarpaVelcro` (apri, chiudi);
  - `tavolo`, `lampada`.
- **Camera** (`camere: [{parola, tipo, chi, dist, angolo, alto}]`): primoPiano, mezzoBusto, figura, gruppo, quinta,
  campoLargo, dalBasso, orbita, carrello, dettaglio. `chi` può essere un avatar o l'`id` di un oggetto.
- **Ambienti**: citta, aula, cameretta, negozio, parco, tg, montagna, laboratorio, macro.

**Se la storia nomina una cosa che non esiste, la si costruisce** in `preset/blocchi/oggetti3d.js`, con la skill
`illustrazione-2d`: forma prima, luce da una parte, colori pieni. Poi la si prova con una striscia di fotogrammi.

## Controllo prima di consegnare
Si fa una striscia di fotogrammi ogni 0,6-0,8 s e si controlla:
- ogni frase mostra quello che dice;
- nessuna inquadratura è vuota o dentro un oggetto;
- gli oggetti sono in campo;
- palline ed effetti si vedono.

Esempio completo: `richieste/2026-11-28-velcro-cane-3d/copione.json`.
