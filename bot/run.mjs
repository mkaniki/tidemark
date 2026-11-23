// Tidemark cloud alert bot: runs All-in-one v2 on BTCUSDT 1H every hour and sends new alerts to your phone.
// Same engine and strategy code as the Tidemark app, so the signals match the backtest exactly.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.join(dir, '..');
const env = process.env, DRY = env.DRY_RUN === '1';
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const SYMBOL = cfg.symbol || 'BTCUSDT', INTERVAL = '1h', H = 36e5;
const HOSTS = ['https://data-api.binance.vision/api/v3', 'https://api.binance.us/api/v3', 'https://api.binance.com/api/v3'];

async function getJSON(p) { let last; for (const h of HOSTS) { try { const r = await fetch(h + p); if (r.ok) return await r.json(); last = r.status } catch (e) { last = e.message } } throw new Error('Binance unreachable: ' + last) }
async function bars() {               // all hourly history since Aug 2017, oldest first
  let out = [], end = null
  for (let k = 0; k < 120; k++) { const j = await getJSON(`/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=1000${end ? `&endTime=${end}` : ''}`); if (!j.length) break
    out = j.map(r => [r[0], +r[1], +r[2], +r[3], +r[4], +r[5]]).concat(out); if (j.length < 1000) break; end = j[0][0] - 1 }
  const now = Date.now(); while (out.length && out[out.length - 1][0] + H > now) out.pop()   // keep only CLOSED candles
  return out
}
// load the shared engine + strategy exactly as the app does
const ctx = { console, Date, Math, JSON, Array, Object, Number, String, Boolean, Infinity, NaN, isFinite, Error, Map, Set }
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(dir, 'engine.js'), 'utf8') + ';this.TAF=TAF;this.RUN=RUN;this.ta=TAF();', ctx)
function runStrategy(raw) {
  const B = { t: raw.map(r => r[0]), o: raw.map(r => r[1]), h: raw.map(r => r[2]), l: raw.map(r => r[3]), c: raw.map(r => r[4]), v: raw.map(r => r[5]) }
  let res; ctx.postMessage = m => { res = m }
  ctx.RUN({ data: { bars: B, code: fs.readFileSync(path.join(dir, 'strategy.js'), 'utf8'), inputs: {
    'Sizing': cfg.sizing || 'Growth: 3% risk, 50% weekly', 'Bitunix futures balance for alert sizing (USDT, 0 = off)': +(env.BALANCE || cfg.balance || 0),
    'Bitunix leverage setting': +(cfg.leverage || 85) } } })
  if (!res || res.error) throw new Error('Strategy error: ' + (res && res.error)); return { B, res }
}
// ---- alert wording (same as the app) ----
const fp = p => p == null || !isFinite(p) ? '–' : p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = v => (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pc = (p, b) => `${(p / b - 1) * 100 >= 0 ? '+' : ''}${((p / b - 1) * 100).toFixed(2)}%`
const side = d => d > 0 ? 'LONG' : 'SHORT'
const res_ = (e) => { const r = e.dir * (e.price / e.entry - 1) * 100; return `${r >= 0 ? 'profit' : 'loss'} ${r >= 0 ? '+' : ''}${r.toFixed(2)}% on the price move, entry ${fp(e.entry)}` }
function plan(A, e) { if (!A || !(A.balance > 0)) return null; const dec = A.qtyDec ?? 4, f = 10 ** dec
  let notional; if (e.pct != null) notional = A.balance * e.pct / 100
  else { if (e.stop == null || !e.risk) return null; const dist = Math.abs(e.price - e.stop) / e.price; if (!dist) return null; notional = Math.min(A.balance * e.risk / 100 / dist, A.balance * (A.maxLev || Infinity)) }
  const qty = Math.floor(notional / e.price * f) / f; return { qty: qty.toFixed(dec), usdt: qty * e.price, margin: qty * e.price / (A.lev || 1), lev: A.lev, risk: e.stop != null ? qty * Math.abs(e.stop - e.price) : null } }
function words(res, e) {
  const A = res.alertInfo, title = `All-in-one v2 · ${e.sleeve}`, where = `${SYMBOL} 1H`
  if (e.type === 'signal') { const p = plan(A, e); return [`${side(e.dir)} ENTRY · ${where}`, [`${title}: ${e.dir > 0 ? 'buy' : 'sell'} at market now (last close ${fp(e.price)})`,
      p ? `Bitunix: ${e.dir > 0 ? 'Open Long' : 'Open Short'} ${p.qty} BTC (≈ ${money(p.usdt)} USDT) · margin ≈ ${money(p.margin)} at ${p.lev}x cross` : `Size: ${e.pct != null ? e.pct + '% of balance at 1x' : e.risk + '% risk'} (add your balance to get BTC amounts)`,
      e.stop != null ? `Stop-loss: ${fp(e.stop)} (${pc(e.stop, e.price)})${p && p.risk != null ? ` · loses ≈ ${money(p.risk)} USDT if hit` : ''}` : 'No stop: exits on the weekly close rule'].join('\n')] }
  if (e.type === 'stop_move') return [`UPDATE STOP · ${where} ${side(e.dir)}`, `${title}: move your stop-loss to ${fp(e.stop)}${e.prev != null ? ` (was ${fp(e.prev)})` : ''}`]
  if (e.type === 'sl') return [`${e.why === 'Trail' ? 'TRAILING ' : ''}STOP HIT · ${where} ${side(e.dir)}`, `${title}: stopped out at ${fp(e.price)} (${res_(e)}). If your Bitunix stop didn't fill, close at market.`]
  if (e.type === 'exit') return [`EXIT (${e.why}) · ${where} ${side(e.dir)}`, `${title}: close the whole position at market now (${fp(e.price)}, ${res_(e)}) and cancel its stop-loss.`]
  if (e.type === 'tp') return [`${e.why} HIT · ${where} ${side(e.dir)}`, `${title}: take profit at ${fp(e.price)}`]
  return null
}
async function send(title, body) {
  console.log(`\n>>> ${title}\n${body}`); if (DRY) return
  const jobs = []
  if (env.NTFY_TOPIC) jobs.push(fetch('https://ntfy.sh/' + encodeURIComponent(env.NTFY_TOPIC.trim()), { method: 'POST', headers: { Title: title.replace(/·/g, '-').replace(/[^\x20-\x7E]/g, ''), Priority: 'high', Tags: 'chart_with_upwards_trend' }, body }))
  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) jobs.push(fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN.trim()}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID.trim(), text: `${title}\n${body}` }) }))
  if (!jobs.length) console.log('(no NTFY_TOPIC or TELEGRAM secrets set: alert only printed)')
  for (const r of await Promise.allSettled(jobs)) if (r.status === 'rejected' || (r.value && !r.value.ok)) console.log('delivery problem:', r.reason || r.value.status)
}
// ---- main ----
const statePath = path.join(root, 'docs', 'state.json'), statusPath = path.join(root, 'docs', 'status.json'), logPath = path.join(root, 'docs', 'alerts.json')
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {}
const raw = await bars(); const { B, res } = runStrategy(raw); const n = B.t.length, lastClosed = B.t[n - 1]
const since = env.REPLAY_SINCE ? Date.parse(env.REPLAY_SINCE) : (state.lastBar ?? lastClosed)   // first run: no backlog
const fresh = res.bt.events.filter(e => e.t > since && e.t <= lastClosed && ['signal', 'stop_move', 'sl', 'exit', 'tp'].includes(e.type) )
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : []
for (const e of fresh) { const w = words(res.bt, e); if (!w) continue; await send(w[0], w[1]); log.unshift({ t: Date.now(), bar: e.t, title: w[0], body: w[1] }) }
if (env.TEST_ALERT === '1') await send('TEST · Tidemark cloud bot', 'If you can read this on your phone, alerts are working.')
fs.mkdirSync(path.dirname(statePath), { recursive: true })
if (!env.REPLAY_SINCE) {
  fs.writeFileSync(statePath, JSON.stringify({ lastBar: lastClosed }, null, 1))
  fs.writeFileSync(logPath, JSON.stringify(log.slice(0, 50), null, 1))
  fs.writeFileSync(statusPath, JSON.stringify({ checked: Date.now(), lastBar: lastClosed, price: B.c[n - 1], sizing: cfg.sizing,
    positions: res.bt.opens.map(o => ({ part: o.sleeve, side: side(o.dir), since: o.et, entry: o.ep, stop: o.stop, unrealisedPct: o.dir * (B.c[n - 1] / o.ep - 1) * 100 })) }, null, 1))
}
console.log(`\nChecked ${SYMBOL} up to ${new Date(lastClosed + H).toISOString()} · ${fresh.length} new alert(s) · open: ${res.bt.opens.map(o => o.sleeve + ' ' + side(o.dir)).join(', ') || 'none'}`)
