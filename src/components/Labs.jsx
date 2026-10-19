import { useEffect, useMemo, useRef, useState } from 'react';
import { amortizingLoan, prepayment, deposit, yearlyRows } from '../engine.js';
import { CURRENCIES, money, pct, duration, num } from '../format.js';
import { RateBars, MiniBars, CostStack, BalanceChart } from './Drawing.jsx';

export const tpl = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
const n = (s) => { const v = parseFloat(String(s).replace(',', '.')); return Number.isFinite(v) ? v : 0; };

// ---------- small parts ----------

function Field({ label, value, onChange, unit, step = 'any', min = 0, wide }) {
  return (
    <label className={`field ${wide ? 'col-span-2' : ''}`}>
      <span>{label}</span>
      <span className="input">
        <input type="number" inputMode="decimal" step={step} min={min} value={value} onChange={(e) => onChange(e.target.value)} />
        {unit && <i className="unit not-italic">{unit}</i>}
      </span>
    </label>
  );
}

function Select({ label, value, onChange, options, wide }) {
  return (
    <label className={`field ${wide ? 'col-span-2' : ''}`}>
      <span>{label}</span>
      <span className="input">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <svg className="chev unit" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.25 6 8l4-3.75" /></svg>
      </span>
    </label>
  );
}

function Row({ k, v, hot, hint }) {
  return (
    <div className={`dim-row ${hot ? 'hot' : ''}`}>
      <span className="k">{k}{hint && <span className="muted block text-sm">{hint}</span>}</span>
      <span className="lead" aria-hidden="true" />
      <span className="v">{v}</span>
    </div>
  );
}

/** A figure that settles to its value instead of jumping, unless the visitor prefers no motion. */
function useCount(value, ms = 650) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); from.current = value; return; }
    const a = from.current, t0 = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const cur = a + (value - a) * (1 - Math.pow(1 - k, 3));
      from.current = cur; setV(cur);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return v;
}

const CurrencyField = ({ ui, value, onChange }) => (
  <Select label={ui.lab.currency} value={value} onChange={onChange} options={CURRENCIES.map((c) => [c, c])} />
);

const Grid = ({ children }) => <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8">{children}</div>;
const Note = ({ children }) => <p className="muted mt-6 text-sm measure">{children}</p>;

function YearTable({ rows, ui, lang, cur }) {
  const f = (v) => money(v, lang, cur, 0);
  return (
    <table className="tbl">
      <thead><tr><th>{ui.lab.year}</th><th>{ui.lab.tPayment}</th><th>{ui.lab.tInterest}</th><th>{ui.lab.tPrincipal}</th><th>{ui.lab.tBalance}</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.year}><td>{r.year}</td><td>{f(r.payment)}</td><td>{f(r.interest)}</td><td>{f(r.principal)}</td><td>{f(r.balance)}</td></tr>
      ))}</tbody>
    </table>
  );
}

function MonthTable({ rows, ui, lang, cur }) {
  const f = (v) => money(v, lang, cur, 2);
  return (
    <table className="tbl">
      <thead><tr><th>{ui.lab.period}</th><th>{ui.lab.tPayment}</th><th>{ui.lab.tInterest}</th><th>{ui.lab.tPrincipal}</th><th>{ui.lab.tBalance}</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.period}><td>{r.period}</td><td>{f(r.payment)}</td><td>{f(r.interest)}</td><td>{f(r.principal)}</td><td>{f(r.balance)}</td></tr>
      ))}</tbody>
    </table>
  );
}

const nominalEffective = (rate) => (Math.pow(1 + rate / 1200, 12) - 1) * 100;

// ---------- loan: cuota, TAE real, cuadro ----------

export function LoanLab({ lang, ui, variant = 'payment' }) {
  const withCosts = variant === 'apr';
  const [principal, setPrincipal] = useState('20000');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState('5');
  const [months, setMonths] = useState('0');
  const [system, setSystem] = useState('french');
  const [cur, setCur] = useState('EUR');
  const [opening, setOpening] = useState(withCosts ? '1' : '0');
  const [appraisal, setAppraisal] = useState('0');
  const [broker, setBroker] = useState('0');
  const [insurance, setInsurance] = useState(withCosts ? '45' : '0');

  const r = useMemo(() => amortizingLoan({
    principal: n(principal), annualRatePct: n(rate), years: Math.round(n(years)), months: Math.round(n(months)), system,
    costs: withCosts ? { opening: n(opening), openingIsPercent: true, appraisal: n(appraisal), broker: n(broker), insurance: n(insurance) } : {},
  }), [principal, rate, years, months, system, opening, appraisal, broker, insurance, withCosts]);

  const valid = n(principal) > 0 && Math.round(n(years)) * 12 + Math.round(n(months)) > 0;
  const m = (v) => money(v, lang, cur);
  const tae = r.hasCosts ? r.aprPct : nominalEffective(n(rate));
  const taeShown = useCount(tae);
  const yearly = useMemo(() => yearlyRows(r.schedule), [r]);
  const L = ui.lab;
  const [seen, setSeen] = useState(false);
  const drawRef = useRef(null);
  useEffect(() => {
    const el = drawRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [valid]);

  return (
    <div>
      {withCosts && valid && !seen && (
        <div className="sticky-strip lg:hidden">
          <MiniBars top={{ value: n(rate) }} bottom={{ value: tae }} lang={lang}
            t={{ aria: tpl(ui.drawing.aria, { tin: pct(n(rate), lang), tae: pct(tae, lang), gap: pct(Math.max(tae - n(rate), 0), lang) }) }} />
        </div>
      )}
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <form className="lg:col-span-5" onSubmit={(e) => e.preventDefault()} aria-label={L.loanTitle}>
        <h3 className="h3 mb-6">{L.loanTitle}</h3>
        <Grid>
          <Field label={L.capital} value={principal} onChange={setPrincipal} unit={cur} wide />
          <Field label={L.tin} value={rate} onChange={setRate} unit="%" step="0.01" />
          <CurrencyField ui={ui} value={cur} onChange={setCur} />
          <Field label={L.years} value={years} onChange={setYears} step="1" />
          <Field label={L.months} value={months} onChange={setMonths} step="1" />
          {variant !== 'apr' && <Select wide label={L.system} value={system} onChange={setSystem} options={Object.entries(L.systems)} />}
        </Grid>
        {withCosts && (
          <>
            <h3 className="h3 mb-6 mt-10">{L.costsTitle}</h3>
            <Grid>
              <Field label={L.opening} value={opening} onChange={setOpening} unit="%" step="0.01" />
              <Field label={L.insurance} value={insurance} onChange={setInsurance} unit={cur} />
              <Field label={L.appraisal} value={appraisal} onChange={setAppraisal} unit={cur} />
              <Field label={L.broker} value={broker} onChange={setBroker} unit={cur} />
            </Grid>
          </>
        )}
        <Note>{L.note}</Note>
      </form>

      <div className="lg:col-span-7" aria-live="polite" aria-atomic="false">
        <h3 className="h3 mb-2">{L.resultsTitle}</h3>
        {!valid ? <p className="muted">{L.invalid}</p> : (
          <>
            {variant === 'apr' && (
              <div className="mb-8" ref={drawRef}>
                <RateBars top={{ label: ui.drawing.tin, value: n(rate), digits: n(rate) % 1 ? 2 : 0 }} bottom={{ label: ui.drawing.tae, value: tae }} lang={lang}
                  t={{ aria: tpl(ui.drawing.aria, { tin: pct(n(rate), lang), tae: pct(tae, lang), gap: pct(Math.max(tae - n(rate), 0), lang) }) }} />
              </div>
            )}
            {r.paymentIsConstant
              ? <Row k={L.payment} v={m(r.payment)} />
              : <><Row k={L.firstPayment} v={m(r.payment)} /><Row k={L.lastPayment} v={m(r.lastPayment)} /></>}
            <Row k={L.interest} v={m(r.totalInterest)} />
            <Row k={L.paid} v={m(r.totalPaid)} />
            {r.hasCosts && <>
              <Row k={L.upfront} v={m(r.upfrontCosts)} />
              <Row k={L.insuranceTotal} v={m(r.insuranceTotal)} />
              <Row k={L.outlay} v={m(r.totalOutlay)} />
            </>}
            {withCosts && (
              <Row hot k={L.apr} v={pct(taeShown, lang)} hint={tae > n(rate) + 0.005 ? tpl(L.gap, { gap: pct(tae - n(rate), lang) }) : undefined} />
            )}
            {variant === 'payment' && (
              <div className="mt-10">
                <CostStack capital={r.principal} interest={r.totalInterest} hidden={0} lang={lang} fmt={(v) => money(v, lang, cur, 0)}
                  t={{ ...ui.cost, aria: tpl(ui.cost.aria, { capital: m(r.principal), interest: m(r.totalInterest), hidden: m(0) }) }} />
              </div>
            )}
            <div className="mt-10">
              <h3 className="h3 mb-4">{L.yearlyTitle}</h3>
              <div className="overflow-x-auto"><YearTable rows={yearly} ui={ui} lang={lang} cur={cur} /></div>
              {variant === 'schedule' && (
                <details className="mt-8">
                  <summary className="stamp stamp-quiet">{L.monthlyToggle}</summary>
                  <div className="mt-4 max-h-[32rem] overflow-auto"><MonthTable rows={r.schedule} ui={ui} lang={lang} cur={cur} /></div>
                </details>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}

// ---------- the three systems side by side ----------

export function SystemsLab({ lang, ui }) {
  const [principal, setPrincipal] = useState('20000');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState('5');
  const [months, setMonths] = useState('0');
  const [cur, setCur] = useState('EUR');
  const L = ui.lab;
  const base = { principal: n(principal), annualRatePct: n(rate), years: Math.round(n(years)), months: Math.round(n(months)) };
  const runs = useMemo(() => ['french', 'linear', 'american'].map((s) => ({ s, r: amortizingLoan({ ...base, system: s }) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [principal, rate, years, months]);
  const valid = n(principal) > 0 && Math.round(n(years)) * 12 + Math.round(n(months)) > 0;
  const m = (v) => money(v, lang, cur);
  const totalYears = (Math.round(n(years)) * 12 + Math.round(n(months))) / 12;
  const series = runs.map(({ s, r }) => ({
    id: s, label: ui.chart[s], style: s === 'french' ? 'solid' : s === 'linear' ? 'dashed' : 'dotted', labelAt: s === 'french' ? 0.8 : s === 'linear' ? 0.45 : 0.5,
    points: [{ year: 0, balance: r.principal }, ...r.schedule.map((x) => ({ year: x.period / 12, balance: x.balance }))],
  }));
  const cheapest = Math.min(...runs.map((x) => x.r.totalInterest));
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <form className="lg:col-span-4" onSubmit={(e) => e.preventDefault()} aria-label={L.loanTitle}>
        <h3 className="h3 mb-6">{L.loanTitle}</h3>
        <Grid>
          <Field label={L.capital} value={principal} onChange={setPrincipal} unit={cur} wide />
          <Field label={L.tin} value={rate} onChange={setRate} unit="%" step="0.01" />
          <CurrencyField ui={ui} value={cur} onChange={setCur} />
          <Field label={L.years} value={years} onChange={setYears} step="1" />
          <Field label={L.months} value={months} onChange={setMonths} step="1" />
        </Grid>
        <Note>{L.note}</Note>
      </form>
      <div className="lg:col-span-8" aria-live="polite" aria-atomic="false">
        <h3 className="h3 mb-4">{L.resultsTitle}</h3>
        {!valid ? <p className="muted">{L.invalid}</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>{L.system}</th><th>{L.firstPayment}</th><th>{L.lastPayment}</th><th>{L.interest}</th></tr></thead>
                <tbody>{runs.map(({ s, r }) => (
                  <tr key={s}>
                    <td style={{ fontFamily: 'var(--font-text)' }}>{ui.chart[s]}</td>
                    <td>{m(r.payment)}</td><td>{m(r.lastPayment)}</td>
                    <td style={r.totalInterest === cheapest ? { fontWeight: 650 } : undefined}>{m(r.totalInterest)}</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <div className="mt-10">
              <BalanceChart series={series} lang={lang} years={totalYears} t={{ xAxis: ui.chart.xAxis, aria: ui.chart.aria }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- two loans side by side ----------

const blank = (o) => ({ principal: '20000', rate: '7', years: '5', opening: '0', appraisal: '0', broker: '0', insurance: '0', ...o });

export function CompareLab({ lang, ui }) {
  const [a, setA] = useState(blank({ rate: '7', opening: '1', insurance: '45' }));
  const [b, setB] = useState(blank({ rate: '8.2', opening: '0', insurance: '0' }));
  const [cur, setCur] = useState('EUR');
  const L = ui.lab, C = L.compare;
  const run = (x) => amortizingLoan({ principal: n(x.principal), annualRatePct: n(x.rate), years: Math.round(n(x.years)), months: 0,
    costs: { opening: n(x.opening), openingIsPercent: true, appraisal: n(x.appraisal), broker: n(x.broker), insurance: n(x.insurance) } });
  const ra = useMemo(() => run(a), [a]); // eslint-disable-line react-hooks/exhaustive-deps
  const rb = useMemo(() => run(b), [b]); // eslint-disable-line react-hooks/exhaustive-deps
  const apr = (r, x) => (r.hasCosts ? r.aprPct : nominalEffective(n(x.rate)));
  const aa = apr(ra, a), ab = apr(rb, b);
  const m = (v) => money(v, lang, cur);
  const diff = Math.abs(ra.totalOutlay - rb.totalOutlay);
  const winner = ra.totalOutlay < rb.totalOutlay ? C.a : C.b;
  const set = (setter) => (k) => (v) => setter((s) => ({ ...s, [k]: v }));
  const col = (x, setter, title) => (
    <div>
      <h3 className="h3 mb-6">{title}</h3>
      <Grid>
        <Field label={L.capital} value={x.principal} onChange={set(setter)('principal')} unit={cur} wide />
        <Field label={L.tin} value={x.rate} onChange={set(setter)('rate')} unit="%" step="0.01" />
        <Field label={L.years} value={x.years} onChange={set(setter)('years')} step="1" />
        <Field label={L.opening} value={x.opening} onChange={set(setter)('opening')} unit="%" step="0.01" />
        <Field label={L.insurance} value={x.insurance} onChange={set(setter)('insurance')} unit={cur} />
        <Field label={L.appraisal} value={x.appraisal} onChange={set(setter)('appraisal')} unit={cur} />
        <Field label={L.broker} value={x.broker} onChange={set(setter)('broker')} unit={cur} />
      </Grid>
    </div>
  );
  return (
    <div>
      <div className="mb-8 max-w-xs"><CurrencyField ui={ui} value={cur} onChange={setCur} /></div>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">{col(a, setA, C.a)}{col(b, setB, C.b)}</div>
      <div className="mt-14" aria-live="polite">
        <h3 className="h3 mb-6">{L.resultsTitle}</h3>
        <RateBars top={{ label: C.a, value: aa }} bottom={{ label: C.b, value: ab }} lang={lang}
          t={{ aria: tpl(ui.drawing.aria, { tin: pct(aa, lang), tae: pct(ab, lang), gap: pct(Math.abs(ab - aa), lang) }) }} />
        <div className="mt-8 overflow-x-auto">
          <table className="tbl">
            <thead><tr><th /><th>{C.a}</th><th>{C.b}</th></tr></thead>
            <tbody>
              <tr><td style={{ fontFamily: 'var(--font-text)' }}>{C.row.apr}</td><td>{pct(aa, lang)}</td><td>{pct(ab, lang)}</td></tr>
              <tr><td style={{ fontFamily: 'var(--font-text)' }}>{C.row.payment}</td><td>{m(ra.payment)}</td><td>{m(rb.payment)}</td></tr>
              <tr><td style={{ fontFamily: 'var(--font-text)' }}>{C.row.interest}</td><td>{m(ra.totalInterest)}</td><td>{m(rb.totalInterest)}</td></tr>
              <tr><td style={{ fontFamily: 'var(--font-text)' }}>{C.row.outlay}</td><td>{m(ra.totalOutlay)}</td><td>{m(rb.totalOutlay)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-lg" style={{ color: 'var(--ink)' }}>{diff < 0.005 ? C.same : tpl(C.better, { name: winner, diff: m(diff) })}</p>
        <Note>{L.note}</Note>
      </div>
    </div>
  );
}

// ---------- prepayment ----------

export function PrepayLab({ lang, ui }) {
  const P = ui.lab.prepay;
  const [outstanding, setOutstanding] = useState('20000');
  const [rate, setRate] = useState('7');
  const [remaining, setRemaining] = useState('60');
  const [mode, setMode] = useState('partial');
  const [lump, setLump] = useState('5000');
  const [at, setAt] = useState('1');
  const [extra, setExtra] = useState('0');
  const [fee, setFee] = useState('0');
  const [opp, setOpp] = useState('0');
  const [cur, setCur] = useState('EUR');
  const valid = n(outstanding) > 0 && n(remaining) >= 2;
  const res = useMemo(() => prepayment({ principal: n(outstanding), annualRatePct: n(rate), remainingMonths: Math.round(n(remaining)), mode,
    lump: n(lump), extra: n(extra), atPeriod: Math.max(Math.round(n(at)), 1), fee: n(fee), feeIsPercent: true, opportunityRatePct: n(opp) }),
  [outstanding, rate, remaining, mode, lump, at, extra, fee, opp]);
  const m = (v) => money(v, lang, cur);
  const u = ui.units;
  const dur = (mm) => duration(mm, u);
  const timeSaved = (k) => (k <= 0 ? P.same : tpl(P.monthsSaved, { n: k }));
  const hasCosts = res.hasCosts;
  const adv = res.advantageOverInvesting;
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <form className="lg:col-span-5" onSubmit={(e) => e.preventDefault()} aria-label={P.title}>
        <h3 className="h3 mb-6">{P.title}</h3>
        <Grid>
          <Field label={P.outstanding} value={outstanding} onChange={setOutstanding} unit={cur} wide />
          <Field label={ui.lab.tin} value={rate} onChange={setRate} unit="%" step="0.01" />
          <CurrencyField ui={ui} value={cur} onChange={setCur} />
          <Field label={P.remaining} value={remaining} onChange={setRemaining} step="1" unit={u.months} />
          <Select label={P.mode} value={mode} onChange={setMode} options={[['partial', P.partial], ['total', P.total]]} />
          {mode === 'partial' && <>
            <Field label={P.lump} value={lump} onChange={setLump} unit={cur} />
            <Field label={P.atMonth} value={at} onChange={setAt} step="1" min={1} />
            <Field label={P.extra} value={extra} onChange={setExtra} unit={cur} wide />
          </>}
        </Grid>
        <h3 className="h3 mb-6 mt-10">{P.costsTitle}</h3>
        <Grid>
          <Field label={P.fee} value={fee} onChange={setFee} unit="%" step="0.01" />
          <Field label={P.opportunity} value={opp} onChange={setOpp} unit="%" step="0.01" />
        </Grid>
        <Note>{ui.lab.note}</Note>
      </form>
      <div className="lg:col-span-7" aria-live="polite" aria-atomic="false">
        <h3 className="h3 mb-4">{ui.lab.resultsTitle}</h3>
        {!valid ? <p className="muted">{ui.lab.invalid}</p> : mode === 'total' ? (
          <>
            <Row k={P.settle} v={m(res.totalPayoffAmount)} />
            <Row k={P.saved} v={m(res.totalInterestSaved)} hot />
            <Row k={P.timeSaved} v={dur(res.totalPeriodsSaved)} />
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th /><th>{P.reduceTerm}</th><th>{P.reducePayment}</th></tr></thead>
              <tbody>
                <tr><td style={{ fontFamily: 'var(--font-text)' }}>{P.newPayment}</td><td>{m(res.reduceTerm.newPayment)}</td><td>{m(res.reducePayment.newPayment)}</td></tr>
                <tr><td style={{ fontFamily: 'var(--font-text)' }}>{P.newTerm}</td><td>{dur(res.reduceTerm.newPeriods)}</td><td>{dur(res.reducePayment.newPeriods)}</td></tr>
                <tr><td style={{ fontFamily: 'var(--font-text)' }}>{P.saved}</td>
                  <td style={res.reduceTerm.interestSaved >= res.reducePayment.interestSaved ? { color: 'var(--red)', fontWeight: 650 } : undefined}>{m(res.reduceTerm.interestSaved)}</td>
                  <td style={res.reducePayment.interestSaved > res.reduceTerm.interestSaved ? { color: 'var(--red)', fontWeight: 650 } : undefined}>{m(res.reducePayment.interestSaved)}</td></tr>
                <tr><td style={{ fontFamily: 'var(--font-text)' }}>{P.timeSaved}</td><td>{timeSaved(res.reduceTerm.periodsSaved)}</td><td>{timeSaved(res.reducePayment.periodsSaved)}</td></tr>
              </tbody>
            </table>
          </div>
        )}
        {valid && (
          <div className="mt-8">
            {hasCosts ? (
              <>
                <Row k={P.feePaid} v={m(res.prepaymentFee)} />
                <Row k={P.netSaving} v={m(res.netSaving)} />
                <Row k={P.ifInvested} v={m(res.opportunityGain)} />
                <p className="mt-6 text-lg" style={{ color: 'var(--ink)' }}>{adv >= 0 ? tpl(P.verdictPrepay, { amount: m(adv) }) : tpl(P.verdictInvest, { amount: m(-adv) })}</p>
              </>
            ) : <p className="muted">{P.verdictNone}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- deposit ----------

export function DepositLab({ lang, ui }) {
  const D = ui.lab.deposit;
  const [capital, setCapital] = useState('10000');
  const [rate, setRate] = useState('3');
  const [years, setYears] = useState('2');
  const [months, setMonths] = useState('0');
  const [monthly, setMonthly] = useState('0');
  const [freq, setFreq] = useState('monthly');
  const [tax, setTax] = useState('19');
  const [opening, setOpening] = useState('0');
  const [maint, setMaint] = useState('0');
  const [infl, setInfl] = useState('2');
  const [cur, setCur] = useState('EUR');
  const valid = n(capital) + n(monthly) > 0 && Math.round(n(years)) * 12 + Math.round(n(months)) > 0;
  const res = useMemo(() => deposit({ principal: n(capital), annualRatePct: n(rate), years: Math.round(n(years)), months: Math.round(n(months)), frequency: freq,
    monthlyContribution: n(monthly), taxRatePct: n(tax), inflationPct: n(infl), openingCommission: n(opening), openingIsPercent: true, maintenancePct: n(maint) }),
  [capital, rate, years, months, monthly, freq, tax, opening, maint, infl]);
  const m = (v) => money(v, lang, cur);
  const L = ui.lab;
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <form className="lg:col-span-5" onSubmit={(e) => e.preventDefault()} aria-label={D.title}>
        <h3 className="h3 mb-6">{D.title}</h3>
        <Grid>
          <Field label={D.capital} value={capital} onChange={setCapital} unit={cur} wide />
          <Field label={D.rate} value={rate} onChange={setRate} unit="%" step="0.01" />
          <CurrencyField ui={ui} value={cur} onChange={setCur} />
          <Field label={L.years} value={years} onChange={setYears} step="1" />
          <Field label={L.months} value={months} onChange={setMonths} step="1" />
          <Field label={D.monthly} value={monthly} onChange={setMonthly} unit={cur} />
          <Select label={D.frequency} value={freq} onChange={setFreq} options={Object.entries(D.freqs)} />
        </Grid>
        <h3 className="h3 mb-6 mt-10">{D.taxTitle}</h3>
        <Grid>
          <Field label={D.tax} value={tax} onChange={setTax} unit="%" step="0.01" />
          <Field label={D.inflation} value={infl} onChange={setInfl} unit="%" step="0.01" />
          <Field label={D.opening} value={opening} onChange={setOpening} unit="%" step="0.01" />
          <Field label={D.maintenance} value={maint} onChange={setMaint} unit="%" step="0.01" />
        </Grid>
        <Note>{L.note}</Note>
      </form>
      <div className="lg:col-span-7" aria-live="polite" aria-atomic="false">
        <h3 className="h3 mb-2">{L.resultsTitle}</h3>
        {!valid ? <p className="muted">{L.invalid}</p> : (
          <>
            <Row k={D.gross} v={m(res.grossInterest)} />
            <Row k={D.taxWithheld} v={`− ${m(res.taxWithheld)}`} />
            {res.commissionsCost > 0 && <Row k={D.commissions} v={`− ${m(res.commissionsCost)}`} />}
            <Row k={D.net} v={m(res.netInterest)} />
            <Row k={D.final} v={m(res.netFinal)} hot />
            <Row k={D.real} v={m(res.realFinal)} />
            <Row k={D.yield} v={pct(res.annualisedYieldPct, lang)} />
            <div className="mt-10 overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>{L.year}</th><th>{L.tInterest}</th><th>{L.tBalance}</th></tr></thead>
                <tbody>{res.rows.map((r) => <tr key={r.year}><td>{r.year}</td><td>{money(r.interest, lang, cur, 0)}</td><td>{money(r.balance, lang, cur, 0)}</td></tr>)}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Lab({ id, lang, ui }) {
  switch (id) {
    case 'real-apr': return <LoanLab lang={lang} ui={ui} variant="apr" />;
    case 'loan-payment': return <LoanLab lang={lang} ui={ui} variant="payment" />;
    case 'amortization-schedule': return <LoanLab lang={lang} ui={ui} variant="schedule" />;
    case 'amortization-systems': return <SystemsLab lang={lang} ui={ui} />;
    case 'compare-loans': return <CompareLab lang={lang} ui={ui} />;
    case 'early-repayment': return <PrepayLab lang={lang} ui={ui} />;
    case 'deposit-net': return <DepositLab lang={lang} ui={ui} />;
    default: return null;
  }
}
