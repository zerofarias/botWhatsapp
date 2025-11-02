import React from 'react';

export interface AvailableVariableUI {
  name: string;
  createdByNodeId?: string;
  createdByNodeType?: string;
  createdByNodeLabel?: string;
}

export interface SetVariableNodeFormProps {
  variable: string;
  value: string;
  availableVariables?: AvailableVariableUI[];
  onChange: (data: { variable: string; value: string }) => void;
}

export const SetVariableNodeForm: React.FC<SetVariableNodeFormProps> = ({
  variable,
  value,
  availableVariables = [],
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
      {availableVariables && availableVariables.length > 0 ? (
        <select
          value={variable}
          onChange={(e) => onChange({ variable: e.target.value, value })}
          style={{ marginLeft: 8, padding: '6px', borderRadius: '4px' }}
        >
          <option value="">-- Selecciona una variable --</option>
          {availableVariables.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.createdByNodeType})
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={variable}
          onChange={(e) => onChange({ variable: e.target.value, value })}
          style={{ marginLeft: 8 }}
          placeholder="nombreVariable"
        />
      )}
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
