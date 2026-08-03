import React, { useEffect, useState } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function decimalsFromStep(step) {
  const raw = String(step ?? 1);
  const dotIndex = raw.indexOf('.');
  return dotIndex === -1 ? 0 : raw.length - dotIndex - 1;
}

export default function NumericSliderField({ slider, value, onChange }) {
  const [draftValue, setDraftValue] = useState(value.toFixed(2) ?? '');

  useEffect(() => {
    setDraftValue(value.toFixed(2) ?? '');
  }, [value]);

  const commitValue = (rawValue) => {
    const normalized = String(rawValue).replace(',', '.').trim();
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setDraftValue(String(value ?? ''));
      return;
    }

    const next = clamp(parsed, slider.min, slider.max);
    const decimals = decimalsFromStep(slider.step);
    const rounded = Number(next.toFixed(decimals));
    onChange(slider.key, rounded);
    setDraftValue(String(rounded));
  };

  const shiftValue = (direction) => {
    const next = clamp((value ?? 0) + slider.step * direction, slider.min, slider.max);
    const decimals = decimalsFromStep(slider.step);
    onChange(slider.key, Number(next.toFixed(decimals)));
  };

  return (
    <div className="sr">
      <div className="sr-head">
        <span className="sr-label">
          {slider.label}
          {slider.tag && (
            <span className="tag" style={{ background: `${slider.tc}22`, color: slider.tc }}>
              {slider.tag}
            </span>
          )}
        </span>
        <span className="sr-val">{value !== undefined ? slider.fmt(value) : '—'}</span>
      </div>

      <div className="sr-inputs">
        <button type="button" className="step-btn" onClick={() => shiftValue(-1)} aria-label={`Зменшити ${slider.label}`}>-</button>
        <input
          type="number"
          className="step-input"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          inputMode="decimal"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={() => commitValue(draftValue)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
        />
        <button type="button" className="step-btn" onClick={() => shiftValue(1)} aria-label={`Збільшити ${slider.label}`}>+</button>
      </div>

      <input
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        onInput={(e) => onChange(slider.key, Number(e.currentTarget.value))}
      />
    </div>
  );
}
