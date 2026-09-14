// Il deposito: quello che entra in un'ubicazione e quello che ne esce.
//
// Le regole sono poche e non si negoziano:
//
//   non si ubica in un posto che non esiste
//   non si ubica con un codice letto male
//   non si toglie piu' di quello che c'e'
//   una quantita' che non e' una quantita' viene rifiutata
//   ogni movimento riuscito lascia una riga, ogni rifiuto non ne lascia
//
// L'ultima e' quella che conta il giorno in cui manca un pezzo: un magazzino
// che non sa spiegare perche' qualcosa e' sparito non e' un magazzino, e' uno
// scaffale.
//
//   node test/deposito.test.js

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

const MAPPA = { daCorridoio: 'AA', aCorridoio: 'AD', scaffali: 12, ripiani: 4 };
const TUTTE = M.genera(MAPPA);
const PRIMA = TUTTE[0].codice;
const SECONDA = TUTTE[1].codice;
const nuovo = () => M.nuovoDeposito(MAPPA);

gruppo('Un deposito appena nato');

prova('ha tutte le ubicazioni della mappa e nessun pezzo', () => {
  const d = nuovo();
  const t = M.totali(d);
  eq(t.ubicazioni, 192);
  eq(t.vuote, 192);
  eq(t.piene, 0);
  eq(t.pezzi, 0);
  eq(d.movimenti.length, 0);
});

gruppo('Ubicare');

prova('il pezzo si trova dove lo abbiamo messo', () => {
  const d = nuovo();
  const r = M.ubica(d, PRIMA, '0986437433', 6, 'MAG');
  assert(r.ok, r.motivo);
  eq(r.qty, 6);
  const dove = M.dove(d, '0986437433');
  eq(dove.length, 1);
  eq(dove[0].qty, 6);
  eq(M.totali(d).pezzi, 6);
});

prova('lo stesso codice due volte somma, non duplica la riga', () => {
  const d = nuovo();
  M.ubica(d, PRIMA, 'ABC123', 4);
  M.ubica(d, PRIMA, 'abc123', 3);        // scritto minuscolo: e' lo stesso
  eq(d.ubicazioni[PRIMA].articoli.length, 1, 'righe');
  eq(d.ubicazioni[PRIMA].articoli[0].qty, 7);
});

prova('lo stesso articolo puo stare in due posti diversi', () => {
  const d = nuovo();
  M.ubica(d, PRIMA, 'X1', 2);
  M.ubica(d, SECONDA, 'X1', 5);
  const dove = M.dove(d, 'X1');
  eq(dove.length, 2);
  eq(dove.reduce((s, x) => s + x.qty, 0), 7);
});

prova('si accetta il codice ubicazione scritto come capita', () => {
  const p = M.pezzi(PRIMA);
  const forme = [
    PRIMA,
    PRIMA.replace(/-/g, ''),
    PRIMA.toLowerCase(),
    p.corridoio + ' ' + p.scaffale + ' ' + p.ripiano + ' ' + p.controllo
  ];
  forme.forEach((f) => {
    const d = nuovo();
    const r = M.ubica(d, f, 'X1', 1);
    assert(r.ok, JSON.stringify(f) + ': ' + r.motivo);
  });
});

gruppo('Ubicare — quello che deve essere rifiutato');

prova('un posto che non esiste nella mappa', () => {
  const d = nuovo();
  const fuoriMappa = M.codice('ZZ', '99', '99');
  const r = M.ubica(d, fuoriMappa, 'X1', 1);
  assert(!r.ok);
  assert(/non esiste/i.test(r.motivo), r.motivo);
  eq(M.totali(d).pezzi, 0, 'non deve essere entrato niente');
});

prova('un codice ubicazione col controllo sbagliato', () => {
  const d = nuovo();
  const giusto = PRIMA.replace(/-/g, '');
  const storto = giusto.slice(0, 6) + (giusto.slice(6) === '99' ? '98' : '99');
  const r = M.ubica(d, storto, 'X1', 1);
  assert(!r.ok, 'ha ubicato con un controllo sbagliato');
  assert(/controllo/i.test(r.motivo), r.motivo);
  eq(M.totali(d).pezzi, 0);
});

prova('un articolo senza codice', () => {
  const d = nuovo();
  ['', '   ', null, undefined].forEach((a) => {
    const r = M.ubica(d, PRIMA, a, 1);
    assert(!r.ok, JSON.stringify(a) + ' e passato');
  });
});

prova('una quantita che non e una quantita', () => {
  const d = nuovo();
  [0, -1, 2.5, 'tre', null, undefined, Infinity, NaN].forEach((q) => {
    const r = M.ubica(d, PRIMA, 'X1', q);
    assert(!r.ok, JSON.stringify(q) + ' e passata');
  });
  eq(M.totali(d).pezzi, 0);
});

gruppo('Disubicare');

prova('il conto torna', () => {
  const d = nuovo();
  M.ubica(d, PRIMA, 'X1', 10);
  const r = M.disubica(d, PRIMA, 'X1', 4);
  assert(r.ok, r.motivo);
  eq(r.restano, 6);
  eq(M.totali(d).pezzi, 6);
});

prova('togliendo tutto la riga sparisce, non resta a zero', () => {
  const d = nuovo();
  M.ubica(d, PRIMA, 'X1', 3);
  M.disubica(d, PRIMA, 'X1', 3);
  eq(d.ubicazioni[PRIMA].articoli.length, 0);
  eq(M.totali(d).vuote, 192);
});

prova('senza quantita si porta via tutto quello che c\'e', () => {
  const d = nuovo();
  M.ubica(d, PRIMA, 'X1', 7);
  const r = M.disubica(d, PRIMA, 'X1');
  assert(r.ok, r.motivo);
  eq(r.qty, 7);
  eq(M.totali(d).pezzi, 0);
});

prova('non si toglie piu di quello che c\'e', () => {
  const d = nuovo();
  M.ubica(d, PRIMA, 'X1', 3);
  const r = M.disubica(d, PRIMA, 'X1', 4);
  assert(!r.ok, 'il magazzino e andato in negativo');
  assert(/ce ne sono 3/.test(r.motivo), r.motivo);
  eq(M.totali(d).pezzi, 3, 'non deve essere uscito niente');
});

prova('non si toglie quello che non c\'e', () => {
  const d = nuovo();
  M.ubica(d, PRIMA, 'X1', 1);
  const r = M.disubica(d, PRIMA, 'MAI-VISTO', 1);
  assert(!r.ok);
  assert(/non e/i.test(r.motivo), r.motivo);
  eq(M.totali(d).pezzi, 1);
});

gruppo('I movimenti — un magazzino deve sapere spiegarsi');

prova('ogni operazione riuscita lascia una riga', () => {
  const d = nuovo();
  M.ubica(d, PRIMA, 'X1', 5, 'MAG');
  M.disubica(d, PRIMA, 'X1', 2, 'MAG');
  eq(d.movimenti.length, 2);
  eq(d.movimenti[0].tipo, 'ubica');
  eq(d.movimenti[1].tipo, 'disubica');
  eq(d.movimenti[1].qty, 2);
  eq(d.movimenti[1].cod, 'X1');
  eq(d.movimenti[1].chi, 'MAG');
  assert(d.movimenti[0].ts > 0, 'senza ora');
  eq(d.movimenti[0].ubicazione, PRIMA);
});

prova('un\'operazione rifiutata non lascia niente', () => {
  const d = nuovo();
  M.ubica(d, M.codice('ZZ', '99', '99'), 'X1', 1);   // posto inesistente
  M.ubica(d, PRIMA, 'X1', -5);                        // quantita assurda
  M.disubica(d, PRIMA, 'X1', 1);                      // non c'e niente
  eq(d.movimenti.length, 0);
});

prova('i movimenti non crescono all\'infinito', () => {
  const d = nuovo();
  for (let i = 0; i < 5200; i++) M.ubica(d, PRIMA, 'X1', 1);
  assert(d.movimenti.length <= 5000, 'sono ' + d.movimenti.length);
  eq(d.ubicazioni[PRIMA].articoli[0].qty, 5200, 'la giacenza non si tocca');
});

console.log('\n' + '─'.repeat(48));
if (!falliti) {
  console.log('\x1b[32m\x1b[1m✓ ' + passati + ' prove superate\x1b[0m');
  process.exit(0);
}
console.log('\x1b[31m\x1b[1m✗ ' + falliti + ' fallite\x1b[0m, ' + passati + ' superate');
rotti.forEach(([n, m]) => console.log('  • ' + n + '\n    ' + m));
process.exit(1);
