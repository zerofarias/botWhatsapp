import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow';
import type { HTTPNodeData } from '../../../views/FlowBuilder/types';

export const SUCCESS_HANDLE_ID = 'http-success';
export const ERROR_HANDLE_ID = 'http-error';

const METHOD_COLORS: Record<string, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
};

export const HTTPNode: React.FC<NodeProps<HTTPNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setLabelValue(data.label);
  }, [data.label]);

  const handleLabelCommit = () => {
    setIsEditing(false);
    const trimmed = labelValue.trim();
    if (!trimmed || trimmed === data.label) {
      setLabelValue(data.label);
      return;
    }

    setNodes((previousNodes) =>
      previousNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                label: trimmed,
              },
            }
          : node
      )
    );
  };

  const method = data.method || 'GET';
  const methodColor = METHOD_COLORS[method] || '#6b7280';
  const url = data.url || '';
  const displayUrl = url.length > 35 ? `${url.slice(0, 32)}...` : url || 'URL no definida';

  return (
    <div className={`http-node ${selected ? 'http-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ top: '50%' }} />
      
      <div className="http-node__header">
        <div className="http-node__title-wrapper">
          <span className="http-node__icon" aria-hidden="true">🌐</span>
          <span className="http-node__chip">HTTP</span>
        </div>
        {isEditing ? (
          <input
            ref={inputRef}
            className="http-node__input"
            value={labelValue}
            onChange={(event) => setLabelValue(event.target.value)}
            onBlur={handleLabelCommit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleLabelCommit();
              } else if (event.key === 'Escape') {
                setLabelValue(data.label);
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="http-node__title"
            onDoubleClick={() => setIsEditing(true)}
          >
            {data.label || 'Petición HTTP'}
          </button>
        )}
      </div>

      <div className="http-node__body">
        <div className="http-node__method-row">
          <span 
            className="http-node__method-badge"
            style={{ backgroundColor: methodColor }}
          >
            {method}
          </span>
          <span className="http-node__url">{displayUrl}</span>
        </div>
        
        {data.responseVariableName && (
          <div className="http-node__variable-row">
            <span className="http-node__variable-label">Variable:</span>
            <span className="http-node__variable-value">{data.responseVariableName}</span>
          </div>
        )}

        {(data.headers?.length ?? 0) > 0 && (
          <div className="http-node__info-tag">
            📋 {data.headers?.filter((h: { enabled?: boolean }) => h.enabled !== false).length || 0} headers
          </div>
        )}

        {(data.queryParams?.length ?? 0) > 0 && (
          <div className="http-node__info-tag">
            🔗 {data.queryParams?.filter((p: { enabled?: boolean }) => p.enabled !== false).length || 0} params
          </div>
        )}
      </div>

      <div className="http-node__branches">
        <div className="http-node__branch http-node__branch--success">
          <span>✅ Éxito</span>
          <Handle
            type="source"
            position={Position.Right}
            id={SUCCESS_HANDLE_ID}
            style={{ top: 'calc(100% - 58px)' }}
          />
        </div>
        <div className="http-node__branch http-node__branch--error">
          <span>❌ Error</span>
          <Handle
            type="source"
            position={Position.Right}
            id={ERROR_HANDLE_ID}
            style={{ top: 'calc(100% - 24px)' }}
          />
        </div>
      </div>
    </div>
  );
};
