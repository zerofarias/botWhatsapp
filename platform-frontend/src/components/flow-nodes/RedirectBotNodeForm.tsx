import React from 'react';

export interface RedirectBotNodeFormProps {
  targetBotId: number | '';
  botOptions: Array<{ id: number; name: string }>;
  onChange: (data: { targetBotId: number | '' }) => void;
}

export const RedirectBotNodeForm: React.FC<RedirectBotNodeFormProps> = ({
  targetBotId,
  botOptions,
  onChange,
}) => (
  <div
    style={{
      background: '#f1f8e9',
      padding: 16,
      borderRadius: 8,
      border: '2px solid #689f38',
    }}
  >
    <h3 style={{ margin: 0, color: '#689f38' }}>Redirigir a Bot</h3>
    <label>
      Selecciona el bot destino:
      <select
        value={targetBotId}
        onChange={(e) => onChange({ targetBotId: Number(e.target.value) })}
        style={{ marginLeft: 8 }}
      >
        <option value="">Selecciona un bot</option>
        {botOptions.map((bot) => (
          <option key={bot.id} value={bot.id}>
            {bot.name}
          </option>
        ))}
      </select>
    </label>
  </div>
);
