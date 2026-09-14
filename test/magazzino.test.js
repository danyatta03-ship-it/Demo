// Il codice ubicazione: o rifiuta ogni lettura sbagliata, o non serve.
//
// Una cifra di controllo che "quasi sempre" funziona e' peggio di nessuna
// cifra di controllo, perche' fa fidare. Quindi qui non si prova a campione:
// si provano TUTTI gli errori di un carattere e TUTTE le inversioni di due
// caratteri vicini, su tutte le ubicazioni di un magazzino intero.
//
//   node test/magazzino.test.js

const M = require('../js/magazzino.js');

let passati = 0, falliti = 0;
const rotti = [];

function prova(nome, fn) {
  try { fn(); passati++; console.log('  \x1b[32m✓\x1b[0m ' + nome); }
  catch (e) {
    falliti++; rotti.push([nome, e.message]);
    console.log('  \x1b[31m✗\x1b[0m ' + nome);
    console.log('    \x1b[31m' + e.message + '\x1b[0m');
  }
}
function gruppo(n) { console.log('\n\x1b[1m' + n + '\x1b[0m'); }
function assert(v, m) { if (!v) throw new Error(m || 'atteso vero'); }
function eq(a, b, m) {
  if (a !== b) throw new Error((m ? m + ': ' : '') + 'atteso ' + JSON.stringify(b) + ', trovato ' + JSON.stringify(a));
}

// Un magazzino di prova: 4 corridoi, 12 scaffali, 4 ripiani.
const MAGAZZINO = { daCorridoio: 'AA', aCorridoio: 'AD', scaffali: 12, ripiani: 4 };
const TUTTE = M.genera(MAGAZZINO);

gruppo('Il codice si legge come lo legge una persona');

prova('"AA 01 01" si scrive come si dice', () => {
  eq(M.leggibile('AA-01-01-42'), 'AA 01 01');
});

prova('si accetta scritto in tutti i modi in cui uno lo scrive', () => {
  const atteso = M.codice('AA', '01', '01');
  ['AA0101', 'aa0101', 'AA-01-01', 'aa 01 01', '  AA  01  01 '].forEach((s) => {
    const v = M.verifica(s);
    assert(v.senzaControllo, s + ': doveva accorgersi che manca il controllo');
    eq(v.codice, atteso, s);
  });
});

prova('quello che non e\' un\'ubicazione viene detto, non indovinato', () => {
  ['', '   ', 'A1', 'AAA0101', 'AA010', '12-34-56', 'AA-01-01-01-01', null, undefined]
    .forEach((s) => {
      const v = M.verifica(s);
      assert(!v.ok, JSON.stringify(s) + ' e\' passata');
      assert(v.motivo && v.motivo.length > 10, JSON.stringify(s) + ': motivo assente o muto');
    });
});

gruppo('Le cifre di controllo — provate per esaurimento');

prova('ogni ubicazione generata si rilegge', () => {
  TUTTE.forEach((u) => {
    const v = M.verifica(u.codice);
    assert(v.ok, u.codice + ' non si rilegge: ' + v.motivo);
    eq(v.leggibile, u.leggibile, u.codice);
  });
});

prova('il controllo sta sempre fra 01 e 97, mai 00', () => {
  TUTTE.forEach((u) => {
    const c = u.codice.slice(-2);
    const n = Number(c);
    assert(/^\d{2}$/.test(c), u.codice + ': controllo non a due cifre');
    assert(n >= 1 && n <= 97, u.codice + ': controllo ' + n + ' fuori da 01..97');
  });
});

prova('NESSUN errore di un carattere passa', () => {
  // Per ogni ubicazione, per ogni posizione, per ogni altro carattere
  // possibile: il codice sbagliato deve essere rifiutato.
  const LETTERE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const CIFRE = '0123456789'.split('');
  let provati = 0, sfuggiti = [];

  TUTTE.forEach((u) => {
    const piatto = u.codice.replace(/-/g, '');        // AA010142
    for (let i = 0; i < piatto.length; i++) {
      const alfabeto = i < 2 ? LETTERE : CIFRE;
      alfabeto.forEach((ch) => {
        if (ch === piatto.charAt(i)) return;
        const guasto = piatto.slice(0, i) + ch + piatto.slice(i + 1);
        provati++;
        if (M.verifica(guasto).ok) sfuggiti.push(u.codice + ' → ' + guasto);
      });
    }
  });

  assert(provati > 5000, 'ne ho provati troppo pochi: ' + provati);
  assert(sfuggiti.length === 0,
    sfuggiti.length + ' errori su ' + provati + ' sono passati, es. ' + sfuggiti.slice(0, 3).join(', '));
  console.log('      (' + provati.toLocaleString('it-IT') + ' errori provati, nessuno passato)');
});

prova('NESSUNA inversione di due caratteri vicini passa', () => {
  // "AA 01 10" battuto al posto di "AA 01 01" non deve diventare
  // un'ubicazione valida: e' l'errore piu' frequente di chi batte a mano.
  let provate = 0, sfuggite = [];
  TUTTE.forEach((u) => {
    const piatto = u.codice.replace(/-/g, '');
    for (let i = 0; i < piatto.length - 1; i++) {
      const a = piatto.charAt(i), b = piatto.charAt(i + 1);
      if (a === b) continue;
      // Una lettera non si scambia con una cifra: verrebbe scartata dal
      // formato, non dal controllo, e non misurerebbe quello che voglio.
      const lettera = (c) => c >= 'A' && c <= 'Z';
      if (lettera(a) !== lettera(b)) continue;
      const guasto = piatto.slice(0, i) + b + a + piatto.slice(i + 2);
      provate++;
      if (M.verifica(guasto).ok) sfuggite.push(u.codice + ' → ' + guasto);
    }
  });
  assert(provate > 500, 'ne ho provate troppo poche: ' + provate);
  assert(sfuggite.length === 0,
    sfuggite.length + ' inversioni su ' + provate + ' sono passate, es. ' + sfuggite.slice(0, 3).join(', '));
  console.log('      (' + provate.toLocaleString('it-IT') + ' inversioni provate, nessuna passata)');
});

prova('due ubicazioni diverse non hanno mai lo stesso codice', () => {
  const visti = new Set();
  TUTTE.forEach((u) => {
    assert(!visti.has(u.codice), 'codice ripetuto: ' + u.codice);
    visti.add(u.codice);
  });
  eq(visti.size, TUTTE.length);
});

gruppo('La mappa del magazzino');

prova('vengono fuori tutte quelle che devono', () => {
  eq(TUTTE.length, 4 * 12 * 4);
  eq(M.quante(MAGAZZINO), TUTTE.length, 'il conto anticipato non torna');
});

prova('la prima e l\'ultima sono quelle giuste', () => {
  eq(TUTTE[0].leggibile, 'AA 01 01');
  eq(TUTTE[TUTTE.length - 1].leggibile, 'AD 12 04');
});

prova('i corridoi si contano come si contano le lettere', () => {
  eq(M.corridoi('AA', 'AC').join(','), 'AA,AB,AC');
  eq(M.corridoi('AY', 'BB').join(','), 'AY,AZ,BA,BB', 'il passaggio da AZ a BA');
  eq(M.corridoi('AC', 'AA').length, 0, 'all\'incontrario non ne esce nessuna');
});

prova('una mappa assurda non fa esplodere niente', () => {
  eq(M.quante({ daCorridoio: 'AA', aCorridoio: 'AA', scaffali: 0, ripiani: -3 }), 1);
  eq(M.quante({ daCorridoio: 'AA', aCorridoio: 'AA', scaffali: 5000, ripiani: 5000 }), 99 * 99);
});

gruppo('Quello che finisce dentro l\'etichetta');

prova('nel codice a barre ci va il codice intero, controllo compreso', () => {
  const c = TUTTE[0].codice;
  const dentro = M.contenutoEtichetta(c);
  // "LOC:" davanti dice al lettore che e un ubicazione e non un articolo.
  eq(dentro, 'LOC:' + c.replace(/-/g, ''), 'il contenuto non corrisponde al codice');
  eq(dentro.length, 12, 'LOC: piu otto caratteri');
});

prova('quello che esce dal lettore rientra dalla porta giusta', () => {
  TUTTE.slice(0, 50).forEach((u) => {
    const letto = M.contenutoEtichetta(u.codice);
    const v = M.daLettura(letto);
    assert(v.ok, u.codice + ': la lettura non torna indietro');
    eq(v.codice, u.codice);
  });
});

prova('una lettura sporca viene rifiutata, non aggiustata', () => {
  const letto = M.contenutoEtichetta(TUTTE[0].codice);
  ['X' + letto, letto + 'X', letto.slice(1), letto.slice(0, -1)].forEach((s) => {
    assert(!M.daLettura(s).ok, '"' + s + '" e\' passata');
  });
});

console.log('\n' + '─'.repeat(48));
if (!falliti) {
  console.log('\x1b[32m\x1b[1m✓ ' + passati + ' prove superate\x1b[0m');
  process.exit(0);
}
console.log('\x1b[31m\x1b[1m✗ ' + falliti + ' fallite\x1b[0m, ' + passati + ' superate');
rotti.forEach(([n, m]) => console.log('  • ' + n + '\n    ' + m));
process.exit(1);
