import React from 'react';
import { EdgeProps, getSmoothStepPath, useReactFlow } from 'reactflow';

export const DeleteableEdge: React.FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, markerEnd } = props;
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const onEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#b1b1b7',
          strokeWidth: 2,
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
