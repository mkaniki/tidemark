// ALL-IN-ONE v2 · BTC futures
// Changes from v1, each tested on 2020-23, checked on 2024-now and on unseen 2018-19:
//  - every trade is sized from ONE shared balance (v1 let each part grow its own pot, which drifted)
//  - Sizing 'Growth' (3% / 50%): most profit, worst drop about -42% since 2018, worst year -13%
//    Sizing 'Balanced' (2.5% / 25%): about half the long-run profit, worst drop about -34%, worst year -7%
//  - optional filters (risk cap, exposure cap, ADX, 1H-after-profit, monthly) are OFF: they did not survive the out-of-sample tests
// Every part that passed the 2024-now test, running together on one Bitunix futures account, on a 1H chart:
//   4H   = your BTC Regime-Adaptive algo (4H breakouts, trailing stop)        risk-based size
//   1H   = Trend-Leg Breakouts (extra 1H trades while the 4H trade is open)   risk-based size
//   W    = Weekly both sides (long above the 50-week average, short below)   fixed size, 1x
// One alert feed: every alert says which part it is from and the exact Bitunix order.
// Use on BTCUSDT 1H with History "All history" (the weekly part needs a year of data first).
strategy('All-in-one v2 · BTC futures', { capital: 10000 })

const P = {
  use4h:   input('Use 4H algo', true),
  use1h:   input('Use 1H leg breakouts', true),
  useW:    input('Use long-term part (weekly or monthly)', true),
  sizing:  input('Sizing', 'Growth: 3% risk, 50% weekly', { options: ['Growth: 3% risk, 50% weekly', 'Balanced: 2.5% risk, 25% weekly', 'Custom: use the two settings below'] }),
  risk:    input('Custom risk per trade % (4H and 1H parts)', 2.5),
  wPct:    input('Custom long-term position size (% of balance)', 25),
  maxLev:  input('Max position per part (x balance)', 20),
  maxRisk: input('Max total risk open at once (% of balance, 0 = no cap)', 0),
  maxExpo: input('Max total position size (x balance, 0 = no cap)', 0),
  adxMin:  input('Skip 4H entries when 4H ADX is below (0 = off)', 0),
  legR:    input('Only add 1H trades once the 4H trade is ahead by (R, 0 = off)', 0),
  longTerm: input('Long-term part', 'weekly', { options: ['weekly', 'monthly'] }),
  feePct:  input('Fee % per side', 0.06),
  slipPct: input('Slippage % per side', 0.02),
  funding: input('Funding % per 8h', 0.01),
  alertMinMove: input('Alert when a trailing stop moves at least %', 0.5),
  balance: input('Bitunix futures balance for alert sizing (USDT, 0 = off)', 3000),
  exLev:   input('Bitunix leverage setting', 85),
  qtyDec:  input('BTC quantity decimals', 4),
  from:    input('Backtest from (YYYY-MM-DD, blank = all)', ''),
  to:      input('Backtest to (YYYY-MM-DD, blank = now)', ''),
}
if (P.sizing.startsWith('Growth')) { P.risk = 3; P.wPct = 50 } else if (P.sizing.startsWith('Balanced')) { P.risk = 2.5; P.wPct = 25 }
const n = close.length, ms = n > 1 ? time[1] - time[0] : 36e5, H4MS = 4 * 36e5
if (ms !== 36e5) throw new Error('Open a 1H chart. This combines a 1H strategy with 4H and weekly ones.')
const cost = (P.feePct + P.slipPct) / 100, cap = 10000, B = { o: open, h: high, l: low, c: close, t: time, v: volume }
const common = { cost, funding8h: P.funding / 100, fundingShortMult: 0.5, from: P.from, to: P.to }

// ---------- helpers ----------
const ema_ = (x, k) => { const a = 2 / (k + 1), o = [x[0]]; for (let i = 1; i < x.length; i++) o.push(o[i-1] + a * (x[i] - o[i-1])); return o }
const rma_ = (x, k) => { let s = 0; for (let i = 0; i < k; i++) s += x[i]; const o = new Array(Math.min(k, x.length)).fill(s / k); for (let i = k; i < x.length; i++) o.push(o[i-1] + (x[i] - o[i-1]) / k); return o }
const ext = (a, k, len, hi) => { let m = hi ? -Infinity : Infinity; for (let j = Math.max(0, k - len); j < k; j++) m = hi ? Math.max(m, a[j]) : Math.min(m, a[j]); return m }
const trOf = (h, l, c) => c.map((x, i) => i ? Math.max(h[i] - l[i], Math.abs(h[i] - c[i-1]), Math.abs(l[i] - c[i-1])) : h[0] - l[0])
function bucket(keyOf) {             // higher-timeframe candles built from the 1H chart
  const H = { h: [], l: [], c: [], k: [] }, idx = new Array(n)
  for (let i = 0; i < n; i++) { const k0 = keyOf(time[i]), j = H.k.length - 1
    if (j < 0 || H.k[j] !== k0) { H.h.push(high[i]); H.l.push(low[i]); H.c.push(close[i]); H.k.push(k0) }
    else { H.h[j] = Math.max(H.h[j], high[i]); H.l[j] = Math.min(H.l[j], low[i]); H.c[j] = close[i] }
    idx[i] = H.k.length - 1 }
  return { H, idx, ends: i => keyOf(time[i] + ms) !== keyOf(time[i]) && time[i] + ms <= Date.now() }
}


// ---------- higher-timeframe candles ----------
const F = bucket(t => Math.floor(t / H4MS)), C4 = F.H.c, H4 = F.H.h, L4 = F.H.l
const atr4 = rma_(trOf(H4, L4, C4), 14), f4 = ema_(C4, 50), s4 = ema_(C4, 200)
const adx4 = P.adxMin > 0 ? ta.dmi(H4, L4, C4, 14, 14)[2] : null
const isMonthly = P.longTerm === 'monthly'
const LT = bucket(isMonthly ? (t => { const d = new Date(t); return d.getUTCFullYear() * 12 + d.getUTCMonth() }) : (t => Math.floor((t / 864e5 + 3) / 7)))
const CL = LT.H.c, LEN = isMonthly ? 10 : 50
const avgL = CL.map((_, k) => { if (k < LEN - 1) return null; let s = 0; for (let j = k - LEN + 1; j <= k; j++) s += CL[j]; return s / LEN })
const Wk = bucket(t => Math.floor((t / 864e5 + 3) / 7)), ema20w = ema_(Wk.H.c, 20)
const atr1 = rma_(trOf(high, low, close), 14)

// 4H trend state replayed independently (used by the 1H part if the 4H part is switched off)
const rp = strategy.simulate(B, (i, s) => {
  if (!F.ends(i)) return; const k = F.idx[i]; if (k < 210) return; const c = C4[k], a = atr4[k]
  if (s.pos > 0) { s.setStop(Math.max(s.stop, c - 3 * a)); if (c < ext(L4, k, 20, false)) s.exit(c, 'x') }
  if (s.pos < 0) { s.setStop(Math.min(s.stop, c + 3 * a)); if (c > ext(H4, k, 20, true)) s.exit(c, 'x') }
  if (!s.pos) { const up = f4[k] > s4[k]; if (up && c > ext(H4, k, 120, true)) s.buy({ riskPct: 1.5, maxLev: 2, stop: c - 3 * a }); else if (!up && c < ext(L4, k, 120, false)) s.sell({ riskPct: 1.5, maxLev: 2, stop: c + 3 * a }) }
}, { cost: 0.0008 })
const rpDir = new Array(n).fill(0), rpEntry = new Array(n).fill(null), rpStop0 = new Array(n).fill(null)
{ const ent = rp.events.filter(e => e.type === 'entry'); let j = 0
  for (const t of rp.trades) { while (j < ent.length && ent[j].i < t.ei) j++; const e = ent[j]; for (let i = t.ei; i < t.xi; i++) { rpDir[i] = t.dir; rpEntry[i] = t.ep; rpStop0[i] = e ? e.stop : null } }
  if (rp.open) { const e = ent[ent.length - 1]; for (let i = rp.open.ei; i < n; i++) { rpDir[i] = rp.open.dir; rpEntry[i] = rp.open.ep; rpStop0[i] = e ? e.stop : null } } }

let S4 = null
const part4 = { name: '4H algo', short: '4H', opts: { stopMoveEvents: true, stopMoveMinPct: P.alertMinMove }, fn: (i, s) => {
  S4 = s; if (s.pos && s.data.stop0 == null) s.data.stop0 = s.stop
  if (!F.ends(i)) return; const k = F.idx[i]; if (k < 210) return
  const c = C4[k], a = atr4[k]
  if (s.pos > 0) { s.setStop(Math.max(s.stop, c - 3 * a)); if (c < ext(L4, k, 20, false)) s.exit(c, 'Channel exit') }
  if (s.pos < 0) { s.setStop(Math.min(s.stop, c + 3 * a)); if (c > ext(H4, k, 20, true)) s.exit(c, 'Channel exit') }
  if (s.pos) return
  if (adx4 && !(adx4[k] >= P.adxMin)) return
  const up = f4[k] > s4[k], r = { riskPct: P.risk, maxLev: P.maxLev, tag: '4H' }
  if (up && c > ext(H4, k, 120, true)) s.buy({ ...r, stop: c - 3 * a })
  else if (!up && c < ext(L4, k, 120, false)) s.sell({ ...r, stop: c + 3 * a }) } }

const part1 = { name: '1H legs', short: '1H', fn: (i, s) => {
  // the 4H trade we follow: the live 4H part if it's on, otherwise the replay
  const live = P.use4h && S4, d = live ? S4.pos : rpDir[i]
  const ent = live ? S4.entry : rpEntry[i], st0 = live ? S4.data.stop0 : rpStop0[i]
  if (s.pos) { if (d !== s.pos) s.exit(close[i], '4H trade ended'); else if (s.barsIn >= 72) s.exit(close[i], 'Time'); if (s.pos) return }
  if (!d || i < 48) return
  if (P.legR > 0) { const R = ent != null && st0 != null ? Math.abs(ent - st0) : 0; if (!R || d * (close[i] - ent) < P.legR * R) return }
  const r = { riskPct: P.risk, maxLev: P.maxLev, tag: '1H' }
  if (d > 0 && close[i] > ext(high, i, 48, true)) s.buy({ ...r, stop: close[i] - 2.5 * atr1[i] })
  else if (d < 0 && close[i] < ext(low, i, 48, false)) s.sell({ ...r, stop: close[i] + 2.5 * atr1[i] }) } }

const partL = { name: isMonthly ? 'Monthly' : 'Weekly', short: isMonthly ? 'M' : 'W', opts: { fundingShortMult: -1 }, fn: (i, s) => {
  // shorts are covered fast: weekly close back above the 20-week EMA
  if (s.pos < 0 && Wk.ends(i) && Wk.H.c[Wk.idx[i]] > ema20w[Wk.idx[i]]) s.exit(close[i], 'Weekly close above 20-week EMA')
  if (!LT.ends(i)) return; const k = LT.idx[i]; if (avgL[k] == null) return
  const c = close[i], above = CL[k] > avgL[k], wk = Wk.idx[i], coverNow = Wk.H.c[wk] > ema20w[wk]
  if (s.pos > 0 && !above) s.exit(c, (isMonthly ? 'Monthly' : 'Weekly') + ' close below average')
  if (s.pos < 0 && above) s.exit(c, (isMonthly ? 'Monthly' : 'Weekly') + ' close above average')
  if (s.pos) return
  if (above) s.buy({ pct: P.wPct, tag: 'LT' })
  else if (!coverNow) s.sell({ pct: P.wPct, tag: 'LT', stop: c * 1.2 }) } }

const parts = []
if (P.use4h) parts.push(part4)
if (P.use1h) parts.push(part1)
if (P.useW)  parts.push(partL)
if (!parts.length) throw new Error('Switch on at least one part in Settings.')
const bt = strategy.runMulti(parts, { ...common, capital: cap, maxRiskPct: P.maxRisk > 0 ? P.maxRisk : null, maxExposure: P.maxExpo > 0 ? P.maxExpo : null,
  costLabel: cost * 100, fundingLabel: P.funding, alertInfo: { balance: P.balance, lev: P.exLev, qtyDec: P.qtyDec, maxLev: P.maxLev, exchange: 'Bitunix' } })

// ---------- on the chart ----------
const lastDone = (arr, X) => series(i => { const k = X.ends(i) ? X.idx[i] : X.idx[i] - 1; return k >= 0 ? arr[k] : null })
plot(lastDone(avgL, LT), (isMonthly ? '10-month' : '50-week') + ' average', '#7e57c2', { style: 'step', width: 2 })
plot(series(i => { const k = F.idx[i]; return k >= 120 ? ext(H4, k, 120, true) : null }), '4H breakout high', '#2962ff', { style: 'step', width: 1 })
plot(series(i => { const k = F.idx[i]; return k >= 120 ? ext(L4, k, 120, false) : null }), '4H breakout low', '#2962ff', { style: 'step', width: 1 })
for (const sl of bt.sleeves) plot(sl.stopLine, sl.name + ' stop', sl.name === '4H algo' ? '#f23645' : sl.name === '1H legs' ? '#ff6d00' : '#b71c1c', { style: 'circles' })
bgcolor(series(i => rpDir[i] > 0), '#089981')
bgcolor(series(i => rpDir[i] < 0), '#f23645')
