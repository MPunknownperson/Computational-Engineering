/**
 * Exact money arithmetic. Everything that touches an amount of currency or a
 * quantity of an asset goes through decimal.js at 40 significant digits so a
 * conversion such as 0.1 BTC × 67,432.18 USD is never rounded by IEEE-754
 * before the user sees it. Public results are returned as strings.
 */
import Decimal from "decimal.js";

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -30, toExpPos: 40 });

export type DecimalInput = string | number | Decimal;

export function dec(value: DecimalInput): Decimal {
  try { return new D(typeof value === "number" ? value.toString() : value); } catch { return new D(0); }
}

export function isPositiveDecimal(value: string): boolean {
  return /^(\d+)(\.\d+)?$/.test(value.trim()) && dec(value).gt(0);
}

export function isDecimalString(value: string): boolean {
  return /^-?(\d+)(\.\d+)?$/.test(value.trim());
}

/** Convert `amount` of an asset priced at `fromPrice` into one priced at `toPrice` (same quote currency). */
export function convertExact(amount: DecimalInput, fromPrice: DecimalInput, toPrice: DecimalInput): { result: string; rate: string; inverse: string; quoteValue: string } {
  const a = dec(amount), f = dec(fromPrice), t = dec(toPrice);
  if (t.lte(0) || f.lte(0)) return { result: "0", rate: "0", inverse: "0", quoteValue: "0" };
  const rate = f.div(t);
  const result = a.mul(rate);
  return { result: result.toFixed(), rate: rate.toSignificantDigits(20).toFixed(), inverse: t.div(f).toSignificantDigits(20).toFixed(), quoteValue: a.mul(f).toFixed() };
}

export type DcaResult = {
  periods: number; invested: string; units: string; averageCost: string; currentValue: string; pnl: string; pnlPct: string;
  lumpSumUnits: string; lumpSumValue: string; lumpSumPnlPct: string; bestEntry: string; worstEntry: string;
  schedule: Array<{ at: number; price: string; units: string; cumulativeUnits: string; cumulativeInvested: string; value: string }>;
};

/** Dollar-cost-averaging simulation over a price series with purchases every `everyDays`. */
export function dcaSimulation(points: Array<[number, number]>, amountPerPeriod: DecimalInput, everyDays: number): DcaResult {
  const amount = dec(amountPerPeriod);
  const schedule: DcaResult["schedule"] = [];
  let units = new D(0), invested = new D(0), lastBuy = -Infinity, best = new D(Infinity), worst = new D(0);
  const spacing = Math.max(1, everyDays) * 86_400_000 * 0.98;
  for (const [ts, price] of points) {
    if (price <= 0 || ts - lastBuy < spacing) continue;
    lastBuy = ts;
    const p = dec(price);
    const bought = amount.div(p);
    units = units.plus(bought); invested = invested.plus(amount);
    if (p.lt(best)) best = p; if (p.gt(worst)) worst = p;
    schedule.push({ at: ts, price: p.toFixed(), units: bought.toFixed(12), cumulativeUnits: units.toFixed(12), cumulativeInvested: invested.toFixed(2), value: units.mul(p).toFixed(2) });
  }
  const last = dec(points[points.length - 1]?.[1] ?? 0);
  const first = dec(points.find(([, p]) => p > 0)?.[1] ?? 0);
  const currentValue = units.mul(last);
  const pnl = currentValue.minus(invested);
  const lumpUnits = first.gt(0) ? invested.div(first) : new D(0);
  const lumpValue = lumpUnits.mul(last);
  return {
    periods: schedule.length, invested: invested.toFixed(2), units: units.toFixed(12),
    averageCost: units.gt(0) ? invested.div(units).toFixed(8) : "0", currentValue: currentValue.toFixed(2), pnl: pnl.toFixed(2),
    pnlPct: invested.gt(0) ? pnl.div(invested).mul(100).toFixed(4) : "0",
    lumpSumUnits: lumpUnits.toFixed(12), lumpSumValue: lumpValue.toFixed(2), lumpSumPnlPct: invested.gt(0) ? lumpValue.minus(invested).div(invested).mul(100).toFixed(4) : "0",
    bestEntry: best.isFinite() ? best.toFixed() : "0", worstEntry: worst.toFixed(), schedule,
  };
}

export type PositionValuation = { marketValue: string; cost: string; pnl: string; pnlPct: string; weight: string };

export function valuePositions(positions: Array<{ quantity: string; costBasis: string; price: DecimalInput }>): { total: string; totalCost: string; pnl: string; pnlPct: string; rows: PositionValuation[] } {
  const rows = positions.map((p) => {
    const qty = dec(p.quantity), cost = dec(p.costBasis), price = dec(p.price);
    const marketValue = qty.mul(price), totalCost = qty.mul(cost), pnl = marketValue.minus(totalCost);
    return { marketValue, totalCost, pnl };
  });
  const total = rows.reduce((acc, r) => acc.plus(r.marketValue), new D(0));
  const totalCost = rows.reduce((acc, r) => acc.plus(r.totalCost), new D(0));
  const pnl = total.minus(totalCost);
  return {
    total: total.toFixed(2), totalCost: totalCost.toFixed(2), pnl: pnl.toFixed(2), pnlPct: totalCost.gt(0) ? pnl.div(totalCost).mul(100).toFixed(4) : "0",
    rows: rows.map((r) => ({ marketValue: r.marketValue.toFixed(2), cost: r.totalCost.toFixed(2), pnl: r.pnl.toFixed(2), pnlPct: r.totalCost.gt(0) ? r.pnl.div(r.totalCost).mul(100).toFixed(4) : "0", weight: total.gt(0) ? r.marketValue.div(total).mul(100).toFixed(2) : "0" })),
  };
}

export function formatDecimal(value: string, maxFraction = 8): string {
  const d = dec(value);
  if (d.isZero()) return "0";
  const abs = d.abs();
  const fraction = abs.gte(1000) ? 2 : abs.gte(1) ? 4 : Math.min(maxFraction, 10);
  return d.toDecimalPlaces(fraction, Decimal.ROUND_HALF_EVEN).toFixed();
}
