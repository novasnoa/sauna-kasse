// Holt den Massageplan der nächsten Wochen aus dem Schichtplan und schreibt ihn als plan.json neben die Kasse.
// Warum so: Der Schichtplan lässt Abfragen aus dem Browser fremder Seiten nicht zu (Cookie, kein CORS) und soll nicht geändert werden.
// Dieses Skript läuft deshalb in der Veröffentlichung (GitHub Actions), meldet sich dort mit dem Teampasswort an und legt nur die
// Anzeigedaten als plan.json ab – die Kasse liest sie von ihrer eigenen Adresse. Das Passwort steht nur im GitHub-Geheimnis
// SCHICHTPLAN_PASSWORT, nie im Quelltext. Die Daten gelten als praktisch öffentlich (Vorgabe des Betreibers).
import { writeFileSync, appendFileSync } from 'node:fs';

const PLAN = process.env.SCHICHTPLAN_URL || 'https://schichtplan.saunaolivin.workers.dev';
const LIVE = process.env.KASSE_PLAN_URL || 'https://sauna-kassensystem.web.app/plan.json';
const passwort = process.env.SCHICHTPLAN_PASSWORT;
const ausgabe = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); console.log(`${k}=${v}`); };

const iso = d => d.toISOString().slice(0, 10);
const heute = new Date(new Date().toLocaleString('en-CA', { timeZone: 'Europe/Berlin', hour12: false }).replace(', ', 'T') + 'Z');
const montag = new Date(heute); montag.setUTCDate(montag.getUTCDate() - ((montag.getUTCDay() + 6) % 7));
const bis = new Date(montag); bis.setUTCDate(bis.getUTCDate() + 34);   // fünf Wochen: vier volle plus Reserve

async function alt() { try { const r = await fetch(LIVE + '?t=' + Date.now()); return r.ok ? await r.json() : null; } catch { return null; } }
const inhalt = p => JSON.stringify({ from: p.from, to: p.to, shifts: p.shifts, personen: p.personen });

async function neu() {
  if (!passwort) throw new Error('SCHICHTPLAN_PASSWORT fehlt');
  const kopf = { 'X-Schichtplan': '1', 'Content-Type': 'application/json' };
  const login = await fetch(PLAN + '/api/login', { method: 'POST', headers: kopf, body: JSON.stringify({ password: passwort }) });
  if (!login.ok) throw new Error('Anmeldung am Schichtplan: HTTP ' + login.status);
  const cookie = (login.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  const get = async pfad => { const r = await fetch(PLAN + pfad, { headers: { 'X-Schichtplan': '1', Cookie: cookie } }); if (!r.ok) throw new Error(pfad + ': HTTP ' + r.status); return r.json(); };
  const board = await get(`/api/board?from=${iso(montag)}&to=${iso(bis)}`), state = await get('/api/state');
  return {
    stand: new Date().toISOString(), from: board.from, to: board.to,
    // nur, was die Anzeige braucht: keine Personen-IDs, keine Notizen
    shifts: board.shifts.map(s => ({ date: s.date, shiftType: s.shiftType, positionName: s.positionName, slots: s.slots, claims: s.claims.map(c => ({ name: c.name, color: c.color })) })),
    personen: (state.staff || []).map(p => p.name)
  };
}

const vorher = await alt();
try {
  const plan = await neu();
  writeFileSync('plan.json', JSON.stringify(plan));
  ausgabe('geaendert', !vorher || inhalt(vorher) !== inhalt(plan) ? 'ja' : 'nein');
} catch (e) {
  console.error('Schichtplan nicht geholt:', e.message);
  // Der letzte Stand bleibt auf der Seite, damit er bei einer Veröffentlichung nicht verschwindet
  if (vorher) writeFileSync('plan.json', JSON.stringify(vorher));
  ausgabe('geaendert', 'nein');
}
