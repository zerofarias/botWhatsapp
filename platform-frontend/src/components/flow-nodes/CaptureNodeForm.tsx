import React from 'react';
import type { FlowVariableType } from '../../views/FlowBuilder/types';

export interface CaptureNodeFormProps {
  message: string;
  variableName?: string;
  variableType?: FlowVariableType;
  audioModel?: string | null;
  imageModel?: string | null;
  onChange: (data: {
    message: string;
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

export const CaptureNodeForm: React.FC<CaptureNodeFormProps> = ({
  message,
  variableName,
  variableType = 'STRING',
  audioModel = 'none',
  imageModel = 'none',
  onChange,
}) => {
  const normalizedVariable = (variableName ?? '').trim();
  const variableError = normalizedVariable.length === 0;

  const handleChange = (patch: Partial<CaptureNodeFormProps>) => {
    onChange({
      message,
      variableName,
      variableType,
      audioModel,
      imageModel,
      ...patch,
    });
  };

  const previewMessage =
    message && message.trim().length
      ? message
      : 'Escribe el mensaje que le mostrarás al usuario antes de capturar su respuesta.';

  return (
    <div className="capture-node-form">
      <div className="capture-node-form__preview-card">
        <div className="capture-node-form__preview-header">
          <span className="capture-node-form__preview-icon">📝</span>
          <span className="capture-node-form__preview-title">
            Capturador de respuesta
          </span>
        </div>
        <p className="capture-node-form__preview-message">{previewMessage}</p>
        <div className="capture-node-form__preview-footer">
          {normalizedVariable.length ? (
            <span>
              La respuesta se guardará en:
              <strong> {normalizedVariable}</strong>
            </span>
          ) : (
            <span className="capture-node-form__warning">
              ⚠️ Configura una variable para guardar la respuesta
            </span>
          )}
        </div>
      </div>

      <div className="capture-node-form__field">
        <label htmlFor="capture-node-message">
          Mensaje de captura (pregunta al usuario)
        </label>
        <textarea
          id="capture-node-message"
          value={message}
          onChange={(e) => handleChange({ message: e.target.value })}
          rows={5}
          placeholder="Ej: ¿Cuál es tu nombre? o ¿Qué tipo de producto buscas?"
        />
      </div>

      <div className="capture-node-form__divider" />

      <div className="capture-node-form__grid">
        <div className="capture-node-form__field">
          <label htmlFor="capture-node-variable">
            Nombre de la variable (requerido)
          </label>
          <input
            id="capture-node-variable"
            type="text"
            placeholder="flow_nombreUsuario"
            value={variableName ?? ''}
            onChange={(e) => handleChange({ variableName: e.target.value })}
          />
          {variableError && (
            <span className="capture-node-form__error">
              Debes definir un nombre para almacenar la respuesta.
            </span>
          )}
        </div>

        <div className="capture-node-form__field">
          <label htmlFor="capture-node-variable-type">Tipo de variable</label>
          <select
            id="capture-node-variable-type"
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

        <div className="capture-node-form__field">
          <label htmlFor="capture-node-audio-model">Modelo de audio</label>
          <select
            id="capture-node-audio-model"
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

        <div className="capture-node-form__field">
          <label htmlFor="capture-node-image-model">Modelo de imagen</label>
          <select
            id="capture-node-image-model"
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
    </div>
  );
};
