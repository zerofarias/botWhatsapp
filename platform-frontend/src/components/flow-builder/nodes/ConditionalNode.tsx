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

  return (
    <div
      className={`conditional-node ${
        selected ? 'conditional-node--selected' : ''
      }`}
      data-nodeid={id}
    >
      <Handle type="target" position={Position.Left} />
      <div className="conditional-node__header">
        <span className="conditional-node__title">{data.label}</span>
        {data.availableVariables && data.availableVariables.length > 0 ? (
          <select
            value={data.sourceVariable || ''}
            className="conditional-node__select"
            title="Selecciona la variable a evaluar"
            onClick={(e) => e.stopPropagation()}
            disabled
          >
            <option value="">-- Selecciona variable --</option>
            {data.availableVariables.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="conditional-node__chip">{data.sourceVariable}</span>
        )}
      </div>
      <div className="conditional-node__body">
        {data.evaluations.map((evaluation, idx) => {
          return (
            <div
              key={evaluation.id}
              className={`conditional-node__row ${
                evaluation.targetId ? 'is-connected' : ''
              }`}
              data-row-index={idx}
              data-row-id={evaluation.id}
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
                data-handleid={evaluation.id}
              />
              {/* DEBUG: Badge visual con el ID del handle */}
              <div
                style={{
                  fontSize: '0.6rem',
                  padding: '2px 4px',
                  background: '#9c27b0',
                  color: 'white',
                  borderRadius: '2px',
                  position: 'absolute',
                  right: '20px',
                  top: '2px',
                }}
              >
                {evaluation.id.slice(0, 8)}
              </div>
            </div>
          );
        })}
        <div
          className={`conditional-node__row conditional-node__row--default ${
            data.defaultTargetId ? 'is-connected' : ''
          }`}
          data-row-id="default"
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
            data-handleid={defaultHandleId}
          />
          {/* DEBUG: Badge visual con el ID del handle */}
          <div
            style={{
              fontSize: '0.6rem',
              padding: '2px 4px',
              background: '#7b1fa2',
              color: 'white',
              borderRadius: '2px',
              position: 'absolute',
              right: '20px',
              top: '2px',
            }}
          >
            {defaultHandleId.slice(0, 8)}
          </div>
        </div>
      </div>
    </div>
  );
};
