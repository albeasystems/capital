import { useId } from 'react';
import { num, pct } from '../format.js';

const niceMax = (v) => {
  const step = v > 30 ? 10 : 5;
  return Math.max(step * 2, Math.ceil((v + 0.5) / step) * step);
};

/**
 * The page's central drawing: two bars to one scale with the difference dimensioned in red like a
 * correction on a plan. The bar that exceeds the other is hatched in red over the excess.
 * Used for the quoted rate (TIN) against the real cost (TAE), and for loan A against loan B.
 * `t` carries the words so every language letters its own sheet.
 */
function Bars({ top, bottom, lang, t, w, h, pad, y1, y2, bh, font, big, ticksEvery, reserve = 0, detail }) {
  const id = useId().replace(/:/g, '');
  const max = niceMax(Math.max(top.value, bottom.value));
  const x = (v) => pad + ((w - pad * 2 - reserve) * v) / max;
  const lo = Math.min(top.value, bottom.value);
  const hi = Math.max(top.value, bottom.value);
  const gap = hi - lo;
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += ticksEvery) ticks.push(v);
  const axisY = y2 + bh + 52;
  const dimY = y1 + bh + (y2 - y1 - bh) / 2;
  const hasGap = gap > 0.005;
  const a = 7; // arrowhead
  const bar = (b, y, cls, other) => {
    const over = b.value > other.value + 0.005;
    return (
      <g key={cls}>
        <g className={cls}>
          <rect className="fill-line" x={pad} y={y} width={x(over ? other.value : b.value) - pad} height={bh} />
          {over && (
            <>
              <rect x={x(other.value)} y={y} width={x(b.value) - x(other.value)} height={bh} fill={`url(#h${id})`} />
              <rect x={x(other.value)} y={y} width={x(b.value) - x(other.value)} height={bh} className="red" />
            </>
          )}
        </g>
        <text x={pad + 14} y={y + bh / 2 + font * 0.36} fontSize={font + 2} fontWeight="600" style={{ fill: 'var(--paper)' }}>{b.label}</text>
        <text x={x(b.value) + 14} y={y + bh / 2 + big * 0.34} fontSize={big} fontWeight={over ? 700 : 560} className={over ? 'red-t' : ''}>
          {pct(b.value, lang, b.digits ?? 2)}
        </text>
      </g>
    );
  };
  return (
    <svg className="draw" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={t.aria} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`h${id}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="9" style={{ stroke: 'var(--red)', strokeWidth: 2.2 }} />
        </pattern>
      </defs>

      {/* scale */}
      <line className="ink" x1={pad} x2={x(max)} y1={axisY} y2={axisY} />
      {ticks.map((v) => (
        <g key={v}>
          <line className="ink" x1={x(v)} x2={x(v)} y1={axisY} y2={axisY + 7} />
          <line className="hair" x1={x(v)} x2={x(v)} y1={y1 - 18} y2={axisY} strokeDasharray="2 5" />
          <text x={x(v)} y={axisY + 26} fontSize={font} textAnchor="middle" className="mute">{pct(v, lang, 0)}</text>
        </g>
      ))}

      {bar(top, y1, 'bar-tin', bottom)}
      {bar(bottom, y2, 'bar-tae', top)}
      {/* detail mark: the circled letter that refers to the view of the app */}
      {detail && (
        <g aria-hidden="true">
          <circle cx={x(bottom.value) + 14 + big * 0.62 * 7 + 34} cy={y2 + bh / 2} r="15" style={{ fill: 'var(--paper)', stroke: 'var(--line)', strokeWidth: 1.5 }} />
          <text x={x(bottom.value) + 14 + big * 0.62 * 7 + 34} y={y2 + bh / 2 + 5} fontSize="14" fontWeight="600" textAnchor="middle">{detail}</text>
        </g>
      )}

      {/* the correction: extension lines and a dimension with arrowheads */}
      {hasGap && (
        <g className="dim-red">
          <line className="red" x1={x(top.value)} x2={x(top.value)} y1={y1 + bh + 4} y2={y2 - 4} strokeDasharray="3 3" />
          <line className="red" x1={x(bottom.value)} x2={x(bottom.value)} y1={y1 + bh + 4} y2={y2 - 4} strokeDasharray="3 3" />
          <line className="red" x1={x(lo) + a} x2={x(hi) - a} y1={dimY} y2={dimY} />
          <path className="red-fill" d={`M${x(lo)} ${dimY} l${a} -3.2 v6.4 z`} />
          <path className="red-fill" d={`M${x(hi)} ${dimY} l${-a} -3.2 v6.4 z`} />
          <text x={(x(lo) + x(hi)) / 2} y={dimY - 9} fontSize={big - 2} fontWeight="700" textAnchor="middle" className="red-t">
            +{pct(gap, lang, 2)}
          </text>
        </g>
      )}
    </svg>
  );
}

export function RateBars({ top, bottom, lang, t, className = '', detail }) {
  return (
    <div className={className} dir="ltr">
      <div className="draw-wide">
        <Bars top={top} bottom={bottom} lang={lang} t={t} w={960} h={340} pad={8} y1={40} y2={146} bh={60} font={15} big={30} ticksEvery={5} detail={detail} />
      </div>
      <div className="draw-compact">
        <Bars top={top} bottom={bottom} lang={lang} t={t} w={420} h={322} pad={10} y1={26} y2={128} bh={52} font={15} big={24} ticksEvery={5} reserve={112} />
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
  const build = (W, pad, bh, y, labels) => {
    const x = (v) => pad + ((W - pad * 2) * v) / total;
    let at = 0;
    const placed = segs.map((s) => { const x0 = x(at); at += s.v; return { ...s, x0, x1: x(at) }; });
    return (
      <svg className="draw cost-draw" viewBox={`0 0 ${W} ${labels ? 252 : bh + y * 2}`} role="img" aria-label={t.aria}>
        <defs>
          <pattern id={`a${id}${W}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="9" style={{ stroke: 'var(--line)', strokeWidth: 2 }} />
          </pattern>
          <pattern id={`b${id}${W}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="9" style={{ stroke: 'var(--red)', strokeWidth: 2.2 }} />
          </pattern>
        </defs>
        {placed.map((s, i) => (
          <g key={s.k}>
            <g className={`seg seg-${i + 1}`}>
            {s.k === 'capital' && <rect className="fill-line" x={s.x0} y={y} width={s.x1 - s.x0} height={bh} />}
            {s.k === 'interest' && <><rect x={s.x0} y={y} width={s.x1 - s.x0} height={bh} fill={`url(#a${id}${W})`} /><rect x={s.x0} y={y} width={s.x1 - s.x0} height={bh} className="ink" /></>}
            {s.k === 'hidden' && <><rect x={s.x0} y={y} width={s.x1 - s.x0} height={bh} fill={`url(#b${id}${W})`} /><rect x={s.x0} y={y} width={s.x1 - s.x0} height={bh} className="red" /></>}
            </g>
            {labels && (
              <>
                <line className={s.k === 'hidden' ? 'red' : 'ink'} x1={s.x0 + 1} x2={s.x1 - 1} y1={y + bh + 26} y2={y + bh + 26} />
                <line className={s.k === 'hidden' ? 'red' : 'ink'} x1={s.x0 + 1} x2={s.x0 + 1} y1={y + bh + 18} y2={y + bh + 34} />
                <line className={s.k === 'hidden' ? 'red' : 'ink'} x1={s.x1 - 1} x2={s.x1 - 1} y1={y + bh + 18} y2={y + bh + 34} />
                {s.k === 'hidden' ? (
                  <>
                    {/* the narrow segments cannot hold their labels side by side: the hidden costs drop to their own line, joined by a leader */}
                    <line className="red" x1={(s.x0 + s.x1) / 2} x2={(s.x0 + s.x1) / 2} y1={y + bh + 26} y2={y + bh + 98} strokeDasharray="3 3" />
                    <text x={s.x1} y={y + bh + 124} fontSize="22" fontWeight="640" textAnchor="end" className="red-t">{fmt(s.v)}</text>
                    <text x={s.x1} y={y + bh + 146} fontSize="13" textAnchor="end" className="mute">{s.label}</text>
                  </>
                ) : (
                  <>
                    <text x={s.k === 'capital' ? (s.x0 + s.x1) / 2 : s.x1 - 2} y={y + bh + 62} fontSize="22" fontWeight="640" textAnchor={s.k === 'capital' ? 'middle' : 'end'}>{fmt(s.v)}</text>
                    <text x={s.k === 'capital' ? (s.x0 + s.x1) / 2 : s.x1 - 2} y={y + bh + 84} fontSize="13" textAnchor={s.k === 'capital' ? 'middle' : 'end'} className="mute">{s.label}</text>
                  </>
                )}
              </>
            )}
          </g>
        ))}
      </svg>
    );
  };
  return (
    <div dir="ltr">
      <div className="draw-wide">{build(960, 22, 56, 34, true)}</div>
      <div className="draw-compact">
        {build(420, 6, 44, 6, false)}
        <ul className="m-0 mt-4 list-none p-0">
          {segs.map((s) => (
            <li key={s.k} className="dim-row">
              <span className="k">{s.label}</span><span className="lead" aria-hidden="true" />
              <span className="v" style={s.k === 'hidden' ? { color: 'var(--red)', fontWeight: 650 } : undefined}>{fmt(s.v)}</span>
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
      <div className="draw-wide"><Balance series={series} lang={lang} t={t} years={years} W={960} H={340} L={64} font={13} lab={14} /></div>
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
          <line className="hair" x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} />
          <text x={L - 8} y={Y(v) + 4} fontSize={font} textAnchor="end" className="mute">{num(v / 1000, lang)}k</text>
        </g>
      ))}
      {xt.map((v) => (
        <g key={v}>
          <line className="ink" x1={X(v)} x2={X(v)} y1={H - B} y2={H - B + 6} />
          <text x={X(v)} y={H - B + 22} fontSize={font} textAnchor="middle" className="mute">{num(v, lang)}</text>
        </g>
      ))}
      <line className="ink" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      <text x={L} y={H - 6} fontSize={font} className="mute">{t.xAxis}</text>
      {series.map((s) => {
        const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.year).toFixed(1)} ${Y(p.balance).toFixed(1)}`).join(' ');
        const at = s.points[Math.min(s.points.length - 1, Math.round((s.points.length - 1) * (s.labelAt ?? 0.5)))];
        return (
          <g key={s.id}>
            <path d={d} className="ink" style={{ strokeWidth: 2.25 }} strokeDasharray={dash[s.style]} strokeLinejoin="round" />
            <text x={X(at.year) + 8} y={Y(at.balance) - 12} fontSize={lab} fontWeight="600" style={{ paintOrder: 'stroke', stroke: 'var(--paper)', strokeWidth: 5, strokeLinejoin: 'round' }}>{s.label}</text>
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
        <rect className="fill-line" x="0" y="2" width={x(top.value)} height={bh} />
        <rect className="fill-line" x="0" y="20" width={x(Math.min(top.value, bottom.value))} height={bh} />
        {over && <rect x={x(top.value)} y="20" width={x(bottom.value) - x(top.value)} height={bh} style={{ fill: 'var(--red)', opacity: 0.55 }} />}
      </svg>
      <span className="data shrink-0 text-base font-semibold" style={{ color: over ? 'var(--red)' : 'var(--ink)' }}>{pct(bottom.value, lang)}</span>
    </div>
  );
}
