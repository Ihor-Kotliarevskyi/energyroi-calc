import React from 'react';
import { useSolar } from '../context/SolarContext.jsx';
import { fN, fM } from '../../../shared/lib/formatters.js';

// Таблиця для режиму СЕС / СЕС+УЗЕ — по роках генерації
function SolarYearlyTable({ result }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <table className="st">
        <thead>
          <tr><th>Рік</th><th>Генерація, кВт·год</th><th>Net, млн грн</th><th>Деградація</th></tr>
        </thead>
        <tbody>
          {result.yearly.map((y) => (
            <tr key={y.year}>
              <td>{y.year}</td>
              <td>{fN(y.gen, 0)}</td>
              <td>{fM(y.net, 2)}</td>
              <td>{fN((1 - y.degFactor) * 100, 2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Таблиця для режиму УЗЕ — по роках (цикли, деградація батарей)
function BessYearlyTable({ result }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <table className="st">
        <thead>
          <tr><th>Рік</th><th>Розряд, кВт·год</th><th>Арбітраж, млн</th><th>аРВЧ, млн</th><th>Net, млн</th><th>Деградація</th></tr>
        </thead>
        <tbody>
          {result.yearly.map((y) => (
            <tr key={y.year}>
              <td>{y.year}</td>
              <td>{fN(y.dischargeKwh, 0)}</td>
              <td>{fM(y.arbitrage, 2)}</td>
              <td>{fM(y.ancillary, 2)}</td>
              <td>{fM(y.net, 2)}</td>
              <td>{fN((1 - y.degFactor) * 100, 2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SolarGenerationScreen() {
  const { result } = useSolar();
  const isBess = result.calcType === 'bess';
  const isCombo = result.calcType === 'solar_bess';

  const totalDischarge = isBess
    ? result.yearly.reduce((sum, y) => sum + y.dischargeKwh, 0)
    : null;
  const totalGen = !isBess
    ? result.yearly.reduce((sum, y) => sum + y.gen, 0)
    : null;

  return (
    <div className="screen active">
      <div className="page-wrap">
        <div className="mg">
          {isBess ? (
            <>
              <div className="m">
                <div className="ml">Розряд / рік 1</div>
                <div className="mv cb">{fN(result.dischargeKwh, 0)}</div>
                <div className="ms">кВт·год</div>
              </div>
              <div className="m">
                <div className="ml">Розряд / 15 років</div>
                <div className="mv cb">{fN(totalDischarge, 0)}</div>
                <div className="ms">Сукупний розряд</div>
              </div>
            </>
          ) : (
            <>
              <div className="m">
                <div className="ml">1-й рік</div>
                <div className="mv cb">{fN(result.year1Gen, 0)}</div>
                <div className="ms">кВт·год</div>
              </div>
              <div className="m">
                <div className="ml">15 років</div>
                <div className="mv cb">{fN(totalGen, 0)}</div>
                <div className="ms">Сукупна генерація</div>
              </div>
            </>
          )}
        </div>

        <div className="sec">{isBess ? 'Цикли по роках' : 'Генерація по роках'}</div>
        {isBess
          ? <BessYearlyTable result={result} />
          : <SolarYearlyTable result={result} />
        }
      </div>
    </div>
  );
}
