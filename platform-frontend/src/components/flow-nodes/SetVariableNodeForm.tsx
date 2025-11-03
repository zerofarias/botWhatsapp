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
    <label style={{ display: 'block', marginBottom: 12 }}>
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
          style={{ marginLeft: 8, display: 'block', marginTop: 6 }}
          placeholder="nombreVariable"
        />
      )}
    </label>
    <label style={{ display: 'block', marginBottom: 12 }}>
      Valor (usa $$variableName para reutilizar):
      <input
        type="text"
        value={value}
        onChange={(e) => onChange({ variable, value: e.target.value })}
        style={{ marginLeft: 8, display: 'block', marginTop: 6 }}
        placeholder="$$test1 o un valor fijo"
      />
    </label>
    {availableVariables && availableVariables.length > 0 && (
      <div style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
        <p style={{ margin: '6px 0', fontWeight: 'bold' }}>
          💡 Variables disponibles:
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {availableVariables.map((v) => (
            <code
              key={v.name}
              style={{
                background: '#fff3e0',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              $${v.name}
            </code>
          ))}
        </div>
      </div>
    )}
  </div>
);
