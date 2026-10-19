// Run with: npm test. The reference figures come from the iOS app's own screenshots and unit tests,
// so a passing run means the website and the app agree to the cent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { amortizingLoan, annualPercentageRate, prepayment, deposit, payment } from './engine.js';

const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test('French loan: 20.000 at 7 % over 5 years matches the app (396,02 / 3.761,44)', () => {
  const r = amortizingLoan({ principal: 20000, annualRatePct: 7, years: 5 });
  near(r.payment, 396.02);
  near(r.totalInterest, 3761.44);
  near(r.totalPaid, 23761.44);
  assert.equal(r.schedule.length, 60);
  near(r.schedule[0].interest, 116.67);
  near(r.schedule[0].balance, 19720.64);
  near(r.schedule.at(-1).balance, 0);
});

test('Real APR with 1 % opening fee and 45 EUR/month insurance: 12,75 % and 26.661,44 outlay', () => {
  const r = amortizingLoan({ principal: 20000, annualRatePct: 7, years: 5, costs: { opening: 1, openingIsPercent: true, insurance: 45 } });
  near(r.aprPct, 12.75, 0.01);
  near(r.totalOutlay, 26661.44);
  near(r.upfrontCosts, 200);
  near(r.insuranceTotal, 2700);
});

test('APR without costs equals the nominal rate annualised monthly', () => {
  const r = amortizingLoan({ principal: 10000, annualRatePct: 6, years: 3, costs: { insurance: 0.0001 } });
  // monthly compounding of 6 % nominal is 6,1678 % effective
  near(r.aprPct, 6.1678, 0.01);
});

test('Linear system: constant principal, payment falls; American: interest only then bullet', () => {
  const l = amortizingLoan({ principal: 12000, annualRatePct: 6, years: 1, system: 'linear' });
  near(l.schedule[0].principal, 1000);
  assert.ok(l.schedule[0].payment > l.schedule[11].payment);
  const a = amortizingLoan({ principal: 12000, annualRatePct: 6, years: 1, system: 'american' });
  near(a.schedule[0].payment, 60);
  near(a.schedule[11].payment, 12060);
  // tips in the app: linear is cheaper than french, american costs the most
  const f = amortizingLoan({ principal: 20000, annualRatePct: 7, years: 5 });
  const lin = amortizingLoan({ principal: 20000, annualRatePct: 7, years: 5, system: 'linear' });
  const am = amortizingLoan({ principal: 20000, annualRatePct: 7, years: 5, system: 'american' });
  near(f.totalInterest - lin.totalInterest, 203, 1);          // "pagarías 203 € menos"
  near(am.totalInterest - f.totalInterest, 3239, 1);          // "3.239 € más de intereses"
  near(f.payment - am.payment, 279, 1);                       // "cuota 279 € más baja"
});

test('payment() handles a zero rate', () => {
  near(payment(1200, 0, 12), 100);
});

test('APR is 0 when the loan repays less than it lends', () => {
  assert.equal(annualPercentageRate(1000, [10, 10, 10]), 0);
});

test('Prepayment: total settlement saves all remaining interest', () => {
  const p = prepayment({ principal: 20000, annualRatePct: 7, remainingMonths: 60, mode: 'total' });
  near(p.totalInterestSaved, 3761.44);
  near(p.totalPayoffAmount, 20000);
});

test('Prepayment: reduce term saves more interest than reduce payment; both finish consistently', () => {
  const p = prepayment({ principal: 20000, annualRatePct: 7, remainingMonths: 60, lump: 5000, atPeriod: 1 });
  assert.ok(p.reduceTerm.interestSaved > p.reducePayment.interestSaved);
  assert.ok(p.reduceTerm.newPeriods < 60);
  assert.equal(p.reducePayment.newPeriods, 60);
  assert.ok(p.reducePayment.newPayment < p.basePayment);
});

test('Prepayment verdict: a high fee and a good alternative flips the advantage negative', () => {
  const p = prepayment({ principal: 20000, annualRatePct: 3, remainingMonths: 120, lump: 10000, atPeriod: 1, fee: 2, opportunityRatePct: 6 });
  assert.ok(p.advantageOverInvesting < 0);
});

test('Deposit: 10.000 at 3 % monthly for 2 years, 19 % tax', () => {
  const d = deposit({ principal: 10000, annualRatePct: 3, years: 2, frequency: 'monthly', taxRatePct: 19, inflationPct: 2 });
  near(d.grossInterest, 10000 * (Math.pow(1 + 0.03 / 12, 24) - 1), 0.01);
  near(d.taxWithheld, d.grossInterest * 0.19, 0.01);
  near(d.netFinal, 10000 + d.grossInterest * 0.81, 0.01);
  assert.ok(d.realFinal < d.netFinal);
  // with no contributions the annualised yield is (netFinal / principal)^(1/years) - 1
  near(d.annualisedYieldPct, (Math.pow(d.netFinal / 10000, 1 / 2) - 1) * 100, 0.01);
});

test('Figures quoted in the page copy are what the engine returns', () => {
  const p = prepayment({ principal: 20000, annualRatePct: 7, remainingMonths: 60, lump: 5000, atPeriod: 1 });
  near(p.reduceTerm.interestSaved, 1724.28); assert.equal(p.reduceTerm.periodsSaved, 16);
  near(p.reducePayment.interestSaved, 924.10); near(p.reducePayment.newPayment, 295.62); near(p.basePayment, 396.02);
  const d = deposit({ principal: 10000, annualRatePct: 3, years: 2, frequency: 'monthly', taxRatePct: 19, inflationPct: 2 });
  near(d.grossInterest, 617.57); near(d.taxWithheld, 117.34); near(d.netInterest, 500.23); near(d.realFinal, 10092.50);
  const l = amortizingLoan({ principal: 20000, annualRatePct: 7, years: 5 });
  near(l.schedule[0].interest, 116.67); near(l.schedule[0].principal, 279.36);
  near(yearlyRowsFirst(l).interest, 1290.33);
  const m = amortizingLoan({ principal: 200000, annualRatePct: 3, years: 25 });
  near(m.payment, 948.42); near(m.totalInterest, 84526.79);
  near((Math.pow(1 + 0.07 / 12, 12) - 1) * 100, 7.23, 0.005);
  const apr = amortizingLoan({ principal: 20000, annualRatePct: 7, years: 5, costs: { opening: 1, openingIsPercent: true, insurance: 45 } });
  near(apr.aprPct, 12.75, 0.005);
});

import { yearlyRows } from './engine.js';
function yearlyRowsFirst(l) { return yearlyRows(l.schedule)[0]; }
