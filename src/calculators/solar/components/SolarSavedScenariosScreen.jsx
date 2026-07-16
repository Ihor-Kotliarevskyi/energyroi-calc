import React, { useCallback, useRef, useState } from 'react';
import { useSolar } from '../context/SolarContext.jsx';
import { fG, fM, fN } from '../../../shared/lib/formatters.js';
import Icon from '../../../shared/components/Icon.jsx';
import {
  deleteScenario,
  downloadScenarioJSON,
  exportToCSV,
  exportToJSON,
  getScenarios,
  importFromJSON,
  saveScenario,
} from '../../../shared/lib/scenarioStorage.js';
import { printSolarScenarioReport } from '../lib/printReport.js';

export default function SolarSavedScenariosScreen({ onLoadScenario }) {
  const { P, result, dispatch } = useSolar();
  const [scenarios, setScenarios] = useState(() => getScenarios('solar'));
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const refresh = useCallback(() => setScenarios(getScenarios('solar')), []);
  const defaultScenarioName = P.projectName?.trim?.() || '';

  const buildCurrentScenario = () => ({
    name: 'Поточний сценарій',
    timestamp: Date.now(),
    P,
    metrics: {
      year1Gen: result.year1Gen,
      pb: result.pb,
      totalRevenue: result.totalRevenue,
      net: result.net,
      lcoe: result.lcoe,
    },
  });

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Вкажіть назву сценарію.');
      return;
    }

    saveScenario(trimmed, P, result, 'solar');
    setName('');
    setError('');
    setShowSaveModal(false);
    refresh();
  };

  const handleApply = (scenario) => {
    dispatch({ type: 'LOAD_STATE', state: scenario.P });
    onLoadScenario?.();
  };

  const handleDelete = (id) => {
    deleteScenario(id, 'solar');
    refresh();
  };

  const handlePrint = (scenario) => {
    try {
      printSolarScenarioReport(scenario);
      setError('');
    } catch (err) {
      setError(err?.message || 'Не вдалося відкрити вікно друку.');
    }
  };

  const handlePrintCurrent = () => handlePrint(buildCurrentScenario());
  const handleImportClick = () => fileInputRef.current?.click();

  const openSaveModal = () => {
    setName(defaultScenarioName);
    setError('');
    setShowSaveModal(true);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importFromJSON(text, 'solar');
      refresh();
      setError('');
    } catch (err) {
      setError(err?.message || 'Не вдалося імпортувати JSON.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="screen active">
      <div className="page-wrap">
        {showSaveModal && (
          <div className="save-modal card">
            <input
              className="save-input"
              type="text"
              placeholder="Назва сценарію..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn-primary" onClick={handleSave}>Зберегти</button>
              <button className="btn-secondary" onClick={() => {
                setShowSaveModal(false);
                setName('');
                setError('');
              }}
              >
                Скасувати
              </button>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
              LCOE: {fG(result.lcoe, 2)} · Окупність: {result.pb ? `${result.pb.toFixed(1)} р.` : '∞'} · Net: {fM(result.net, 2)}
            </div>
          </div>
        )}

        <div className="card">
          <div className="saved-toolbar">
            <button className="btn-primary" onClick={openSaveModal}>Зберегти сценарій</button>
            <button className="btn-export" onClick={() => exportToJSON(scenarios, 'solar')}>JSON</button>
            <button className="btn-export" onClick={() => exportToCSV(scenarios, 'solar')}>CSV</button>
            <button className="btn-export" onClick={handleImportClick}>Імпорт JSON</button>
            <button className="btn-export" onClick={handlePrintCurrent}>Друк</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>

        {scenarios.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon"><Icon name="files" /></div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Збережених сценаріїв ще немає</div>
          </div>
        ) : (
          scenarios.map((scenario) => (
            <div key={scenario.id} className="card sc-saved-card">
              <div className="saved-card-head">
                <div className="saved-card-title-wrap">
                  <div className="sc-saved-name">{scenario.name}</div>
                  <div className="sc-saved-date">{new Date(scenario.timestamp).toLocaleString('uk-UA')}</div>
                </div>
                <div className="saved-card-tools">
                  <button className="btn-icon" title="Завантажити JSON" onClick={() => downloadScenarioJSON(scenario, 'solar')}><Icon name="download" /></button>
                  <button className="btn-icon" title="Друк" onClick={() => handlePrint(scenario)}><Icon name="print" /></button>
                  <button className="btn-icon btn-icon-danger" title="Видалити" onClick={() => handleDelete(scenario.id)}><Icon name="trash" /></button>
                </div>
              </div>
              <div className="sc-saved-metrics">
                <div className="sc-saved-metric">
                  <span className="sc-saved-metric-label">Тип</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
                    {scenario.P?.calcType === 'bess' ? '🔋 УЗЕ' : scenario.P?.calcType === 'solar_bess' ? '⚡ СЕС+УЗЕ' : '☀️ СЕС'}
                  </span>
                </div>
                <div className="sc-saved-metric"><span className="sc-saved-metric-label">Окупність</span><span>{scenario.metrics.pb ? `${scenario.metrics.pb.toFixed(1)} р.` : '∞'}</span></div>
                <div className="sc-saved-metric"><span className="sc-saved-metric-label">Net</span><span>{fM(scenario.metrics.net, 2)}</span></div>
              </div>
              <div className="saved-card-actions">
                <button className="btn-secondary" onClick={() => handleApply(scenario)}>Застосувати в калькулятор</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
