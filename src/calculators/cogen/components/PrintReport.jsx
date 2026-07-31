import React from 'react';
import { calc } from '../lib/calc.js';
import { fN, fM, fG } from '../../../shared/lib/formatters.js';

export default function PrintReport({ scenario }) {
  const { P, metrics } = scenario;
  const r = calc(P);
  const now = new Date(scenario.timestamp);

  return (
    <div className="print-report">
      <div className="print-header">
        <h1>КГУ 1 МВт · Бізнес-центр</h1>
        <h2>{scenario.name}</h2>
        <p className="print-date">
          {now.toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="print-section">
        <h3>Ключові показники</h3>
        <table className="print-table">
          <tbody>
            <tr>
              <td>Собівартість електроенергії</td>
              <td className={r.ecg < r.ep ? 'print-green' : 'print-red'}>{fG(r.ecg)}</td>
            </tr>
            <tr>
              <td>Ціна мережі</td>
              <td>{fG(r.ep)}</td>
            </tr>
            <tr>
              <td>Окупність</td>
              <td className={r.pb && r.pb < 5 ? 'print-green' : 'print-amber'}>
                {r.pb ? r.pb.toFixed(1) + ' років' : '∞'}
              </td>
            </tr>
            <tr>
              <td>Річний дохід</td>
              <td>{fM(r.tot)}</td>
            </tr>
            <tr>
              <td>Чистий прибуток / рік</td>
              <td className={r.net > 0 ? 'print-green' : 'print-red'}>
                {fM(r.net)}
              </td>
            </tr>
            <tr>
              <td>NPV за 15 років</td>
              <td className={r.cf[15] > 0 ? 'print-green' : 'print-red'}>
                {fN(r.cf[15], 1)} млн грн
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="print-section">
        <h3>Вхідні параметри</h3>
        <table className="print-table">
          <tbody>
            <tr><td>Ціна газу</td><td>{fN(P.gp)} грн/тис.м³</td></tr>
            <tr><td>РДН</td><td>{fN(P.rdm)} грн/МВт·год</td></tr>
            <tr><td>Передача (Укренерго)</td><td>{fN(P.trans)} грн/МВт·год</td></tr>
            <tr><td>Розподіл (Львівобленерго 2кл)</td><td>{fN(P.distr)} грн/МВт·год</td></tr>
            <tr><td>Кінцева ціна електроенергії для БЦ</td><td>{((P.rdm + P.trans + P.distr) / 1000).toFixed(2)} грн/кВт·год</td></tr>
            <tr><td>Ціна тепла в мережу</td><td>{fN(P.hp)} грн/Гкал</td></tr>
            <tr><td>Мережа бере тепло влітку</td><td>{P.sh === 0 ? 'Ні' : P.sh === 0.5 ? '50%' : 'Так'}</td></tr>
            <tr><td>Базове ел. навантаження</td><td>{P.elB.toFixed(2)} МВт</td></tr>
            <tr><td>Додаткове навантаження взимку</td><td>{P.vrfW.toFixed(2)} МВт</td></tr>
            <tr><td>Додаткове навантаження влітку</td><td>{P.vrfS.toFixed(2)} МВт</td></tr>
            <tr><td>CAPEX</td><td>{fM(P.capex, 0)}</td></tr>
            <tr><td>OPEX</td><td>{P.opex.toFixed(1)}% від CAPEX</td></tr>
            <tr><td>Доступність КГУ</td><td>{P.av.toFixed(2)} ({fN(r.h)} год/рік)</td></tr>
          </tbody>
        </table>
      </div>

      <div className="print-section">
        <h3>P&L — доходи та витрати</h3>
        <table className="print-table">
          <tbody>
            <tr><td>Економія на купівлі електрики</td><td className="print-green">{fM(r.eSav)}</td></tr>
            <tr><td>Продаж тепла в мережу</td><td className="print-green">{fM(r.hRev)}</td></tr>
            <tr><td>Економія ГВП</td><td className="print-green">{fM(r.hIS)}</td></tr>
            <tr className="print-total"><td>РАЗОМ ДОХОДИ</td><td className="print-green">{fM(r.tot)}</td></tr>
            <tr><td>Витрати на газ</td><td className="print-red">–{fM(r.gCost)}</td></tr>
            <tr><td>OPEX</td><td className="print-red">–{fM(r.opex)}</td></tr>
            <tr className="print-total">
              <td>ЧИСТИЙ ПРИБУТОК</td>
              <td className={r.net > 0 ? 'print-green' : 'print-red'}>{fM(r.net)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="print-section">
        <h3>Кумулятивний CF по роках</h3>
        <table className="print-table print-cf">
          <thead>
            <tr>
              {r.cf.map((_, i) => <th key={i}>{i === 0 ? 'Ст.' : 'р.' + i}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              {r.cf.map((v, i) => (
                <td key={i} className={v >= 0 ? 'print-green' : 'print-red'}>
                  {fN(v, 1)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="print-footer">
        <p>Згенеровано: КГУ Калькулятор · {now.toLocaleDateString('uk-UA')}</p>
      </div>
    </div>
  );
}


