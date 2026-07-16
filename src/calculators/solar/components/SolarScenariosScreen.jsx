import React from 'react';
import { useSolar } from '../context/SolarContext.jsx';
import { calc } from '../lib/calc.js';
import { fG, fM, fN } from '../../../shared/lib/formatters.js';

// Набори сценаріїв для кожного режиму
function buildSolarScenarios(P, result) {
  const s = (ov) => calc({ ...P, ...ov, calcType: 'solar' });
  return [
    { title: 'Консервативний', shortTitle: 'Консерват.', badge: 'Низькі ринкові ціни',           bc: 'var(--bg3)',       tc: 'var(--text2)',  overrides: { feedInTariff: 2.5, gridPrice: 6.0 },               result: s({ feedInTariff: 2.5, gridPrice: 6.0 }) },
    { title: 'Базовий',        shortTitle: 'Базовий',    badge: 'Ваші параметри',                  bc: 'var(--green-bg)', tc: 'var(--green)',  overrides: {},                                                   result, best: true },
    { title: 'Self-use фокус', shortTitle: 'Self-use',   badge: 'Більше власного споживання',       bc: 'var(--blue-bg)',  tc: 'var(--blue)',   overrides: { selfUseShare: 0.85, degradation: 0.6 },             result: s({ selfUseShare: 0.85, degradation: 0.6 }) },
    { title: 'Ринковий продаж',shortTitle: 'Ринковий',   badge: 'Вищий тариф продажу',             bc: 'var(--amber-bg)', tc: 'var(--amber)',  overrides: { feedInTariff: 8.0, selfUseShare: 0.3 },             result: s({ feedInTariff: 8.0, selfUseShare: 0.3 }) },
  ];
}

function buildBessScenarios(P, result) {
  const s = (ov) => calc({ ...P, ...ov, calcType: 'bess' });
  return [
    { title: 'Консервативний',  shortTitle: 'Консерват.', badge: 'Мінімальна маржа',              bc: 'var(--bg3)',       tc: 'var(--text2)',  overrides: { peakTariff: 12, offPeakTariff: 7, cyclesPerYear: 150, includeAncillary: false }, result: s({ peakTariff: 12, offPeakTariff: 7, cyclesPerYear: 150, includeAncillary: false }) },
    { title: 'Базовий',         shortTitle: 'Базовий',    badge: 'Ваші параметри',                bc: 'var(--green-bg)', tc: 'var(--green)',  overrides: {},                                                   result, best: true },
    { title: 'З аРВЧ',          shortTitle: 'аРВЧ',       badge: 'Максимальний дохід від аРВЧ',    bc: 'var(--blue-bg)',  tc: 'var(--blue)',   overrides: { includeAncillary: true, cyclesPerYear: 300 },        result: s({ includeAncillary: true, cyclesPerYear: 300 }) },
    { title: 'Пікова маржа',    shortTitle: 'Піковий',    badge: 'Висока різниця тарифів',         bc: 'var(--amber-bg)', tc: 'var(--amber)',  overrides: { peakTariff: 22, offPeakTariff: 5, cyclesPerYear: 300 }, result: s({ peakTariff: 22, offPeakTariff: 5, cyclesPerYear: 300 }) },
  ];
}

function buildComboScenarios(P, result) {
  const s = (ov) => calc({ ...P, ...ov, calcType: 'solar_bess' });
  return [
    { title: 'Консервативний', shortTitle: 'Консерват.', badge: 'Низькі ціни ринку',              bc: 'var(--bg3)',       tc: 'var(--text2)',  overrides: { feedInTariff: 3.0, gridPrice: 6.0, peakTariff: 12, includeAncillary: false }, result: s({ feedInTariff: 3.0, gridPrice: 6.0, peakTariff: 12, includeAncillary: false }) },
    { title: 'Базовий',        shortTitle: 'Базовий',    badge: 'Ваші параметри',                  bc: 'var(--green-bg)', tc: 'var(--green)',  overrides: {},                                                   result, best: true },
    { title: 'Self-use макс.', shortTitle: 'Self-use',   badge: 'Максимум власного споживання',    bc: 'var(--blue-bg)',  tc: 'var(--blue)',   overrides: { selfUseShare: 0.9, solarToStorage: 0.9 },            result: s({ selfUseShare: 0.9, solarToStorage: 0.9 }) },
    { title: 'Ринок + аРВЧ',   shortTitle: 'Ринок',      badge: 'Максимальний ринковий дохід',     bc: 'var(--amber-bg)', tc: 'var(--amber)',  overrides: { peakTariff: 20, offPeakTariff: 4, includeAncillary: true }, result: s({ peakTariff: 20, offPeakTariff: 4, includeAncillary: true }) },
  ];
}

export default function SolarScenariosScreen() {
  const { P, result, dispatch } = useSolar();
  const calcType = P.calcType ?? 'solar';

  const scenarios =
    calcType === 'bess'       ? buildBessScenarios(P, result)
    : calcType === 'solar_bess' ? buildComboScenarios(P, result)
    : buildSolarScenarios(P, result);

  const isBess = calcType === 'bess';

  const metrics = [
    { label: isBess ? 'Розряд, кВт·год' : 'Генерація, кВт·год', format: (r) => isBess ? fN(r.dischargeKwh, 0) : fN(r.year1Gen, 0) },
    { label: 'Дохід, млн',     format: (r) => fM(r.totalRevenue, 2) },
    { label: 'Net, млн',       format: (r) => fM(r.net, 2) },
    { label: 'Окупність',      format: (r) => (r.pb ? `${r.pb.toFixed(1)} р.` : '∞') },
    { label: 'LCOE',           format: (r) => fG(r.lcoe, 2) },
  ];

  const applyScenario = (overrides) => {
    Object.entries(overrides).forEach(([key, value]) => {
      dispatch({ type: 'SET_PARAM', key, value });
    });
  };

  return (
    <div className="screen active">
      <div className="page-wrap">
        <div className="sc-cards-grid">
          {scenarios.map((scenario) => (
            <div key={scenario.title} className={`card${scenario.best ? ' best' : ''}`}>
              <div className="sc-card-head">
                <div className="sc-title">{scenario.title}</div>
                <div className="sc-badge" style={{ background: scenario.bc, color: scenario.tc }}>{scenario.badge}</div>
              </div>

              <div className="sc-row">
                <span className="sc-k">{isBess ? 'Розряд / рік' : 'Генерація / 1-й рік'}</span>
                <span className="sc-v">{isBess ? fN(scenario.result.dischargeKwh, 0) : fN(scenario.result.year1Gen, 0)} кВт·год</span>
              </div>
              <div className="sc-row">
                <span className="sc-k">LCOE</span>
                <span className="sc-v">{fG(scenario.result.lcoe, 2)}</span>
              </div>
              <div className="sc-row">
                <span className="sc-k">Net / рік</span>
                <span className="sc-v" style={{ color: scenario.result.net > 0 ? 'var(--green)' : 'var(--red)' }}>{fM(scenario.result.net, 2)}</span>
              </div>
              <div className="sc-row">
                <span className="sc-k">Окупність</span>
                <span className="sc-v" style={{ color: scenario.result.pb ? (scenario.result.pb < 5 ? 'var(--green)' : 'var(--amber)') : 'var(--red)' }}>
                  {scenario.result.pb ? `${scenario.result.pb.toFixed(1)} р.` : '∞'}
                </span>
              </div>

              {!scenario.best && (
                <div className="saved-card-actions">
                  <button className="btn-secondary" onClick={() => applyScenario(scenario.overrides)}>Застосувати</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sec comparison-table-desktop">Порівняльна таблиця</div>
        <div className="card comparison-table comparison-table-desktop" style={{ padding: 12 }}>
          <table className="st">
            <thead>
              <tr>
                <th></th>
                {scenarios.map((sc) => (
                  <th key={sc.title} style={{ color: sc.tc, fontSize: 10 }}>{sc.shortTitle}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label}>
                  <td>{metric.label}</td>
                  {scenarios.map((sc) => (
                    <td key={`${sc.title}-${metric.label}`}>{metric.format(sc.result)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
