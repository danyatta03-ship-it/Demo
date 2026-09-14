/* Riconoscimento assistito: facoltativo.
 *
 * Se qui dentro non c'e' niente, la lettura dei documenti funziona comunque
 * in locale, sul dispositivo: piu' lenta, e senza il secondo controllo.
 *
 * Una chiave messa qui finisce nel browser di chiunque apra l'app. Se serve,
 * si mette dietro un servizio, non davanti.
 */
window.OCR_AI = window.OCR_AI || null;
