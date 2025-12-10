import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow';
import type {
  FlowNodeData,
  FlowNodeType,
  TextNodeData,
  CaptureNodeData,
  SetVariableNodeData,
  AINodeData,
  HTTPNodeData,
  FlowOption,
  NoteNodeData,
  DataLogNodeData,
} from '../../../views/FlowBuilder/types';
import { FLOW_NODE_TYPE_LABELS } from '../../../views/FlowBuilder/types';

export const GenericNode: React.FC<NodeProps<FlowNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (label !== data.label && label.trim()) {
      // Actualizar el nodo con el nuevo label
      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: { ...node.data, label: label.trim() },
              }
            : node
        )
      );
    } else {
      // Si está vacío, revertir al label anterior
      setLabel(data.label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setLabel(data.label);
      setIsEditing(false);
    }
  };

  const rawType = (data.type ?? 'TEXT') as FlowNodeType;
  const nodeType = rawType;
  const nodeKindClass = `generic-node--${nodeType.toLowerCase()}`;
  const badgeLabel = FLOW_NODE_TYPE_LABELS[nodeType] ?? nodeType;
  const isTerminalNode = nodeType === 'END' || nodeType === 'END_CLOSED';
  const isCircleNode = nodeType === 'START' || isTerminalNode;

  const renderMessagePreview = (value?: string | null): string => {
    if (!value) return 'Sin contenido';
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return 'Sin contenido';
    return normalized.length > 120
      ? `${normalized.slice(0, 117)}…`
      : normalized;
  };

  const renderOptionPills = (options?: FlowOption[]) => {
    if (!Array.isArray(options) || !options.length) return null;
    const visible = options.slice(0, 3);
    const remaining = options.length - visible.length;
    return (
      <div className="generic-node__options">
        {visible.map((option) => (
          <span key={option.id} className="generic-node__pill">
            {option.label || option.trigger || 'Opción'}
          </span>
        ))}
        {remaining > 0 && (
          <span className="generic-node__pill generic-node__pill--ghost">
            +{remaining}
          </span>
        )}
      </div>
    );
  };

  const summary = useMemo(() => {
    switch (nodeType) {
      case 'TEXT': {
        const textData = data as TextNodeData;
        return (
          <>
            <p className="generic-node__message">
              {renderMessagePreview(textData.message)}
            </p>
            {renderOptionPills(textData.options)}
          </>
        );
      }
      case 'CAPTURE': {
        const captureData = data as CaptureNodeData;
        return (
          <>
            <p className="generic-node__message">
              {renderMessagePreview(captureData.message)}
            </p>
            <div className="generic-node__meta">
              <span className="generic-node__meta-label">Variable</span>
              <span className="generic-node__meta-value">
                {captureData.responseVariableName || 'sin nombre'}
              </span>
            </div>
          </>
        );
      }
      case 'DELAY': {
        const seconds =
          typeof (data as any).seconds === 'number' ? (data as any).seconds : 1;
        return (
          <div className="generic-node__meta">
            <span className="generic-node__meta-label">Esperar</span>
            <span className="generic-node__meta-value">{seconds} seg</span>
          </div>
        );
      }
      case 'SET_VARIABLE': {
        const setVariableData = data as SetVariableNodeData;
        return (
          <div className="generic-node__meta-block">
            <div className="generic-node__meta">
              <span className="generic-node__meta-label">Variable</span>
              <span className="generic-node__meta-value">
                {setVariableData.variable || 'sin nombre'}
              </span>
            </div>
            <div className="generic-node__meta">
              <span className="generic-node__meta-label">Valor</span>
              <span className="generic-node__meta-value">
                {renderMessagePreview(setVariableData.value || '')}
              </span>
            </div>
          </div>
        );
      }
      case 'AI': {
        const aiData = data as AINodeData;
        return (
          <>
            <p className="generic-node__message">
              {renderMessagePreview(aiData.prompt)}
            </p>
            <div className="generic-node__meta-block">
              <div className="generic-node__meta">
                <span className="generic-node__meta-label">Modelo</span>
                <span className="generic-node__meta-value">
                  {aiData.model || 'default'}
                </span>
              </div>
              {aiData.responseVariableName && (
                <div className="generic-node__meta">
                  <span className="generic-node__meta-label">Variable</span>
                  <span className="generic-node__meta-value">
                    {aiData.responseVariableName}
                  </span>
                </div>
              )}
            </div>
          </>
        );
      }
      case 'NOTE': {
        const noteData = data as NoteNodeData;
        return (
          <p className="generic-node__message">
            {renderMessagePreview(
              (noteData as any).value ?? noteData.label ?? ''
            )}
          </p>
        );
      }
      case 'DATA_LOG': {
        const dataLog = data as DataLogNodeData;
        return (
          <div className="generic-node__meta-block">
            <div className="generic-node__meta">
              <span className="generic-node__meta-label">Tipo</span>
              <span className="generic-node__meta-value">
                {dataLog.dataType}
              </span>
            </div>
            {dataLog.description && (
              <p className="generic-node__message">
                {renderMessagePreview(dataLog.description)}
              </p>
            )}
          </div>
        );
      }
      case 'REDIRECT_BOT': {
        const target = (data as any).targetBotId;
        return (
          <div className="generic-node__meta">
            <span className="generic-node__meta-label">Bot ID</span>
            <span className="generic-node__meta-value">
              {target ? `#${target}` : 'sin definir'}
            </span>
          </div>
        );
      }
      case 'REDIRECT_AGENT': {
        const agent = (data as any).agentId;
        return (
          <div className="generic-node__meta">
            <span className="generic-node__meta-label">Agente</span>
            <span className="generic-node__meta-value">
              {agent ? `#${agent}` : 'sin definir'}
            </span>
          </div>
        );
      }
      case 'HTTP': {
        const httpData = data as HTTPNodeData;
        const methodColors: Record<string, string> = {
          GET: '#22c55e',
          POST: '#3b82f6',
          PUT: '#f59e0b',
          DELETE: '#ef4444',
          PATCH: '#8b5cf6',
        };
        return (
          <div className="generic-node__meta-block">
            <div className="generic-node__meta">
              <span
                className="generic-node__http-method"
                style={{
                  backgroundColor: methodColors[httpData.method] || '#6b7280',
                }}
              >
                {httpData.method || 'GET'}
              </span>
            </div>
            <p className="generic-node__message generic-node__url">
              {httpData.url
                ? httpData.url.length > 40
                  ? `${httpData.url.slice(0, 37)}...`
                  : httpData.url
                : 'URL no definida'}
            </p>
            <div className="generic-node__meta">
              <span className="generic-node__meta-label">Variable</span>
              <span className="generic-node__meta-value">
                {httpData.responseVariableName || 'sin nombre'}
              </span>
            </div>
          </div>
        );
      }
      default: {
        if ('message' in data && typeof (data as any).message === 'string') {
          return (
            <p className="generic-node__message">
              {renderMessagePreview((data as any).message)}
            </p>
          );
        }
        return null;
      }
    }
  }, [data, nodeType]);

  const containerClassNames = [
    'generic-node',
    nodeKindClass,
    selected ? 'generic-node--selected' : '',
    isCircleNode ? 'generic-node--minimal' : '',
    nodeType === 'END'
      ? 'generic-node--end'
      : nodeType === 'END_CLOSED'
      ? 'generic-node--end-closed'
      : '',
    nodeType === 'START' ? 'generic-node--start' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const titleContent = isEditing ? (
    <input
      ref={inputRef}
      type="text"
      className="generic-node__input"
      value={label}
      onChange={handleLabelChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  ) : (
    <div className="generic-node__title-text">{label || 'Sin nombre'}</div>
  );

  const bodyContent =
    !isCircleNode && summary ? (
      <div className="generic-node__body">{summary}</div>
    ) : null;

  const targetHandleStyle =
    nodeType === 'START'
      ? undefined
      : isCircleNode
      ? undefined
      : {
          top: '50%',
          left: -6,
          transform: 'translateY(-50%)',
        };

  const sourceHandleStyle =
    nodeType === 'START'
      ? {
          top: '50%',
          right: -6,
          transform: 'translateY(-50%)',
        }
      : isCircleNode
      ? undefined
      : {
          top: '50%',
          right: -6,
          transform: 'translateY(-50%)',
        };

  const showSourceHandle =
    (nodeType === 'START' && (data.type ?? nodeType) === 'START') ||
    (!isCircleNode &&
      (data.type ?? nodeType) !== 'END' &&
      (data.type ?? nodeType) !== 'END_CLOSED');

  return (
    <div
      className={containerClassNames}
      onDoubleClick={() => setIsEditing(true)}
    >
      {nodeType !== 'START' && (
        <Handle
          type="target"
          position={Position.Left}
          style={targetHandleStyle}
        />
      )}
      {!isCircleNode && (
        <div className="generic-node__header">
          <span className="generic-node__badge">{badgeLabel}</span>
        </div>
      )}
      <div className="generic-node__title">{titleContent}</div>
      {bodyContent}
      {showSourceHandle && (
        <Handle
          type="source"
          position={nodeType === 'START' ? Position.Right : Position.Right}
          style={sourceHandleStyle}
        />
      )}
    </div>
  );
};
