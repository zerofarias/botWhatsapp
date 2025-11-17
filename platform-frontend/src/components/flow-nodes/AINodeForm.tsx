import React from 'react';

export interface AINodeFormProps {
  prompt: string;
  model: string;
  responseVariableName?: string | null;
  modelOptions: string[];
  availableVariables?: string[];
  onChange: (data: {
    prompt: string;
    model: string;
    responseVariableName?: string | null;
  }) => void;
}

export const AINodeForm: React.FC<AINodeFormProps> = ({
  prompt,
  model,
  responseVariableName,
  modelOptions,
  availableVariables = [],
  onChange,
}) => {
  const normalizedVariable = responseVariableName ?? '';
  const variableError = normalizedVariable.trim().length === 0;
  const [copiedVariable, setCopiedVariable] = React.useState<string | null>(
    null
  );
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const normalizedVariables = React.useMemo(
    () =>
      availableVariables
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name)),
    [availableVariables]
  );

  React.useEffect(
    () => () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    },
    []
  );

  const handleVariableCopy = React.useCallback((name: string) => {
    const value = `$$${name}`;
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
    } else if (typeof document !== 'undefined') {
      const tempArea = document.createElement('textarea');
      tempArea.value = value;
      tempArea.style.position = 'fixed';
      tempArea.style.left = '-9999px';
      document.body.appendChild(tempArea);
      tempArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempArea);
    }
    setCopiedVariable(name);
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedVariable(null);
    }, 2000);
  }, []);

  return (
    <div
      style={{
        background: '#f3e5f5',
        padding: 16,
        borderRadius: 8,
        border: '2px solid #7b1fa2',
        display: 'grid',
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, color: '#7b1fa2' }}>Consulta IA</h3>
      <label style={{ display: 'grid', gap: 4 }}>
        Instrucción / prompt
        <textarea
          value={prompt}
          onChange={(e) =>
            onChange({ prompt: e.target.value, model, responseVariableName })
          }
          style={{ width: '100%', borderRadius: 8, padding: 8 }}
          rows={4}
          placeholder="Ej: Resume el pedido usando un tono cordial"
        />
      </label>
      <label style={{ display: 'grid', gap: 4 }}>
        Guardar respuesta en la variable
        <input
          type="text"
          value={responseVariableName ?? ''}
          onChange={(e) =>
            onChange({
              prompt,
              model,
              responseVariableName: e.target.value,
            })
          }
          style={{ width: '100%', borderRadius: 8, padding: 8 }}
          placeholder="Ej: flow_resumenIA"
        />
        {variableError && (
          <small style={{ color: '#c026d3' }}>
            Define el nombre de la variable para reutilizar la respuesta.
          </small>
        )}
      </label>
      {normalizedVariables.length > 0 && (
        <div className="ai-node-form__variables">
          <div className="ai-node-form__variables-header">
            <span>Variables disponibles ({normalizedVariables.length})</span>
            <small className="ai-node-form__copy-hint">
              {copiedVariable
                ? `Copiaste $$${copiedVariable}`
                : 'Haz clic para copiarlas'}
            </small>
          </div>
          <div className="ai-node-form__variables-grid">
            {normalizedVariables.map((name) => (
              <button
                key={name}
                type="button"
                className={`ai-node-form__variable-pill${
                  copiedVariable === name
                    ? ' ai-node-form__variable-pill--copied'
                    : ''
                }`}
                onClick={() => handleVariableCopy(name)}
              >
                $$ {name}
              </button>
            ))}
          </div>
        </div>
      )}
      <label style={{ display: 'grid', gap: 4 }}>
        Modelo
        <select
          value={model}
          onChange={(e) =>
            onChange({
              prompt,
              model: e.target.value,
              responseVariableName,
            })
          }
          style={{ borderRadius: 8, padding: 8 }}
        >
          {modelOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
