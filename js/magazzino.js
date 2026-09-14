/* ═══════════════════════════════════════════════════════════════════════
   MAGAZZINO — ubicazioni, etichette, scansione

   La parte che decide se tutto il resto funziona e' il codice ubicazione.
   Se sbaglia quello, sbagliano le etichette, sbagliano le scansioni e
   sbaglia l'inventario. Quindi qui dentro non si tira a indovinare mai.

   FORMATO
     Si legge "AA 01 01": corridoio, scaffale, ripiano. Due lettere e
     quattro cifre, nell'ordine in cui una persona cammina in magazzino.

   LE DUE CIFRE DI CONTROLLO
     Il codice completo e' "AA-01-01-42". Le ultime due cifre sono calcolate
     dalle altre con lo stesso metodo dell'IBAN, modulo 97.

     Non sono un vezzo. Sono la ragione per cui un codice letto male viene
     RIFIUTATO invece di finire nei dati: con modulo 97 ogni errore su un
     singolo carattere e ogni inversione di due caratteri vicini cambiano il
     resto, e il codice non passa. "AA 01 01" battuto come "AA 01 10" non
     diventa un'altra ubicazione esistente: diventa un codice non valido, e
     l'app lo dice.

     Il collaudo lo verifica per esaurimento, non per campione: prova TUTTI
     gli errori di un carattere e TUTTE le inversioni su un migliaio di
     ubicazioni.

   L'ETICHETTA
     Il disegno del codice a barre lo fa la libreria gia' a bordo. Qui sta
     solo cosa ci va scritto dentro, che e' la parte che deve essere giusta.
   ═══════════════════════════════════════════════════════════════════════ */

(function (radice) {
  'use strict';

  // ── Il codice ubicazione ─────────────────────────────────────────────

  var FORMA = /^([A-Z]{2})-?(\d{2})-?(\d{2})(?:-?(\d{2}))?$/;

  /** "aa 1 1" → {corridoio:'AA', scaffale:'01', ripiano:'01'} oppure null. */
  function pezzi(testo) {
    if (testo == null) return null;
    var t = String(testo).toUpperCase().replace(/\s+/g, '');
    var m = FORMA.exec(t);
    if (!m) return null;
    return { corridoio: m[1], scaffale: m[2], ripiano: m[3], controllo: m[4] || null };
  }

  /**
   * Le cifre di controllo, con il metodo dell'IBAN.
   * Le lettere diventano numeri (A=10 … Z=35), si concatena tutto, si
   * prende il resto modulo 97 e si sottrae da 98: viene sempre fra 01 e 97.
   */
  function controllo(corridoio, scaffale, ripiano) {
    var grezzo = corridoio + scaffale + ripiano;
    var n = '';
    for (var i = 0; i < grezzo.length; i++) {
      var c = grezzo.charAt(i);
      n += (c >= 'A' && c <= 'Z') ? String(c.charCodeAt(0) - 55) : c;
    }
    // Il numero e' piu' lungo di quanto un intero regga: resto a pezzi.
    var r = 0;
    for (var k = 0; k < n.length; k++) r = (r * 10 + Number(n.charAt(k))) % 97;
    var c97 = 98 - ((r * 100) % 97);
    if (c97 === 98) c97 = 1;          // il caso in cui il resto e' gia' zero
    return (c97 < 10 ? '0' : '') + c97;
  }

  /** Il codice completo da stampare e da mettere nel codice a barre. */
  function codice(corridoio, scaffale, ripiano) {
    var p = pezzi(corridoio + '-' + scaffale + '-' + ripiano);
    if (!p) return null;
    return p.corridoio + '-' + p.scaffale + '-' + p.ripiano + '-' +
           controllo(p.corridoio, p.scaffale, p.ripiano);
  }

  /** Come si legge sull'etichetta e a voce: "AA 01 01". */
  function leggibile(cod) {
    var p = pezzi(cod);
    return p ? p.corridoio + ' ' + p.scaffale + ' ' + p.ripiano : '';
  }

  /** Quello che viaggia dentro il codice a barre: compatto, senza trattini. */
  function perBarre(cod) {
    var p = pezzi(cod);
    if (!p) return null;
    return p.corridoio + p.scaffale + p.ripiano +
           (p.controllo || controllo(p.corridoio, p.scaffale, p.ripiano));
  }

  /**
   * La domanda che conta: questo codice e' buono?
   *
   * Torna sempre un motivo leggibile. Un lettore che dice soltanto "no"
   * manda il magazziniere a cercare a caso.
   */
  function verifica(testo) {
    if (testo == null || String(testo).trim() === '') {
      return { ok: false, motivo: 'Non hai letto niente.' };
    }
    var p = pezzi(testo);
    if (!p) {
      return { ok: false, motivo: "Non e' un'ubicazione: si scrive come \"AA 01 01\"." };
    }
    if (!p.controllo) {
      return {
        ok: false, senzaControllo: true,
        codice: codice(p.corridoio, p.scaffale, p.ripiano),
        motivo: "Manca la parte di controllo: questa etichetta e' vecchia o scritta a mano."
      };
    }
    var atteso = controllo(p.corridoio, p.scaffale, p.ripiano);
    if (p.controllo !== atteso) {
      return {
        ok: false,
        motivo: "Lettura sbagliata: il controllo non torna. Rileggi l'etichetta."
      };
    }
    return {
      ok: true,
      codice: p.corridoio + '-' + p.scaffale + '-' + p.ripiano + '-' + p.controllo,
      leggibile: p.corridoio + ' ' + p.scaffale + ' ' + p.ripiano,
      corridoio: p.corridoio, scaffale: p.scaffale, ripiano: p.ripiano
    };
  }

  // ── Generare la mappa del magazzino ──────────────────────────────────

  /** "A".."F" oppure "AA".."AF": la sequenza dei corridoi. */
  function corridoi(da, a) {
    var out = [];
    var d = String(da).toUpperCase().slice(0, 2);
    var f = String(a).toUpperCase().slice(0, 2);
    if (d.length === 1) d = 'A' + d;
    if (f.length === 1) f = 'A' + f;
    var i = valore(d), j = valore(f);
    if (i > j) return out;
    for (; i <= j; i++) out.push(nome(i));
    return out;

    function valore(s) { return (s.charCodeAt(0) - 65) * 26 + (s.charCodeAt(1) - 65); }
    function nome(v) {
      return String.fromCharCode(65 + Math.floor(v / 26)) + String.fromCharCode(65 + (v % 26));
    }
  }

  /**
   * Tutte le ubicazioni di un magazzino descritto a grandi linee.
   * `{ daCorridoio:'AA', aCorridoio:'AD', scaffali:12, ripiani:4 }`
   */
  function genera(mappa) {
    var m = mappa || {};
    var cor = corridoi(m.daCorridoio || 'AA', m.aCorridoio || 'AA');
    var ns = Math.max(1, Math.min(99, Number(m.scaffali) || 1));
    var nr = Math.max(1, Math.min(99, Number(m.ripiani) || 1));
    var out = [];
    for (var a = 0; a < cor.length; a++) {
      for (var s = 1; s <= ns; s++) {
        for (var r = 1; r <= nr; r++) {
          var ss = (s < 10 ? '0' : '') + s;
          var rr = (r < 10 ? '0' : '') + r;
          out.push({
            codice: cor[a] + '-' + ss + '-' + rr + '-' + controllo(cor[a], ss, rr),
            leggibile: cor[a] + ' ' + ss + ' ' + rr,
            corridoio: cor[a], scaffale: ss, ripiano: rr
          });
        }
      }
    }
    return out;
  }

  /** Quante ne verrebbero, senza costruirle: serve a non far esplodere la pagina. */
  function quante(mappa) {
    var m = mappa || {};
    return corridoi(m.daCorridoio || 'AA', m.aCorridoio || 'AA').length *
           Math.max(1, Math.min(99, Number(m.scaffali) || 1)) *
           Math.max(1, Math.min(99, Number(m.ripiani) || 1));
  }

  // ── L'etichetta ──────────────────────────────────────────────────────
  //
  // Il codice a barre lo disegna la libreria QR gia' a bordo dell'app, che
  // e' codice provato. Avevo cominciato a scrivere Code128 a mano per non
  // dipendere da niente: la tabella delle larghezze e' uscita sbagliata, 48
  // righe su 107 con la somma dei moduli errata. Una tabella di codici a
  // barre o e' esatta o manda il magazziniere a cercare un articolo che non
  // c'e', quindi e' finita nel cestino.
  //
  // Qui resta la parte che DEVE essere giusta e che si puo' dimostrare: cosa
  // c'e' scritto dentro il codice, e come si rilegge.

  // Il contenuto dell'etichetta porta "LOC:" davanti. Serve a distinguere,
  // nel momento in cui il lettore spara il codice, un'ubicazione da un
  // codice articolo: senza prefisso l'app dovrebbe indovinare, e indovinare
  // e' esattamente quello che non deve fare.
  var PREFISSO = "LOC:";

  /** Quello che il lettore restituisce quando inquadra l'etichetta. */
  function contenutoEtichetta(cod) {
    var b = perBarre(cod);
    return b ? PREFISSO + b : null;
  }

  /** Questa lettura e' un'ubicazione, o e' un articolo? */
  function eUbicazione(letto) {
    return String(letto == null ? "" : letto).toUpperCase().indexOf(PREFISSO) === 0;
  }

  /**
   * Il contrario: dal contenuto letto all'ubicazione, passando dal controllo.
   * E' l'unica porta d'ingresso di una lettura, cosi' non esiste un percorso
   * che salti la verifica.
   */
  function daLettura(letto) {
    var t = String(letto == null ? "" : letto).trim().toUpperCase();
    if (t.indexOf(PREFISSO) === 0) t = t.slice(PREFISSO.length);
    return verifica(t);
  }

  // ── Il foglio delle etichette ────────────────────────────────────────
  //
  // Un magazzino si etichetta una volta sola, e quella volta bisogna
  // stampare centinaia di etichette senza sbagliarne una. Quindi il foglio
  // si costruisce come testo, e si puo' collaudare senza stampante: quante
  // etichette, in che ordine, con che misure.
  //
  // FORMATI
  //   'a4'   fogli adesivi comuni, 3 colonne per 8 righe, 70x37 mm
  //   'rotolo' etichettatrice a rotolo, una per volta, 62x29 mm
  //
  // Le misure sono in millimetri veri: la stampa esce nella misura giusta
  // perche' la pagina e' dichiarata in millimetri, non in pixel.

  // Le misure sono in millimetri e non si indovinano: `qr` e `corpo` sono
  // scelti perche' il codice CI STIA. Un codice tagliato a meta' su mille
  // etichette gia' attaccate e' un magazzino da rietichettare.
  // Il conto lo rifa' `spazioTesto`, e un collaudo lo verifica.
  var FORMATI = {
    a4:     { nome: 'Foglio A4 adesivo', colonne: 3, righe: 8, largo: 70, alto: 37,
              pagina: 'A4', margine: 8, bordo: 2.5, vano: 3, qr: 26, corpo: 7, spaziatura: 0.3 },
    rotolo: { nome: 'Rotolo 62x29',      colonne: 1, righe: 1, largo: 62, alto: 29,
              pagina: '62mm 29mm', margine: 0, bordo: 2, vano: 2.5, qr: 22, corpo: 6, spaziatura: 0.2 }
  };

  /**
   * Quanto spazio resta al codice, e quanto ne chiede.
   * La larghezza di una cifra in grassetto sta intorno a 0,58 volte il corpo:
   * basta per sapere prima di stampare se il codice ci sta.
   */
  function spazioTesto(f, testo) {
    var disponibile = f.largo - (f.bordo * 2) - f.qr - f.vano;
    var n = String(testo || 'AA 01 01').length;
    var serve = n * 0.58 * f.corpo + (n - 1) * f.spaziatura;
    return { disponibile: disponibile, serve: serve, ci_sta: serve <= disponibile };
  }

  function _esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Il documento da stampare.
   *
   * `voci` sono ubicazioni gia' pronte: { leggibile, codice, qr } dove `qr`
   * e' l'immagine del codice, come indirizzo dati. Se manca, l'etichetta si
   * stampa lo stesso con il solo codice: meglio un'etichetta leggibile a
   * occhio che un buco sullo scaffale.
   */
  function foglioEtichette(voci, opzioni) {
    var o = opzioni || {};
    var f = FORMATI[o.formato] || FORMATI.a4;
    var elenco = voci || [];

    var etichette = elenco.map(function (v) {
      var qr = v.qr
        ? '<img class="qr" src="' + _esc(v.qr) + '" alt="">'
        : '<div class="qr vuoto"></div>';
      return '<div class="et">' + qr +
             '<div class="testo">' +
               '<div class="grande">' + _esc(v.leggibile) + '</div>' +
               '<div class="piccolo">' + _esc(v.codice) + '</div>' +
             '</div></div>';
    }).join('');

    // Le pagine si riempiono per righe: e' l'ordine in cui si staccano le
    // etichette dal foglio, e quindi l'ordine in cui si cammina fra gli
    // scaffali senza doverle cercare.
    return '<!doctype html><html lang="it"><head><meta charset="utf-8">' +
      '<title>Etichette ubicazioni</title><style>' +
      '@page { size: ' + f.pagina + '; margin: ' + f.margine + 'mm; }' +
      '* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
      'body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }' +
      '.foglio { display: grid; grid-template-columns: repeat(' + f.colonne + ', ' + f.largo + 'mm); }' +
      '.et { width: ' + f.largo + 'mm; height: ' + f.alto + 'mm;' +
            ' display: flex; align-items: center; gap: ' + f.vano + 'mm; padding: ' + f.bordo + 'mm;' +
            ' page-break-inside: avoid; break-inside: avoid; overflow: hidden; }' +
      '.qr { width: ' + f.qr + 'mm; height: ' + f.qr + 'mm; flex: none; }' +
      '.qr.vuoto { border: 0.4mm dashed #999; }' +
      '.testo { min-width: 0; }' +
      // La misura del codice grande e' la cosa che conta davvero: si deve
      // leggere da due metri, in piedi, con lo scaffale in ombra.
      '.grande { font-size: ' + f.corpo + 'mm; font-weight: 700; letter-spacing: ' + f.spaziatura + 'mm;' +
                ' line-height: 1; white-space: nowrap; }' +
      '.piccolo { font-size: 2.6mm; color: #444; margin-top: 1.5mm; font-family: monospace; }' +
      '@media screen { body { background: #eee; padding: 10mm; }' +
      '  .foglio { background: #fff; box-shadow: 0 0 2mm rgba(0,0,0,.3); }' +
      '  .et { outline: 0.2mm dashed #ccc; outline-offset: -0.2mm; } }' +
      '</style></head><body><div class="foglio">' + etichette + '</div></body></html>';
  }

  /** Quante etichette stanno in una pagina di questo formato. */
  function etichettePerPagina(formato) {
    var f = FORMATI[formato] || FORMATI.a4;
    return f.colonne * f.righe;
  }

  // ── Il deposito ──────────────────────────────────────────────────────
  //
  // Cosa c'e' dentro ogni ubicazione, e come ci entra e ci esce. Tutto
  // passa da qui, e tutto lascia una riga di movimento: un magazzino che non
  // sa spiegare perche' un pezzo e' sparito non e' un magazzino, e' uno
  // scaffale.

  /** Un deposito vuoto, con la mappa del magazzino che lo descrive. */
  function nuovoDeposito(mappa) {
    var d = { mappa: mappa || null, ubicazioni: {}, movimenti: [] };
    if (mappa) {
      genera(mappa).forEach(function (u) {
        d.ubicazioni[u.codice] = {
          codice: u.codice, leggibile: u.leggibile,
          corridoio: u.corridoio, scaffale: u.scaffale, ripiano: u.ripiano,
          articoli: []
        };
      });
    }
    return d;
  }

  function registra(d, tipo, dati) {
    d.movimenti.push(Object.assign({ ts: Date.now(), tipo: tipo }, dati));
    if (d.movimenti.length > 5000) d.movimenti = d.movimenti.slice(-5000);
  }

  /**
   * Mette un articolo in un'ubicazione.
   * Non si fida di niente: il codice ubicazione passa dalla verifica, la
   * quantita' dev'essere un numero intero positivo, e l'ubicazione deve
   * esistere davvero nella mappa.
   */
  function ubica(d, codUbi, articolo, quantita, chi) {
    var v = verifica(codUbi);
    if (!v.ok) return { ok: false, motivo: v.motivo };

    var u = d.ubicazioni[v.codice];
    if (!u) return { ok: false, motivo: "L'ubicazione " + v.leggibile + " non esiste in questo magazzino." };

    var art = String(articolo == null ? "" : articolo).trim().toUpperCase();
    if (!art) return { ok: false, motivo: "Manca il codice dell'articolo." };

    var q = Number(quantita);
    if (!isFinite(q) || q <= 0 || Math.floor(q) !== q) {
      return { ok: false, motivo: "La quantita' dev'essere un numero intero maggiore di zero." };
    }

    var riga = null;
    for (var i = 0; i < u.articoli.length; i++) if (u.articoli[i].cod === art) riga = u.articoli[i];
    if (riga) riga.qty += q; else u.articoli.push({ cod: art, qty: q, dal: Date.now() });

    registra(d, "ubica", { ubicazione: v.codice, cod: art, qty: q, chi: chi || "" });
    return { ok: true, ubicazione: v.codice, leggibile: v.leggibile, cod: art, qty: q, totale: (riga ? riga.qty : q) };
  }

  /**
   * Toglie un articolo da un'ubicazione.
   * Non si puo' togliere piu' di quello che c'e': un magazzino che va in
   * negativo ha perso il conto, e nessuno se ne accorge finche' non serve.
   */
  function disubica(d, codUbi, articolo, quantita, chi) {
    var v = verifica(codUbi);
    if (!v.ok) return { ok: false, motivo: v.motivo };

    var u = d.ubicazioni[v.codice];
    if (!u) return { ok: false, motivo: "L'ubicazione " + v.leggibile + " non esiste in questo magazzino." };

    var art = String(articolo == null ? "" : articolo).trim().toUpperCase();
    var pos = -1;
    for (var i = 0; i < u.articoli.length; i++) if (u.articoli[i].cod === art) pos = i;
    if (pos < 0) return { ok: false, motivo: art + " non e' in " + v.leggibile + "." };

    var riga = u.articoli[pos];
    var q = quantita == null ? riga.qty : Number(quantita);
    if (!isFinite(q) || q <= 0 || Math.floor(q) !== q) {
      return { ok: false, motivo: "La quantita' dev'essere un numero intero maggiore di zero." };
    }
    if (q > riga.qty) {
      return { ok: false, motivo: "In " + v.leggibile + " ce ne sono " + riga.qty + ", non " + q + "." };
    }

    riga.qty -= q;
    if (riga.qty === 0) u.articoli.splice(pos, 1);

    registra(d, "disubica", { ubicazione: v.codice, cod: art, qty: q, chi: chi || "" });
    return { ok: true, ubicazione: v.codice, leggibile: v.leggibile, cod: art, qty: q, restano: riga.qty };
  }

  /** Dove sta un articolo, e quanti ce ne sono in ogni posto. */
  function dove(d, articolo) {
    var art = String(articolo == null ? "" : articolo).trim().toUpperCase();
    var out = [];
    for (var k in d.ubicazioni) {
      var u = d.ubicazioni[k];
      for (var i = 0; i < u.articoli.length; i++) {
        if (u.articoli[i].cod === art) {
          out.push({ ubicazione: u.codice, leggibile: u.leggibile, qty: u.articoli[i].qty });
        }
      }
    }
    return out.sort(function (a, b) { return a.codice < b.codice ? -1 : 1; });
  }

  /** Quante righe e quanti pezzi ci sono in tutto. */
  function totali(d) {
    var righe = 0, pezzi = 0, piene = 0, vuote = 0;
    for (var k in d.ubicazioni) {
      var n = d.ubicazioni[k].articoli.length;
      if (n) piene++; else vuote++;
      righe += n;
      for (var i = 0; i < n; i++) pezzi += d.ubicazioni[k].articoli[i].qty;
    }
    return { ubicazioni: piene + vuote, piene: piene, vuote: vuote, righe: righe, pezzi: pezzi };
  }

  // ── Fuori ────────────────────────────────────────────────────────────

  var Magazzino = {
    pezzi: pezzi,
    controllo: controllo,
    codice: codice,
    leggibile: leggibile,
    perBarre: perBarre,
    verifica: verifica,
    corridoi: corridoi,
    genera: genera,
    quante: quante,
    contenutoEtichetta: contenutoEtichetta,
    daLettura: daLettura,
    eUbicazione: eUbicazione,
    FORMATI: FORMATI,
    foglioEtichette: foglioEtichette,
    etichettePerPagina: etichettePerPagina,
    spazioTesto: spazioTesto,
    nuovoDeposito: nuovoDeposito,
    ubica: ubica,
    disubica: disubica,
    dove: dove,
    totali: totali
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Magazzino;
  else radice.Magazzino = Magazzino;

})(typeof globalThis !== 'undefined' ? globalThis : this);
