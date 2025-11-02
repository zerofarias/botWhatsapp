import React from 'react';

export const StartNodeForm: React.FC = () => (
  <div
    style={{
      background: '#ffe082',
      padding: 16,
      borderRadius: 8,
      border: '2px solid #ffb300',
    }}
  >
    <h3 style={{ margin: 0, color: '#ffb300' }}>Nodo de Inicio (START)</h3>
    <p>Este nodo inicia el flujo y no puede ser eliminado.</p>
  </div>
);
