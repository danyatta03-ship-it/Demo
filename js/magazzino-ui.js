/* ═══════════════════════════════════════════════════════════════════════
   MAGAZZINO — l'interfaccia

   Due cose, e si attaccano al guscio dell'app senza riscriverlo.

   LA SCELTA ALL'INGRESSO
     Appena si entra si sceglie il reparto: magazzino o resi. Non e' una
     preferenza da nascondere nelle impostazioni: sono due mestieri diversi,
     e chi fa il magazziniere non deve passare la giornata a scansare le
     schede che non gli servono. La scelta resta finche' non la si cambia
     dal nome del reparto, in alto.

   LE ETICHETTE
     Si descrive il magazzino una volta sola — da che corridoio a che
     corridoio, quanti scaffali, quanti ripiani — e vengono fuori tutte le
     ubicazioni. Da li' si stampano le etichette, tutte insieme, nell'ordine
     in cui si cammina fra gli scaffali.

   Il disegno del foglio e le regole del codice stanno in magazzino.js, che
   si collauda senza browser. Qui c'e' solo quello che ha bisogno di uno
   schermo.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var M = window.Magazzino;
  if (!M) { try { console.warn('magazzino.js non caricato'); } catch (e) {} return; }

  // ── Dove vivono le cose ──────────────────────────────────────────────

  var CHIAVE_REPARTO = 'reparto';
  var CHIAVE_DEPOSITO = 'magazzino';

  var REPARTI = {
    magazzino: {
      nome: 'Magazzino',
      sotto: 'Ubicazioni, etichette, giacenze',
      schede: ['tabMag', 'tabList', 'tabUbi', 'tabCon']
    },
    resi: {
      nome: 'Resi',
      sotto: 'Ricevimento bolle, pratiche, anomalie',
      schede: null          // null: restano tutte quelle di sempre
    }
  };

  var deposito = null;

  function leggiDeposito() {
    if (deposito) return deposito;
    try {
      var g = localStorage.getItem(CHIAVE_DEPOSITO);
      if (g) deposito = JSON.parse(g);
    } catch (e) { deposito = null; }
    if (!deposito || !deposito.ubicazioni) deposito = M.nuovoDeposito(null);
    return deposito;
  }

  function salvaDeposito() {
    try { localStorage.setItem(CHIAVE_DEPOSITO, JSON.stringify(deposito)); }
    catch (e) { avvisa('Non sono riuscito a salvare: la memoria del browser è piena.', 'r'); }
  }

  function avvisa(testo, tono) {
    if (typeof toast === 'function') toast(testo, tono || 'b');
  }

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── La scelta del reparto ────────────────────────────────────────────

  function repartoAttivo() {
    try { return localStorage.getItem(CHIAVE_REPARTO) || null; } catch (e) { return null; }
  }

  function scegliReparto(id) {
    if (!REPARTI[id]) return;
    try { localStorage.setItem(CHIAVE_REPARTO, id); } catch (e) {}
    var velo = document.getElementById('repVelo');
    if (velo) velo.style.display = 'none';
    applicaReparto();
  }

  /** Accende le schede del reparto scelto e spegne le altre. */
  function applicaReparto() {
    var id = repartoAttivo();
    var r = REPARTI[id];
    if (!r) return;

    var tutte = ['tabIns', 'tabList', 'tabAno', 'tabMag', 'tabUbi', 'tabTri',
                 'tabHist', 'tabNotif', 'tabPortale', 'tabCon'];
    tutte.forEach(function (t) {
      var el = document.getElementById(t);
      if (!el) return;
      el.style.display = (!r.schede || r.schede.indexOf(t) >= 0) ? '' : 'none';
    });

    var eti = document.getElementById('repNome');
    if (eti) eti.textContent = r.nome;

    // Se la scheda aperta non appartiene piu' al reparto, si va sulla prima
    // che c'e': lasciare a video una pagina che il reparto non usa e' il
    // modo piu' rapido per far pensare che l'app sia rotta.
    if (r.schede) {
      var prima = document.getElementById(r.schede[0]);
      var aperta = document.querySelector('#mainTabs .tab.on');
      if (aperta && r.schede.indexOf(aperta.id) < 0 && prima) prima.click();
    }
  }

  function apriSceltaReparto() {
    var velo = document.getElementById('repVelo');
    if (velo) { velo.style.display = 'flex'; return; }

    velo = document.createElement('div');
    velo.id = 'repVelo';
    velo.style.cssText = 'position:fixed;inset:0;z-index:7000;background:#0a0a0a;' +
      'display:flex;align-items:center;justify-content:center;padding:20px';

    var dentro = '<div style="width:100%;max-width:420px">' +
      '<div style="text-align:center;margin-bottom:26px">' +
        '<div style="font-size:19px;font-weight:800;letter-spacing:.5px;color:#3B9FD4">DOVE LAVORI OGGI</div>' +
        '<div style="font-size:12.5px;color:#777;margin-top:7px">Si cambia quando vuoi, dal nome del reparto in alto</div>' +
      '</div>';

    Object.keys(REPARTI).forEach(function (k) {
      var r = REPARTI[k];
      dentro += '<button class="rep-scelta" data-rep="' + k + '" style="' +
        'width:100%;display:block;text-align:left;background:#111;border:1.5px solid #2a2a2a;' +
        'border-radius:14px;padding:18px 20px;margin-bottom:12px;cursor:pointer;' +
        '-webkit-appearance:none;font-family:inherit;color:inherit">' +
        '<div style="font-size:17px;font-weight:800;color:#3B9FD4">' + esc(r.nome) + '</div>' +
        '<div style="font-size:12.5px;color:#888;margin-top:4px">' + esc(r.sotto) + '</div>' +
        '</button>';
    });

    dentro += '</div>';
    velo.innerHTML = dentro;
    document.body.appendChild(velo);

    velo.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.rep-scelta') : null;
      if (b && b.dataset.rep) scegliReparto(b.dataset.rep);
    });
  }

  // ── La scheda MAGAZZINO ──────────────────────────────────────────────

  function disegnaMagazzino() {
    var pg = document.getElementById('pgMag');
    if (!pg) return;
    var d = leggiDeposito();
    var t = M.totali(d);

    var h = '';

    // Cosa c'e' adesso.
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">' +
      misura(t.ubicazioni, 'UBICAZIONI') +
      misura(t.piene, 'OCCUPATE') +
      misura(t.righe, 'ARTICOLI') +
      misura(t.pezzi, 'PEZZI') +
      '</div>';

    // La mappa del magazzino.
    var m = d.mappa || { daCorridoio: 'AA', aCorridoio: 'AD', scaffali: 12, ripiani: 4 };
    h += '<div class="card" style="margin-bottom:14px">' +
      '<div style="font-size:13px;font-weight:800;color:#3B9FD4;margin-bottom:4px">LA MAPPA DEL MAGAZZINO</div>' +
      '<div style="font-size:11.5px;color:#777;margin-bottom:12px">' +
        'Si descrive una volta: da che corridoio a che corridoio, quanti scaffali per corridoio, quanti ripiani per scaffale.</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:9px">' +
        campo('magDa', 'Dal corridoio', m.daCorridoio, 'text', 'AA') +
        campo('magA', 'Al corridoio', m.aCorridoio, 'text', 'AD') +
        campo('magScaffali', 'Scaffali per corridoio', m.scaffali, 'number', '12') +
        campo('magRipiani', 'Ripiani per scaffale', m.ripiani, 'number', '4') +
      '</div>' +
      '<div id="magConto" style="font-size:12px;color:#888;margin:12px 0 10px"></div>' +
      '<button id="magGenera" class="btn-primario" style="' +
        'background:#3B9FD4;color:#001;border:none;border-radius:9px;padding:11px 16px;' +
        'font-size:13px;font-weight:800;cursor:pointer;-webkit-appearance:none;font-family:inherit">' +
        'Crea le ubicazioni</button>' +
      '</div>';

    // Le etichette.
    if (t.ubicazioni) {
      h += '<div class="card" style="margin-bottom:14px">' +
        '<div style="font-size:13px;font-weight:800;color:#3B9FD4;margin-bottom:4px">ETICHETTE</div>' +
        '<div style="font-size:11.5px;color:#777;margin-bottom:12px">' +
          'Escono nell’ordine in cui si cammina fra gli scaffali, così si attaccano senza cercarle.</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">' +
          '<div style="flex:1;min-width:150px">' +
            '<label style="display:block;font-size:11px;color:#888;margin-bottom:4px">Formato</label>' +
            '<select id="magFormato" style="width:100%;background:#0e0e0e;color:#fff;border:1px solid #2a2a2a;' +
              'border-radius:8px;padding:10px;font-size:13px;font-family:inherit">' +
              '<option value="a4">Foglio A4 adesivo (24 per pagina)</option>' +
              '<option value="rotolo">Rotolo 62×29 mm (una per volta)</option>' +
            '</select>' +
          '</div>' +
          '<button id="magStampa" style="background:rgba(59,159,212,.12);color:#3B9FD4;' +
            'border:1px solid rgba(59,159,212,.4);border-radius:9px;padding:11px 16px;font-size:13px;' +
            'font-weight:800;cursor:pointer;-webkit-appearance:none;font-family:inherit">' +
            'Stampa tutte (' + t.ubicazioni + ')</button>' +
        '</div>' +
        '<div id="magStampaNota" style="font-size:11.5px;color:#666;margin-top:10px"></div>' +
        '</div>';

      // L'elenco.
      h += '<div class="card">' +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">' +
          '<div style="font-size:13px;font-weight:800;color:#3B9FD4;flex:1">UBICAZIONI</div>' +
        '</div>' +
        '<input id="magCerca" placeholder="Cerca ubicazione o articolo…" style="width:100%;' +
          'background:#0e0e0e;color:#fff;border:1px solid #2a2a2a;border-radius:8px;padding:10px 12px;' +
          'font-size:13px;margin-bottom:10px;font-family:inherit">' +
        '<div id="magElenco"></div>' +
        '</div>';
    }

    pg.innerHTML = h;
    aggiornaConto();
    disegnaElenco();

    on('magGenera', 'click', generaUbicazioni);
    on('magStampa', 'click', stampaEtichette);
    ['magDa', 'magA', 'magScaffali', 'magRipiani'].forEach(function (id) {
      on(id, 'input', aggiornaConto);
    });
    on('magCerca', 'input', disegnaElenco);
  }

  function misura(n, etichetta) {
    return '<div style="background:#111;border:1px solid #2a2a2a;border-radius:10px;padding:11px 9px;text-align:center">' +
      '<div style="font-size:20px;font-weight:800;color:#3B9FD4;line-height:1">' + n + '</div>' +
      '<div style="font-size:9.5px;color:#777;margin-top:4px;letter-spacing:.4px">' + etichetta + '</div></div>';
  }

  function campo(id, etichetta, valore, tipo, esempio) {
    return '<div><label style="display:block;font-size:11px;color:#888;margin-bottom:4px">' + etichetta + '</label>' +
      '<input id="' + id + '" type="' + tipo + '" value="' + esc(valore) + '" placeholder="' + esc(esempio) + '" ' +
      'style="width:100%;background:#0e0e0e;color:#fff;border:1px solid #2a2a2a;border-radius:8px;' +
      'padding:10px 12px;font-size:13px;font-family:inherit"></div>';
  }

  function on(id, evento, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(evento, fn);
  }

  function mappaDalModulo() {
    return {
      daCorridoio: (val('magDa') || 'AA').toUpperCase(),
      aCorridoio: (val('magA') || 'AA').toUpperCase(),
      scaffali: Number(val('magScaffali')) || 1,
      ripiani: Number(val('magRipiani')) || 1
    };
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value).trim() : '';
  }

  /** Quante ne verrebbero, detto prima di farle. */
  function aggiornaConto() {
    var el = document.getElementById('magConto');
    if (!el) return;
    var n = M.quante(mappaDalModulo());
    var prime = M.genera(mappaDalModulo()).slice(0, 1)[0];
    if (!n || !prime) {
      el.innerHTML = '<span style="color:#E6B03C">Da questa mappa non esce nessuna ubicazione: controlla i corridoi.</span>';
      return;
    }
    var fogli = Math.ceil(n / M.etichettePerPagina('a4'));
    el.innerHTML = '<strong style="color:#ddd">' + n + '</strong> ubicazioni, dalla <strong style="color:#3B9FD4">' +
      esc(prime.leggibile) + '</strong> in avanti · ' + fogli + (fogli === 1 ? ' foglio A4' : ' fogli A4');
  }

  function generaUbicazioni() {
    var mappa = mappaDalModulo();
    var n = M.quante(mappa);
    if (!n) { avvisa('Da questa mappa non esce nessuna ubicazione.', 'r'); return; }
    if (n > 5000) { avvisa('Sono ' + n + ' ubicazioni: troppe per una volta sola.', 'r'); return; }

    var d = leggiDeposito();
    var pieneFuori = [];
    var nuove = M.nuovoDeposito(mappa);

    // Quello che c'e' dentro non si butta perche' cambia la mappa. Se
    // un'ubicazione piena non esiste piu', lo si dice invece di cancellarla
    // in silenzio: da qualche parte, su uno scaffale, quei pezzi ci sono.
    for (var k in d.ubicazioni) {
      var vecchia = d.ubicazioni[k];
      if (!vecchia.articoli.length) continue;
      if (nuove.ubicazioni[k]) nuove.ubicazioni[k].articoli = vecchia.articoli;
      else pieneFuori.push(vecchia.leggibile);
    }

    if (pieneFuori.length) {
      var elenco = pieneFuori.slice(0, 5).join(', ') + (pieneFuori.length > 5 ? '…' : '');
      if (!confirm('Attenzione: ' + pieneFuori.length + ' ubicazioni con merce dentro non esistono in questa mappa (' +
                   elenco + ').\n\nSe continui, quelle giacenze spariscono. Procedo?')) return;
    }

    nuove.movimenti = d.movimenti || [];
    deposito = nuove;
    salvaDeposito();
    avvisa(n + ' ubicazioni create', 'b');
    disegnaMagazzino();
  }

  // ── Stampare ─────────────────────────────────────────────────────────

  /**
   * Il codice a barre come immagine.
   * La libreria disegna dentro un elemento; da li' si prende la tela e la si
   * porta via come immagine, perche' la pagina di stampa e' un'altra finestra
   * e la libreria non ci abita.
   */
  function immagineCodice(contenuto) {
    if (typeof QRCode === 'undefined') return null;
    var tmp = document.createElement('div');
    tmp.style.cssText = 'position:absolute;left:-9999px;top:0';
    document.body.appendChild(tmp);
    var dati = null;
    try {
      new QRCode(tmp, {
        text: contenuto, width: 240, height: 240,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      var tela = tmp.querySelector('canvas');
      if (tela) dati = tela.toDataURL('image/png');
      else {
        var img = tmp.querySelector('img');
        if (img && img.src) dati = img.src;
      }
    } catch (e) { dati = null; }
    tmp.remove();
    return dati;
  }

  function stampaEtichette() {
    var d = leggiDeposito();
    var formato = val('magFormato') || 'a4';
    var nota = document.getElementById('magStampaNota');

    var codici = Object.keys(d.ubicazioni).sort();
    if (!codici.length) { avvisa('Non ci sono ubicazioni da stampare.', 'r'); return; }

    if (nota) nota.textContent = 'Preparo ' + codici.length + ' etichette…';

    var senzaCodice = 0;
    var voci = codici.map(function (k) {
      var u = d.ubicazioni[k];
      var qr = immagineCodice(M.contenutoEtichetta(u.codice));
      if (!qr) senzaCodice++;
      return { leggibile: u.leggibile, codice: u.codice, qr: qr };
    });

    var pagina = window.open('', '_blank');
    if (!pagina) {
      if (nota) nota.innerHTML = '<span style="color:#E6B03C">Il browser ha bloccato la finestra di stampa: ' +
        'consenti le finestre a comparsa per questo sito e riprova.</span>';
      return;
    }
    pagina.document.write(M.foglioEtichette(voci, { formato: formato }));
    pagina.document.close();
    pagina.focus();
    setTimeout(function () { try { pagina.print(); } catch (e) {} }, 400);

    if (nota) {
      nota.innerHTML = codici.length + ' etichette pronte nella finestra di stampa.' +
        (senzaCodice ? ' <span style="color:#E6B03C">' + senzaCodice +
          ' senza codice a barre: si leggono comunque a occhio.</span>' : '');
    }
  }

  // ── L'elenco ─────────────────────────────────────────────────────────

  function disegnaElenco() {
    var el = document.getElementById('magElenco');
    if (!el) return;
    var d = leggiDeposito();
    var q = (val('magCerca') || '').toUpperCase();

    var codici = Object.keys(d.ubicazioni).sort().filter(function (k) {
      if (!q) return true;
      var u = d.ubicazioni[k];
      if (u.leggibile.indexOf(q) >= 0 || u.codice.indexOf(q) >= 0) return true;
      for (var i = 0; i < u.articoli.length; i++) if (u.articoli[i].cod.indexOf(q) >= 0) return true;
      return false;
    });

    if (!codici.length) {
      el.innerHTML = '<div style="text-align:center;padding:22px;color:#555;font-size:12.5px">' +
        (q ? 'Nessuna ubicazione e nessun articolo con “' + esc(q) + '”.' : 'Nessuna ubicazione.') + '</div>';
      return;
    }

    // Con molte ubicazioni si mostra solo l'inizio: mille righe su un
    // telefono non si scorrono, si subiscono.
    var mostrate = codici.slice(0, 200);
    var h = mostrate.map(function (k) {
      var u = d.ubicazioni[k];
      var pezzi = u.articoli.reduce(function (s, a) { return s + a.qty; }, 0);
      var righe = u.articoli.map(function (a) {
        return '<div style="display:flex;gap:8px;padding:5px 0;border-top:1px solid #1a1a1a">' +
          '<span style="flex:1;font-family:monospace;font-size:12px;color:#ccc">' + esc(a.cod) + '</span>' +
          '<span style="font-size:12px;color:#888">×' + a.qty + '</span></div>';
      }).join('');

      return '<div style="background:#0e0e0e;border:1px solid #1f1f1f;border-left:3px solid ' +
        (u.articoli.length ? '#3B9FD4' : '#2a2a2a') + ';border-radius:9px;padding:10px 12px;margin-bottom:7px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="font-size:15px;font-weight:800;color:' + (u.articoli.length ? '#3B9FD4' : '#666') + ';' +
            'font-family:monospace;letter-spacing:1px;flex:1">' + esc(u.leggibile) + '</span>' +
          '<span style="font-size:10.5px;color:#666;font-family:monospace">' + esc(u.codice) + '</span>' +
          (u.articoli.length
            ? '<span style="font-size:10.5px;color:#888;background:#1a1a1a;padding:2px 7px;border-radius:5px">' +
              u.articoli.length + ' art · ' + pezzi + ' pz</span>'
            : '<span style="font-size:10.5px;color:#444">vuota</span>') +
        '</div>' + righe + '</div>';
    }).join('');

    if (codici.length > mostrate.length) {
      h += '<div style="text-align:center;padding:12px;color:#666;font-size:12px">' +
        'Ne mostro ' + mostrate.length + ' su ' + codici.length + '. Cerca per restringere.</div>';
    }
    el.innerHTML = h;
  }

  // ── Attacco al guscio ────────────────────────────────────────────────

  window.magDisegna = disegnaMagazzino;
  window.magApriScelta = apriSceltaReparto;
  window.magApplicaReparto = applicaReparto;
  window.magRepartoAttivo = repartoAttivo;

  /**
   * Chiamata da launchApp. Aspetta che l'app sia davvero in piedi prima di
   * chiedere il reparto: sopra il login o sopra la richiesta di collegamento
   * al database, la domanda coprirebbe quello che si sta facendo, e chi
   * guarda vedrebbe il velo al posto della pagina che si aspettava.
   */
  window.magDopoAccesso = function () {
    var tentativi = 0;
    (function aspetta() {
      var barra = document.getElementById('mainTabs');
      var login = document.getElementById('initPopup');
      var prontaBarra = barra && getComputedStyle(barra).display !== 'none';
      var loginChiuso = !login || getComputedStyle(login).display === 'none';

      if (prontaBarra && loginChiuso) {
        if (repartoAttivo()) applicaReparto();
        else apriSceltaReparto();
        return;
      }
      // Venti secondi e poi si lascia perdere: meglio nessuna domanda che
      // una domanda che compare da sola mezz'ora dopo, sopra altro.
      if (++tentativi < 80) setTimeout(aspetta, 250);
    })();
  };

})();
