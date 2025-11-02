import React from 'react';

export interface FlowToolbarProps {
  onBack?: () => void;
  onTest?: () => void;
  onUploadMedia?: () => void;
  onCreateBlock?: () => void;
  onOpenPermissions?: () => void;
  onSave?: () => void;
  onSearch?: (value: string) => void;
  searchValue?: string;
  disableActions?: boolean;
  nodeTypes?: string[];
  selectedNodeType?: string;
  onNodeTypeChange?: (type: string) => void;
}

export const FlowToolbar: React.FC<FlowToolbarProps> = ({
  onBack,
  onTest,
  onUploadMedia,
  onCreateBlock,
  onOpenPermissions,
  onSave,
  onSearch,
  searchValue = '',
  disableActions = false,
  nodeTypes = [],
  selectedNodeType = '',
  onNodeTypeChange,
}) => (
  <header className="flow-toolbar">
    <div className="flow-toolbar__left">
      <button
        type="button"
        className="flow-toolbar__button"
        onClick={onBack}
        disabled={disableActions}
      >
        Volver
      </button>
      <button
        type="button"
        className="flow-toolbar__button"
        onClick={onTest}
        disabled={disableActions}
      >
        Probar
      </button>
      <button
        type="button"
        className="flow-toolbar__button"
        onClick={onUploadMedia}
        disabled={disableActions}
      >
        Cargar media
      </button>
      {nodeTypes.length > 0 && (
        <div className="flow-toolbar__node-type-selector">
          <label htmlFor="new-node-type" style={{ marginRight: 8 }}>
            Tipo:
          </label>
          <select
            id="new-node-type"
            value={selectedNodeType}
            onChange={(e) => onNodeTypeChange?.(e.target.value)}
            disabled={disableActions}
            style={{ marginRight: 8 }}
          >
            {nodeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="button"
        className="flow-toolbar__button flow-toolbar__button--primary"
        onClick={onCreateBlock}
        disabled={disableActions}
      >
        + Bloque
      </button>
      <button
        type="button"
        className="flow-toolbar__button"
        onClick={onOpenPermissions}
        disabled={disableActions}
      >
        Permisos
      </button>
    </div>
    <div className="flow-toolbar__right">
      <input
        type="text"
        className="flow-toolbar__search"
        placeholder="Buscar bloque por ID"
        value={searchValue}
        onChange={(e) => onSearch?.(e.target.value)}
        disabled={disableActions}
      />
      <button
        type="button"
        className="flow-toolbar__button flow-toolbar__button--success"
        onClick={onSave}
        disabled={disableActions}
      >
        Guardar
      </button>
    </div>
  </header>
);
