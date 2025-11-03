import React from 'react';

export interface NoteNodeFormProps {
  value: string;
  onChange: (data: { value: string }) => void;
}

export const NoteNodeForm: React.FC<NoteNodeFormProps> = ({
  value,
  onChange,
}) => {
  return (
    <div
      style={{
        background: '#fffde7',
        padding: 16,
        borderRadius: 8,
        border: '2px solid #fbc02d',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 20, marginRight: 8 }}>📝</span>
        <h3 style={{ margin: 0, color: '#f57f17' }}>Nota Interna</h3>
      </div>

      <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px 0' }}>
        Esta nota no se envía al usuario, solo se registra internamente.
      </p>

      <label style={{ display: 'block' }}>
        <span style={{ fontWeight: 'bold', color: '#333' }}>
          Contenido de la nota:
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange({ value: e.target.value })}
          rows={6}
          style={{
            width: '100%',
            marginTop: 8,
            padding: 8,
            borderRadius: 4,
            border: '1px solid #fbc02d',
            fontFamily: 'monospace',
            fontSize: 12,
          }}
          placeholder="Escribe una nota interna aquí..."
        />
      </label>

      <div
        style={{
          marginTop: 12,
          padding: 8,
          background: '#fff59d',
          borderRadius: 4,
          fontSize: 11,
          color: '#333',
        }}
      >
        <strong>💡 Nota:</strong> El contenido se registrará en el panel de
        administración y en la base de datos, pero no se mostrará al usuario.
      </div>
    </div>
  );
};
