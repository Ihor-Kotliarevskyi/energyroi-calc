import React, { useEffect, useRef } from 'react';
import { useSolar } from '../context/SolarContext.jsx';
import { calc } from '../lib/calc.js';
import { fN } from '../../../shared/lib/formatters.js';

function drawChart(canvas, cf) {
  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = wrap.clientWidth - 4;
  const H = 200;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 42, r: 10, t: 10, b: 26 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const minV = Math.min(...cf);
  const maxV = Math.max(...cf);
  const rng = maxV - minV || 1;
  const xOf = (i) => pad.l + (i / (cf.length - 1)) * cW;
  const yOf = (v) => pad.t + cH - ((v - minV) / rng) * cH;

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.t + (i * cH) / 4;
    const val = maxV - (i / 4) * rng;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fN(val, 0), pad.l - 4, y + 3);
  }

  if (minV < 0 && maxV > 0) {
    const y0 = yOf(0);
    ctx.strokeStyle = 'rgba(29,158,117,.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, y0);
    ctx.lineTo(W - pad.r, y0);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(cf[0]));
  cf.forEach((v, i) => { if (i > 0) ctx.lineTo(xOf(i), yOf(v)); });
  ctx.lineTo(xOf(cf.length - 1), H - pad.b);
  ctx.lineTo(xOf(0), H - pad.b);
  ctx.closePath();
  ctx.fillStyle = 'rgba(29,78,216,0.07)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(cf[0]));
  cf.forEach((v, i) => { if (i > 0) ctx.lineTo(xOf(i), yOf(v)); });
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2;
  ctx.stroke();

  cf.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(xOf(i), yOf(v), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = v >= 0 ? '#059669' : '#dc2626';
    ctx.fill();
  });

  [0, 3, 6, 9, 12, 15].forEach((i) => {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '9px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i === 0 ? 'Старт' : `р.${i}`, xOf(i), H - pad.b + 14);
  });
}

export default function SolarCashflowScreen() {
  const { P, result } = useSolar();
  const canvasRef = useRef(null);
  const calcType = P.calcType ?? 'solar';
  const isBess = calcType === 'bess';

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const t = setTimeout(() => drawChart(canvasRef.current, result.cf), 30);
    return () => clearTimeout(t);
  }, [result.cf]);

  const npv = result.cf[15];
  const be = result.cf.findIndex((v) => v >= 0);
  const pbCls = result.pb ? (result.pb < 5 ? 'cg' : result.pb < 8 ? 'ca' : 'cr') : 'cr';

  // Таблиця чутливості — адаптується до режиму
  const sensitivityRows = isBess
    ? [100, 150, 200, 250, 300, 365]   // cyclesPerYear
    : [5, 6, 7, 8, 9, 10];             // gridPrice

  const sensitivityCols = isBess
    ? [
        { label: 'Маржа 8 грн', key: 8,  pT: 14, oT: 6 },
        { label: 'Маржа 10 грн', key: 10, pT: 16, oT: 6 },
        { label: 'Маржа 14 грн', key: 14, pT: 20, oT: 6 },
      ]
    : [
        { t: 3.0, c: 'var(--green)', l: 'Тариф 3.0' },
        { t: 4.2, c: 'var(--blue)',  l: 'Тариф 4.2' },
        { t: 5.2, c: 'var(--red)',   l: 'Тариф 5.2' },
      ];

  return (
    <div className="screen active">
      <div className="page-wrap">
        <div className="sec">Кумулятивний CF, млн грн</div>
        <div className="card" style={{ padding: 12 }}>
          <div className="chart-wrap">
            <canvas ref={canvasRef}></canvas>
          </div>
        </div>

        <div className="two-col-grid">
          <div>
            <div className="sec">По роках</div>
            <div className="card">
              {result.cf.map((v, i) => (
                <div key={i} className="cf-row">
                  <span className="cf-yr">{i === 0 ? 'Старт' : `Рік ${i}`}</span>
                  <span className="cf-v" style={{ color: v >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {v >= 0 ? '+' : ''}{fN(v, 1)} млн
                  </span>
                  <span
                    className="cf-badge"
                    style={{
                      background: v >= 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                      color: v >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {v >= 0 ? '✓ окупився' : '· в мінусі'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="sec">Чутливість окупності</div>
            <div className="card" style={{ padding: 12 }}>
              <div className="cf-summary-row">
                <span className="cf-summary-item">Окупність: <b className={pbCls}>{result.pb ? `${result.pb.toFixed(1)} р.` : '∞'}</b></span>
                <span className="cf-summary-item">NPV 15 р.: <b className={npv > 0 ? 'cg' : 'cr'}>{fN(npv, 1)} млн</b></span>
                <span className="cf-summary-item">Break-even: <b>{be > 0 ? `рік ${be}` : 'не окупається'}</b></span>
              </div>
              <table className="st">
                <thead>
                  <tr>
                    <th>{isBess ? 'Циклів/рік' : 'Ціна мережі'}</th>
                    {sensitivityCols.map((col) => (
                      <th key={col.label || col.l} style={{ color: col.c }}>{col.label || col.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivityRows.map((rowVal) => (
                    <tr key={rowVal}>
                      <td>{isBess ? `${rowVal} цикл.` : `${rowVal.toFixed(1)} грн`}</td>
                      {sensitivityCols.map((col) => {
                        const overrides = isBess
                          ? { cyclesPerYear: rowVal, peakTariff: col.pT, offPeakTariff: col.oT }
                          : { gridPrice: rowVal, feedInTariff: col.t };
                        const sc = calc({ ...P, ...overrides });
                        return <td key={col.label || col.l}>{sc.pb ? `${sc.pb.toFixed(1)} р.` : '∞'}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
