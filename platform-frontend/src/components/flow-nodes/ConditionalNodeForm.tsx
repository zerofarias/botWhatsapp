import React from 'react';
import type {
  ConditionalEvaluation,
  ConditionalOperator,
} from '../../views/FlowBuilder/types';

export interface ConditionalNodeFormProps {
  sourceVariable: string;
  evaluations: ConditionalEvaluation[];
  defaultLabel?: string;
  onChange: (data: {
    sourceVariable: string;
    evaluations: ConditionalEvaluation[];
    defaultLabel?: string;
  }) => void;
}

const OPERATORS: { value: ConditionalOperator; label: string }[] = [
  { value: 'EQUALS', label: 'Es igual a' },
  { value: 'NOT_EQUALS', label: 'Distinto de' },
  { value: 'CONTAINS', label: 'Contiene' },
  { value: 'STARTS_WITH', label: 'Comienza con' },
  { value: 'ENDS_WITH', label: 'Termina con' },
  { value: 'GREATER_THAN', label: 'Mayor que' },
  { value: 'LESS_THAN', label: 'Menor que' },
  { value: 'REGEX', label: 'Regex' },
];

export const ConditionalNodeForm: React.FC<ConditionalNodeFormProps> = ({
  sourceVariable,
  evaluations,
  defaultLabel,
  onChange,
}) => {
  const handleEvalChange = (
    index: number,
    patch: Partial<ConditionalEvaluation>
  ) => {
    const next = evaluations.map((evaluation, idx) =>
      idx === index ? { ...evaluation, ...patch } : evaluation
    );
    onChange({ sourceVariable, evaluations: next, defaultLabel });
  };

  const handleAddEvaluation = () => {
    const next: ConditionalEvaluation = {
      id: crypto.randomUUID(),
      label: 'Condición',
      operator: 'EQUALS',
      value: '',
      targetId: null,
    };
    onChange({
      sourceVariable,
      evaluations: [...evaluations, next],
      defaultLabel,
    });
  };

  const handleRemoveEvaluation = (id: string) => {
    onChange({
      sourceVariable,
      evaluations: evaluations.filter((evaluation) => evaluation.id !== id),
      defaultLabel,
    });
  };

  return (
    <div
      style={{
        background: '#fff3e0',
        padding: 16,
        borderRadius: 8,
        border: '2px solid #fb8c00',
        display: 'grid',
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, color: '#fb8c00' }}>Condicional</h3>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        Variable a evaluar
        <input
          type="text"
          value={sourceVariable}
          onChange={(e) =>
            onChange({
              sourceVariable: e.target.value,
              evaluations,
              defaultLabel,
            })
          }
          placeholder="flow_variable"
        />
      </label>
      <div style={{ display: 'grid', gap: 12 }}>
        {evaluations.map((evaluation, index) => (
          <div
            key={evaluation.id}
            style={{
              border: '1px solid #fb8c00',
              borderRadius: 6,
              padding: 12,
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <strong>Condición #{index + 1}</strong>
              <button
                type="button"
                onClick={() => handleRemoveEvaluation(evaluation.id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#d32f2f',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              Texto/etiqueta
              <input
                type="text"
                value={evaluation.label}
                onChange={(e) =>
                  handleEvalChange(index, { label: e.target.value })
                }
                placeholder="Es igual a 1"
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              Operador
              <select
                value={evaluation.operator}
                onChange={(e) =>
                  handleEvalChange(index, {
                    operator: e.target.value as ConditionalOperator,
                  })
                }
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              Valor
              <input
                type="text"
                value={evaluation.value}
                onChange={(e) =>
                  handleEvalChange(index, { value: e.target.value })
                }
                placeholder="1"
              />
            </label>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddEvaluation}
        style={{
          border: '1px dashed #fb8c00',
          padding: 8,
          borderRadius: 6,
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        + Agregar condición
      </button>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        Etiqueta para salida “Otro”
        <input
          type="text"
          value={defaultLabel ?? ''}
          onChange={(e) =>
            onChange({
              sourceVariable,
              evaluations,
              defaultLabel: e.target.value,
            })
          }
          placeholder="Otro..."
        />
      </label>
    </div>
  );
};
