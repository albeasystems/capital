// Calculation engine. A line-for-line port of Capital/Services/FinancialCalculator.swift so the
// website gives the same figures as the app. Pure functions, no DOM, no formatting.

export const SYSTEMS = ['french', 'linear', 'american'];

/** Constant payment for `principal` at `periodRate` over `periods`. */
export function payment(principal, periodRate, periods) {
  if (periods <= 0) return principal;
  if (periodRate === 0) return principal / periods;
  return (principal * periodRate) / (1 - Math.pow(1 + periodRate, -periods));
}

export const termMonths = (years, months) => Math.max((years | 0) * 12 + (months | 0), 0);

/** What turns a headline rate into what a loan costs. */
export function costsActive(c = {}) {
  return (c.opening > 0) || (c.appraisal > 0) || (c.broker > 0) || (c.insurance > 0) || (c.inflation > 0);
}
export function openingAmount(c, principal) {
  const v = c.openingIsPercent === false ? c.opening || 0 : (principal * (c.opening || 0)) / 100;
  return Math.max(v, 0);
}
export const upfrontAmount = (c, principal) =>
  openingAmount(c, principal) + Math.max(c.appraisal || 0, 0) + Math.max(c.broker || 0, 0);

/** Amortizing loan under the French, Linear or American system. */
export function amortizingLoan({ principal, annualRatePct, years = 0, months = 0, system = 'french', costs = {} }) {
  const p = Math.max(principal, 0);
  const n = Math.max(termMonths(years, months), 1);
  const i = annualRatePct / 100 / 12;
  const rows = [];
  let totalInterest = 0;

  if (system === 'french') {
    const pay = payment(p, i, n);
    let balance = p;
    for (let k = 1; k <= n; k++) {
      const interest = balance * i;
      let principalPaid = pay - interest;
      if (principalPaid > balance) principalPaid = balance;
      balance -= principalPaid;
      totalInterest += interest;
      rows.push({ period: k, payment: interest + principalPaid, interest, principal: principalPaid, balance: Math.max(balance, 0) });
    }
  } else if (system === 'linear') {
    const slice = p / n;
    let balance = p;
    for (let k = 1; k <= n; k++) {
      const interest = balance * i;
      const principalPaid = Math.min(slice, balance);
      balance -= principalPaid;
      totalInterest += interest;
      rows.push({ period: k, payment: interest + principalPaid, interest, principal: principalPaid, balance: Math.max(balance, 0) });
    }
  } else {
    for (let k = 1; k <= n; k++) {
      const interest = p * i;
      const principalPaid = k === n ? p : 0;
      const balance = k === n ? 0 : p;
      totalInterest += interest;
      rows.push({ period: k, payment: interest + principalPaid, interest, principal: principalPaid, balance });
    }
  }

  const result = {
    payment: rows[0]?.payment ?? 0,
    lastPayment: rows[rows.length - 1]?.payment ?? 0,
    paymentIsConstant: system === 'french',
    totalInterest,
    totalPaid: p + totalInterest,
    payoffPeriods: n,
    schedule: rows,
    principal: p,
    hasCosts: costsActive(costs),
    upfrontCosts: 0,
    insuranceTotal: 0,
    totalOutlay: p + totalInterest,
    realTotalOutlay: p + totalInterest,
    aprPct: 0,
  };
  applyCosts(costs, result, p, rows);
  return result;
}

function applyCosts(costs, result, principal, schedule) {
  if (!result.hasCosts) return;
  const upfront = upfrontAmount(costs, principal);
  const ins = Math.max(costs.insurance || 0, 0);
  const insurance = ins * schedule.length;
  result.upfrontCosts = upfront;
  result.insuranceTotal = insurance;
  result.totalOutlay = result.totalPaid + upfront + insurance;

  const received = principal - upfront;
  const payments = schedule.map((r) => r.payment + ins);
  result.aprPct = annualPercentageRate(received, payments);

  const inflation = Math.max(costs.inflation || 0, 0) / 100;
  if (inflation > 0) {
    const monthly = Math.pow(1 + inflation, 1 / 12);
    let discounted = upfront;
    payments.forEach((pay, k) => { discounted += pay / Math.pow(monthly, k + 1); });
    result.realTotalOutlay = discounted;
  } else {
    result.realTotalOutlay = result.totalOutlay;
  }
}

/**
 * Effective annual rate (TAE / APR) of a loan's real cash flows: what is received (principal minus
 * upfront costs) against what is paid (instalments plus tied insurance). Bisection on the monthly IRR.
 */
export function annualPercentageRate(received, payments) {
  if (!(received > 0) || !payments.length) return 0;
  const flows = [received, ...payments.map((x) => -x)];
  const monthly = monthlyIRR(flows, 0, 2);
  if (monthly == null) return 0;
  return (Math.pow(1 + monthly, 12) - 1) * 100;
}

export function monthlyIRR(flows, low = -0.9999, high = 2) {
  const npv = (j) => {
    let v = 0;
    for (let k = 0; k < flows.length; k++) v += flows[k] / Math.pow(1 + j, k);
    return v;
  };
  let lo = low, hi = high;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || (fLo === 0 && fHi === 0)) return null;
  if (fLo === 0) return lo;
  if (fHi === 0) return hi;
  if (fLo * fHi >= 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (fMid === 0) return mid;
    if (fLo * fMid < 0) hi = mid;
    else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

// ---- Prepayment (always a French loan, as in the app) ----

function simulate(principal, ip, pay, maxPeriods, { extra = 0, lump = 0, lumpPeriod = 0 } = {}) {
  let balance = principal, totalInterest = 0, period = 0;
  while (balance > 0.005 && period < maxPeriods) {
    period += 1;
    const interest = balance * ip;
    let principalPaid = pay - interest + extra;
    if (lump > 0 && period === lumpPeriod) principalPaid += lump;
    if (principalPaid < 0) principalPaid = 0;
    if (principalPaid > balance) principalPaid = balance;
    balance -= principalPaid;
    totalInterest += interest;
  }
  return { totalInterest, periods: period, finalBalance: Math.max(balance, 0) };
}

function runPeriods(principal, ip, pay, count) {
  let balance = principal, interestSum = 0, period = 0;
  while (balance > 0.005 && period < count) {
    period += 1;
    const interest = balance * ip;
    let principalPaid = pay - interest;
    if (principalPaid < 0) principalPaid = 0;
    if (principalPaid > balance) principalPaid = balance;
    balance -= principalPaid;
    interestSum += interest;
  }
  return { balance: Math.max(balance, 0), interest: interestSum, periods: period };
}

/**
 * Prepayment of an existing French loan. `principal` is the outstanding balance, `remainingMonths`
 * what is left of the term. mode 'partial' (lump at `atPeriod`, optional monthly extra) or 'total'.
 */
export function prepayment({ principal, annualRatePct, remainingMonths, mode = 'partial', lump = 0, extra = 0, atPeriod = 1, fee = 0, feeIsPercent = true, opportunityRatePct = 0 }) {
  const p = Math.max(principal, 0);
  const n = Math.max(remainingMonths | 0, 1);
  const i = annualRatePct / 100 / 12;
  const basePay = payment(p, i, n);
  const baseline = simulate(p, i, basePay, n);
  const out = { baselineInterest: baseline.totalInterest, baselinePeriods: baseline.periods, basePayment: basePay, mode,
    reduceTerm: null, reducePayment: null, totalPayoffAmount: 0, totalInterestSaved: 0, totalPeriodsSaved: 0,
    prepaymentFee: 0, netSaving: 0, opportunityGain: 0, advantageOverInvesting: 0, hasCosts: fee > 0 || opportunityRatePct > 0 };

  if (mode === 'total') {
    out.totalPayoffAmount = p;
    out.totalInterestSaved = baseline.totalInterest;
    out.totalPeriodsSaved = baseline.periods;
  } else {
    const rt = simulate(p, i, basePay, n * 3 + 12, { extra: Math.max(extra, 0), lump: Math.max(lump, 0), lumpPeriod: Math.max(atPeriod, 1) });
    out.reduceTerm = { newPayment: basePay, newTotalInterest: rt.totalInterest, interestSaved: Math.max(baseline.totalInterest - rt.totalInterest, 0),
      newPeriods: rt.periods, periodsSaved: Math.max(baseline.periods - rt.periods, 0) };
    const k = Math.max(1, Math.min(atPeriod, n - 1));
    const pre = runPeriods(p, i, basePay, k);
    const balAfter = Math.max(pre.balance - Math.max(lump, 0), 0);
    const remaining = Math.max(n - k, 1);
    const newPay = payment(balAfter, i, remaining);
    const post = simulate(balAfter, i, newPay, remaining + 6);
    const rpInterest = pre.interest + post.totalInterest;
    out.reducePayment = { newPayment: newPay, newTotalInterest: rpInterest, interestSaved: Math.max(baseline.totalInterest - rpInterest, 0),
      newPeriods: k + post.periods, periodsSaved: Math.max(baseline.periods - (k + post.periods), 0) };
  }

  const amountPrepaid = mode === 'total' ? out.totalPayoffAmount : Math.max(lump, 0);
  const best = mode === 'total' ? null : (out.reduceTerm.interestSaved >= out.reducePayment.interestSaved ? out.reduceTerm : out.reducePayment);
  const grossSaved = mode === 'total' ? out.totalInterestSaved : best.interestSaved;
  if (!out.hasCosts) { out.netSaving = grossSaved; return out; }

  out.prepaymentFee = feeIsPercent ? (amountPrepaid * Math.max(fee, 0)) / 100 : Math.max(fee, 0);
  out.netSaving = grossSaved - out.prepaymentFee;
  const horizon = mode === 'total' ? out.baselinePeriods : best.newPeriods;
  const years = horizon / 12;
  const rate = Math.max(opportunityRatePct, 0) / 100;
  out.opportunityGain = rate > 0 && years > 0 ? amountPrepaid * (Math.pow(1 + rate, years) - 1) : 0;
  out.advantageOverInvesting = out.netSaving - out.opportunityGain;
  return out;
}

// ---- Deposit ----

export const PERIODS_PER_YEAR = { simple: 0, annual: 1, semiannual: 2, quarterly: 4, monthly: 12, daily: 365 };

export function deposit({ principal, annualRatePct, years = 0, months = 0, frequency = 'monthly', monthlyContribution = 0, taxRatePct = 0, inflationPct = 0, openingCommission = 0, openingIsPercent = true, maintenancePct = 0 }) {
  const p = Math.max(principal, 0);
  const r = annualRatePct / 100;
  const c = Math.max(monthlyContribution, 0);
  const m = Math.max(years * 12 + months, 0);
  const t = years + months / 12;
  let acc = 0, contributed = 0;
  const rows = [];
  let prevYearAcc = 0;
  const snapshot = (mm) => {
    if (!(mm % 12 === 0 || mm === m)) return;
    const gross = p + contributed + acc;
    rows.push({ year: Math.ceil(mm / 12), interest: acc - prevYearAcc, accumulated: acc, balance: gross });
    prevYearAcc = acc;
  };
  if (m > 0) {
    if (frequency === 'simple') {
      let base = p;
      for (let k = 1; k <= m; k++) { acc += (base * r) / 12; base += c; contributed += c; snapshot(k); }
    } else {
      const n = PERIODS_PER_YEAR[frequency];
      const mf = Math.pow(1 + r / n, n / 12);
      let balance = p;
      for (let k = 1; k <= m; k++) { const before = balance; balance *= mf; acc += balance - before; balance += c; contributed += c; snapshot(k); }
    }
  }
  const grossInterest = acc;
  const openingCost = openingIsPercent ? (p * openingCommission) / 100 : openingCommission;
  const maintenanceCost = (p * maintenancePct) / 100 * t;
  const commissionsCost = Math.max(openingCost, 0) + Math.max(maintenanceCost, 0);
  const taxWithheld = (Math.max(grossInterest, 0) * taxRatePct) / 100;
  const netInterest = grossInterest - taxWithheld - commissionsCost;
  const netFinal = p + contributed + netInterest;
  const realFinal = t > 0 ? netFinal / Math.pow(1 + inflationPct / 100, t) : netFinal;
  const invested = p + contributed;

  let annualisedYieldPct = 0;
  if (m > 0 && p + c > 0 && netFinal > 0) {
    const flows = new Array(m + 1).fill(-c);
    flows[0] = -p;
    flows[m] += netFinal;
    const j = monthlyIRR(flows);
    if (j != null) annualisedYieldPct = (Math.pow(1 + j, 12) - 1) * 100;
  }
  return { principal: p, totalContributions: contributed, grossInterest, commissionsCost, taxWithheld, netInterest, netFinal, realFinal,
    effectiveYieldPct: invested > 0 ? (netInterest / invested) * 100 : 0, annualisedYieldPct, rows };
}

/** Yearly roll-up of a monthly schedule, for tables and charts. */
export function yearlyRows(schedule) {
  const out = [];
  for (const row of schedule) {
    const year = Math.ceil(row.period / 12);
    const last = out[out.length - 1];
    if (!last || last.year !== year) out.push({ year, interest: 0, principal: 0, payment: 0, balance: 0 });
    const e = out[out.length - 1];
    e.interest += row.interest; e.principal += row.principal; e.payment += row.payment; e.balance = row.balance;
  }
  return out;
}
