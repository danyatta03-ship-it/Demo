# Nordovest Ricambi

Gestionale per i resi ai fornitori di un ricambista auto: la merce che torna
indietro, da quando arriva a quando la pratica si chiude.

```bash
npx serve .            # o qualunque server statico
```

Nessuna compilazione, nessuna dipendenza da installare. I file vanno online
come sono scritti.

## Cosa c'è

| | |
|---|---|
| Ricevimento | si fotografa la bolla e la legge l'AI, oppure si compila a mano nella stessa schermata |
| Lista | tutte le pratiche, con ricerca e filtri |
| Anomalie | quello che si è bloccato, e perché |
| Logistica | ubicazioni, fornitori, foto dei colli |
| Pregresso | lo storico, in sola lettura |

Le fasi del flusso sono RICEVIMENTO, UFFICIO RESI, MAGAZZINO, FINALE.

## Le tre modalità del ricevimento

Entrando si sceglie come si lavora:

| | |
|---|---|
| 📱 Scanner bolle | dal telefono: si fotografa e si manda al PC |
| 💻 Ricevimento PC | arrivano le foto, l'AI le ha già lette, si controlla e si inserisce |
| ✏️ Manuale | si scrivono le righe a mano |

Le ultime due arrivano alla stessa schermata, ed è il punto: un articolo per
riga, i dati che valgono per tutti scritti una volta sola in fondo, un
bottone solo per mandarli tutti in lista. Cambia soltanto chi riempie le
righe — l'AI, o le dita.

Prima la modalità manuale riapriva il modulo vecchio, un articolo per volta,
con i campi in un altro ordine: chi passava dalla foto alla scrittura doveva
cambiare mestiere a metà giornata. Ora no, e nei giorni in cui l'AI non
risponde non si deve reimparare niente.

## Dati

Aziende, persone, codici e importi sono inventati. I dati si fermano nel
browser di chi apre l'app.
