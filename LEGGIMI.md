# Nordovest Ricambi

Gestionale per un magazzino ricambi auto: ricevimento merce, resi ai
fornitori, ubicazioni.

```bash
npx serve .            # o qualunque server statico
sh test/tutti.sh       # 69 prove, senza browser
```

Nessuna compilazione, nessuna dipendenza da installare. I file vanno online
come sono scritti.

## Cosa c'è

| | |
|---|---|
| Ricevimento | tre modi: si fotografa la bolla, si riceve al PC quello che è stato fotografato, oppure si compila a mano |
| Lista | tutte le pratiche, con ricerca e filtri |
| Anomalie | quello che si è bloccato, e perché |
| Magazzino | la mappa degli scaffali, le etichette da stampare, ubica e disubica |
| Giacenze | la merce: un codice per riga, quanti pezzi, dove stanno, quanto valgono |
| Logistica | ubicazioni, fornitori, foto dei colli |
| Pregresso | lo storico, in sola lettura |

All'ingresso si sceglie il reparto, magazzino o resi: sono due mestieri
diversi, e chi sta fra gli scaffali non deve passare la giornata a scansare
schede che non gli servono. La scelta si cambia dal nome del reparto, in alto.

Le fasi del flusso sono RICEVIMENTO, UFFICIO RESI, MAGAZZINO, FINALE.

## Il codice ubicazione

Si legge `AA 01 01`: corridoio, scaffale, ripiano, nell'ordine in cui una
persona cammina in magazzino. Il codice intero è `AA-01-01-42`, dove le
ultime due cifre sono calcolate dalle altre con il metodo dell'IBAN,
modulo 97.

Servono a una cosa sola: una lettura sbagliata viene **rifiutata** invece di
finire nei dati. `AA 01 10` battuto al posto di `AA 01 01` non diventa
un'altra ubicazione esistente, diventa un codice non valido, e l'app dice
perché.

Il collaudo lo verifica per esaurimento: su un magazzino di 192 ubicazioni
prova tutti i 19.968 errori di un singolo carattere e tutte le 1.035
inversioni di due caratteri vicini. Nessuno passa.

Sta in [`js/magazzino.js`](js/magazzino.js).

## Ubica e disubica

Il giro è sempre lo stesso: prima DOVE, poi COSA, poi QUANTI — l'ordine in
cui si muove una persona, che arriva allo scaffale, legge l'etichetta, e solo
dopo guarda cosa ha in mano.

I due campi accettano tre modi di riempirsi e non li distinguono: la pistola
(che scrive e batte Invio come una tastiera), la fotocamera, e le dita. Il
controllo del codice è lo stesso in tutti e tre i casi.

Due cose che si notano solo usandolo: dopo un'ubicazione riuscita resta lo
scaffale e si svuota il codice, perché chi ubica un bancale fa venti codici
nello stesso posto; e un'etichetta di scaffale letta nel campo dell'articolo
viene segnalata come errore di mira, non presa per un codice che si chiama
così.

## Da fare

Inventario · flusso commessa.

## Dati

Aziende, persone, codici e importi sono inventati. I dati si fermano nel
browser di chi apre l'app.
