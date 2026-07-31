import React from 'react';
import { useCalc } from '../context/CogenContext.jsx';
import { fN } from '../../../shared/lib/formatters.js';

export default function BalanceScreen() {
  const { P, result } = useCalc();

  return (
    <div className="screen active">
      <div className="page-wrap">
        <div className="two-col-grid">
          <div>
            <div className="sec">Тепловий баланс</div>
            <div className="ib blue">
              <b>Тепло КГУ:</b> ГВП 0,15 МВт + мережа {result.thG.toFixed(2)} МВт.
              Влітку мережа бере: <b>{P.sh === 0 ? 'нічого' : P.sh === 0.5 ? '50%' : 'повністю'}</b>.
              Річний продаж: <b>{fN(result.gcT, 0)} Гкал</b>.
            </div>
            <div className="card" style={{ padding: 12 }}>
              <table className="bt">
                <thead>
                  <tr><th>Показник</th><th>Зима</th><th>Літо</th><th>Рік</th></tr>
                </thead>
                <tbody>
                  <tr><td>Виробництво КГУ, МВт</td><td>{P.thMW.toFixed(2)}</td><td>{P.thMW.toFixed(2)}</td><td>{P.thMW.toFixed(2)}</td></tr>
                  <tr><td>ГВП (внутр.), МВт</td><td>0,15</td><td>0,15</td><td>0,15</td></tr>
                  <tr>
                    <td>В мережу, МВт</td>
                    <td style={{ color: 'var(--green)' }}>{result.thG.toFixed(2)}</td>
                    <td style={{ color: 'var(--green)' }}>{(result.thG * P.sh).toFixed(2)}</td>
                    <td style={{ color: 'var(--green)' }}>{result.h > 0 ? (((result.gcW + result.gcS) / result.h) * 1.163).toFixed(2) : '0.00'}</td>
                  </tr>
                  <tr className="tot">
                    <td>В мережу, тис. Гкал</td>
                    <td>{fN(result.gcW / 1000, 1)}</td>
                    <td>{fN(result.gcS / 1000, 1)}</td>
                    <td>{fN(result.gcT / 1000, 1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mg" style={{ marginTop: 4 }}>
              <div className="m">
                <div className="ml">тепло в мережу</div>
                <div className="mv cg">{fN(result.gcT, 0)}</div>
                <div className="ms">Гкал / рік</div>
              </div>
              <div className="m">
                <div className="ml">дохід від тепла</div>
                <div className="mv cg">{fN(result.hRev / 1e6, 1)}</div>
                <div className="ms">млн грн / рік</div>
              </div>
            </div>
          </div>

          <div>
            <div className="sec">Електричний баланс</div>
            <div className={`ib ${result.iW > 0 ? 'amber' : 'blue'}`}>
              <b>Зима:</b> {result.lW.toFixed(2)} МВт
              {result.iW > 0 ? <><span> → </span><b>дефіцит {result.iW.toFixed(2)} МВт з мережі</b></> : ' → КГУ покриває повністю'}
              . <b>Літо:</b> {result.lS.toFixed(2)} МВт
              {result.iS > 0 ? ` → дефіцит ${result.iS.toFixed(2)} МВт` : ` → надлишок ${result.sS.toFixed(2)} МВт`}.
            </div>
            <div className="card" style={{ padding: 12 }}>
              <table className="bt">
                <thead>
                  <tr><th>Показник</th><th>Зима</th><th>Літо</th><th>Рік</th></tr>
                </thead>
                <tbody>
                  <tr><td>Виробництво КГУ, МВт</td><td>{P.elMW.toFixed(2)}</td><td>{P.elMW.toFixed(2)}</td><td>{P.elMW.toFixed(2)}</td></tr>
                  <tr>
                    <td>Навантаження (база + сезонне)</td>
                    <td>{result.lW.toFixed(2)}</td>
                    <td>{result.lS.toFixed(2)}</td>
                    <td>{result.h > 0 ? ((result.lW * result.hW + result.lS * result.hS) / result.h).toFixed(2) : '0.00'}</td>
                  </tr>
                  <tr>
                    <td>КГУ покриває, МВт</td>
                    <td style={{ color: 'var(--green)' }}>{result.cW.toFixed(2)}</td>
                    <td style={{ color: 'var(--green)' }}>{result.cS.toFixed(2)}</td>
                    <td style={{ color: 'var(--green)' }}>{result.h > 0 ? (result.ks / result.h / 1000).toFixed(2) : '0.00'}</td>
                  </tr>
                  <tr>
                    <td>З мережі, МВт</td>
                    <td style={{ color: result.iW > 0 ? 'var(--red)' : 'var(--text3)' }}>{result.iW > 0 ? result.iW.toFixed(2) : '—'}</td>
                    <td style={{ color: result.iS > 0 ? 'var(--red)' : 'var(--text3)' }}>{result.iS > 0 ? result.iS.toFixed(2) : '—'}</td>
                    <td>—</td>
                  </tr>
                  <tr className="tot">
                    <td>Збережено, млн кВт·год</td>
                    <td>{fN((result.cW * result.hW) / 1000, 1)}</td>
                    <td>{fN((result.cS * result.hS) / 1000, 1)}</td>
                    <td style={{ color: 'var(--green)' }}>{fN(result.ks / 1e6, 1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mg" style={{ marginTop: 4 }}>
              <div className="m">
                <div className="ml">річна генерація</div>
                <div className="mv cb">{fN(result.kGen / 1e6, 2)}</div>
                <div className="ms">млн кВт·год</div>
              </div>
              <div className="m">
                <div className="ml">економія на ел. енергії</div>
                <div className="mv cg">{fN(result.eSav / 1e6, 1)}</div>
                <div className="ms">млн грн / рік</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
