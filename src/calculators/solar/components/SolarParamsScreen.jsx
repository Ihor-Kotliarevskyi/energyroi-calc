import React from 'react';
import { useSolar } from '../context/SolarContext.jsx';
import { fN } from '../../../shared/lib/formatters.js';
import NumericSliderField from '../../../shared/components/NumericSliderField.jsx';

// ── Параметри СЕС ──────────────────────────────────────────────────────────
const SOLAR_SLIDERS = [
  { key: 'pvMW',         label: 'Потужність СЕС, МВт',                min: 0.1,   max: 20,    step: 0.1,   fmt: (v) => `${v.toFixed(1)} МВт` },
  { key: 'specificYield',label: 'Питомий виробіток, кВт·год/кВт·рік', min: 800,   max: 1800,  step: 10,    fmt: (v) => `${fN(v, 0)} кВт·год` },
  { key: 'degradation',  label: 'Деградація панелей, %/рік',           min: 0.1,   max: 2,     step: 0.1,   fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'selfUseShare', label: 'Частка власного споживання',          min: 0,     max: 1,     step: 0.05,  fmt: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'gridPrice',    label: 'Ціна заміщення з мережі, грн/кВт·год',min: 2,   max: 20,    step: 0.1,   fmt: (v) => `${v.toFixed(2)} грн` },
  { key: 'feedInTariff', label: 'Тариф продажу / зелений, грн/кВт·год',min: 1,   max: 20,    step: 0.1,   fmt: (v) => `${v.toFixed(2)} грн` },
  { key: 'pvCapex',      label: 'CAPEX СЕС, млн грн',                  min: 2e6,  max: 800e6, step: 0.5e6, fmt: (v) => `${fN(v / 1e6, 1)} млн` },
  { key: 'pvOpex',       label: 'OPEX СЕС, % від CAPEX/рік',           min: 0.2,  max: 5,     step: 0.1,   fmt: (v) => `${v.toFixed(1)}%` },
];

// ── Параметри УЗЕ ──────────────────────────────────────────────────────────
const BESS_SLIDERS = [
  { key: 'bessCapacityMWh',    label: 'Ємність УЗЕ, МВт·год',              min: 0.1,   max: 50,    step: 0.1,   fmt: (v) => `${v.toFixed(1)} МВт·год` },
  { key: 'roundTripEff',       label: 'ККД циклу (round-trip)',             min: 0.5,   max: 1,     step: 0.01,  fmt: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'bessDegrad',         label: 'Деградація батарей, %/рік',          min: 0.5,   max: 5,     step: 0.1,   fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'cyclesPerYear',      label: 'Циклів на рік',                      min: 50,    max: 365,   step: 5,     fmt: (v) => `${fN(v, 0)} цикл.` },
  { key: 'peakTariff',         label: 'Тариф розряду (пік), грн/кВт·год',  min: 5,     max: 30,    step: 0.5,   fmt: (v) => `${v.toFixed(1)} грн` },
  { key: 'offPeakTariff',      label: 'Тариф заряду (ніч), грн/кВт·год',   min: 1,     max: 12,    step: 0.1,   fmt: (v) => `${v.toFixed(1)} грн` },
  { key: 'ancillaryRatePerMWh',label: 'аРВЧ ставка, грн/МВт·год/рік',      min: 500000,max: 8000000,step: 100000,fmt: (v) => `${fN(v / 1e6, 2)} млн` },
  { key: 'bessCapex',          label: 'CAPEX УЗЕ, млн грн',                 min: 1e6,   max: 500e6, step: 0.5e6, fmt: (v) => `${fN(v / 1e6, 1)} млн` },
  { key: 'bessOpex',           label: 'OPEX УЗЕ, % від CAPEX/рік',          min: 0.5,   max: 6,     step: 0.1,   fmt: (v) => `${v.toFixed(1)}%` },
];

// ── Параметри СЕС+УЗЕ ─────────────────────────────────────────────────────
// Усі solar + усі bess + один додатковий
const COMBO_EXTRA_SLIDERS = [
  { key: 'solarToStorage', label: 'Частка надлишку СЕС → УЗЕ', min: 0, max: 1, step: 0.05, fmt: (v) => `${(v * 100).toFixed(0)}%` },
];

const CALC_TYPE_OPTIONS = [
  { key: 'solar',      label: '☀️ СЕС',       hint: 'Генерація та продаж/self-use' },
  { key: 'bess',       label: '🔋 УЗЕ',       hint: 'Арбітраж та аРВЧ' },
  { key: 'solar_bess', label: '⚡ СЕС + УЗЕ', hint: 'Комбінована система' },
];

export default function SolarParamsScreen() {
  const { P, dispatch, resetToDefaults, marketMeta } = useSolar();
  const showRateLimit = marketMeta?.apiStatus === 'rate_limited' || marketMeta?.errorStatus === 429;

  const setCalcType = (type) => dispatch({ type: 'SET_PARAM', key: 'calcType', value: type });
  const setParam = (key, value) => dispatch({ type: 'SET_PARAM', key, value });

  const currentType = P.calcType ?? 'solar';
  const showSolar   = currentType === 'solar' || currentType === 'solar_bess';
  const showBess    = currentType === 'bess'  || currentType === 'solar_bess';
  const showCombo   = currentType === 'solar_bess';

  return (
    <div className="screen active">
      <div className="page-wrap">
        <div className="title-row">
          <button className="reset-btn" onClick={resetToDefaults}>Скинути</button>
        </div>

        {/* ── Перемикач режиму ──────────────────────────────────── */}
        <div className="sec">Тип розрахунку</div>
        <div className="card">
          {showRateLimit && (
            <div className="ib amber" style={{ marginBottom: 12 }}>
              API limit (429). Показані локальні дані.
            </div>
          )}

          <div className="calc-type-switcher">
            {CALC_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`calc-type-btn${currentType === opt.key ? ' active' : ''}`}
                onClick={() => setCalcType(opt.key)}
              >
                <span className="calc-type-label">{opt.label}</span>
                <span className="calc-type-hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Назва проєкту ─────────────────────────────────────── */}
        <div className="sec">Налаштування проєкту</div>
        <div className="card">
          <div className="project-settings-row">
            <div className="project-field">
              <div className="project-field-label">Назва проєкту</div>
              <input
                type="text"
                className="project-input"
                value={P.projectName}
                onChange={(e) => setParam('projectName', e.target.value)}
                placeholder="Введіть назву проєкту..."
              />
            </div>
            <div className="project-meta-grid">
              <div className="project-chip">
                <span className="project-chip-label">Тип</span>
                <span className="project-chip-value">
                  {currentType === 'solar' && `СЕС · ${P.pvMW?.toFixed(1)} МВт`}
                  {currentType === 'bess'  && `УЗЕ · ${P.bessCapacityMWh?.toFixed(1)} МВт·год`}
                  {currentType === 'solar_bess' && `СЕС+УЗЕ · ${P.pvMW?.toFixed(1)}МВт / ${P.bessCapacityMWh?.toFixed(1)}МВт·год`}
                </span>
              </div>
              <div className="project-chip">
                <span className="project-chip-label">Оновлено</span>
                <span className="project-chip-value">{marketMeta.updated || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── СЕС-параметри ────────────────────────────────────── */}
        {showSolar && (
          <>
            <div className="sec">Параметри СЕС</div>
            <div className="card">
              {SOLAR_SLIDERS.map((slider) => (
                <NumericSliderField
                  key={slider.key}
                  slider={slider}
                  value={P[slider.key]}
                  onChange={setParam}
                />
              ))}
            </div>
          </>
        )}

        {/* ── УЗЕ-параметри ────────────────────────────────────── */}
        {showBess && (
          <>
            <div className="sec">Параметри УЗЕ (Установка Запасу Енергії)</div>
            <div className="card">
              {/* Перемикач аРВЧ */}
              <div className="toggle-row" style={{ marginBottom: 12 }}>
                <span className="toggle-label">Враховувати аРВЧ-контракт (плата за готовність)</span>
                <button
                  className={`toggle-btn${P.includeAncillary ? ' on' : ''}`}
                  onClick={() => setParam('includeAncillary', !P.includeAncillary)}
                >
                  {P.includeAncillary ? 'Увімк.' : 'Вимк.'}
                </button>
              </div>
              {BESS_SLIDERS.map((slider) => {
                if (slider.key === 'ancillaryRatePerMWh' && !P.includeAncillary) return null;
                return (
                  <NumericSliderField
                    key={slider.key}
                    slider={slider}
                    value={P[slider.key]}
                    onChange={setParam}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* ── Комбо-параметри ──────────────────────────────────── */}
        {showCombo && (
          <>
            <div className="sec">Параметри інтеграції СЕС → УЗЕ</div>
            <div className="card">
              {COMBO_EXTRA_SLIDERS.map((slider) => (
                <NumericSliderField
                  key={slider.key}
                  slider={slider}
                  value={P[slider.key]}
                  onChange={setParam}
                />
              ))}
              <div className="ib" style={{ marginTop: 8, fontSize: 11 }}>
                УЗЕ спочатку заряджається від надлишку сонячної генерації (безкоштовно),
                решта — дозаряд від мережі по нічному тарифу.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
