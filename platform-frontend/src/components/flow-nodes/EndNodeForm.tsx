import React from 'react';

export const EndNodeForm: React.FC = () => (
  <div
    style={{
      background: '#ececec',
      padding: 16,
      borderRadius: 8,
      border: '2px solid #757575',
    }}
  >
    <h3 style={{ margin: 0, color: '#757575' }}>Fin del Flujo (END)</h3>
    <p>Este nodo termina el flujo. No tiene configuración adicional.</p>
  </div>
);
