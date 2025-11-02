import React, { useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { ConditionalNodeData } from '../../../views/FlowBuilder/types';

export const ConditionalNode: React.FC<NodeProps<ConditionalNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const defaultLabel = data.defaultLabel?.length
    ? data.defaultLabel
    : 'Otro...';
  const defaultHandleId =
    data.defaultConditionId && data.defaultConditionId.length
      ? data.defaultConditionId
      : `default-${id}`;

  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [handleOffsets, setHandleOffsets] = useState<Map<string, number>>(
    new Map()
  );

  // Recalcular posiciones cuando cambian las evaluaciones o el tamaño del nodo
  useEffect(() => {
    const newOffsets = new Map<string, number>();

    data.evaluations.forEach((evaluation) => {
      const rowElement = rowRefs.current.get(evaluation.id);
      if (rowElement) {
        // Usar el centro del elemento (offsetHeight / 2)
        newOffsets.set(evaluation.id, rowElement.offsetHeight / 2);
      }
    });

    // Para el default
    const defaultRowElement = rowRefs.current.get('default');
    if (defaultRowElement) {
      newOffsets.set('default', defaultRowElement.offsetHeight / 2);
    }

    setHandleOffsets(newOffsets);
  }, [data.evaluations]);

  return (
    <div
      className={`conditional-node ${
        selected ? 'conditional-node--selected' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="conditional-node__header">
        <span className="conditional-node__title">{data.label}</span>
        {data.sourceVariable && (
          <span className="conditional-node__chip">{data.sourceVariable}</span>
        )}
      </div>
      <div className="conditional-node__body">
        {data.evaluations.map((evaluation) => {
          const handleOffset = handleOffsets.get(evaluation.id) ?? 22; // 22 es el centro por defecto

          return (
            <div
              key={evaluation.id}
              ref={(el) => {
                if (el) {
                  rowRefs.current.set(evaluation.id, el);
                }
              }}
              className={`conditional-node__row ${
                evaluation.targetId ? 'is-connected' : ''
              }`}
            >
              <div className="conditional-node__row-content">
                <strong>{evaluation.label || 'Condición'}</strong>
                <span className="conditional-node__row-operator">
                  {evaluation.operator}
                </span>
                <span className="conditional-node__row-value">
                  {evaluation.value || '...'}
                </span>
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={evaluation.id}
                className="conditional-node__handle"
                style={
                  {
                    top: `${handleOffset}px`,
                    right: '4px',
                  } as React.CSSProperties
                }
              />
            </div>
          );
        })}
        <div
          ref={(el) => {
            if (el) {
              rowRefs.current.set('default', el);
            }
          }}
          className={`conditional-node__row conditional-node__row--default ${
            data.defaultTargetId ? 'is-connected' : ''
          }`}
        >
          <div className="conditional-node__row-content">
            <strong>{defaultLabel}</strong>
            <span className="conditional-node__row-operator">DEFAULT</span>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id={defaultHandleId}
            className="conditional-node__handle conditional-node__handle--default"
            style={
              {
                top: `${handleOffsets.get('default') ?? 22}px`,
                right: '4px',
              } as React.CSSProperties
            }
          />
        </div>
      </div>
    </div>
  );
};
