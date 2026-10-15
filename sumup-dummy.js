/* SumUp-Dummy und Testmodus der Termin-/Kassenseite.
   Warum im Browser statt als eigener Server: So läuft der Test auch am echten Tablet, mit derselben Seite, demselben Browser und
   denselben Eigenheiten – und die App merkt keinen Unterschied, weil der Dummy an fetch() sitzt, nicht an ihren Funktionen.
   Warum eine Sandbox und nicht nur ein falsches SumUp: Die App speichert im Browser, schickt Termine und Berichte an den Schichtplan
   und kann über Google abgleichen und Mails schicken. Im Testmodus bekommt sie deshalb einen eigenen Speicher (Schlüssel mit „TEST|“),
   Schreibaufrufe an den Schichtplan beantwortet der Dummy selbst, Google ist gesperrt. Gelesen wird nur der echte Plan (wer ist eingeteilt).
   Die Antworten folgen der OpenAPI-Spezifikation von SumUp (sumup-py/-ts/-go, Stand Oktober 2026) und Messungen gegen api.sumup.com
   (401, 404 ohne Schlüssel, CORS). Wo die Spezifikation zwei Lesarten lässt, ist die Lesart unter „Störungen“ umschaltbar.
   Diese Datei muss VOR dem Hauptskript geladen werden: Der Speicher wird umgelenkt, bevor die App ihren Stand liest.
   Dieselbe Datei liegt in der Kasse (sauna-kasse) und im Schichtplan (public/); Änderungen an beiden Stellen gleich halten. */
(function () {
  'use strict';
  const SCHALTER = 'sk-testmodus', ZUSTAND = 'TEST|sumup-dummy';
  const ls = window.localStorage;
  const roh = { get: Storage.prototype.getItem, set: Storage.prototype.setItem, weg: Storage.prototype.removeItem };
  const rGet = (k) => { try { return roh.get.call(ls, k); } catch (e) { return null; } };
  const rSet = (k, v) => { try { roh.set.call(ls, k, v); } catch (e) { /* voll oder gesperrt */ } };
  const rWeg = (k) => { try { roh.weg.call(ls, k); } catch (e) { /* egal */ } };

  // Ein- und Ausschalten auch über die Adresse (?testmodus=1 / ?testmodus=0), damit es ohne Umweg über die Stammdaten geht.
  const q = new URLSearchParams(location.search).get('testmodus');
  if (q === '1') rSet(SCHALTER, '1');
  if (q === '0') rWeg(SCHALTER);
  const aktiv = rGet(SCHALTER) === '1';

  window.SUMUP_TEST = {
    aktiv,
    ein() { rSet(SCHALTER, '1'); location.reload(); },
    aus() { rWeg(SCHALTER); location.reload(); },
  };
  // Knopf in „Kartengerät“: eigener Klick-Lauscher statt einer Aktion der App, damit die App vom Testmodus nichts wissen muss.
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-sumup-test]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.sumupTest === 'ein') window.SUMUP_TEST.ein(); else window.SUMUP_TEST.aus();
  }, true);
  if (!aktiv) return;

  // ------------------------------------------------------------------ Sandbox: eigener Speicher
  const getrennt = (k) => k !== SCHALTER && !String(k).startsWith('TEST|');
  Storage.prototype.getItem = function (k) { return this === ls && getrennt(k) ? roh.get.call(this, 'TEST|' + k) : roh.get.call(this, k); };
  Storage.prototype.setItem = function (k, v) { return this === ls && getrennt(k) ? roh.set.call(this, 'TEST|' + k, v) : roh.set.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { return this === ls && getrennt(k) ? roh.weg.call(this, 'TEST|' + k) : roh.weg.call(this, k); };

  // ------------------------------------------------------------------ Zustand des Dummys
  const uuid = () => crypto.randomUUID();
  const zufall = (n, abc) => { let s = ''; const a = abc || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  const jetztIso = () => new Date().toISOString();
  const PREISE = { 30: 4000, 40: 5500, 45: 6000, 60: 7500, 90: 11000 };
  function grundzustand() {
    const p = [];
    for (const L of [30, 40, 45, 60, 90]) for (const s of ['früh', 'spät']) p.push({ id: uuid(), name: 'Massage ' + L + ' ' + s, variante: '', preis: PREISE[L] });
    p.push({ id: uuid(), name: 'Wasser', variante: '0,5 l', preis: 350 });
    return {
      haendler: 'MTEST123', haendlerPruefen: false,
      readers: [], koppelCode: zufall(8), online: true,
      stoerung: 'keine', fehlerform: 'errors', tipImBetrag: true, sichtbarNach: 0, langsamMs: 0,
      produkte: p, tx: [], offen: null, belegNr: 1000, log: [],
      termine: [],                          // was die App im Testmodus an den Schichtplan „geschickt“ hat
    };
  }
  let Z;
  try { Z = Object.assign(grundzustand(), JSON.parse(rGet(ZUSTAND) || 'null') || {}); } catch (e) { Z = grundzustand(); }
  const merken = () => { rSet(ZUSTAND, JSON.stringify(Z)); };

  function protokoll(eintrag) {
    Z.log.unshift(Object.assign({ t: new Date().toLocaleTimeString('de-DE') }, eintrag));
    Z.log = Z.log.slice(0, 150); merken(); zeichnen();
  }

  // ------------------------------------------------------------------ Antworten im Format von SumUp
  const antwort = (status, json, typ) => new Response(json === undefined ? null : (typeof json === 'string' ? json : JSON.stringify(json)), {
    status, headers: { 'Content-Type': typ || 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
  // Gemessen am 15.10.2026: 401 kommt als Problem-Objekt, aber mit Content-Type application/json und einer trace_id.
  const p401 = () => ({ type: 'https://developer.sumup.com/problem/unauthorized', title: 'Unauthorized', status: 401, detail: 'Unauthorized.', trace_id: zufall(32, '0123456789abcdef') });
  // Gemessen: ohne Authorization-Kopf (und bei falscher Methode) 404 statt 401.
  const p404roh = () => ({ type: 'https://developer.sumup.com/docs/problem/problem/404-not-found', title: 'Not Found', status: 404, detail: 'Resource not found' });
  const p404 = () => ({ type: 'https://developer.sumup.com/problem/not-found', title: "Requested resource couldn't be found.", status: 404, detail: "The requested resource doesn't exist or does not belong to you." });
  const p400 = () => ({ type: 'https://developer.sumup.com/problem/bad-request', title: 'Bad Request', status: 400, detail: 'Request validation failed.' });
  const p403 = () => ({ type: 'https://developer.sumup.com/problem/forbidden', title: 'Forbidden', status: 403, detail: 'You do not have permission to perform this action.' });
  const p409 = () => ({ type: 'https://developer.sumup.com/problem/conflict', title: 'Conflict', status: 409, detail: 'The request conflicts with the current state of the resource.' });
  // Reader-Checkout: Die Spezifikation führt {errors:{…}} UND Problem+JSON. Welche kommt, ist offen – deshalb umschaltbar.
  const readerFehler = (status, typ, detail, felder) => Z.fehlerform === 'problem'
    ? antwort(status, { type: 'https://developer.sumup.com/problem/' + String(typ || 'validation-error').toLowerCase().replace(/_/g, '-'), title: status === 422 ? 'Unprocessable Entity' : 'Error', status, detail }, 'application/problem+json')
    : antwort(status, { errors: felder || { type: typ, detail } });
  // Alte Endpunkte (Transaktionen, Belege) antworten in der alten Form.
  const altFehler = (status, code, message) => antwort(status, { error_code: code, message });

  const euro = (c) => Math.round(c) / 100;
  const euroText = (c) => (Math.round(c) / 100).toFixed(2);
  const ust = (c) => Math.round(c - c / 1.19);

  function txVoll(t) {
    const gesamt = t.betrag + (Z.tipImBetrag ? t.tip : 0);
    return {
      id: t.id, transaction_code: t.code, amount: euro(gesamt), currency: 'EUR', timestamp: t.zeit,
      local_time: new Date(t.zeit).toISOString().replace('Z', '+00:00'),
      status: t.status, simple_status: t.status, payment_type: 'POS', simple_payment_type: 'EMV', entry_mode: 'CONTACTLESS',
      verification_method: 'none', installments_count: 1, merchant_code: Z.haendler, username: 'sauna@example.org',
      vat_amount: euro(ust(t.betrag)), tip_amount: euro(t.tip), fee_amount: euro(Math.round(gesamt * 0.0139)), auth_code: zufall(6, '0123456789'),
      product_summary: t.produkte.length ? t.produkte.map((p) => p.name).join(', ') : (t.beschreibung || 'Purchase'),
      ...(t.ftid ? { foreign_transaction_id: t.ftid } : {}), client_transaction_id: t.ctid,
      card: { last_4_digits: t.karte.last4, type: t.karte.typ }, process_as: 'DEBIT',
      products: t.produkte.map((p) => ({ name: p.name, price: euro(p.preis), price_label: 'EUR ' + euroText(p.preis), quantity: p.menge, total_price: euro(p.preis * p.menge),
        vat_rate: 0.19, single_vat_amount: euro(ust(p.preis)), price_with_vat: euro(p.preis), vat_amount: euro(ust(p.preis * p.menge)), total_with_vat: euro(p.preis * p.menge) })),
      vat_rates: [{ rate: 0.19, net: euro(t.betrag - ust(t.betrag)), vat: euro(ust(t.betrag)), gross: euro(t.betrag) }],
      payout_plan: 'SINGLE_PAYMENT', payouts_total: 1, payouts_received: 0, payout_type: 'BANK_ACCOUNT', events: [], transaction_events: [], links: [], tax_enabled: true,
    };
  }
  function txKurz(t) {
    // Die Liste kennt weder tip_amount noch products – das muss die App über den Beleg holen.
    return { id: t.id, transaction_id: t.id, transaction_code: t.code, amount: euro(t.betrag + (Z.tipImBetrag ? t.tip : 0)), currency: 'EUR', timestamp: t.zeit,
      status: t.status, payment_type: 'POS', installments_count: 1, product_summary: t.produkte.map((p) => p.name).join(', ') || 'Purchase',
      payouts_total: 1, payouts_received: 0, payout_plan: 'SINGLE_PAYMENT', client_transaction_id: t.ctid, user: 'sauna@example.org', type: 'PAYMENT',
      card_type: t.karte.typ, payout_type: 'BANK_ACCOUNT', refunded_amount: t.status === 'REFUNDED' ? euro(t.betrag + t.tip) : 0 };
  }
  function beleg(t) {
    const gesamt = t.betrag + (Z.tipImBetrag ? t.tip : 0);
    // Belege: alle Beträge als Zeichenketten; die Variante steht – wenn überhaupt – in description, ein Feld für Varianten gibt es nicht.
    return {
      transaction_data: {
        transaction_code: t.code, transaction_id: t.id, merchant_code: Z.haendler, receipt_no: String(t.belegNr), amount: euroText(gesamt),
        vat_amount: euroText(ust(t.betrag)), tip_amount: euroText(t.tip), currency: 'EUR', timestamp: t.zeit, status: t.status, payment_type: 'POS',
        entry_mode: 'CONTACTLESS', verification_method: 'none', installments_count: 1, process_as: 'DEBIT',
        card: { last_4_digits: t.karte.last4, type: t.karte.typ }, card_reader: { code: 'U1DT3NA00-CN', type: 'solo' },
        products: t.produkte.map((p) => ({ name: p.name, ...(p.variante ? { description: p.variante } : {}), price: euroText(p.preis), quantity: p.menge,
          total_price: euroText(p.preis * p.menge), vat_rate: '0.19', single_vat_amount: euroText(ust(p.preis)), price_with_vat: euroText(p.preis),
          vat_amount: euroText(ust(p.preis * p.menge)), total_with_vat: euroText(p.preis * p.menge) })),
        vat_rates: [{ rate: 0.19, net: euro(t.betrag - ust(t.betrag)), vat: euro(ust(t.betrag)), gross: euro(t.betrag) }],
        events: [],
      },
      merchant_data: { locale: 'de-DE', merchant_profile: { merchant_code: Z.haendler, business_name: 'Olivin Berlin (Test)', language: 'de',
        address: { address_line1: 'Schönhauser Allee 177', city: 'Berlin', country: 'DE', post_code: '10119' } } },
      emv_data: {}, acquirer_data: { tid: '12345678', authorization_code: zufall(6, '0123456789'), return_code: '00', local_time: t.zeit },
    };
  }
  const readerAnsicht = (r) => {
    // Kopplung: erst „processing“, nach ein paar Sekunden „paired“ – wie ein Solo, das die Kopplung bestätigt.
    if (r.status === 'processing' && Date.now() - Date.parse(r.created_at) > 4000) { r.status = 'paired'; r.updated_at = jetztIso(); merken(); }
    return { id: r.id, name: r.name, status: r.status, device: r.device, metadata: r.metadata || {}, created_at: r.created_at, updated_at: r.updated_at };
  };
  const sichtbar = (t) => !t.sichtbarAb || Date.now() >= t.sichtbarAb;

  function offenAbgelaufen() {
    // Laut Doku hat das Gerät 60 Sekunden, die Zahlung zu starten; danach verfällt der Checkout ohne Transaktion.
    const o = Z.offen;
    if (o && !o.gestartet && Date.now() - o.seit > 60000) { o.verfallen = true; Z.offen = null; merken(); protokoll({ art: 'solo', text: 'Checkout verfallen: am Gerät nicht innerhalb von 60 s gestartet.' }); }
  }

  async function sumup(url, init) {
    const methode = String((init && init.method) || 'GET').toUpperCase();
    const pfad = url.pathname, auth = new Headers((init && init.headers) || {}).get('Authorization') || '';
    let body = null; try { body = init && init.body ? JSON.parse(init.body) : null; } catch (e) { body = '(kein JSON)'; }
    const eintrag = { art: 'api', methode, pfad: pfad + url.search, body };

    // Der Erreichbarkeitstest der App (no-cors auf „/“) scheitert nur ohne Netz.
    if (init && init.mode === 'no-cors') {
      if (Z.stoerung === 'netz') { protokoll({ ...eintrag, status: 'Netzfehler' }); throw new TypeError('Failed to fetch'); }
      protokoll({ ...eintrag, status: 'opak (no-cors)' }); return new Response(null, { status: 200 });
    }
    if (Z.langsamMs || Z.stoerung === 'langsam') await new Promise((r) => setTimeout(r, Z.langsamMs || 3000));
    if (Z.stoerung === 'netz' || Z.stoerung === 'cors') {
      protokoll({ ...eintrag, status: Z.stoerung === 'netz' ? 'Netzfehler' : 'CORS gesperrt' });
      throw new TypeError('Failed to fetch');
    }
    const r = await sumupAntwort(methode, pfad, url.searchParams, auth, body);
    let text = ''; try { text = await r.clone().text(); } catch (e) { /* leer */ }
    let json = text; try { json = JSON.parse(text); } catch (e) { /* kein JSON */ }
    protokoll({ ...eintrag, status: r.status, antwort: json });
    return r;
  }

  async function sumupAntwort(methode, pfad, such, auth, body) {
    if (!/^Bearer\s+\S+/.test(auth)) return antwort(404, p404roh());
    if (Z.stoerung === '401') return antwort(401, p401());
    if (Z.stoerung === '403') return antwort(403, p403());
    if (Z.stoerung === '500') return antwort(500, { type: 'about:blank', title: 'Internal Server Error', status: 500, detail: 'Simulierter Serverfehler (Dummy).' });
    offenAbgelaufen();

    let m;
    const haendlerFalsch = (mc) => Z.haendlerPruefen && mc.toUpperCase() !== Z.haendler.toUpperCase();

    // ---- Reader (v0.1)
    if ((m = pfad.match(/^\/v0\.1\/merchants\/([^/]+)\/readers\/?$/))) {
      if (haendlerFalsch(decodeURIComponent(m[1]))) return antwort(404, p404());
      if (methode === 'GET') return antwort(200, { items: Z.readers.map(readerAnsicht) });
      if (methode === 'POST') {
        if (!body || typeof body !== 'object' || !body.name || !/^.{8,9}$/.test(String(body.pairing_code || ''))) return antwort(400, p400());
        if (String(body.pairing_code).toUpperCase() !== Z.koppelCode) return antwort(404, p404());
        const r = { id: 'rdr_' + zufall(26), name: String(body.name).slice(0, 500), status: 'processing', device: { identifier: 'U1DT3NA00-CN', model: 'solo' },
          metadata: body.metadata || {}, created_at: jetztIso(), updated_at: jetztIso() };
        Z.readers.push(r); Z.koppelCode = zufall(8); merken();
        return antwort(201, readerAnsicht(r));
      }
      return antwort(404, p404roh());
    }
    if ((m = pfad.match(/^\/v0\.1\/merchants\/([^/]+)\/readers\/([^/]+)(\/[a-z]+)?(\/[^/]+)?$/))) {
      if (haendlerFalsch(decodeURIComponent(m[1]))) return antwort(404, p404());
      const r = Z.readers.find((x) => x.id === decodeURIComponent(m[2])), was = m[3] || '';
      if (!r) return was === '/checkout' || was === '/terminate' ? readerFehler(404, null, 'Reader not found', { detail: 'Reader not found' }) : antwort(404, p404());
      if (!was && methode === 'GET') return antwort(200, readerAnsicht(r));
      if (!was && methode === 'DELETE') { Z.readers = Z.readers.filter((x) => x !== r); merken(); return new Response(null, { status: 200 }); }
      if (!was && methode === 'PATCH') { if (body && body.name) r.name = String(body.name).slice(0, 500); r.updated_at = jetztIso(); merken(); return antwort(200, readerAnsicht(r)); }
      if (was === '/status' && methode === 'GET') {
        return antwort(200, { data: { status: Z.online ? 'ONLINE' : 'OFFLINE', state: Z.offen ? (Z.offen.gestartet ? 'WAITING_FOR_CARD' : 'IDLE') : 'IDLE',
          battery_level: 80, battery_temperature: 30, connection_type: 'Wi-Fi', firmware_version: '3.3.39.0', last_activity: jetztIso() } });
      }
      if (was === '/checkout' && methode === 'POST') return checkoutAnlegen(r, body);
      if (was === '/checkout' && methode === 'GET' && m[4]) {
        const cid = decodeURIComponent(m[4].slice(1)), t = Z.tx.find((x) => x.checkoutId === cid), o = Z.offen && Z.offen.checkoutId === cid ? Z.offen : null;
        if (!t && !o) return readerFehler(404, null, 'Checkout not found', { detail: 'Checkout not found' });
        const st = t ? ({ SUCCESSFUL: 'successful', FAILED: 'failed', CANCELLED: 'cancelled' }[t.status] || 'pending') : 'pending', q = t || o;
        return antwort(200, { data: { checkout_id: cid, client_transaction_id: q.ctid, status: st, total_amount: { currency: 'EUR', minor_unit: 2, value: q.betrag },
          payment_type: 'card', created_at: new Date(q.seit || Date.parse(q.zeit)).toISOString(), updated_at: jetztIso(), valid_until: new Date((q.seit || Date.parse(q.zeit)) + 60000).toISOString() } });
      }
      if (was === '/terminate' && methode === 'POST') {
        if (!Z.online) return readerFehler(422, 'READER_OFFLINE', 'The device is offline.');
        if (Z.offen && Z.offen.readerId === r.id) { soloAbschluss('CANCELLED', 0, 'Abgebrochen über terminate'); return antwort(202, {}); }
        return readerFehler(422, 'NO_PENDING_CHECKOUT', 'There is no pending checkout for the device. (Dummy: Antwort nicht dokumentiert)');
      }
      return antwort(404, p404roh());
    }

    // ---- Transaktionen (v2.1)
    if ((m = pfad.match(/^\/v2\.1\/merchants\/([^/]+)\/transactions\/history\/?$/)) && methode === 'GET') {
      if (haendlerFalsch(decodeURIComponent(m[1]))) return altFehler(404, 'NOT_FOUND', 'Resource not found');
      const limit = Math.max(1, Math.min(1000, Number(such.get('limit')) || 10)), absteigend = such.get('order') === 'descending';
      const alt = such.get('oldest_time'), neu = such.get('newest_time'), alteRef = such.get('oldest_ref'), neueRef = such.get('newest_ref');
      if ((alt && isNaN(Date.parse(alt))) || (neu && isNaN(Date.parse(neu)))) return altFehler(400, 'INVALID', 'Validation error');
      const st = such.getAll('statuses[]');
      let liste = Z.tx.filter(sichtbar).sort((a, b) => Date.parse(a.zeit) - Date.parse(b.zeit));
      if (alteRef || neueRef) {
        // Die Referenzen haben laut Spezifikation Vorrang vor den Zeiten.
        const i = liste.findIndex((t) => t.id === (alteRef || neueRef));
        liste = alteRef ? liste.slice(i + 1) : liste.slice(0, Math.max(0, i));
      } else {
        if (alt) liste = liste.filter((t) => Date.parse(t.zeit) >= Date.parse(alt));
        if (neu) liste = liste.filter((t) => Date.parse(t.zeit) < Date.parse(neu));
      }
      if (st.length) liste = liste.filter((t) => st.indexOf(t.status) >= 0);
      if (absteigend) liste.reverse();
      const seite = liste.slice(0, limit), links = [];
      // links[].href ist nur eine Query-Zeichenkette, keine URL (laut Spezifikation-Beispiel ohne die Zeitgrenzen).
      if (liste.length > limit) links.push({ rel: 'next', href: 'limit=' + limit + '&' + (absteigend ? 'newest_ref=' : 'oldest_ref=') + seite[seite.length - 1].id + '&order=' + (absteigend ? 'descending' : 'ascending') });
      return antwort(200, { items: seite.map(txKurz), links });
    }
    if ((m = pfad.match(/^\/v2\.1\/merchants\/([^/]+)\/transactions\/?$/)) && methode === 'GET') {
      if (haendlerFalsch(decodeURIComponent(m[1]))) return altFehler(404, 'NOT_FOUND', 'Resource not found');
      const schluessel = ['id', 'transaction_code', 'foreign_transaction_id', 'client_transaction_id'].filter((k) => such.has(k));
      if (schluessel.length !== 1) return altFehler(400, 'INVALID', 'Validation error');
      const k = schluessel[0], v = such.get(k);
      const feld = { id: 'id', transaction_code: 'code', foreign_transaction_id: 'ftid', client_transaction_id: 'ctid' }[k];
      const t = Z.tx.find((x) => x[feld] && x[feld] === v && sichtbar(x));
      if (!t) return altFehler(404, 'NOT_FOUND', 'Resource not found');
      return antwort(200, txVoll(t));
    }

    // ---- Belege (v1.1)
    if ((m = pfad.match(/^\/v1\.1\/receipts\/([^/]+)$/)) && methode === 'GET') {
      const mid = such.get('mid') || '';
      if (!mid || haendlerFalsch(mid)) return altFehler(400, 'INVALID', 'is not a valid merchant code');
      const v = decodeURIComponent(m[1]), t = Z.tx.find((x) => (x.id === v || x.code === v) && sichtbar(x));
      if (!t) return altFehler(404, 'NOT_FOUND', 'No such transaction ' + v);
      return antwort(200, beleg(t));
    }
    return antwort(404, p404roh());
  }

  function checkoutAnlegen(r, b) {
    if (!Z.online || r.status !== 'paired') return readerFehler(422, 'READER_OFFLINE', 'The device is offline.');
    if (Z.offen) return readerFehler(422, 'READER_BUSY', 'There is a pending checkout for the device.');
    if (!b || typeof b !== 'object') return readerFehler(400, 'INVALID', 'Request body is not valid JSON.', { type: 'INVALID', detail: 'Request body is not valid JSON.' });
    const ta = b.total_amount, felder = {};
    if (!ta || !Number.isInteger(ta.value) || !Number.isInteger(ta.minor_unit) || !ta.currency) felder.total_amount = ['is required'];
    else if (ta.value <= 0) felder.total_amount = ['must be greater than 0'];
    if (b.tip_rates !== undefined) {
      const ok = Array.isArray(b.tip_rates) && b.tip_rates.every((x, i, a) => typeof x === 'number' && x >= 0.01 && x <= 0.99 && (i === 0 || a[i - 1] <= x));
      if (!ok) felder.tip_rates = ['must be between 0.01 and 0.99'];
      if (b.tip_timeout !== undefined && !(Number.isInteger(b.tip_timeout) && b.tip_timeout >= 30 && b.tip_timeout <= 120)) felder.tip_timeout = ['must be between 30 and 120'];
    }
    if (b.return_url !== undefined && !/^https:\/\//.test(String(b.return_url))) felder.return_url = ['must be a valid URL'];
    if (b.affiliate && !(b.affiliate.app_id && b.affiliate.key && b.affiliate.foreign_transaction_id)) felder.affiliate = ['is invalid'];
    if (Object.keys(felder).length) return Z.fehlerform === 'problem'
      ? antwort(422, { type: 'https://developer.sumup.com/problem/validation-error', title: 'Unprocessable Entity', status: 422, detail: 'Validation failed' }, 'application/problem+json')
      : antwort(422, { errors: felder });
    const o = { checkoutId: uuid(), ctid: uuid(), ftid: b.affiliate ? String(b.affiliate.foreign_transaction_id) : '', betrag: ta.value, beschreibung: b.description || '',
      raten: Array.isArray(b.tip_rates) ? b.tip_rates : [], seit: Date.now(), readerId: r.id, gestartet: false };
    Z.offen = o; merken(); offnen('solo');
    return antwort(201, { data: { checkout_id: o.checkoutId, client_transaction_id: o.ctid } });
  }

  function txNeu(werte) {
    const t = Object.assign({ id: uuid(), code: zufall(10), ctid: uuid(), ftid: '', betrag: 0, tip: 0, status: 'SUCCESSFUL', zeit: jetztIso(), produkte: [],
      beschreibung: '', karte: { last4: zufall(4, '0123456789'), typ: 'VISA' }, belegNr: ++Z.belegNr, checkoutId: '' }, werte);
    if (Z.sichtbarNach) t.sichtbarAb = Date.now() + Z.sichtbarNach * 1000;
    Z.tx.push(t); merken(); return t;
  }
  function soloStart() {
    const o = Z.offen; if (!o || o.gestartet) return;
    // Ab hier gibt es die Transaktion, zunächst als PENDING – so sieht die App „Die Kundin zahlt am Gerät“.
    o.gestartet = true; o.txId = txNeu({ ctid: o.ctid, ftid: o.ftid, betrag: o.betrag, status: 'PENDING', beschreibung: o.beschreibung, checkoutId: o.checkoutId }).id;
    merken(); protokoll({ art: 'solo', text: 'Kundin hat die Zahlung am Gerät begonnen (PENDING).' });
  }
  function soloAbschluss(status, tip, text) {
    const o = Z.offen; if (!o) return;
    if (!o.gestartet) soloStart();
    const t = Z.tx.find((x) => x.id === o.txId);
    if (t) { t.status = status; t.tip = status === 'SUCCESSFUL' ? tip : 0; t.zeit = jetztIso(); }
    Z.offen = null; merken();
    protokoll({ art: 'solo', text: text + (status === 'SUCCESSFUL' && tip ? ' – Trinkgeld ' + euroText(tip) + ' €' : '') });
  }

  // ------------------------------------------------------------------ Schichtplan: Schreiben bleibt lokal, Lesen ist echt
  const echtesFetch = window.fetch.bind(window);
  async function schichtplan(url, init) {
    const methode = String((init && init.method) || 'GET').toUpperCase(), p = url.pathname;
    if (p === '/api/termine' && methode === 'GET') {
      // Den echten Plan lesen (wer ist eingeteilt), die Termine aber aus dem Testspeicher – so mischen sich keine echten Gäste hinein.
      const r = await echtesFetch(url.toString(), init);
      if (!r.ok) return r;
      const j = await r.json(), von = url.searchParams.get('from') || '', bis = url.searchParams.get('to') || '9999';
      j.termine = Z.termine.filter((t) => t.date >= von && t.date <= bis);
      return antwort(200, j);
    }
    if (methode === 'GET' || /^\/api\/(konto\/(anmelden|abmelden)|state)$/.test(p)) return echtesFetch(url.toString(), init);
    let body = null; try { body = init && init.body ? JSON.parse(init.body) : null; } catch (e) { /* egal */ }
    if (p === '/api/termine/aenderungen') {
      const ergebnis = [];
      for (const op of (body && body.ops) || []) {
        Z.termine = Z.termine.filter((t) => t.id !== op.id);
        if (op.op !== 'loeschen') Z.termine.push({ id: op.id, date: op.date, zeit: op.zeit, dauer: op.dauer, gast: op.gast, tel: op.tel, masseur: op.masseur, status: 'ok',
          quelle: 'tablet', zahlungsart: op.zahlungsart, fest: op.fest, extra: op.extra || {} });
        ergebnis.push({ opId: op.opId, ok: true, status: 'ok' });
      }
      merken(); protokoll({ art: 'plan', text: 'Termine an den Schichtplan (nur im Testspeicher): ' + ergebnis.length + ' Änderung(en)' });
      return antwort(200, { ok: true, ergebnis });
    }
    protokoll({ art: 'plan', methode, pfad: p, body, status: 200, text: 'Schreibaufruf an den Schichtplan abgefangen (nichts gespeichert).' });
    return antwort(200, { ok: true });
  }

  window.fetch = async function (eingabe, init) {
    const url = new URL(typeof eingabe === 'string' ? eingabe : eingabe.url, location.href);
    if (url.hostname === 'api.sumup.com') return sumup(url, init);
    if (/(^|\.)googleapis\.com$|(^|\.)google\.com$/.test(url.hostname)) {
      protokoll({ art: 'plan', methode: (init && init.method) || 'GET', pfad: url.hostname + url.pathname, status: 'gesperrt', text: 'Google ist im Testmodus gesperrt.' });
      throw new TypeError('Testmodus: Google gesperrt');
    }
    if (url.origin === location.origin && url.pathname.startsWith('/api/')) return schichtplan(url, init);
    // Die Kasse liegt auf einer anderen Adresse und schreibt in den Schichtplan über …/api/kasse/… (Termine, Berichte). Allgemein gilt
    // deshalb: Im Testmodus geht kein Schreibaufruf an eine fremde Adresse hinaus, gleich wohin.
    const methode = String((init && init.method) || (typeof eingabe !== 'string' && eingabe.method) || 'GET').toUpperCase();
    if (url.origin !== location.origin && methode !== 'GET' && methode !== 'HEAD') {
      let body = null; try { body = init && init.body ? JSON.parse(init.body) : null; } catch (e) { /* kein JSON */ }
      protokoll({ art: 'plan', methode, pfad: url.hostname + url.pathname, body, status: 200, text: 'Schreibaufruf an ' + url.hostname + url.pathname + ' abgefangen (nichts gesendet).' });
      return antwort(200, { ok: true });
    }
    return echtesFetch(eingabe, init);
  };

  // ------------------------------------------------------------------ Testgäste und Testtermine in der App
  // Diese Funktionen greifen auf das Hauptskript zu (S, U, render, speichern …); sie laufen erst nach dessen Start.
  const app = () => typeof S !== 'undefined' && typeof render === 'function';
  function appFertig() { try { speichern(); } catch (e) { console.error(e); } try { render(); } catch (e) { console.error(e); } }
  function testSchicht(nr) {
    const d = heute();
    if (S.sch.some((s) => s.datum === d && s.nr === nr && !s.zu)) return S.sch.find((s) => s.datum === d && s.nr === nr && !s.zu);
    const ma = (aktive('ma')[0] || {}).id || '', mas = aktive('mas').slice(0, 2).map((x) => x.id);
    const s = { id: id(), datum: d, nr, ma, mas, gaeste: [], buch: [], zahl: [], zu: false };
    S.sch.push(s); U.sch = s.id; return s;
  }
  function testGast(name) {
    const s = schicht() || testSchicht(terminNr(new Date().toTimeString().slice(0, 5)));
    let n = 1; while (S.kun.some((k) => k.nummer === 'T' + n && !k.weg) && belegtNummer('T' + n)) n++;
    let k = S.kun.find((x) => x.nummer === 'T' + n && !x.weg);
    if (!k) { k = { id: id(), nummer: 'T' + n, name: '' }; S.kun.push(k); }
    gastAufnehmen(s, k);
    const g = s.gaeste.find((x) => x.kun === k.id && x.da); if (g && name) g.name = name;
    U.tab = 'kasse'; appFertig();
  }
  const belegtNummer = (nr) => { const k = S.kun.find((x) => x.nummer === nr && !x.weg); return !!(k && belegt(k.id)); };
  function testTermin(zeit, dauer, gast, mas) {
    S.ter.push({ id: id(), datum: heute(), nr: terminNr(zeit), zeit, dauer, was: 'Massage', gast: gast || 'Testgast', ...(mas ? { mas } : {}) });
    appFertig();
  }
  function stammdatenUebernehmen() {
    let echt = null; try { echt = JSON.parse(rGet('saunakasse-v1') || 'null'); } catch (e) { /* kaputt */ }
    if (!echt) return alert('Auf diesem Gerät gibt es keinen echten Stand zum Übernehmen.');
    let test = null; try { test = JSON.parse(rGet('TEST|saunakasse-v1') || 'null'); } catch (e) { /* leer */ }
    test = test || { v: 1, ma: [], mas: [], lei: [], war: [], kun: [], sch: [], ter: [], ger: [], tot: {} };
    // Nur Stammdaten – keine Schichten, Termine, Zahlungen der echten Gäste.
    for (const k of ['ma', 'mas', 'lei', 'war', 'kun', 'ger']) test[k] = echt[k] || [];
    rSet('TEST|saunakasse-v1', JSON.stringify(test)); location.reload();
  }
  function testdatenWeg() {
    if (!confirm('Alle Testdaten löschen (Kasse, Termine, Dummy-SumUp)? Die echten Daten bleiben unberührt.')) return;
    const weg = []; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith('TEST|')) weg.push(k); }
    weg.forEach(rWeg); location.reload();
  }
  function schnellEinrichten(mitAffiliate) {
    if (!app()) return;
    if (!Z.readers.some((r) => r.status === 'paired')) Z.readers.push({ id: 'rdr_' + zufall(26), name: 'Test-Solo', status: 'paired', device: { identifier: 'U1DT3NA00-CN', model: 'solo' }, metadata: {}, created_at: jetztIso(), updated_at: jetztIso() });
    const r = Z.readers.find((x) => x.status === 'paired'); merken();
    ls.setItem('sk-sumup-code', Z.haendler); ls.setItem('sk-sumup-reader', r.id); ls.setItem('sk-sumup-reader-name', r.name);
    ls.setItem('sk-sumup-app', mitAffiliate ? 'com.olivin.test' : '');
    // Der echte Weg: verschlüsselt speichern (Code „testtest“) und gleich entsperren.
    suSpeichern('testtest', { key: 'sup_sk_TESTDUMMY', aff: mitAffiliate ? 'sup_afk_TESTDUMMY' : '' }).then(() => { SU.key = 'sup_sk_TESTDUMMY'; SU.aff = mitAffiliate ? 'sup_afk_TESTDUMMY' : ''; appFertig(); zeichnen(); });
  }

  // ------------------------------------------------------------------ Oberfläche
  const e = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eurT = (c) => (c / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const UI = { offen: false, tab: 'solo', korb: {}, tipSolo: '', zeitSolo: '' };
  const STIL = `
  #sd-band{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#7a2e8e;color:#fff;font:600 14px/1.3 system-ui,sans-serif;display:flex;gap:10px;align-items:center;padding:6px 10px;box-shadow:0 -2px 8px #0004}
  #sd-band button{font:inherit;border:0;border-radius:8px;padding:6px 12px;background:#fff;color:#7a2e8e;cursor:pointer}
  #sd-band .sd-blink{animation:sdb 1s infinite}@keyframes sdb{50%{opacity:.4}}
  #sd-pan{position:fixed;top:0;right:0;bottom:42px;width:min(460px,100%);z-index:2147483001;background:#fff;color:#222;box-shadow:-4px 0 16px #0005;display:flex;flex-direction:column;font:14px/1.4 system-ui,sans-serif}
  #sd-pan header{display:flex;flex-wrap:wrap;gap:4px;padding:8px;background:#f3e9f6;position:static}
  #sd-pan header button{font:inherit;border:1px solid #c9a6d4;background:#fff;border-radius:8px;padding:5px 9px;cursor:pointer;color:#222}
  #sd-pan header button.sd-on{background:#7a2e8e;color:#fff;border-color:#7a2e8e}
  #sd-inh{overflow:auto;padding:10px 12px;flex:1}
  #sd-inh h3{margin:14px 0 6px;font-size:15px}
  #sd-inh button{font:inherit;border:1px solid #bbb;background:#f7f7f7;border-radius:8px;padding:7px 11px;cursor:pointer;margin:2px 4px 2px 0;color:#222}
  #sd-inh button.sd-p{background:#2e7d4f;color:#fff;border-color:#2e7d4f}#sd-inh button.sd-r{background:#b3402e;color:#fff;border-color:#b3402e}
  #sd-inh input,#sd-inh select{font:inherit;padding:5px 7px;border:1px solid #bbb;border-radius:7px;margin:2px 0;max-width:100%}
  #sd-inh .sd-solo{background:#1d1d1f;color:#fff;border-radius:16px;padding:14px;text-align:center;margin:6px 0}
  #sd-inh .sd-solo .sd-gross{background:none;border:0;color:#fff;font-size:28px;font-weight:700;margin:6px 0}
  #sd-inh .sd-mut{color:#777;font-size:12.5px}#sd-inh .sd-zeile{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0}
  #sd-inh table{border-collapse:collapse;width:100%;font-size:13px}#sd-inh td,#sd-inh th{border-bottom:1px solid #eee;padding:4px;text-align:left;vertical-align:top}
  #sd-inh details{border-bottom:1px solid #eee;padding:4px 0}#sd-inh pre{white-space:pre-wrap;word-break:break-all;font-size:11.5px;background:#f6f6f6;padding:6px;border-radius:6px;margin:4px 0}
  #sd-inh .sd-ok{color:#2e7d4f;font-weight:600}#sd-inh .sd-fe{color:#b3402e;font-weight:600}`;

  function offnen(tab) { UI.offen = true; if (tab) UI.tab = tab; zeichnen(); }

  function soloAnsicht() {
    offenAbgelaufen();
    const o = Z.offen, r = Z.readers.find((x) => x.status === 'paired');
    let h = `<div class="sd-zeile"><label><input type="checkbox" data-sd="online" ${Z.online ? 'checked' : ''}> Solo online</label>
      <span class="sd-mut">Gerät: ${r ? e(r.name) + ' · ' + e(r.id) : 'keins gekoppelt'}</span></div>`;
    if (o) {
      const rest = Math.max(0, 60 - Math.round((Date.now() - o.seit) / 1000));
      const raten = o.raten.length ? o.raten : [0.05, 0.1, 0.15];
      h += `<div class="sd-solo"><div>${o.gestartet ? 'Kundin zahlt …' : 'Neue Zahlung von der Kasse'}</div><div class="sd-gross">${eurT(o.betrag)}</div>
        <div class="sd-mut" style="color:#bbb">${e(o.beschreibung)} · ftid ${o.ftid ? e(o.ftid) : '<b>keine</b> (ohne Affiliate)'}${o.gestartet ? '' : ' · verfällt in ' + rest + ' s'}</div>
        <div class="sd-mut" style="color:#bbb">Trinkgeld-Auswahl: ${o.raten.length ? 'von der Kasse geschickt' : 'Voreinstellung des Solo'}</div></div>
        <div class="sd-zeile">${o.gestartet ? '' : '<button data-sd="start">Kundin beginnt (PENDING)</button>'}</div>
        <div class="sd-zeile">Trinkgeld: <button data-sd="tipw" data-v="0">keins</button>${raten.map((x) => `<button data-sd="tipw" data-v="${Math.round(o.betrag * x)}">${Math.round(x * 100)} % (${eurT(Math.round(o.betrag * x))})</button>`).join('')}
          <input id="sd-tipfrei" size="6" placeholder="€ frei" value="${e(UI.tipSolo)}"></div>
        <div class="sd-zeile"><button class="sd-p" data-sd="bezahlt">✓ Bezahlt</button><button class="sd-r" data-sd="abgelehnt">✗ Karte abgelehnt (FAILED)</button>
          <button data-sd="abbruch">Abbruch am Gerät (CANCELLED)</button></div>
        <div class="sd-mut">Oder nichts tun: Ohne Start verfällt der Checkout nach 60 s, die App wartet dann bis zu ihrem 5-Minuten-Limit.</div>`;
    } else h += `<div class="sd-solo"><div class="sd-mut" style="color:#bbb">Bereit</div><div class="sd-gross">—</div><div class="sd-mut" style="color:#bbb">Kopplungscode für „Gerät koppeln“: <b style="color:#fff;letter-spacing:2px">${e(Z.koppelCode)}</b></div></div>`;

    h += `<h3>Direkt am Solo kassieren (mit Artikeln, für den Abgleich)</h3><table>${Z.produkte.map((p) => `<tr><td>${e(p.name)}${p.variante ? ' <span class="sd-mut">' + e(p.variante) + '</span>' : ''}</td><td>${eurT(p.preis)}</td>
      <td><button data-sd="korb" data-v="${p.id}" data-d="-1">−</button>${UI.korb[p.id] || 0}<button data-sd="korb" data-v="${p.id}" data-d="1">+</button></td></tr>`).join('')}</table>`;
    const summe = Z.produkte.reduce((s, p) => s + p.preis * (UI.korb[p.id] || 0), 0);
    h += `<div class="sd-zeile">Summe <b>${eurT(summe)}</b> · Trinkgeld <input id="sd-dtip" size="6" placeholder="€"> · Uhrzeit heute <input id="sd-dzeit" type="time" value="${e(UI.zeitSolo)}">
      <select id="sd-dkarte"><option>VISA</option><option>MASTERCARD</option><option>GIROCARD</option><option>MAESTRO</option><option>AMEX</option></select></div>
      <div class="sd-zeile"><button class="sd-p" data-sd="direkt" ${summe ? '' : 'disabled'}>Am Solo kassieren</button><button data-sd="korbleer">Leeren</button>
      <button data-sd="ohneartikel">Nur Betrag, ohne Artikel</button></div>`;
    return h;
  }
  function produkteAnsicht() {
    return `<h3>Produkte (wie die Artikel im SumUp)</h3><div class="sd-mut">Name, Variante und Preis landen so im Beleg (<code>products[].name</code>, <code>description</code>, <code>price</code>). Der Abgleich erkennt Massagen am Namen: „Massage“, Minuten und früh/spät.</div>
      <table><tr><th>Name</th><th>Variante</th><th>Preis €</th><th></th></tr>${Z.produkte.map((p) => `<tr><td><input data-sd-feld="name" data-v="${p.id}" value="${e(p.name)}" size="16"></td>
      <td><input data-sd-feld="variante" data-v="${p.id}" value="${e(p.variante)}" size="8"></td><td><input data-sd-feld="preis" data-v="${p.id}" value="${(p.preis / 100).toFixed(2).replace('.', ',')}" size="6"></td>
      <td><button data-sd="pweg" data-v="${p.id}">✕</button></td></tr>`).join('')}</table>
      <div class="sd-zeile"><button class="sd-p" data-sd="pneu">+ Produkt</button><button data-sd="pmassage">Massage-Artikel neu anlegen (10 Stück)</button></div>
      <div class="sd-mut">Achtung: Liegt die Schicht nur in der Variante („Massage 60“ + Variante „früh“), steht sie im Beleg in <code>description</code> – siehe Hinweis im Protokoll.</div>`;
  }
  function txAnsicht() {
    const l = [...Z.tx].reverse();
    return `<h3>Transaktionen im Dummy-SumUp</h3><table><tr><th>Zeit</th><th>Betrag</th><th>Status</th><th>Posten</th><th></th></tr>${l.map((t) => `<tr>
      <td>${new Date(t.zeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}<div class="sd-mut">${e(t.code)}</div></td>
      <td>${eurT(t.betrag)}${t.tip ? '<div class="sd-mut">+ ' + eurT(t.tip) + ' TG</div>' : ''}</td>
      <td class="${t.status === 'SUCCESSFUL' ? 'sd-ok' : t.status === 'PENDING' ? '' : 'sd-fe'}">${t.status}${t.sichtbarAb && Date.now() < t.sichtbarAb ? '<div class="sd-mut">noch unsichtbar</div>' : ''}</td>
      <td>${e(t.produkte.map((p) => p.menge + '× ' + p.name + (p.variante ? ' ' + p.variante : '')).join(', ') || t.beschreibung)}<div class="sd-mut">${t.ftid ? 'ftid ' + e(t.ftid) : 'ohne ftid'}</div></td>
      <td><select data-sd="txst" data-v="${t.id}">${['SUCCESSFUL', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'].map((s) => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <button data-sd="txweg" data-v="${t.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="5" class="sd-mut">Noch keine.</td></tr>'}</table>
      <div class="sd-zeile"><button data-sd="txalle">Alle löschen</button></div>`;
  }
  function gaesteAnsicht() {
    if (!app()) return '<div class="sd-mut">Die App lädt noch …</div>';
    const s = schicht(), plan = (typeof PLAN !== 'undefined' && PLAN && PLAN.personen) || [], mas = plan.length ? plan : aktive('mas').map((x) => x.name);
    // Auf der Termin-Seite (nur Massageplan) gibt es keine Kasse: Gäste mit Schlüssel und Schichten wären dort unsichtbar.
    const kasse = !(typeof modusMassage === 'function' && modusMassage());
    const heuteT = S.ter.filter((t) => t.datum === heute()).sort((a, b) => a.zeit.localeCompare(b.zeit));
    return `<h3>Testgäste und Testtermine</h3><div class="sd-mut">Alles landet nur im Testspeicher dieses Geräts.${kasse ? ` Offene Schicht: <b>${s ? e(schName(s.nr)) + ' ' + e(datumDe(s.datum)) : 'keine'}</b>` : ''}</div>
      ${kasse ? `<div class="sd-zeile"><button data-sd="schicht" data-v="1">Tagesschicht öffnen</button><button data-sd="schicht" data-v="2">Abendschicht öffnen</button></div>
      <div class="sd-zeile"><input id="sd-gname" placeholder="Name (optional)" size="16"><button class="sd-p" data-sd="gast">Testgast einchecken (Schlüssel T…)</button></div>` : ''}
      <h3>Gast mit Massagetermin heute</h3>
      ${heuteT.length ? `<table>${heuteT.map((t) => `<tr><td>${e(t.zeit)}</td><td>${e(t.dauer)} Min.</td><td>${e(t.gast)}</td><td>${e(t.mas || '')}</td></tr>`).join('')}</table>` : '<div class="sd-mut">Heute noch keine.</div>'}
      <div class="sd-zeile"><input id="sd-tzeit" type="time" value="14:00"><select id="sd-tdauer">${[30, 40, 45, 60, 90].map((L) => `<option value="${L}" ${L === 60 ? 'selected' : ''}>${L} Min.</option>`).join('')}</select>
      <input id="sd-tgast" placeholder="Gast" size="12"><select id="sd-tmas"><option value="">Masseur*in …</option>${mas.map((m) => `<option>${e(m)}</option>`).join('')}</select>
      <button class="sd-p" data-sd="termin">Termin anlegen</button></div>
      ${kasse ? `<h3>Stammdaten</h3><div class="sd-zeile"><button data-sd="stamm">Stammdaten vom echten Stand übernehmen</button></div>
      <div class="sd-mut">Übernimmt Mitarbeiter, Masseure, Leistungen, Waren, Schlüssel und Geräte – keine Schichten, Termine oder Zahlungen. Danach lädt die Seite neu.</div>` : ''}
      <h3>SumUp in der App einrichten</h3><div class="sd-zeile"><button class="sd-p" data-sd="einr" data-v="1">Einrichten mit Affiliate-Schlüssel</button><button data-sd="einr" data-v="0">Einrichten ohne Affiliate</button></div>
      <div class="sd-mut">Händlernummer ${e(Z.haendler)}, Test-Solo gekoppelt, Code zum Entsperren: <b>testtest</b>. „Ohne Affiliate“ zeigt, was passiert, wenn die Kasse keine foreign_transaction_id mitschicken kann.</div>
      <h3>Zurücksetzen</h3><div class="sd-zeile"><button class="sd-r" data-sd="allesweg">Alle Testdaten löschen</button></div>`;
  }
  function stoerAnsicht() {
    const opt = (wert, liste) => liste.map(([v, t]) => `<option value="${v}" ${String(wert) === String(v) ? 'selected' : ''}>${t}</option>`).join('');
    return `<h3>Störungen und offene Lesarten</h3>
      <div class="sd-zeile">Verbindung zu SumUp <select data-sd-z="stoerung">${opt(Z.stoerung, [['keine', 'normal'], ['netz', 'kein Netz'], ['cors', 'Browser darf nicht lesen (CORS)'], ['langsam', 'langsam (3 s)'], ['401', '401 Schlüssel abgelehnt'], ['403', '403 keine Berechtigung'], ['500', '500 Serverfehler']])}</select></div>
      <div class="sd-zeile">Händlernummer <input data-sd-z="haendler" value="${e(Z.haendler)}" size="10"><label><input type="checkbox" data-sd-z="haendlerPruefen" ${Z.haendlerPruefen ? 'checked' : ''}> prüfen (sonst gilt jede)</label></div>
      <div class="sd-zeile">Fehlerform Reader <select data-sd-z="fehlerform">${opt(Z.fehlerform, [['errors', '{errors:{type,detail}} (Spezifikation-Beispiel)'], ['problem', 'Problem+JSON {type,title,status,detail}']])}</select></div>
      <div class="sd-zeile"><label><input type="checkbox" data-sd-z="tipImBetrag" ${Z.tipImBetrag ? 'checked' : ''}> <code>amount</code> enthält das Trinkgeld</label> <span class="sd-mut">(Doku sagt es nicht)</span></div>
      <div class="sd-zeile">Transaktion auffindbar nach <select data-sd-z="sichtbarNach">${opt(Z.sichtbarNach, [[0, 'sofort'], [5, '5 s'], [15, '15 s'], [60, '60 s']])}</select> <span class="sd-mut">(Doku sagt es nicht)</span></div>
      <h3>Gekoppelte Geräte</h3>${Z.readers.map((r) => `<div class="sd-zeile">${e(r.name)} · ${e(r.status)} <span class="sd-mut">${e(r.id)}</span><button data-sd="rweg" data-v="${r.id}">entkoppeln</button></div>`).join('') || '<div class="sd-mut">keins</div>'}
      <div class="sd-zeile">Kopplungscode am Solo: <b>${e(Z.koppelCode)}</b><button data-sd="neucode">neuer Code</button></div>`;
  }
  function logAnsicht() {
    return `<h3>Protokoll</h3><div class="sd-zeile"><button data-sd="logweg">Leeren</button></div>${Z.log.map((l) => l.art === 'api'
      ? `<details><summary>${e(l.t)} <b>${e(l.methode)}</b> ${e(l.pfad)} → <span class="${typeof l.status === 'number' && l.status < 300 ? 'sd-ok' : 'sd-fe'}">${e(l.status)}</span></summary>
        ${l.body ? '<div class="sd-mut">Anfrage</div><pre>' + e(JSON.stringify(l.body, null, 1)) + '</pre>' : ''}${l.antwort !== undefined ? '<div class="sd-mut">Antwort</div><pre>' + e(typeof l.antwort === 'string' ? l.antwort : JSON.stringify(l.antwort, null, 1)) + '</pre>' : ''}</details>`
      : `<details><summary>${e(l.t)} ${l.art === 'solo' ? '📟' : '🗂'} ${e(l.text || (l.methode + ' ' + l.pfad))}</summary>${l.body ? '<pre>' + e(JSON.stringify(l.body, null, 1)) + '</pre>' : ''}</details>`).join('') || '<div class="sd-mut">Noch nichts.</div>'}`;
  }

  function zeichnen() {
    if (!document.body) return;
    let band = document.getElementById('sd-band');
    if (!band) {
      const st = document.createElement('style'); st.textContent = STIL; document.head.appendChild(st);
      band = document.createElement('div'); band.id = 'sd-band'; document.body.appendChild(band);
      document.body.style.paddingBottom = '46px';
    }
    band.innerHTML = `🧪 TESTMODUS – SumUp-Dummy. Nichts geht an SumUp, Google oder den Schichtplan.
      <span style="flex:1"></span><button data-sd="pan" class="${Z.offen ? 'sd-blink' : ''}">${Z.offen ? '📟 Zahlung wartet' : '📟 Test-Solo'}</button><button data-sumup-test="aus">Testmodus beenden</button>`;
    let pan = document.getElementById('sd-pan');
    if (!UI.offen) { if (pan) pan.remove(); return; }
    // Eingaben, in denen gerade getippt wird, nicht unter den Fingern neu zeichnen.
    const fokus = document.activeElement;
    if (pan && fokus && pan.contains(fokus) && /INPUT|SELECT/.test(fokus.tagName)) return;
    if (!pan) { pan = document.createElement('div'); pan.id = 'sd-pan'; document.body.appendChild(pan); }
    const tabs = [['solo', '📟 Solo'], ['produkte', 'Produkte'], ['tx', 'Transaktionen'], ['gaeste', 'Testgäste'], ['stoer', 'Störungen'], ['log', 'Protokoll']];
    const inhalt = { solo: soloAnsicht, produkte: produkteAnsicht, tx: txAnsicht, gaeste: gaesteAnsicht, stoer: stoerAnsicht, log: logAnsicht }[UI.tab]();
    const scroll = (pan.querySelector('#sd-inh') || {}).scrollTop || 0;
    pan.innerHTML = `<header>${tabs.map(([k, t]) => `<button data-sd="tab" data-v="${k}" class="${UI.tab === k ? 'sd-on' : ''}">${t}</button>`).join('')}<span style="flex:1"></span><button data-sd="zu">✕</button></header><div id="sd-inh">${inhalt}</div>`;
    pan.querySelector('#sd-inh').scrollTop = scroll;
  }

  const centAus = (txt) => { const n = parseFloat(String(txt || '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? Math.round(n * 100) : 0; };
  const wert = (i) => (document.getElementById(i) || {}).value || '';
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('[data-sd]');
    if (!b || !(b.closest('#sd-pan') || b.closest('#sd-band'))) return;
    if (b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
    ev.preventDefault(); ev.stopPropagation();
    const a = b.dataset.sd, v = b.dataset.v;
    const fertig = () => { merken(); zeichnen(); };
    if (a === 'pan') { UI.offen = !UI.offen; if (Z.offen) UI.tab = 'solo'; return zeichnen(); }
    if (a === 'zu') { UI.offen = false; return zeichnen(); }
    if (a === 'tab') { UI.tab = v; return zeichnen(); }
    if (a === 'start') { soloStart(); return fertig(); }
    if (a === 'tipw') { UI.tipSolo = (Number(v) / 100).toFixed(2).replace('.', ','); return zeichnen(); }
    if (a === 'bezahlt') { const tip = centAus(wert('sd-tipfrei')); UI.tipSolo = ''; soloAbschluss('SUCCESSFUL', tip, 'Bezahlt am Gerät'); return fertig(); }
    if (a === 'abgelehnt') { soloAbschluss('FAILED', 0, 'Karte abgelehnt'); return fertig(); }
    if (a === 'abbruch') { soloAbschluss('CANCELLED', 0, 'Abbruch am Gerät'); return fertig(); }
    if (a === 'korb') { UI.korb[v] = Math.max(0, (UI.korb[v] || 0) + Number(b.dataset.d)); UI.zeitSolo = wert('sd-dzeit'); return zeichnen(); }
    if (a === 'korbleer') { UI.korb = {}; return zeichnen(); }
    if (a === 'direkt' || a === 'ohneartikel') {
      const z = wert('sd-dzeit'), tip = centAus(wert('sd-dtip')), d = new Date();
      if (z) { const [h, m] = z.split(':').map(Number); d.setHours(h, m, 0, 0); }
      let produkte = Z.produkte.filter((p) => UI.korb[p.id]).map((p) => ({ name: p.name, variante: p.variante, preis: p.preis, menge: UI.korb[p.id] }));
      let betrag = produkte.reduce((s, p) => s + p.preis * p.menge, 0);
      if (a === 'ohneartikel') { betrag = centAus(prompt('Betrag in € (ohne Trinkgeld):', '75,00')); produkte = []; if (!betrag) return; }
      txNeu({ betrag, tip, zeit: d.toISOString(), produkte, karte: { last4: zufall(4, '0123456789'), typ: wert('sd-dkarte') || 'VISA' } });
      UI.korb = {}; UI.zeitSolo = '';
      protokoll({ art: 'solo', text: 'Direkt am Solo kassiert: ' + eurT(betrag) + (tip ? ' + ' + eurT(tip) + ' Trinkgeld' : '') + (produkte.length ? ' (' + produkte.map((p) => p.menge + '× ' + p.name).join(', ') + ')' : ' ohne Artikel') });
      return fertig();
    }
    if (a === 'pneu') { Z.produkte.push({ id: uuid(), name: 'Neues Produkt', variante: '', preis: 100 }); return fertig(); }
    if (a === 'pweg') { Z.produkte = Z.produkte.filter((p) => p.id !== v); return fertig(); }
    if (a === 'pmassage') { for (const L of [30, 40, 45, 60, 90]) for (const s of ['früh', 'spät']) Z.produkte.push({ id: uuid(), name: 'Massage ' + L + ' ' + s, variante: '', preis: PREISE[L] }); return fertig(); }
    if (a === 'txweg') { Z.tx = Z.tx.filter((t) => t.id !== v); return fertig(); }
    if (a === 'txalle') { if (confirm('Alle Dummy-Transaktionen löschen?')) { Z.tx = []; Z.offen = null; } return fertig(); }
    if (a === 'rweg') { Z.readers = Z.readers.filter((r) => r.id !== v); return fertig(); }
    if (a === 'neucode') { Z.koppelCode = zufall(8); return fertig(); }
    if (a === 'logweg') { Z.log = []; return fertig(); }
    if (a === 'schicht') { testSchicht(Number(v)); appFertig(); return zeichnen(); }
    if (a === 'gast') { testGast(wert('sd-gname').trim()); return zeichnen(); }
    if (a === 'termin') { testTermin(wert('sd-tzeit') || '14:00', Number(wert('sd-tdauer')) || 60, wert('sd-tgast').trim(), wert('sd-tmas')); return zeichnen(); }
    if (a === 'stamm') return stammdatenUebernehmen();
    if (a === 'einr') return schnellEinrichten(v === '1');
    if (a === 'allesweg') return testdatenWeg();
  }, true);
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!el.closest || !el.closest('#sd-pan')) return;
    if (el.dataset.sd === 'online') { Z.online = el.checked; merken(); return zeichnen(); }
    if (el.dataset.sd === 'txst') { const t = Z.tx.find((x) => x.id === el.dataset.v); if (t) t.status = el.value; merken(); el.blur(); return zeichnen(); }
    if (el.dataset.sdFeld) {
      const p = Z.produkte.find((x) => x.id === el.dataset.v); if (!p) return;
      if (el.dataset.sdFeld === 'preis') p.preis = centAus(el.value); else p[el.dataset.sdFeld] = el.value;
      merken(); return;
    }
    if (el.dataset.sdZ) {
      const k = el.dataset.sdZ;
      Z[k] = el.type === 'checkbox' ? el.checked : k === 'sichtbarNach' ? Number(el.value) : el.value;
      merken(); el.blur(); return zeichnen();
    }
  }, true);

  // Der Solo-Bildschirm zählt den Verfall herunter; einmal je Sekunde genügt.
  setInterval(() => { if (UI.offen && UI.tab === 'solo' && Z.offen) zeichnen(); else if (Z.offen) offenAbgelaufen(); }, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', zeichnen); else zeichnen();
})();
