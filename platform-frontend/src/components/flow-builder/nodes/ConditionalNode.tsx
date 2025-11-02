import React from 'react';
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

  // Calcular la altura total del header y body para posicionar handles correctamente
  // Header: ~44px (título + chip)
  // Gap entre rows: 8px
  // Cada row: ~44px
  const headerHeight = 44;
  const rowHeight = 44;
  const rowGap = 8;

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
        {data.evaluations.map((evaluation, index) => {
          // Calcular la posición Y del handle
          const handleTop =
            headerHeight + index * (rowHeight + rowGap) + rowHeight / 2;

          return (
            <div
              key={evaluation.id}
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
                    top: `${handleTop}px`,
                    right: '-6px',
                  } as React.CSSProperties
                }
              />
            </div>
          );
        })}
        <div
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
                top: `${
                  headerHeight +
                  data.evaluations.length * (rowHeight + rowGap) +
                  rowHeight / 2
                }px`,
                right: '-6px',
              } as React.CSSProperties
            }
          />
        </div>
      </div>
    </div>
  );
};
