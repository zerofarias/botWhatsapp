import React from 'react';

export interface AvailableVariable {
  name: string;
  createdByNodeId?: string;
  createdByNodeType?: string;
  createdByNodeLabel?: string;
}

export interface DataLogNodeFormProps {
  dataType: string;
  description?: string;
  availableVariables?: AvailableVariable[];
  onChange: (data: { dataType: string; description?: string }) => void;
}

const DATA_TYPES = [
  { value: 'pedido', label: '📦 Pedido', color: '#ff6b6b' },
  {
    value: 'consulta_precio',
    label: '💰 Consulta de Precio',
    color: '#4ecdc4',
  },
  { value: 'consulta_general', label: '❓ Consulta General', color: '#45b7d1' },
  { value: 'otro', label: '🔹 Otro', color: '#95a5a6' },
];

export const DataLogNodeForm: React.FC<DataLogNodeFormProps> = ({
  dataType,
  description = '',
  availableVariables = [],
  onChange,
}) => {
  const selectedType = DATA_TYPES.find((t) => t.value === dataType);
  const bgColor = selectedType?.color || '#95a5a6';

  return (
    <div
      style={{
        background: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        border: `2px solid ${bgColor}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 20, marginRight: 8 }}>💾</span>
        <h3 style={{ margin: 0, color: bgColor }}>Guardar Datos</h3>
      </div>

      <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px 0' }}>
        Captura todas las variables actuales y las guarda en el panel de
        órdenes.
      </p>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <span
          style={{
            fontWeight: 'bold',
            color: '#333',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Tipo de Dato:
        </span>
        <select
          value={dataType}
          onChange={(e) => onChange({ dataType: e.target.value, description })}
          style={{
            width: '100%',
            padding: 8,
            borderRadius: 4,
            border: `1px solid ${bgColor}`,
            fontSize: 13,
            fontWeight: '500',
            cursor: 'pointer',
            background: 'white',
          }}
        >
          {DATA_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'block' }}>
        <span
          style={{
            fontWeight: 'bold',
            color: '#333',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Descripción (opcional):
        </span>
        <textarea
          value={description}
          onChange={(e) => onChange({ dataType, description: e.target.value })}
          rows={3}
          style={{
            width: '100%',
            padding: 8,
            borderRadius: 4,
            border: `1px solid ${bgColor}`,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
          placeholder="Agrega una descripción o contexto para este registro..."
        />
      </label>

      <div
        style={{
          marginTop: 12,
          padding: 10,
          background: '#e8f5e9',
          borderRadius: 4,
          fontSize: 11,
          color: '#1b5e20',
          borderLeft: `4px solid #4caf50`,
        }}
      >
        <strong>✅ Cómo funciona:</strong>
        <ul style={{ margin: '6px 0', paddingLeft: 16 }}>
          <li>Se capturan TODAS las variables del contexto actual</li>
          <li>Se guarda el tipo de dato seleccionado</li>
          <li>
            Los datos aparecen en el panel de órdenes clasificados por tipo
          </li>
        </ul>
      </div>

      {availableVariables && availableVariables.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: '#e3f2fd',
            borderRadius: 4,
            border: '1px solid #2196f3',
          }}
        >
          <strong
            style={{ color: '#1976d2', display: 'block', marginBottom: 8 }}
          >
            📦 Variables que se guardarán ({availableVariables.length}):
          </strong>
          <div
            style={{
              fontSize: 11,
              color: '#333',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {availableVariables.map((variable) => (
              <div
                key={variable.name}
                style={{
                  marginBottom: 6,
                  padding: 6,
                  background: 'white',
                  borderRadius: 3,
                  border: '1px solid #bbdefb',
                }}
              >
                <div style={{ fontWeight: '600', color: '#1976d2' }}>
                  ${variable.name}
                </div>
                {variable.createdByNodeType && (
                  <div style={{ fontSize: 10, color: '#666' }}>
                    Creada por:{' '}
                    <span style={{ fontStyle: 'italic' }}>
                      {variable.createdByNodeType}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
