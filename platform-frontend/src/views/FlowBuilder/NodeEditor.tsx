import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowBuilderNode,
  FlowMessageKind,
  FlowNodeData,
  FlowOption,
} from './types';
import { FLOW_NODE_TYPES } from './types';

interface NodeEditorProps {
  node: FlowBuilderNode;
  allNodes: FlowBuilderNode[];
  onChange: (updated: FlowBuilderNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

function updateNodeData(
  node: FlowBuilderNode,
  patch: Partial<FlowNodeData>
): FlowBuilderNode {
  return {
    ...node,
    data: {
      ...node.data,
      ...patch,
    },
  };
}

const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  allNodes,
  onChange,
  onDeleteNode,
}) => {
  const options = node.data.options ?? [];
  const messageKind = (
    node.data.messageKind ? node.data.messageKind.toUpperCase() : 'TEXT'
  ) as FlowMessageKind;
  const buttonSettings = node.data.buttonSettings ?? {};
  const listSettings = node.data.listSettings ?? {};
  const availableTargets = useMemo(
    () => allNodes.filter((candidate) => candidate.id !== node.id),
    [allNodes, node.id]
  );

  const handleUpdate = (patch: Partial<FlowNodeData>) => {
    onChange(updateNodeData(node, patch));
  };

  const updateOption = (optionId: string, patch: Partial<FlowOption>) => {
    const nextOptions = options.map((option) =>
      option.id === optionId ? { ...option, ...patch } : option
    );
    handleUpdate({ options: nextOptions });
  };

  const addOption = () => {
    const nextOptions = [
      ...options,
      { id: uuidv4(), label: '', trigger: '', targetId: null },
    ];
    handleUpdate({ options: nextOptions });
  };

  const removeOption = (optionId: string) => {
    const nextOptions = options.filter((option) => option.id !== optionId);
    handleUpdate({ options: nextOptions });
  };

  const updateMessageKind = (kind: FlowMessageKind) => {
    handleUpdate({ messageKind: kind });
  };

  const updateButtonSettings = (patch: typeof buttonSettings) => {
    handleUpdate({
      buttonSettings: {
        ...buttonSettings,
        ...patch,
      },
    });
  };

  const updateListSettings = (patch: typeof listSettings) => {
    handleUpdate({
      listSettings: {
        ...listSettings,
        ...patch,
      },
    });
  };

  const isButtons = messageKind === 'BUTTONS';
  const isList = messageKind === 'LIST';

  return (
    <aside className="node-editor">
      <div className="node-editor__header">
        <h3 className="node-editor__title">Editar nodo</h3>
        {typeof node.data.flowId === 'number' && (
          <span className="node-editor__badge">ID #{node.data.flowId}</span>
        )}
      </div>

      <label className="node-editor__label">Tipo de bloque</label>
      <select
        value={node.data.type}
        onChange={(event) => {
          const nextType = event.target.value as FlowNodeData['type'];
          handleUpdate({ type: nextType });
        }}
        className="node-editor__select"
      >
        {FLOW_NODE_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <label className="node-editor__label">Titulo</label>
      <input
        type="text"
        value={node.data.label}
        onChange={(event) => handleUpdate({ label: event.target.value })}
        className="node-editor__input"
        placeholder="Nombre del menu"
      />

      <label className="node-editor__label">Tipo de mensaje</label>
      <select
        value={messageKind}
        onChange={(event) =>
          updateMessageKind(event.target.value as FlowMessageKind)
        }
        className="node-editor__select"
      >
        <option value="TEXT">Texto</option>
        <option value="BUTTONS">Botones</option>
        <option value="LIST">Lista</option>
      </select>

      <label className="node-editor__label">Mensaje del bot</label>
      <textarea
        value={node.data.message}
        onChange={(event) => handleUpdate({ message: event.target.value })}
        className="node-editor__textarea"
        placeholder="Contenido que vera el usuario"
      />

      {isButtons && (
        <div className="node-editor__section">
          <h4 className="node-editor__title">Configuración de botones</h4>
          <label className="node-editor__label">Título (opcional)</label>
          <input
            type="text"
            value={buttonSettings.title ?? ''}
            onChange={(event) =>
              updateButtonSettings({ title: event.target.value })
            }
            className="node-editor__input"
            placeholder="Menú principal"
          />
          <label className="node-editor__label">Pie (opcional)</label>
          <input
            type="text"
            value={buttonSettings.footer ?? ''}
            onChange={(event) =>
              updateButtonSettings({ footer: event.target.value })
            }
            className="node-editor__input"
            placeholder="Ecofarma Villa Nueva"
          />
          <p className="node-editor__note">
            Máximo 3 botones. Cada botón usa el texto de la opción y el trigger
            como identificador.
          </p>
        </div>
      )}

      {isList && (
        <div className="node-editor__section">
          <h4 className="node-editor__title">Configuración de lista</h4>
          <label className="node-editor__label">Texto del botón</label>
          <input
            type="text"
            value={listSettings.buttonText ?? ''}
            onChange={(event) =>
              updateListSettings({ buttonText: event.target.value })
            }
            className="node-editor__input"
            placeholder="Ver opciones"
          />
          <label className="node-editor__label">Título de la lista</label>
          <input
            type="text"
            value={listSettings.title ?? ''}
            onChange={(event) =>
              updateListSettings({ title: event.target.value })
            }
            className="node-editor__input"
            placeholder="Menú principal"
          />
          <label className="node-editor__label">Descripción</label>
          <textarea
            value={listSettings.description ?? ''}
            onChange={(event) =>
              updateListSettings({ description: event.target.value })
            }
            className="node-editor__textarea"
            placeholder="Selecciona una opción del menú."
          />
          <p className="node-editor__note">
            Todas las opciones se mostrarán en una única sección. El trigger se
            usa como identificador de la fila.
          </p>
        </div>
      )}

      <div className="node-editor__options-header">
        <h4 className="node-editor__title">Opciones</h4>
        <button
          type="button"
          onClick={addOption}
          className="node-editor__add-option"
        >
          Agregar
        </button>
      </div>

      <p className="node-editor__options">
        Las opciones representan respuestas posibles del usuario. Cada una puede
        redirigir a otro nodo.
      </p>

      {isButtons && (
        <p className="node-editor__note">
          WhatsApp permite hasta 3 botones. Si dejas el trigger vacío, se genera
          automáticamente a partir del texto visible.
        </p>
      )}

      {options.length === 0 && (
        <p className="node-editor__empty">Sin opciones configuradas.</p>
      )}

      {options.map((option) => (
        <div key={option.id} className="node-editor__option-card">
          <div className="node-editor__option-header">
            <span className="node-editor__option-title">Opcion</span>
            <button
              type="button"
              onClick={() => removeOption(option.id)}
              className="node-editor__remove-option"
            >
              Quitar
            </button>
          </div>

          <label className="node-editor__label">Texto visible</label>
          <input
            type="text"
            value={option.label}
            onChange={(event) =>
              updateOption(option.id, { label: event.target.value })
            }
            className="node-editor__input"
            placeholder="Ej: 1 - Realizar pedido"
          />

          <label className="node-editor__label">Trigger (texto o numero)</label>
          <input
            type="text"
            value={option.trigger}
            onChange={(event) =>
              updateOption(option.id, { trigger: event.target.value })
            }
            className="node-editor__input"
            placeholder="Ej: 1, pedido, salir"
          />

          <label className="node-editor__label">Siguiente nodo</label>
          <select
            value={option.targetId ?? ''}
            onChange={(event) =>
              updateOption(option.id, {
                targetId: event.target.value || null,
              })
            }
            className="node-editor__select"
          >
            <option value="">Sin conexion</option>
            {availableTargets.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.data.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <button
        type="button"
        className="node-editor__remove-node"
        onClick={() => onDeleteNode(node.id)}
      >
        Eliminar nodo
      </button>
    </aside>
  );
};

export default NodeEditor;
