import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowBuilderNode,
  FlowMessageKind,
  FlowNodeData,
  FlowOption,
  FlowCondition,
  ButtonSettings,
  ListSettings,
} from './types';
import {
  FLOW_NODE_TYPES,
  FLOW_NODE_TYPE_LABELS,
  FLOW_NODE_TYPE_DESCRIPTIONS,
} from './types';

type AreaOption = {
  id: number;
  name: string;
};

interface NodeEditorProps {
  node: FlowBuilderNode;
  allNodes: FlowBuilderNode[];
  areas: AreaOption[];
  areasLoading: boolean;
  onChange: (updated: FlowBuilderNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
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
  areas,
  areasLoading,
  onChange,
  onDeleteNode,
  onDuplicateNode,
}) => {
  const options = node.data.options ?? [];
  const conditions = node.data.conditions ?? [];
  const messageKind = (
    node.data.messageKind ? node.data.messageKind.toUpperCase() : 'TEXT'
  ) as FlowMessageKind;
  const buttonSettings = node.data.buttonSettings ?? {};
  const listSettings = node.data.listSettings ?? {};
  const availableTargets = useMemo(
    () => allNodes.filter((candidate) => candidate.id !== node.id),
    [allNodes, node.id]
  );
  const isRedirect = node.data.type === 'REDIRECT';
  const canUseConditions = node.data.type !== 'END';

  const handleUpdate = (patch: Partial<FlowNodeData>) => {
    onChange(updateNodeData(node, patch));
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value as FlowNodeData['type'];
    const patch: Partial<FlowNodeData> = { type: nextType };

    if (nextType === 'END') {
      patch.options = [];
      patch.conditions = [];
      patch.areaId = null;
    } else if (nextType !== 'REDIRECT') {
      patch.areaId = null;
    }

    handleUpdate(patch);
  };

  const handleAreaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (!value) {
      handleUpdate({ areaId: null });
      return;
    }
    const nextAreaId = Number(value);
    if (Number.isFinite(nextAreaId)) {
      handleUpdate({ areaId: nextAreaId });
    }
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

  const updateCondition = (
    conditionId: string,
    patch: Partial<FlowCondition>
  ) => {
    const nextConditions = conditions.map((condition) =>
      condition.id === conditionId ? { ...condition, ...patch } : condition
    );
    handleUpdate({ conditions: nextConditions });
  };

  const addCondition = () => {
    const nextConditions = [
      ...conditions,
      {
        id: uuidv4(),
        label: '',
        match: '',
        matchMode: 'EXACT' as FlowCondition['matchMode'],
        targetId: null,
      },
    ];
    handleUpdate({ conditions: nextConditions });
  };

  const removeCondition = (conditionId: string) => {
    const nextConditions = conditions.filter(
      (condition) => condition.id !== conditionId
    );
    handleUpdate({ conditions: nextConditions });
  };

  const isButtons = messageKind === 'BUTTONS';
  const isList = messageKind === 'LIST';

  const optionsTitle = isButtons
    ? 'Botones'
    : isList
    ? 'Ítems de la lista'
    : 'Opciones';

  const renderSettings = () => {
    if (isButtons) {
      return (
        <>
          <label className="node-editor__label">
            Título de botones (opcional)
          </label>
          <input
            type="text"
            value={buttonSettings.title ?? ''}
            onChange={(event) =>
              handleUpdate({
                buttonSettings: {
                  ...buttonSettings,
                  title: event.target.value,
                },
              })
            }
            className="node-editor__input"
            placeholder="Ej: Menú principal"
          />
          <label className="node-editor__label">Pie de página (opcional)</label>
          <input
            type="text"
            value={buttonSettings.footer ?? ''}
            onChange={(event) =>
              handleUpdate({
                buttonSettings: {
                  ...buttonSettings,
                  footer: event.target.value,
                },
              })
            }
            className="node-editor__input"
            placeholder="Ej: Ecofarma Villa Nueva"
          />
        </>
      );
    }
    if (isList) {
      return (
        <>
          <label className="node-editor__label">Texto del botón de lista</label>
          <input
            type="text"
            value={listSettings.buttonText ?? ''}
            onChange={(event) =>
              handleUpdate({
                listSettings: {
                  ...listSettings,
                  buttonText: event.target.value,
                },
              })
            }
            className="node-editor__input"
            placeholder="Ej: Ver opciones"
          />
          <label className="node-editor__label">Título de la sección</label>
          <input
            type="text"
            value={listSettings.title ?? ''}
            onChange={(event) =>
              handleUpdate({
                listSettings: { ...listSettings, title: event.target.value },
              })
            }
            className="node-editor__input"
            placeholder="Ej: Opciones disponibles"
          />
          <label className="node-editor__label">Descripción (opcional)</label>
          <textarea
            value={listSettings.description ?? ''}
            onChange={(event) =>
              handleUpdate({
                listSettings: {
                  ...listSettings,
                  description: event.target.value,
                },
              })
            }
            className="node-editor__textarea"
            placeholder="Ej: Selecciona una opción para continuar"
          />
        </>
      );
    }
    return null;
  };

  const nodeTypeClass = `flow-node-type-${(
    node.data.type ||
    node.type ||
    ''
  ).toLowerCase()}`;
  return (
    <aside className="node-editor">
      <div
        className={`node-editor__header ${nodeTypeClass}`}
        style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
      >
        <h3 className="node-editor__title">Editar Nodo</h3>
        {typeof node.data.flowId === 'number' && (
          <span className="node-editor__badge">ID: {node.data.flowId}</span>
        )}
      </div>

      <div className="node-editor__content">
        <div className="node-editor__section">
          <label className="node-editor__label">Nombre del Nodo</label>
          <input
            type="text"
            value={node.data.label}
            onChange={(event) => handleUpdate({ label: event.target.value })}
            className="node-editor__input"
            placeholder="Nombre interno del menú"
          />

          <label className="node-editor__label">Tipo de Nodo</label>
          <select
            value={node.data.type}
            onChange={handleTypeChange}
            className="node-editor__select"
          >
            {FLOW_NODE_TYPES.map((type) => (
              <option key={type} value={type}>
                {FLOW_NODE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <p className="node-editor__note">
            {FLOW_NODE_TYPE_DESCRIPTIONS[node.data.type]}
          </p>
        </div>

        <div className="node-editor__section">
          <label className="node-editor__label">Tipo de Mensaje</label>
          <select
            value={messageKind}
            onChange={(event) =>
              handleUpdate({
                messageKind: event.target.value as FlowMessageKind,
              })
            }
            className="node-editor__select"
          >
            <option value="TEXT">Texto Simple</option>
            <option value="BUTTONS">Botones Interactivos</option>
            <option value="LIST">Lista Interactiva</option>
          </select>

          <label className="node-editor__label">Mensaje Principal</label>
          <textarea
            value={node.data.message}
            onChange={(event) => handleUpdate({ message: event.target.value })}
            className="node-editor__textarea"
            placeholder="Contenido que verá el usuario"
            rows={4}
          />
          {renderSettings()}
        </div>

        {isRedirect && (
          <div className="node-editor__section">
            <label className="node-editor__label">Area destino</label>
            {areasLoading ? (
              <p className="node-editor__note">Cargando areas disponibles...</p>
            ) : areas.length ? (
              <select
                value={node.data.areaId ?? ''}
                onChange={handleAreaChange}
                className="node-editor__select"
              >
                <option value="">Seleccionar area</option>
                {areas.map((area: AreaOption) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="node-editor__note">
                No hay areas activas. Crea una desde el panel de areas para
                derivar la conversacion.
              </p>
            )}
          </div>
        )}

        {canUseConditions && (
          <div className="node-editor__section">
            <div className="node-editor__options-header">
              <h4 className="node-editor__title">Condiciones</h4>
              <button
                type="button"
                onClick={addCondition}
                className="node-editor__add-option"
              >
                Agregar condicion
              </button>
            </div>
            <p className="node-editor__note">
              Se evaluan antes de los triggers y permiten redirigir segun el
              texto recibido.
            </p>

            {conditions.length === 0 ? (
              <p className="node-editor__empty">
                No hay condiciones configuradas.
              </p>
            ) : (
              conditions.map((condition) => (
                <ConditionCard
                  key={condition.id}
                  condition={condition}
                  availableTargets={availableTargets}
                  onUpdate={updateCondition}
                  onRemove={removeCondition}
                />
              ))
            )}
          </div>
        )}

        {(isButtons || isList) && (
          <div className="node-editor__section">
            <div className="node-editor__options-header">
              <h4 className="node-editor__title">{optionsTitle}</h4>
              <button
                type="button"
                onClick={addOption}
                className="node-editor__add-option"
              >
                Agregar
              </button>
            </div>
            <p className="node-editor__note">
              {isButtons
                ? 'Cada opción será un botón. WhatsApp permite hasta 3 botones.'
                : 'Cada opción será un ítem en la lista.'}
            </p>

            {options.length === 0 ? (
              <p className="node-editor__empty">
                No hay {optionsTitle.toLowerCase()} configurados.
              </p>
            ) : (
              options.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  isButton={isButtons}
                  availableTargets={availableTargets}
                  onUpdate={updateOption}
                  onRemove={removeOption}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="node-editor__footer">
        <button
          type="button"
          className="node-editor__action-button"
          onClick={() => onDuplicateNode(node.id)}
        >
          Duplicar
        </button>
        <button
          type="button"
          className="node-editor__action-button node-editor__action-button--danger"
          onClick={() => onDeleteNode(node.id)}
        >
          Eliminar
        </button>
      </div>
    </aside>
  );
};

interface OptionCardProps {
  option: FlowOption;
  isButton: boolean;
  availableTargets: FlowBuilderNode[];
  onUpdate: (optionId: string, patch: Partial<FlowOption>) => void;
  onRemove: (optionId: string) => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  option,
  isButton,
  availableTargets,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="node-editor__option-card">
      <div className="node-editor__option-header">
        <span className="node-editor__option-title">
          {isButton ? 'Botón' : 'Ítem'}
        </span>
        <button
          type="button"
          onClick={() => onRemove(option.id)}
          className="node-editor__remove-option"
        >
          &times;
        </button>
      </div>

      <label className="node-editor__label">Texto a mostrar</label>
      <input
        type="text"
        value={option.label}
        onChange={(event) => onUpdate(option.id, { label: event.target.value })}
        className="node-editor__input"
        placeholder={isButton ? 'Texto del botón' : 'Título del ítem'}
      />

      <label className="node-editor__label">Trigger (identificador)</label>
      <input
        type="text"
        value={option.trigger}
        onChange={(event) =>
          onUpdate(option.id, { trigger: event.target.value })
        }
        className="node-editor__input"
        placeholder="Si se deja vacío, se auto-genera"
      />

      <label className="node-editor__label">Conectar con el nodo</label>
      <select
        value={option.targetId ?? ''}
        onChange={(event) =>
          onUpdate(option.id, { targetId: event.target.value || null })
        }
        className="node-editor__select"
      >
        <option value="">No redirigir</option>
        {availableTargets.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.data.label}
          </option>
        ))}
      </select>
    </div>
  );
};

interface ConditionCardProps {
  condition: FlowCondition;
  availableTargets: FlowBuilderNode[];
  onUpdate: (conditionId: string, patch: Partial<FlowCondition>) => void;
  onRemove: (conditionId: string) => void;
}

const ConditionCard: React.FC<ConditionCardProps> = ({
  condition,
  availableTargets,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="node-editor__option-card">
      <div className="node-editor__option-header">
        <span className="node-editor__option-title">Condicion</span>
        <button
          type="button"
          onClick={() => onRemove(condition.id)}
          className="node-editor__remove-option"
        >
          &times;
        </button>
      </div>

      <label className="node-editor__label">Etiqueta (opcional)</label>
      <input
        type="text"
        value={condition.label ?? ''}
        onChange={(event) =>
          onUpdate(condition.id, { label: event.target.value })
        }
        className="node-editor__input"
        placeholder="Texto interno para identificarla"
      />

      <label className="node-editor__label">Coincidencia</label>
      <input
        type="text"
        value={condition.match ?? ''}
        onChange={(event) =>
          onUpdate(condition.id, { match: event.target.value })
        }
        className="node-editor__input"
        placeholder="Ej: pagos, soporte o una expresion regular"
      />

      <label className="node-editor__label">Modo de coincidencia</label>
      <select
        value={condition.matchMode ?? 'EXACT'}
        onChange={(event) =>
          onUpdate(condition.id, {
            matchMode: event.target.value as FlowCondition['matchMode'],
          })
        }
        className="node-editor__select"
      >
        <option value="EXACT">Exacta / triggers</option>
        <option value="CONTAINS">Contiene</option>
        <option value="REGEX">Expresion regular</option>
      </select>

      <label className="node-editor__label">Redirigir al nodo</label>
      <select
        value={condition.targetId ?? ''}
        onChange={(event) =>
          onUpdate(condition.id, {
            targetId: event.target.value || null,
          })
        }
        className="node-editor__select"
      >
        <option value="">Mantener en el nodo actual</option>
        {availableTargets.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.data.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default NodeEditor;
