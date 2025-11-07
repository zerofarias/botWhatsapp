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
  variableType?: 'string' | 'number' | 'boolean';
  availableVariables?: AvailableVariableUI[];
  onChange: (data: {
    variable: string;
    value: string;
    variableType?: 'string' | 'number' | 'boolean';
  }) => void;
}

export const SetVariableNodeForm: React.FC<SetVariableNodeFormProps> = ({
  variable,
  value,
  variableType = 'string',
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
    <h3 style={{ margin: 0, color: '#43a047' }}>Crear Nueva Variable</h3>

    <label style={{ display: 'block', marginBottom: 12, marginTop: 12 }}>
      <strong>Nombre de variable:</strong>
      <input
        type="text"
        value={variable}
        onChange={(e) =>
          onChange({ variable: e.target.value, value, variableType })
        }
        style={{
          marginLeft: 8,
          display: 'block',
          marginTop: 6,
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
        placeholder="Ej: pedido, nombre_cliente, cantidad"
      />
      <small style={{ display: 'block', marginTop: 4, color: '#666' }}>
        Usa caracteres alfanuméricos y guiones bajos. No uses espacios.
      </small>
    </label>

    <label style={{ display: 'block', marginBottom: 12 }}>
      <strong>Valor asignado:</strong>
      <input
        type="text"
        value={value}
        onChange={(e) =>
          onChange({ variable, value: e.target.value, variableType })
        }
        style={{
          marginLeft: 8,
          display: 'block',
          marginTop: 6,
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
        placeholder="Ej: true, 100, o usa ${nombre_var} para referencia"
      />
      <small style={{ display: 'block', marginTop: 4, color: '#666' }}>
        Valor fijo o referencia a otra variable usando {'${variable_name}'}
      </small>
    </label>

    <label style={{ display: 'block', marginBottom: 12 }}>
      <strong>Tipo de variable:</strong>
      <select
        value={variableType}
        onChange={(e) =>
          onChange({
            variable,
            value,
            variableType: e.target.value as 'string' | 'number' | 'boolean',
          })
        }
        style={{
          marginLeft: 8,
          display: 'block',
          marginTop: 6,
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
      >
        <option value="string">String (texto)</option>
        <option value="number">Number (número)</option>
        <option value="boolean">Boolean (verdadero/falso)</option>
      </select>
    </label>

    {availableVariables && availableVariables.length > 0 && (
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fff3e0',
          borderRadius: 4,
        }}
      >
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: 12 }}>
          💡 Variables disponibles para referencia:
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {availableVariables.map((v) => (
            <code
              key={v.name}
              style={{
                background: '#ffffff',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                border: '1px solid #ffb74d',
              }}
            >
              {`${v.name}`}
            </code>
          ))}
        </div>
      </div>
    )}
  </div>
);
