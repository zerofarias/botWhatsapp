import React from 'react';

export interface RedirectAgentNodeFormProps {
  agentId: number | '';
  agentOptions: Array<{ id: number; name: string }>;
  onChange: (data: { agentId: number | '' }) => void;
}

export const RedirectAgentNodeForm: React.FC<RedirectAgentNodeFormProps> = ({
  agentId,
  agentOptions,
  onChange,
}) => (
  <div
    style={{
      background: '#e8eaf6',
      padding: 16,
      borderRadius: 8,
      border: '2px solid #3949ab',
    }}
  >
    <h3 style={{ margin: 0, color: '#3949ab' }}>Redirigir a Agente</h3>
    <label>
      Selecciona el agente destino:
      <select
        value={agentId}
        onChange={(e) => onChange({ agentId: Number(e.target.value) })}
        style={{ marginLeft: 8 }}
      >
        <option value="">Selecciona un agente</option>
        {agentOptions.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
    </label>
  </div>
);
