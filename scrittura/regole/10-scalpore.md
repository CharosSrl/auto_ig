# 10 · Scalpore (Antonio, 2026-11-24)

> "Devono esserci proprio temi divisivi, qualcosa che crea stupore e scalpore, perché senza scalpore, senza quella
> cosa assurda, ma assurda, assurda, la gente non si ferma a vedere i video."

È una svolta voluta da Antonio. I reel puntano al formato brainrot che oggi va di più: voce veloce, tono esagerato,
parolacce, presa di posizione forte e un'interruzione di schema al secondo 0. Si giudica dagli Insights (ritenzione
a 3 s e quota 13-17: Instagram nasconde ai profili under 18 i post con linguaggio forte, rischio accettato).

## Facilissimo: lo deve capire un bambino piccolo (Antonio, 2026-11-24, SEMPRE)

> "Deve essere proprio per un pubblico brainrottato, facilissimo da comprendere. Quando dici le date, dici prima,
> dopo; quando dici l'80% dovresti dire un sacco, un botto, un casino. Linguaggio proprio di basso livello, facile
> da comprendere anche a un bambino piccolo."

- **Niente date nella voce**: niente "1918", "1927", "anni '40". Si dice "prima", "dopo", "tanto tempo fa", "i
  tuoi bisnonni", "oggi".
- **Niente percentuali né numeri grandi nella voce**: niente "80%", "12.000". Si dice "un botto", "un casino", "un
  sacco", "quasi tutte", "tipo tutte". Il numero vero può stare a schermo (contatore, timbro) e in caption.
- **Parole da bambino**: "cambiare" e non "ribaltare", "dire" e non "consigliare", "chi vende" e non "produttori e
  negozianti", "scarpe da lavoro" e non "calzature".
- **Frasi cortissime**, soggetto + verbo + cosa. Una cosa per frase.
- Il build si ferma se nella voce ci sono numeri di due o più cifre, percentuali o "anni quaranta". Avvisa se ci sono
  parole lunghe (12+ lettere).

Prima → dopo:
- "Nel 1927 i grandi negozi americani lo consigliano ancora ai maschi." → "E dopo, i negozi lo danno ancora ai maschi."
- "All'inizio l'80% delle vendite va a donne sopra i 40 anni!" → "Le comprano un botto di signore. Tipo quasi tutte!"

## Il gancio deve dividere o scioccare
- Nel `copione.json` il campo **`scalpore`** è obbligatorio: in una frase, perché il gancio divide o sciocca.
  Se non sai scriverlo, il gancio è debole e va riscritto.
- **Nelle prime 2-3 parole c'è la scossa**: una parolaccia, un'accusa, un "assurdo", un "un botto". Se manca,
  `copione controlla` dà l'avviso "gancio senza scossa".
- **Prende posizione.** Non racconta, accusa: "Ti stanno fregando", "Chi mette le Crocs non lo sa", "Ti senti
  ribelle con le Dr. Martens? Le compravano le casalinghe".
- **Tocca un nervo**: soldi, status, identità, "i ricchi contro noi", maschi e femmine, scuola e regole, marchi con
  un passato sporco, la cosa che hai addosso che è ridicola o falsa.

## Temi che dividono (sui vestiti e sui marchi)
- Prezzi gonfiati: quanto costa davvero fare una borsa o una felpa rispetto a quanto la paghi.
- Fast fashion: chi la fa, quanto viene pagato, quanto dura.
- Status symbol: il logo che compri per sembrare ricco e da dove viene davvero.
- Marchi con un passato imbarazzante: fondatori, divieti, scandali documentati.
- Regole assurde: dress code di scuola e lavoro, capi vietati, divieti storici.
- Maschi e femmine: tacchi, rosa, gonne, trucco, "da maschio / da femmina".
- Hot take di stile: "le sneakers bianche sono finite", "il vintage è una truffa" (opinioni di stile, mai sul corpo).

## Ganci a modello
- "Ti stanno fregando con [oggetto]: [numero choc]."
- "[Gruppo che si crede X] con [oggetto]? Lo [faceva / comprava] [gruppo opposto]."
- "La cosa più assurda che [marchio] ha fatto: [fatto]."
- "Nessuno te lo dice, ma [oggetto che hai] [fatto scomodo]."
- "[Opinione a caldo]. E ti spiego perché." (il perché arriva per ultimo)
- "Se hai [oggetto], [conseguenza assurda ma vera]."

## Tono (brainrot)
- **Voce maschile Charon a 1.1** (Antonio, 2026-11-25: "più calma… deve scandire bene ogni parola"; prima Aoede a 1.2).
  Tono calmo e impassibile anche sulle parolacce (11-attacco-a-te). I sottotitoli a blocco aiutano a capire.
- **Slang ammesso**: bro, fra, tipo, POV, aura, rizz, cringe, flex, red flag, "no ma", "ma che cazzo", "letteralmente".
  Senza esagerare fino a non capire niente: una frase deve reggere anche al primo ascolto.
- **Parolacce ammesse, anche tante**: cazzo, merda, stronzata, minchia, cazzata, incazzato, fa cagare, vaffanculo.
  Si scrivono intere nel copione. La voce le dice, mentre schermo e caption le censurano da soli (c*zzo,
  `auto_ig/censura.py`).
- **Iperbole e ironia cinica**: "il marketing più geniale e più bastardo della storia".

## Linee rosse (il build si ferma: `vietate_sempre` in `regole.json`)
- **Bestemmie**, in nessuna forma.
- **Insulti a gruppi di persone**: origine, religione, orientamento, disabilità, genere ("troia", "puttana" come
  insulto, "frocio", "negro", "ritardato"…).
- **Insulti al corpo**: peso, aspetto fisico, "ciccione".
- **Niente sesso, droghe, autolesionismo.**
- **Niente fatti inventati.** Lo scalpore viene da come lo dici, non da cosa ti inventi. Un falso scoperto nei
  commenti brucia la pagina. Ogni fatto resta con la sua fonte (04-fatti-e-fonti).
- **Si attacca un marchio, un'abitudine o un'idea, mai una persona privata.**

## Prima → dopo
- "I vestiti rosa erano da maschi, quelli blu da femmine." → "Rosa da femmine? Bro, nel 1918 era il colore dei maschi."
- "Le Dr. Martens nascono da una caviglia ferita sugli sci." → "Ti senti punk con le Dr. Martens? Le compravano le
  signore di 40 anni."
