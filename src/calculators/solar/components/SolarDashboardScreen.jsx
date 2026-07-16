import React from 'react';
import { useSolar } from '../context/SolarContext.jsx';
import { fM, fN, fG } from '../../../shared/lib/formatters.js';

// P&L rows для кожного режиму
function buildRows(r) {
  if (r.calcType === 'bess') {
    return [
      { n: 'Дохід від арбітражу (розряд − заряд)', v: r.arbitrageRevenue, pos: r.arbitrageRevenue >= 0 },
      { n: 'Дохід аРВЧ (плата за готовність)',      v: r.ancillaryRevenue, pos: true },
      { n: 'Разом доходи',                           v: r.totalRevenue,    pos: true, tot: true },
      { n: 'OPEX',                                   v: -r.opexCost,       pos: false },
      { n: 'Чистий прибуток',                        v: r.net,             pos: r.net > 0, tot: true },
    ];
  }
  if (r.calcType === 'solar_bess') {
    return [
      { n: 'Економія на власному споживанні', v: r.savings,             pos: true },
      { n: 'Продаж надлишку СЕС в мережу',   v: r.directExportRevenue, pos: true },
      { n: 'Дохід від розряду УЗЕ (пік)',    v: r.dischargeRevenue,    pos: true },
      { n: 'аРВЧ-контракт',                  v: r.ancillaryRevenue,    pos: true },
      { n: 'Вартість заряду від мережі',      v: -(r.gridChargeCost||0),pos: false },
      { n: 'Разом доходи (нетто)',            v: r.totalRevenue,        pos: true, tot: true },
      { n: 'OPEX (СЕС + УЗЕ)',               v: -r.opexCost,           pos: false },
      { n: 'Чистий прибуток',                v: r.net,                 pos: r.net > 0, tot: true },
    ];
  }
  // solar (default)
  return [
    { n: 'Економія на власному споживанні', v: r.savings,        pos: true },
    { n: 'Продаж електроенергії',           v: r.exportRevenue,  pos: true },
    { n: 'Разом доходи',                    v: r.totalRevenue,   pos: true, tot: true },
    { n: 'OPEX',                            v: -r.opexCost,      pos: false },
    { n: 'Чистий прибуток',                 v: r.net,            pos: r.net > 0, tot: true },
  ];
}

function EnergyPanel({ r }) {
  if (r.calcType === 'bess') {
    return (
      <div className="card" style={{ padding: 12 }}>
        <div className="det-row"><span className="det-k">Ємність УЗЕ</span><span className="det-v">{fN(r.bessCapMWh * 1000, 0)} кВт·год</span></div>
        <div className="det-row"><span className="det-k">Заряд / рік</span><span className="det-v">{fN(r.chargeKwh, 0)} кВт·год</span></div>
        <div className="det-row"><span className="det-k">Розряд / рік</span><span className="det-v">{fN(r.dischargeKwh, 0)} кВт·год</span></div>
        <div className="det-row"><span className="det-k">Втрати циклу</span><span className="det-v">{fN(r.chargeKwh - r.dischargeKwh, 0)} кВт·год</span></div>
      </div>
    );
  }
  if (r.calcType === 'solar_bess') {
    return (
      <div className="card" style={{ padding: 12 }}>
        <div className="det-row"><span className="det-k">Генерація СЕС</span><span className="det-v">{fN(r.year1Gen, 0)} кВт·год</span></div>
        <div className="det-row"><span className="det-k">Власне споживання</span><span className="det-v">{fN(r.selfUseKwh, 0)} кВт·год</span></div>
        <div className="det-row"><span className="det-k">Заряд УЗЕ від СЕС</span><span className="det-v">{fN(r.solarChargeKwh, 0)} кВт·год</span></div>
        <div className="det-row"><span className="det-k">Дозаряд від мережі</span><span className="det-v">{fN(r.gridChargeKwh, 0)} кВт·год</span></div>
        <div className="det-row"><span className="det-k">Розряд УЗЕ</span><span className="det-v">{fN(r.dischargeKwh, 0)} кВт·год</span></div>
        <div className="det-row"><span className="det-k">Прямий продаж СЕС</span><span className="det-v">{fN(r.directExportKwh, 0)} кВт·год</span></div>
      </div>
    );
  }
  // solar
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="det-row"><span className="det-k">Власне споживання</span><span className="det-v">{fN(r.selfUseKwh, 0)} кВт·год</span></div>
      <div className="det-row"><span className="det-k">Продаж в мережу</span><span className="det-v">{fN(r.directExportKwh, 0)} кВт·год</span></div>
    </div>
  );
}

function TopMetric({ r }) {
  if (r.calcType === 'bess') {
    return (
      <div className="m">
        <div className="ml">Цикли / ємність</div>
        <div className="dashboard-pair">
          <div>
            <div className="dashboard-pair-label">Розряд / рік</div>
            <div className="mv cb">{fN(r.dischargeKwh, 0)}</div>
          </div>
          <div>
            <div className="dashboard-pair-label">LCOE</div>
            <div className="mv">{fG(r.lcoe, 2)}</div>
          </div>
        </div>
        <div className="dashboard-diff">
          <span className="dashboard-diff-label">кВт·год / рік (розряд)</span>
        </div>
      </div>
    );
  }
  // solar / solar_bess
  return (
    <div className="m">
      <div className="ml">Генерація / LCOE</div>
      <div className="dashboard-pair">
        <div>
          <div className="dashboard-pair-label">Генерація</div>
          <div className="mv cb">{fN(r.year1Gen, 0)}</div>
        </div>
        <div>
          <div className="dashboard-pair-label">LCOE</div>
          <div className="mv">{fG(r.lcoe, 2)}</div>
        </div>
      </div>
      <div className="dashboard-diff">
        <span className="dashboard-diff-label">кВт·год / 1-й рік</span>
        <span className="dashboard-diff-value cb">{fN(r.year1Gen / 1000, 0)}</span>
      </div>
    </div>
  );
}

export default function SolarDashboardScreen() {
  const { P, result: r } = useSolar();
  const pbCls = r.pb ? (r.pb < 5 ? 'cg' : r.pb < 8 ? 'ca' : 'cr') : 'cr';
  const rows = buildRows(r);

  return (
    <div className="screen active">
      <div className="page-wrap">
        <div className="sec">Ключові показники</div>
        <div className="mg dashboard-mg-three">
          <TopMetric r={r} />

          <div className="m">
            <div className="ml">Дохід / Прибуток</div>
            <div className="mv cb">{fM(r.totalRevenue, 2)}</div>
            <div className={`ms ${r.net > 0 ? 'cg' : 'cr'}`}>net: {fM(r.net, 2)}</div>
          </div>

          <div className="m">
            <div className="ml">Окупність</div>
            <div className={`mv ${pbCls}`}>{r.pb ? `${r.pb.toFixed(1)} р.` : '∞'}</div>
            <div className="ms">CAPEX {fM(r.capex, 1)}</div>
          </div>
        </div>

        <div className="two-col-grid">
          <div>
            <div className="sec">Економіка</div>
            <div className="card" style={{ padding: 12 }}>
              {rows.map((row, i) => (
                <div key={i} className={`pnl-row${row.tot ? ' tot' : ''}`}>
                  <span className="pnl-n">{row.n}</span>
                  <span className="pnl-v" style={{ color: row.pos ? 'var(--green)' : 'var(--red)' }}>
                    {row.v >= 0 ? '+' : ''}{fM(row.v, 2)}
                  </span>
                  {!row.tot && (
                    <span className="pnl-pct">
                      {r.totalRevenue > 0 ? `${fN((Math.abs(row.v) / Math.abs(r.totalRevenue)) * 100, 0)}%` : '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="sec">Енергетичні показники</div>
            <EnergyPanel r={r} />
          </div>
        </div>
      </div>
    </div>
  );
}
