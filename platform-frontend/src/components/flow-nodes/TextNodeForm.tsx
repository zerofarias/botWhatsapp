import React from 'react';
import type { FlowVariableType } from '../../views/FlowBuilder/types';
import {
  extractVariableReferences,
  validateVariableReferences,
} from '../../views/FlowBuilder/utils/variableTracker';

export interface AvailableVariableUI {
  name: string;
  createdByNodeId?: string;
  createdByNodeType?: string;
  createdByNodeLabel?: string;
}

export interface TextNodeFormProps {
  value: string;
  waitForResponse: boolean;
  variableName?: string;
  variableType?: FlowVariableType;
  audioModel?: string | null;
  imageModel?: string | null;
  availableVariables?: AvailableVariableUI[];
  onChange: (data: {
    value: string;
    waitForResponse: boolean;
    variableName?: string;
    variableType?: FlowVariableType;
    audioModel?: string | null;
    imageModel?: string | null;
  }) => void;
}

const VARIABLE_TYPES: FlowVariableType[] = [
  'STRING',
  'NUMBER',
  'BOOLEAN',
  'JSON',
];
const AUDIO_MODELS = [
  { value: 'none', label: 'Sin procesamiento' },
  { value: 'whisper-1', label: 'whisper-1' },
  { value: 'whisper-large', label: 'whisper-large' },
];
const IMAGE_MODELS = [
  { value: 'none', label: 'Sin procesamiento' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: 'gpt-4o', label: 'gpt-4o' },
];

export const TextNodeForm: React.FC<TextNodeFormProps> = ({
  value,
  waitForResponse,
  variableName,
  variableType = 'STRING',
  audioModel = 'none',
  imageModel = 'none',
  availableVariables = [],
  onChange,
}) => {
  const normalizedVariable = (variableName ?? '').trim();
  const variableError = waitForResponse && normalizedVariable.length === 0;

  // Validar referencias a variables en el mensaje
  const variableReferences = extractVariableReferences(value);
  const availableVarNames = availableVariables.map((v) => v.name);
  const { valid: referencesValid, missingVariables } =
    validateVariableReferences(value, availableVarNames);

  const handleChange = (patch: Partial<TextNodeFormProps>) => {
    onChange({
      value,
      waitForResponse,
      variableName,
      variableType,
      audioModel,
      imageModel,
      ...patch,
    });
  };

  const handleWaitToggle = (checked: boolean) => {
    handleChange({
      waitForResponse: checked,
      ...(checked
        ? {}
        : {
            variableName: '',
            variableType: 'STRING',
            audioModel: null,
            imageModel: null,
          }),
    });
  };

  const previewMessage =
    value && value.trim().length
      ? value
      : 'Escribe el contenido del mensaje que recibirán tus usuarios.';

  return (
    <div className="text-node-form">
      <div className="text-node-form__preview-card">
        <div className="text-node-form__preview-header">
          <span className="text-node-form__preview-icon">🟢</span>
          <span className="text-node-form__preview-title">
            Mensaje de texto
          </span>
        </div>
        <p className="text-node-form__preview-message">{previewMessage}</p>
        <div className="text-node-form__preview-footer">
          {waitForResponse ? (
            <span>
              Esperando respuesta →
              <strong>
                {normalizedVariable.length
                  ? ` ${normalizedVariable}`
                  : ' define una variable'}
              </strong>
            </span>
          ) : (
            <span>No espera respuesta</span>
          )}
        </div>
      </div>

      <div className="text-node-form__field">
        <label htmlFor="text-node-message">Texto del mensaje</label>
        <textarea
          id="text-node-message"
          value={value}
          onChange={(e) => handleChange({ value: e.target.value })}
          rows={6}
        />
        {availableVariables && availableVariables.length > 0 && (
          <div className="text-node-form__variables-helper">
            <p className="text-node-form__variables-title">
              💡 Variables disponibles: usa para insertar
            </p>
            <div className="text-node-form__variables-list">
              {availableVariables.map((v) => (
                <span key={v.name} className="text-node-form__variable-tag">
                  {'{'}
                  {'{'}
                  {v.name}
                  {'}'}
                  {'}'}
                  <small>de {v.createdByNodeLabel}</small>
                </span>
              ))}
            </div>
            {missingVariables.length > 0 && (
              <div className="text-node-form__variables-error">
                ⚠️ Variables no disponibles: {missingVariables.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-node-form__divider" />

      <label className="text-node-form__toggle">
        <input
          type="checkbox"
          checked={waitForResponse}
          onChange={(e) => handleWaitToggle(e.target.checked)}
        />
        <div>
          <strong>Esperar respuesta del usuario</strong>
          <p>Guarda la próxima respuesta en una variable del contexto.</p>
        </div>
      </label>

      {waitForResponse && (
        <div className="text-node-form__grid">
          <div className="text-node-form__field">
            <label htmlFor="text-node-variable">Nombre de la variable</label>
            <input
              id="text-node-variable"
              type="text"
              placeholder="flow_consultaCP"
              value={variableName ?? ''}
              onChange={(e) => handleChange({ variableName: e.target.value })}
            />
            {variableError && (
              <span className="text-node-form__error">
                Debes definir un nombre para almacenar la respuesta.
              </span>
            )}
          </div>

          <div className="text-node-form__field">
            <label htmlFor="text-node-variable-type">Tipo de variable</label>
            <select
              id="text-node-variable-type"
              value={variableType}
              onChange={(e) =>
                handleChange({
                  variableType: e.target.value as FlowVariableType,
                })
              }
            >
              {VARIABLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="text-node-form__field">
            <label htmlFor="text-node-audio-model">Modelo de audio</label>
            <select
              id="text-node-audio-model"
              value={audioModel ?? 'none'}
              onChange={(e) =>
                handleChange({
                  audioModel: e.target.value === 'none' ? null : e.target.value,
                })
              }
            >
              {AUDIO_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-node-form__field">
            <label htmlFor="text-node-image-model">Modelo de imagen</label>
            <select
              id="text-node-image-model"
              value={imageModel ?? 'none'}
              onChange={(e) =>
                handleChange({
                  imageModel: e.target.value === 'none' ? null : e.target.value,
                })
              }
            >
              {IMAGE_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
