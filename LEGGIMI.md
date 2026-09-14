# Nordovest Ricambi

Gestionale per un magazzino ricambi auto: ricevimento merce, resi ai
fornitori, ubicazioni.

```bash
npx serve .            # o qualunque server statico
node test/magazzino.test.js
```

Nessuna compilazione, nessuna dipendenza da installare. I file vanno online
come sono scritti.

## Cosa c'è

| | |
|---|---|
| Ricevimento | tre modi: si fotografa la bolla, si riceve al PC quello che è stato fotografato, oppure si compila a mano |
| Lista | tutte le pratiche, con ricerca e filtri |
| Anomalie | quello che si è bloccato, e perché |
| Logistica | ubicazioni, fornitori, foto dei colli |
| Pregresso | lo storico, in sola lettura |

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

## Da fare

Scelta magazzino/resi all'ingresso · foglio etichette da stampare · ubica e
disubica col lettore · inventario · flusso commessa.

## Dati

Aziende, persone, codici e importi sono inventati. I dati si fermano nel
browser di chi apre l'app.
