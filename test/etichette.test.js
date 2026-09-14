// Le etichette: si stampano una volta sola, e quella volta devono uscire
// tutte e giuste.
//
// Il foglio si costruisce come testo, quindi si controlla senza stampante:
// che ci siano tutte, che le misure siano in millimetri veri, che il codice
// grande si legga, e che un nome con dentro un carattere strano non rompa
// la pagina.
//
//   node test/etichette.test.js

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
const quante = (h) => (h.match(/class="et"/g) || []).length;

gruppo('Il contenuto dell\'etichetta');

prova('porta "LOC:" davanti, per non confondersi con un articolo', () => {
  const c = M.codice('AA', '01', '01');
  const dentro = M.contenutoEtichetta(c);
  assert(dentro.indexOf('LOC:') === 0, dentro);
  eq(dentro.length, 12, 'LOC: piu otto caratteri');
});

prova('un\'ubicazione si riconosce, un codice articolo no', () => {
  const c = M.contenutoEtichetta(M.codice('AB', '03', '02'));
  assert(M.eUbicazione(c), 'non ha riconosciuto la sua etichetta');
  ['0986437433', 'AA010173', '', null, 'LOCANDA'].forEach((x) => {
    assert(!M.eUbicazione(x), JSON.stringify(x) + ' e passato per ubicazione');
  });
});

prova('quello che esce dal lettore rientra e torna al codice giusto', () => {
  M.genera({ daCorridoio: 'AA', aCorridoio: 'AC', scaffali: 4, ripiani: 3 }).forEach((u) => {
    const letto = M.contenutoEtichetta(u.codice);
    const v = M.daLettura(letto);
    assert(v.ok, u.codice + ': ' + v.motivo);
    eq(v.codice, u.codice);
  });
});

prova('un\'etichetta storpiata viene rifiutata anche col prefisso giusto', () => {
  const buono = M.contenutoEtichetta(M.codice('AA', '01', '01'));
  const corpo = buono.slice(4);
  const storto = 'LOC:' + corpo.slice(0, 6) + (corpo.slice(6) === '99' ? '98' : '99');
  assert(!M.daLettura(storto).ok, storto + ' e passato');
});

gruppo('Il foglio da stampare');

const UBI = M.genera({ daCorridoio: 'AA', aCorridoio: 'AB', scaffali: 6, ripiani: 2 });  // 24

prova('ci sono tutte le etichette, nessuna persa per strada', () => {
  eq(UBI.length, 24);
  eq(quante(M.foglioEtichette(UBI, { formato: 'a4' })), 24);
  eq(quante(M.foglioEtichette(UBI, { formato: 'rotolo' })), 24);
});

prova('un foglio vuoto non rompe niente', () => {
  [[], null, undefined].forEach((v) => {
    const h = M.foglioEtichette(v, { formato: 'a4' });
    eq(quante(h), 0);
    assert(/<\/html>/.test(h), 'documento incompleto');
  });
});

prova('ogni etichetta ha il codice grande e quello per esteso', () => {
  const h = M.foglioEtichette(UBI, { formato: 'a4' });
  UBI.forEach((u) => {
    assert(h.indexOf('>' + u.leggibile + '<') >= 0, 'manca il codice leggibile ' + u.leggibile);
    assert(h.indexOf('>' + u.codice + '<') >= 0, 'manca il codice intero ' + u.codice);
  });
});

prova('le misure sono in millimetri veri, non in pixel', () => {
  const h = M.foglioEtichette(UBI, { formato: 'a4' });
  assert(/@page \{ size: A4; margin: 8mm; \}/.test(h), 'la pagina non e dichiarata in A4');
  assert(/width: 70mm; height: 37mm/.test(h), 'l etichetta non e 70x37mm');
  assert(!/\d+px/.test(h), 'ci sono misure in pixel: la stampa uscirebbe sballata');
});

prova('il formato a rotolo cambia misure e pagina', () => {
  const h = M.foglioEtichette(UBI, { formato: 'rotolo' });
  assert(/size: 62mm 29mm/.test(h), 'la pagina non segue il rotolo');
  assert(/width: 62mm; height: 29mm/.test(h));
  assert(/repeat\(1,/.test(h), 'il rotolo deve avere una colonna sola');
});

prova('un formato che non esiste ricade sull\'A4 invece di sparire', () => {
  [{ formato: 'inventato' }, {}, undefined].forEach((o) => {
    const h = M.foglioEtichette(UBI, o);
    eq(quante(h), 24, JSON.stringify(o));
    assert(/size: A4/.test(h), JSON.stringify(o));
  });
});

prova('il conto delle etichette per pagina torna', () => {
  eq(M.etichettePerPagina('a4'), 24);
  eq(M.etichettePerPagina('rotolo'), 1);
  eq(M.etichettePerPagina('inventato'), 24, 'il formato ignoto ricade sull A4');
});

prova('l\'immagine del codice entra quando c\'e, e manca senza rompere', () => {
  const conQr = UBI.slice(0, 2).map((u) => Object.assign({}, u, { qr: 'data:image/png;base64,AAAA' }));
  const h1 = M.foglioEtichette(conQr, { formato: 'a4' });
  eq((h1.match(/<img class="qr"/g) || []).length, 2);

  const h2 = M.foglioEtichette(UBI.slice(0, 2), { formato: 'a4' });
  eq((h2.match(/<img class="qr"/g) || []).length, 0);
  eq((h2.match(/class="qr vuoto"/g) || []).length, 2, 'senza immagine resta il posto');
  eq(quante(h2), 2, 'le etichette ci sono comunque');
});

gruppo('Il foglio non si lascia rompere');

prova('un codice con dentro caratteri di markup non buca la pagina', () => {
  const cattivo = [{
    leggibile: '<script>alert(1)</script>',
    codice: 'AA"-01-01-42',
    qr: 'data:image/png;base64,AA"><script>x</script>'
  }];
  const h = M.foglioEtichette(cattivo, { formato: 'a4' });
  assert(h.indexOf('<script>alert(1)</script>') < 0, 'il markup e passato dritto');
  assert(h.indexOf('&lt;script&gt;') >= 0, 'il testo non e stato messo al sicuro');
  eq(quante(h), 1);
  // Il documento resta un documento: i tag aperti e quelli chiusi sono in pari.
  eq((h.match(/<div\b/g) || []).length, (h.match(/<\/div>/g) || []).length, "div sbilanciati");
});

gruppo("Il codice ci deve stare, o le etichette sono da rifare");

prova("in ogni formato il codice entra nello spazio che gli resta", () => {
  Object.keys(M.FORMATI).forEach((k) => {
    const f = M.FORMATI[k];
    const s = M.spazioTesto(f);
    assert(s.ci_sta, k + ": servono " + s.serve.toFixed(1) + "mm e ce ne sono " + s.disponibile.toFixed(1) + "mm");
  });
});

prova("resta un margine, non si sta al pelo", () => {
  Object.keys(M.FORMATI).forEach((k) => {
    const s = M.spazioTesto(M.FORMATI[k]);
    const margine = s.disponibile - s.serve;
    assert(margine >= 1, k + ": avanza solo " + margine.toFixed(1) + "mm, troppo poco per un carattere piu largo");
  });
});

prova("il quadrato e il codice stanno dentro la larghezza dell etichetta", () => {
  Object.keys(M.FORMATI).forEach((k) => {
    const f = M.FORMATI[k];
    const usato = f.bordo * 2 + f.qr + f.vano + M.spazioTesto(f).serve;
    assert(usato <= f.largo, k + ": servono " + usato.toFixed(1) + "mm su " + f.largo + "mm");
    assert(f.qr + f.bordo * 2 <= f.alto, k + ": il quadrato e piu alto dell etichetta");
  });
});

prova("un codice piu lungo del solito viene visto prima di stampare", () => {
  // Corridoi a due lettere e numeri a due cifre stanno. Se un giorno il
  // formato cresce, il conto lo deve dire prima, non la stampante dopo.
  const f = M.FORMATI.a4;
  assert(M.spazioTesto(f, "AA 01 01").ci_sta, "il formato di oggi deve starci");
  assert(!M.spazioTesto(f, "AAA 001 001 001").ci_sta, "un codice enorme deve risultare fuori misura");
});

prova("le misure dichiarate finiscono davvero nel foglio", () => {
  const f = M.FORMATI.a4;
  const h = M.foglioEtichette(UBI.slice(0, 1), { formato: "a4" });
  assert(h.indexOf("width: " + f.qr + "mm; height: " + f.qr + "mm") >= 0, "il quadrato non ha la misura dichiarata");
  assert(h.indexOf("font-size: " + f.corpo + "mm") >= 0, "il codice non ha il corpo dichiarato");
  assert(h.indexOf("padding: " + f.bordo + "mm") >= 0, "il bordo non e quello dichiarato");
});

console.log('\n' + '─'.repeat(48));
if (!falliti) {
  console.log('\x1b[32m\x1b[1m✓ ' + passati + ' prove superate\x1b[0m');
  process.exit(0);
}
console.log('\x1b[31m\x1b[1m✗ ' + falliti + ' fallite\x1b[0m, ' + passati + ' superate');
rotti.forEach(([n, m]) => console.log('  • ' + n + '\n    ' + m));
process.exit(1);
