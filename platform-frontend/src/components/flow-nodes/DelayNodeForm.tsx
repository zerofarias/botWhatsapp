import React from 'react';

export interface DelayNodeFormProps {
  seconds: number;
  onChange: (data: { seconds: number }) => void;
}

export const DelayNodeForm: React.FC<DelayNodeFormProps> = ({
  seconds,
  onChange,
}) => (
  <div
    style={{
      background: '#f3e5f5',
      padding: 16,
      borderRadius: 8,
      border: '2px solid #8e24aa',
    }}
  >
    <h3 style={{ margin: 0, color: '#8e24aa' }}>Espera</h3>
    <label>
      Segundos a esperar:
      <input
        type="number"
        min={1}
        value={seconds}
        onChange={(e) => onChange({ seconds: Number(e.target.value) })}
        style={{ width: 80, marginLeft: 8 }}
      />
    </label>
  </div>
);
