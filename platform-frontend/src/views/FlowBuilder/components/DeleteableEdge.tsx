import React from 'react';
import { EdgeProps, getBezierPath, useReactFlow } from 'reactflow';

export const DeleteableEdge: React.FC<EdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  } = props;
  const { setEdges } = useReactFlow();

  // Usar el camino de Bezier por defecto de ReactFlow
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      {/* Línea de conexión con estilo por defecto */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: '#999',
          strokeWidth: 2,
          fill: 'none',
        }}
      />

      {/* Área invisible para hacer clic y eliminar */}
      <path
        id={`${id}-click-area`}
        d={edgePath}
        style={{
          stroke: 'transparent',
          strokeWidth: 10,
          fill: 'none',
          cursor: 'pointer',
        }}
        onClick={onEdgeClick}
      />

      {/* Botón X para eliminar - flotante en el centro de la línea */}
      <foreignObject
        x={labelX - 12}
        y={labelY - 12}
        width={24}
        height={24}
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: '#ff4444',
            borderRadius: '50%',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
            userSelect: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
          onClick={onEdgeClick}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#cc0000';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#ff4444';
          }}
          title="Click para eliminar la conexión"
        >
          ✕
        </div>
      </foreignObject>
    </>
  );
};
