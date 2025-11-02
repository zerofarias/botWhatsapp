import React from 'react';
import { EdgeProps, getSmoothStepPath, useReactFlow } from 'reactflow';

export const DeleteableEdge: React.FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY } = props;
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius: 50, // Aumentar radio para curvas más pronunciadas
  });

  const onEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      {/* Definir marcador personalizado */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#7c3aed" />
        </marker>
      </defs>

      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd="url(#arrowhead)"
        style={{
          stroke: '#7c3aed',
          strokeWidth: 3,
          opacity: 0.9,
          fill: 'none',
        }}
      />
      {/* Botón X para eliminar */}
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
