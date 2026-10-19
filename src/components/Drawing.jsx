import { useId } from 'react';
import { num, pct } from '../format.js';

const niceMax = (v) => {
  const step = v > 30 ? 10 : 5;
  return Math.max(step * 2, Math.ceil((v + 0.5) / step) * step);
};

/**
 * The page's central drawing: two bars to one scale. The bar that costs more shows the part above the
 * other in red, with its size in a chip. Used for the quoted rate (TIN) against the real cost (TAE),
 * and for loan A against loan B. `t` carries the words so every language labels its own chart.
 */
function Bars({ top, bottom, lang, t, w, h, pad, y1, y2, bh, font, big, ticksEvery, reserve = 0 }) {
  const id = useId().replace(/:/g, '');
  const max = niceMax(Math.max(top.value, bottom.value));
  const x = (v) => pad + ((w - pad * 2 - reserve) * v) / max;
  const lo = Math.min(top.value, bottom.value);
  const hi = Math.max(top.value, bottom.value);
  const gap = hi - lo;
  const hasGap = gap > 0.005;
  const axisY = y2 + bh + 34;
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += ticksEvery) ticks.push(v);
  const r = 9;
  const chipW = big * 4.6, chipH = big * 1.35;

  const bar = (b, y, cls, other, quiet) => {
    const over = b.value > other.value + 0.005;
    const baseEnd = x(over ? other.value : b.value);
    return (
      <g key={cls}>
        <g className={cls}>
          <clipPath id={`c${id}${cls}`}><rect x={pad} y={y} width={x(b.value) - pad} height={bh} rx={r} /></clipPath>
          <g clipPath={`url(#c${id}${cls})`}>
            <rect className={quiet ? 'soft' : 'blue'} x={pad} y={y} width={baseEnd - pad} height={bh} />
            {over && <rect className="redbar" x={baseEnd} y={y} width={x(b.value) - baseEnd} height={bh} />}
          </g>
        </g>
        <text x={pad + 16} y={y + bh / 2 + font * 0.36} fontSize={font + 1} fontWeight="620" className={quiet ? '' : 'on-blue'}>{b.label}</text>
        <text x={x(b.value) + 14} y={y + bh / 2 + big * 0.34} fontSize={big} fontWeight={over ? 700 : 600} className={over ? 'red-t' : ''}>{pct(b.value, lang, b.digits ?? 2)}</text>
      </g>
    );
  };

  return (
    <svg className="draw" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={t.aria} preserveAspectRatio="xMidYMid meet">
      {ticks.map((v) => (
        <g key={v}>
          <line className="grid" x1={x(v)} x2={x(v)} y1={y1 - 14} y2={axisY} />
          <text x={x(v)} y={axisY + 22} fontSize={font} textAnchor={v === 0 ? 'start' : 'middle'} className="mute">{pct(v, lang, 0)}</text>
        </g>
      ))}
      <line className="tick" x1={pad} x2={x(max)} y1={axisY} y2={axisY} />

      {bar(top, y1, 'bar-tin', bottom, true)}
      {bar(bottom, y2, 'bar-tae', top, false)}

      {hasGap && (
        <g className="dim-red">
          <rect x={(x(lo) + x(hi)) / 2 - chipW / 2} y={(y1 + bh + y2) / 2 - chipH / 2} width={chipW} height={chipH} rx={chipH / 2} style={{ fill: 'var(--red-soft)' }} />
          <text x={(x(lo) + x(hi)) / 2} y={(y1 + bh + y2) / 2 + big * 0.34} fontSize={big - 2} fontWeight="700" textAnchor="middle" className="red-t">+{pct(gap, lang, 2)}</text>
        </g>
      )}
    </svg>
  );
}

export function RateBars({ top, bottom, lang, t, className = '' }) {
  return (
    <div className={className} dir="ltr">
      <div className="draw-wide">
        <Bars top={top} bottom={bottom} lang={lang} t={t} w={960} h={330} pad={0} y1={20} y2={140} bh={64} font={15} big={30} ticksEvery={5} reserve={150} />
      </div>
      <div className="draw-compact">
        <Bars top={top} bottom={bottom} lang={lang} t={t} w={420} h={300} pad={0} y1={14} y2={118} bh={54} font={15} big={24} ticksEvery={5} reserve={104} />
      </div>
    </div>
  );
}

/** Where the money goes: one bar split into capital, interest and what the offer does not advertise. */
export function CostStack({ capital, interest, hidden, lang, t, fmt }) {
  const id = useId().replace(/:/g, '');
  const total = capital + interest + hidden;
  const segs = [
    { k: 'capital', v: capital, label: t.capital },
    { k: 'interest', v: interest, label: t.interest },
    { k: 'hidden', v: hidden, label: t.hidden },
  ].filter((s) => s.v > 0);
  const cls = { capital: 'blue', interest: 'soft', hidden: 'redbar' };
  const build = (W, bh, y, labels) => {
    const gapPx = 3;
    const x = (v) => ((W - gapPx * (segs.length - 1)) * v) / total;
    let at = 0;
    const placed = segs.map((s, i) => { const x0 = x(at) + gapPx * i; at += s.v; return { ...s, x0, x1: x(at) + gapPx * i }; });
    return (
      <svg className="draw cost-draw" viewBox={`0 0 ${W} ${labels ? 200 : bh + y * 2}`} role="img" aria-label={t.aria}>
        <clipPath id={`k${id}${W}`}><rect x="0" y={y} width={W} height={bh} rx={bh / 4} /></clipPath>
        <g clipPath={`url(#k${id}${W})`}>
          {placed.map((s, i) => (
            <g key={s.k} className={`seg seg-${i + 1}`}><rect className={cls[s.k]} x={s.x0} y={y} width={s.x1 - s.x0} height={bh} /></g>
          ))}
        </g>
        {labels && placed.map((s) => {
          if (s.k === 'hidden') {
            const cx = (s.x0 + s.x1) / 2;
            return (
              <g key={s.k}>
                <line className="redline" x1={cx} x2={cx} y1={y + bh + 6} y2={y + bh + 74} strokeDasharray="2 4" />
                <text x={s.x1} y={y + bh + 104} fontSize="24" fontWeight="680" textAnchor="end" className="red-t">{fmt(s.v)}</text>
                <text x={s.x1} y={y + bh + 126} fontSize="14" textAnchor="end" className="mute">{s.label}</text>
              </g>
            );
          }
          const ax = s.k === 'capital' ? (s.x0 + s.x1) / 2 : s.x1 - 2;
          const an = s.k === 'capital' ? 'middle' : 'end';
          return (
            <g key={s.k}>
              <text x={ax} y={y + bh + 40} fontSize="24" fontWeight="650" textAnchor={an}>{fmt(s.v)}</text>
              <text x={ax} y={y + bh + 62} fontSize="14" textAnchor={an} className="mute">{s.label}</text>
            </g>
          );
        })}
      </svg>
    );
  };
  return (
    <div dir="ltr">
      <div className="draw-wide">{build(960, 64, 6, true)}</div>
      <div className="draw-compact">
        {build(420, 44, 4, false)}
        <ul className="m-0 mt-4 list-none p-0">
          {segs.map((s) => (
            <li key={s.k} className="dim-row">
              <span className="k flex items-center gap-2">
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: s.k === 'capital' ? 'var(--line)' : s.k === 'interest' ? 'var(--line-soft)' : 'var(--red)' }} />
                {s.label}
              </span>
              <span className="lead" aria-hidden="true" />
              <span className="v" style={s.k === 'hidden' ? { color: 'var(--red)', fontWeight: 680 } : undefined}>{fmt(s.v)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Balance over time for one or three repayment systems, labelled on the lines. */
export function BalanceChart({ series, lang, t, years }) {
  return (
    <div dir="ltr">
      <div className="draw-wide"><Balance series={series} lang={lang} t={t} years={years} W={960} H={340} L={64} font={14} lab={15} /></div>
      <div className="draw-compact"><Balance series={series} lang={lang} t={t} years={years} W={420} H={300} L={48} font={14} lab={14} /></div>
    </div>
  );
}

function Balance({ series, lang, t, years, W, H, L, font, lab }) {
  const R = 14, T = 16, B = 46;
  const maxY = Math.max(...series.flatMap((s) => s.points.map((p) => p.balance)), 1);
  const maxX = Math.max(years, 1);
  const X = (yr) => L + ((W - L - R) * yr) / maxX;
  const Y = (v) => T + (H - T - B) * (1 - v / maxY);
  const step = maxX > 20 ? 5 : maxX > 10 ? 2 : 1;
  const xt = []; for (let v = 0; v <= maxX; v += step) xt.push(v);
  const yt = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  const dash = { solid: undefined, dashed: '9 6', dotted: '2 5' };
  return (
    <svg className="draw" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.aria}>
      {yt.map((v) => (
        <g key={v}>
          <line className="grid" x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} />
          <text x={L - 8} y={Y(v) + 4} fontSize={font} textAnchor="end" className="mute">{num(v / 1000, lang)}k</text>
        </g>
      ))}
      {xt.map((v) => (
        <text key={v} x={X(v)} y={H - B + 22} fontSize={font} textAnchor="middle" className="mute">{num(v, lang)}</text>
      ))}
      <line className="tick" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      <text x={L} y={H - 6} fontSize={font} className="mute">{t.xAxis}</text>
      {series.map((s) => {
        const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.year).toFixed(1)} ${Y(p.balance).toFixed(1)}`).join(' ');
        const at = s.points[Math.min(s.points.length - 1, Math.round((s.points.length - 1) * (s.labelAt ?? 0.5)))];
        return (
          <g key={s.id}>
            <path d={d} className="linepath" style={{ strokeWidth: 2.5 }} strokeDasharray={dash[s.style]} strokeLinejoin="round" strokeLinecap="round" />
            <text x={X(at.year) + 8} y={Y(at.balance) - 12} fontSize={lab} fontWeight="620" style={{ paintOrder: 'stroke', stroke: 'var(--paper)', strokeWidth: 5, strokeLinejoin: 'round' }}>{s.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** A thin two-bar strip with the figures, for the sticky header of the mobile calculator. */
export function MiniBars({ top, bottom, lang, t }) {
  const max = niceMax(Math.max(top.value, bottom.value));
  const W = 360, bh = 12;
  const x = (v) => (W * v) / max;
  const over = bottom.value > top.value + 0.005;
  return (
    <div dir="ltr" className="flex items-center gap-3" role="img" aria-label={t.aria}>
      <svg className="draw" viewBox={`0 0 ${W} 34`} style={{ flex: 1, minWidth: 0, width: 0 }}>
        <rect className="soft" x="0" y="2" width={x(top.value)} height={bh} rx="6" />
        <rect className="blue" x="0" y="20" width={x(Math.min(top.value, bottom.value))} height={bh} rx="6" />
        {over && <rect className="redbar" x={x(top.value)} y="20" width={x(bottom.value) - x(top.value)} height={bh} rx="6" />}
      </svg>
      <span className="data shrink-0 text-base font-semibold" style={{ color: over ? 'var(--red)' : 'var(--ink)' }}>{pct(bottom.value, lang)}</span>
    </div>
  );
}
