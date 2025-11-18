import React from 'react';

interface EndNodeFormProps {
  variant?: 'standard' | 'closed';
}

export const EndNodeForm: React.FC<EndNodeFormProps> = ({
  variant = 'standard',
}) => {
  const isClosed = variant === 'closed';
  const title = isClosed ? 'Fin y cierre (END_CLOSED)' : 'Fin del Flujo (END)';
  const description = isClosed
    ? 'Este nodo termina el flujo y cierra la conversación, finalizando el chat automáticamente.'
    : 'Este nodo termina el flujo. No tiene configuración adicional.';

  return (
    <div
      style={{
        background: '#ececec',
        padding: 16,
        borderRadius: 8,
        border: '2px solid #757575',
      }}
    >
      <h3 style={{ margin: 0, color: '#757575' }}>{title}</h3>
      <p>{description}</p>
    </div>
  );
};
