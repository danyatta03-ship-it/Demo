// Gli articoli e le giacenze: cosa c'e' in magazzino, e quanto vale.
//
// Un'ubicazione dice DOVE sta un codice e QUANTI ce ne sono. Non dice cosa
// sia quel codice ne' quanto vale: quello e' l'articolo, e vive una volta
// sola. La lista del magazzino si legge per codice, non per scaffale, perche'
// la domanda vera e' "quanti ne ho e dove stanno", non "cosa c'e' in AB 03".
//
//   node test/giacenze.test.js

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

const MAPPA = { daCorridoio: 'AA', aCorridoio: 'AB', scaffali: 4, ripiani: 2 };
const TUTTE = M.genera(MAPPA);
const A = TUTTE[0].codice, B = TUTTE[1].codice;
const nuovo = () => M.nuovoDeposito(MAPPA);

gruppo('Il prezzo, scritto come lo scrive una persona');

prova('la virgola e il punto valgono uguale', () => {
  eq(M.prezzo('12,50'), 12.5);
  eq(M.prezzo('12.50'), 12.5);
  eq(M.prezzo(' 12,50 '), 12.5);
  eq(M.prezzo(12.5), 12.5);
});

prova('si ferma ai centesimi', () => {
  eq(M.prezzo('12,499'), 12.5);
  eq(M.prezzo('0,014'), 0.01);
});

prova('quello che non e un prezzo torna vuoto, non zero', () => {
  ['', null, undefined, 'abc', '-3', 'dodici'].forEach((v) => {
    eq(M.prezzo(v), null, JSON.stringify(v));
  });
});

gruppo('L\'anagrafica degli articoli');

prova('si scrive un articolo con descrizione e prezzo', () => {
  const d = nuovo();
  const r = M.salvaArticolo(d, { cod: '0986437433', desc: 'Iniettore', prezzo: '40,50' });
  assert(r.ok, r.motivo);
  const a = M.articolo(d, '0986437433');
  eq(a.desc, 'Iniettore');
  eq(a.prezzo, 40.5);
});

prova('il codice si trova comunque lo si scriva', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: ' abc123 ', desc: 'Filtro' });
  assert(M.articolo(d, 'ABC123'), 'non trovato in maiuscolo');
  assert(M.articolo(d, 'abc123'), 'non trovato in minuscolo');
});

prova('correggere il prezzo non cancella la descrizione', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: 'X1', desc: 'Pastiglie', prezzo: '10' });
  M.salvaArticolo(d, { cod: 'X1', prezzo: '11,20' });
  const a = M.articolo(d, 'X1');
  eq(a.desc, 'Pastiglie', 'la descrizione e sparita');
  eq(a.prezzo, 11.2);
});

prova('si puo togliere il prezzo, e resta vuoto invece di zero', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: 'X1', prezzo: '10' });
  M.salvaArticolo(d, { cod: 'X1', prezzo: '' });
  eq(M.articolo(d, 'X1').prezzo, null);
});

prova('un prezzo che non e un numero viene rifiutato', () => {
  const d = nuovo();
  const r = M.salvaArticolo(d, { cod: 'X1', prezzo: 'dieci euro' });
  assert(!r.ok);
  assert(/12,50/.test(r.motivo), r.motivo);
  assert(!M.articolo(d, 'X1'), 'e stato scritto lo stesso');
});

prova('senza codice non si scrive niente', () => {
  const d = nuovo();
  ['', '   ', null, undefined].forEach((c) => {
    assert(!M.salvaArticolo(d, { cod: c, desc: 'x' }).ok, JSON.stringify(c) + ' e passato');
  });
});

gruppo('Le giacenze — una riga per codice, non per scaffale');

prova('lo stesso codice in due posti fa una riga sola', () => {
  const d = nuovo();
  M.ubica(d, A, 'X1', 4);
  M.ubica(d, B, 'X1', 6);
  const g = M.giacenze(d);
  eq(g.length, 1, 'righe');
  eq(g[0].qty, 10);
  eq(g[0].ubicazioni.length, 2, 'deve dire dove sta');
});

prova('dice dove sta e quanti ce ne sono in ogni posto', () => {
  const d = nuovo();
  M.ubica(d, A, 'X1', 4);
  M.ubica(d, B, 'X1', 6);
  const u = M.giacenze(d)[0].ubicazioni;
  eq(u.find((x) => x.codice === A).qty, 4);
  eq(u.find((x) => x.codice === B).qty, 6);
});

prova('il valore e prezzo per quantita', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: 'X1', prezzo: '40,50' });
  M.ubica(d, A, 'X1', 6);
  eq(M.giacenze(d)[0].valore, 243);
});

prova('senza prezzo il valore resta vuoto, non zero', () => {
  const d = nuovo();
  M.ubica(d, A, 'X1', 6);
  eq(M.giacenze(d)[0].valore, null, 'un valore a zero direbbe che non vale niente');
});

prova('un codice finito resta in lista con zero pezzi', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: 'X1', desc: 'Filtro' });
  M.ubica(d, A, 'X1', 2);
  M.disubica(d, A, 'X1', 2);
  const g = M.giacenze(d);
  eq(g.length, 1, 'il codice deve restare: sapere che e finito serve');
  eq(g[0].qty, 0);
});

prova('la descrizione arriva dall anagrafica, non dallo scaffale', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: 'X1', desc: 'Pastiglie freno' });
  M.ubica(d, A, 'X1', 1);
  M.ubica(d, B, 'X1', 1);
  M.giacenze(d).forEach((g) => eq(g.desc, 'Pastiglie freno'));
});

gruppo('Quanto vale il magazzino');

prova('somma quello che ha un prezzo', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: 'X1', prezzo: '10' });
  M.salvaArticolo(d, { cod: 'X2', prezzo: '2,50' });
  M.ubica(d, A, 'X1', 3);
  M.ubica(d, A, 'X2', 4);
  const v = M.valoreTotale(d);
  eq(v.valore, 40);
  eq(v.conPrezzo, 2);
  assert(v.completo);
});

prova('dice su quanti codici il conto e incompleto', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: 'X1', prezzo: '10' });
  M.ubica(d, A, 'X1', 3);
  M.ubica(d, A, 'SENZA-PREZZO', 5);
  const v = M.valoreTotale(d);
  eq(v.valore, 30);
  eq(v.senzaPrezzo, 1);
  assert(!v.completo, 'un totale che si dichiara completo mentre manca un prezzo e una bugia');
});

prova('un magazzino vuoto vale zero ed e completo', () => {
  const v = M.valoreTotale(nuovo());
  eq(v.valore, 0);
  eq(v.senzaPrezzo, 0);
  assert(v.completo);
});

prova('i centesimi non si perdono per strada', () => {
  const d = nuovo();
  M.salvaArticolo(d, { cod: 'X1', prezzo: '0,10' });
  M.ubica(d, A, 'X1', 3);
  eq(M.valoreTotale(d).valore, 0.3, 'tre volte dieci centesimi');
});

console.log('\n' + '─'.repeat(48));
if (!falliti) {
  console.log('\x1b[32m\x1b[1m✓ ' + passati + ' prove superate\x1b[0m');
  process.exit(0);
}
console.log('\x1b[31m\x1b[1m✗ ' + falliti + ' fallite\x1b[0m, ' + passati + ' superate');
rotti.forEach(([n, m]) => console.log('  • ' + n + '\n    ' + m));
process.exit(1);
