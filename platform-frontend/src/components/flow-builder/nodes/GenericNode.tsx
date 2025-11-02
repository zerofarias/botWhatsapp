import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow';
import type { FlowNodeData } from '../../../views/FlowBuilder/types';

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

  return (
    <div
      className={`generic-node ${selected ? 'generic-node--selected' : ''}`}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle type="target" position={Position.Left} />

      {isEditing ? (
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
        <div className="generic-node__label">{label || 'Sin nombre'}</div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
};
