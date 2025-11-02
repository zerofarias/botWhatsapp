import React from 'react';

export interface AINodeFormProps {
  prompt: string;
  model: string;
  onChange: (data: { prompt: string; model: string }) => void;
  modelOptions: string[];
}

export const AINodeForm: React.FC<AINodeFormProps> = ({
  prompt,
  model,
  onChange,
  modelOptions,
}) => (
  <div
    style={{
      background: '#f3e5f5',
      padding: 16,
      borderRadius: 8,
      border: '2px solid #7b1fa2',
    }}
  >
    <h3 style={{ margin: 0, color: '#7b1fa2' }}>Consulta IA</h3>
    <label>
      Prompt:
      <input
        type="text"
        value={prompt}
        onChange={(e) => onChange({ prompt: e.target.value, model })}
        style={{ width: '100%' }}
        placeholder="¿Cuál es tu pregunta para la IA?"
      />
    </label>
    <label style={{ marginTop: 8, display: 'block' }}>
      Modelo:
      <select
        value={model}
        onChange={(e) => onChange({ prompt, model: e.target.value })}
        style={{ marginLeft: 8 }}
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
