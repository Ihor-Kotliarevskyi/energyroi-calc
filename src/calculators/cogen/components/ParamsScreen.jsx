import React from 'react';
import { useCalc } from '../context/CogenContext.jsx';
import { fN } from '../../../shared/lib/formatters.js';
import NumericSliderField from '../../../shared/components/NumericSliderField.jsx';

const SLIDERS = {
  unit: [
    {
      key: 'elMW',
      label: 'Електрична потужність КГУ, МВт',
      min: 0.1,
      max: 5,
      step: 0.1,
      fmt: (v) => `${v.toFixed(1)} МВт`,
      tag: 'ел.',
      tc: 'var(--blue)',
    },
    {
      key: 'thMW',
      label: 'Теплова потужність КГУ, МВт',
      min: 0.1,
      max: 6,
      step: 0.1,
      fmt: (v) => `${v.toFixed(1)} МВт`,
      tag: 'теп.',
      tc: 'var(--amber)',
    },
    {
      key: 'eff',
      label: 'Електричний ККД, %',
      min: 0.25,
      max: 0.5,
      step: 0.01,
      fmt: (v) => `${(v * 100).toFixed(0)}%`,
      tag: 'газ',
      tc: 'var(--green)',
    },
  ],
  prices: [
    { key: 'gp', label: 'Ціна газу, грн/тис.м³', min: 5000, max: 50000, step: 500, fmt: (v) => `${fN(v)} грн`, tag: 'ринок', tc: 'var(--red)' },
    { key: 'rdm', label: 'РДН, грн/МВт·год', min: 1000, max: 20000, step: 100, fmt: (v) => `${fN(v)} грн`, tag: 'волат.', tc: 'var(--red)' },
    { key: 'trans', label: 'Передача Укренерго, грн/МВт·год', min: 500, max: 5000, step: 100, fmt: (v) => `${fN(v)} грн`, tag: 'snapshot', tc: 'var(--text3)' },
    { key: 'distr', label: 'Розподіл обленерго, грн/МВт·год', min: 1500, max: 4500, step: 100, fmt: (v) => `${fN(v)} грн`, tag: 'snapshot', tc: 'var(--text3)' },
  ],
  heat: [
    { key: 'hp', label: 'Ціна тепла в мережу, грн/Гкал', min: 0, max: 5000, step: 100, fmt: (v) => v === 0 ? 'Вимкнено' : `${fN(v)} грн`, tag: 'ЛТЕ', tc: 'var(--green)' },
  ],
  el: [
    { key: 'elB', label: 'Базове ел. навантаження, МВт', min: 0.1, max: 5, step: 0.05, fmt: (v) => `${v.toFixed(2)} МВт` },
    { key: 'vrfW', label: 'Додаткове навантаження взимку (опалення), МВт', min: 0.0, max: 3, step: 0.05, fmt: (v) => `${v.toFixed(2)} МВт` },
    { key: 'vrfS', label: 'Додаткове навантаження влітку (охолодження), МВт', min: 0.0, max: 3, step: 0.05, fmt: (v) => `${v.toFixed(2)} МВт` },
  ],
  inv: [
    { key: 'capex', label: 'CAPEX «під ключ», млн грн', min: 5e6, max: 500e6, step: 1e6, fmt: (v) => `${fN(v / 1e6, 0)} млн`, tag: 'орієнтир', tc: 'var(--amber)' },
    { key: 'opex', label: 'OPEX (ТО + персонал), % від CAPEX/рік', min: 1, max: 30, step: 0.5, fmt: (v) => `${v.toFixed(1)}%` },
    { key: 'av', label: 'Коефіцієнт доступності КГУ', min: 0.5, max: 1, step: 0.01, fmt: (v) => `${v.toFixed(2)} → ${fN(Math.round(8760 * v))} год` },
  ],
};

function SliderGroup({ sliders, P, onChange, extra }) {
  return (
    <div className="card">
      {sliders.map((slider) => (
        <NumericSliderField key={slider.key} slider={slider} value={P[slider.key]} onChange={onChange} />
      ))}
      {extra}
    </div>
  );
}

export default function ParamsScreen() {
  const { P, dispatch, resetToDefaults, marketMeta } = useCalc();
  const showRateLimit = marketMeta?.apiStatus === 'rate_limited' || marketMeta?.errorStatus === 429;

  const onChange = (key, value) => dispatch({ type: 'SET_PARAM', key, value });
  const setSH = (value) => dispatch({ type: 'SET_SH', value });

  const pricesDerived = (
    <div className="derived">
      <span className="d-label">Кінцева ціна для об’єкта</span>
      <span className="d-val">{((P.rdm + P.trans + P.distr) / 1000).toFixed(2)} грн/кВт·год</span>
    </div>
  );

  const heatExtra = (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)', marginBottom: 8 }}>
        Мережа бере тепло влітку? <span className="tag" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>ЛТЕ</span>
      </div>
      <div className="segs">
        <div className={`seg${P.sh === 0 ? ' active' : ''}`} onClick={() => setSH(0)}>Ні</div>
        <div className={`seg${P.sh === 0.5 ? ' active' : ''}`} onClick={() => setSH(0.5)}>50%</div>
        <div className={`seg${P.sh === 1 ? ' active' : ''}`} onClick={() => setSH(1)}>Так</div>
      </div>
    </div>
  );

  const elDerived = (
    <>
      <div className="derived">
        <span className="d-label">Зима: база + опалення</span>
        <span className="d-val">{(P.elB + P.vrfW).toFixed(2)} МВт</span>
      </div>
      <div className="derived" style={{ marginTop: 6 }}>
        <span className="d-label">Літо: база + охолодження</span>
        <span className="d-val">{(P.elB + P.vrfS).toFixed(2)} МВт</span>
      </div>
    </>
  );

  return (
    <div className="screen active">
      <div className="page-wrap">
        <div className="title-row">
          <button className="reset-btn" onClick={resetToDefaults}>Скинути</button>
        </div>

        <div className="sec">Налаштування проєкту</div>
        <div className="card">
          {showRateLimit && (
            <div className="ib amber" style={{ marginBottom: 12 }}>
              API limit reached (429). Показані локальні дані `market-data.json`.
            </div>
          )}

          <div className="project-settings-row">
            <div className="project-field">
              <div className="project-field-label">Назва проєкту</div>
              <input
                type="text"
                className="project-input"
                value={P.projectName}
                onChange={(e) => onChange('projectName', e.target.value)}
                placeholder="Введіть назву проєкту..."
              />
            </div>

            <div className="project-meta-grid">
              <div className="project-chip">
                <span className="project-chip-label">Тип</span>
                <span className="project-chip-value">КГУ · {P.elMW.toFixed(1)} / {P.thMW.toFixed(1)} МВт</span>
              </div>
              <div className="project-chip">
                <span className="project-chip-label">Оновлено</span>
                <span className="project-chip-value">{marketMeta.updated || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sec">Установка КГУ</div>
        <SliderGroup sliders={SLIDERS.unit} P={P} onChange={onChange} />

        <div className="params-grid">
          <div className="params-item params-prices">
            <div className="sec">Ціни</div>
            <SliderGroup sliders={SLIDERS.prices} P={P} onChange={onChange} extra={pricesDerived} />
          </div>

          <div className="params-item params-inv">
            <div className="sec">Інвестиції</div>
            <SliderGroup sliders={SLIDERS.inv} P={P} onChange={onChange} />
          </div>

          <div className="params-item params-el">
            <div className="sec">Електричне навантаження об’єкта</div>
            <SliderGroup sliders={SLIDERS.el} P={P} onChange={onChange} extra={elDerived} />
          </div>

          <div className="params-item params-heat">
            <div className="sec">Тепло в мережу</div>
            <SliderGroup sliders={SLIDERS.heat} P={P} onChange={onChange} extra={heatExtra} />
          </div>
        </div>
      </div>
    </div>
  );
}
