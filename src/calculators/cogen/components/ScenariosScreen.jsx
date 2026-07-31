import React from 'react';
import { useCalc } from '../context/CogenContext.jsx';
import { calc } from '../lib/calc.js';
import { fG, fM, fN } from '../../../shared/lib/formatters.js';

export default function ScenariosScreen() {
  const { P, result, dispatch } = useCalc();

  const buildScenario = (overrides) => calc({ ...P, ...overrides });
  const scenarios = [
    {
      title: 'Консервативний',
      shortTitle: 'Консерват.',
      badge: 'Мережа не бере влітку',
      bc: 'var(--bg3)',
      tc: 'var(--text2)',
      overrides: { sh: 0, hp: 800 },
      result: buildScenario({ sh: 0, hp: 800 }),
    },
    {
      title: 'Базовий (поточний)',
      shortTitle: 'Базовий',
      badge: 'Ваші параметри',
      bc: 'var(--green-bg)',
      tc: 'var(--green)',
      overrides: {},
      result,
      best: true,
    },
    {
      title: 'Оптимістичний',
      shortTitle: 'Оптиміст.',
      badge: 'РДН 8 грн, газ -10%, тепло 2500',
      bc: 'var(--blue-bg)',
      tc: 'var(--blue)',
      overrides: {
        rdm: 8000,
        gp: Math.round(P.gp * 0.9),
        hp: 2500,
        sh: 1,
        av: 0.95,
      },
      result: buildScenario({
        rdm: 8000,
        gp: Math.round(P.gp * 0.9),
        hp: 2500,
        sh: 1,
        av: 0.95,
      }),
    },
    {
      title: 'Тільки електрика',
      shortTitle: 'Електрика',
      badge: 'Без продажу тепла',
      bc: 'var(--amber-bg)',
      tc: 'var(--amber)',
      overrides: { hp: 0, sh: 0 },
      result: buildScenario({ hp: 0, sh: 0 }),
    },
  ];

  const metrics = [
    { label: 'Собів. ел., грн/кВт·год', format: (r) => fG(r.ecg, 2) },
    { label: 'Дохід, млн', format: (r) => fM(r.tot, 1) },
    { label: 'Прибуток, млн', format: (r) => fM(r.net, 1) },
    { label: 'Окупність', format: (r) => (r.pb ? `${r.pb.toFixed(1)} р.` : '∞') },
    { label: 'NPV 15р.', format: (r) => `${fN(r.cf[15], 1)} млн` },
  ];

  const applyScenario = (overrides) => {
    Object.entries(overrides).forEach(([key, value]) => {
      dispatch({ type: 'SET_PARAM', key, value });
    });
  };

  return (
    <div className="screen active">
      <div className="page-wrap">
        <div className="scr-title" style={{ marginBottom: 16 }}>Сценарії</div>

        <div className="sc-cards-grid">
          {scenarios.map((scenario) => (
            <div key={scenario.title} className={`card${scenario.best ? ' best' : ''}`}>
              <div className="sc-card-head">
                <div className="sc-title">{scenario.title}</div>
                <div className="sc-badge" style={{ background: scenario.bc, color: scenario.tc }}>{scenario.badge}</div>
              </div>

              <div className="sc-row">
                <span className="sc-k">Собів. ел.</span>
                <span className="sc-v" style={{ color: scenario.result.ecg < scenario.result.ep ? 'var(--green)' : 'var(--red)' }}>
                  {fG(scenario.result.ecg)}
                </span>
              </div>
              <div className="sc-row">
                <span className="sc-k">Тепло в мережу</span>
                <span className="sc-v">{fN(scenario.result.gcT, 0)} Гкал</span>
              </div>
              <div className="sc-row">
                <span className="sc-k">Прибуток / рік</span>
                <span className="sc-v" style={{ color: scenario.result.net > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fM(scenario.result.net)}
                </span>
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
                {scenarios.map((scenario) => (
                  <th key={scenario.title} style={{ color: scenario.tc, fontSize: 10 }}>{scenario.shortTitle}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label}>
                  <td>{metric.label}</td>
                  {scenarios.map((scenario) => (
                    <td key={`${scenario.title}-${metric.label}`}>{metric.format(scenario.result)}</td>
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
