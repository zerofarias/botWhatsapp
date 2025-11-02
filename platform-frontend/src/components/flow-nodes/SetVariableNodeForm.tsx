import React from 'react';

export interface SetVariableNodeFormProps {
  variable: string;
  value: string;
  onChange: (data: { variable: string; value: string }) => void;
}

export const SetVariableNodeForm: React.FC<SetVariableNodeFormProps> = ({
  variable,
  value,
  onChange,
}) => (
  <div
    style={{
      background: '#e8f5e9',
      padding: 16,
      borderRadius: 8,
      border: '2px solid #43a047',
    }}
  >
    <h3 style={{ margin: 0, color: '#43a047' }}>Setear Variable</h3>
    <label>
      Nombre de variable:
      <input
        type="text"
        value={variable}
        onChange={(e) => onChange({ variable: e.target.value, value })}
        style={{ marginLeft: 8 }}
        placeholder="nombreVariable"
      />
    </label>
    <label style={{ marginLeft: 16 }}>
      Valor:
      <input
        type="text"
        value={value}
        onChange={(e) => onChange({ variable, value: e.target.value })}
        style={{ marginLeft: 8 }}
        placeholder="valor"
      />
    </label>
  </div>
);
