import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type FlowType = 'MESSAGE' | 'MENU' | 'ACTION' | 'REDIRECT' | 'END';
type FlowMessageKind = 'TEXT' | 'BUTTONS' | 'LIST';

interface FlowOption {
  id: string;
  label: string;
  trigger: string;
}

interface ButtonSettings {
  title?: string;
  footer?: string;
}

interface ListSettings {
  buttonText?: string;
  title?: string;
  description?: string;
}

interface FlowMetadata {
  messageKind: FlowMessageKind;
  options: FlowOption[];
  buttonSettings?: ButtonSettings;
  listSettings?: ListSettings;
}

type FlowNode = {
  id: number;
  name: string;
  trigger: string | null;
  message: string;
  type: FlowType;
  parentId: number | null;
  areaId: number | null;
  orderIndex: number;
  isActive: boolean;
  children: FlowNode[];
  metadata: any | null;
};

type AreaItem = {
  id: number;
  name: string;
  isActive: boolean;
};

type FlowFormState = {
  id: number | null;
  name: string;
  type: FlowType;
  trigger: string;
  message: string;
  parentId: number | null;
  areaId: number | null;
  orderIndex: number;
  isActive: boolean;
  metadata: FlowMetadata;
};

const initialFormState: FlowFormState = {
  id: null,
  name: '',
  type: 'MESSAGE',
  trigger: '',
  message: '',
  parentId: null,
  areaId: null,
  orderIndex: 0,
  isActive: true,
  metadata: {
    messageKind: 'TEXT',
    options: [],
    buttonSettings: { title: '', footer: '' },
    listSettings: { buttonText: '', title: '', description: '' },
  },
};

const FLOW_TYPE_OPTIONS: {
  value: FlowType;
  label: string;
  description: string;
}[] = [
  { value: 'MESSAGE', label: 'Mensaje', description: 'Envia un texto simple' },
  {
    value: 'MENU',
    label: 'Menu',
    description: 'Presenta opciones numericas al contacto',
  },
  {
    value: 'ACTION',
    label: 'Accion',
    description: 'Ejecuta logica personalizada (placeholder)',
  },
  {
    value: 'REDIRECT',
    label: 'Agente',
    description: 'Deriva la conversacion a un area u operador',
  },
  { value: 'END', label: 'Fin', description: 'Finaliza el flujo' },
];

function extractBuilderMetadata(metadata: any): Partial<FlowMetadata> {
  if (!metadata?.builder) {
    return {};
  }
  const builder = metadata.builder;
  return {
    messageKind: builder.messageType || 'TEXT',
    options: builder.options || [],
    buttonSettings: builder.buttonSettings || {},
    listSettings: builder.listSettings || {},
  };
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowNode[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<FlowFormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const areaMap = useMemo(() => {
    const map = new Map<number, AreaItem>();
    areas.forEach((area) => map.set(area.id, area));
    return map;
  }, [areas]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [flowsResponse, areasResponse] = await Promise.all([
        api.get<FlowNode[]>('/flows'),
        api.get<AreaItem[]>('/areas', { params: { active: true } }),
      ]);
      setFlows(flowsResponse.data);
      setAreas(areasResponse.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleEdit = (node: FlowNode) => {
    const builderMeta = extractBuilderMetadata(node.metadata);
    setFormState({
      id: node.id,
      name: node.name,
      type: node.type,
      trigger: node.trigger ?? '',
      message: node.message,
      parentId: node.parentId,
      areaId: node.areaId,
      orderIndex: node.orderIndex,
      isActive: node.isActive,
      metadata: {
        messageKind: builderMeta.messageKind ?? 'TEXT',
        options: builderMeta.options ?? [],
        buttonSettings: builderMeta.buttonSettings ?? { title: '', footer: '' },
        listSettings: builderMeta.listSettings ?? {
          buttonText: '',
          title: '',
          description: '',
        },
      },
    });
  };

  const handleResetForm = () => {
    setFormState(initialFormState);
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este paso del flujo?')) return;
    await api.delete(`/flows/${id}`);
    void fetchData();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        id: formState.id ?? undefined,
        name: formState.name,
        type: formState.type,
        trigger: formState.trigger.trim() || null,
        message: formState.message,
        parentId: formState.parentId,
        areaId: formState.areaId,
        orderIndex: formState.orderIndex,
        isActive: formState.isActive,
        metadata: {
          builder: {
            messageType: formState.metadata.messageKind,
            options: formState.metadata.options,
            buttonSettings: formState.metadata.buttonSettings,
            listSettings: formState.metadata.listSettings,
          },
        },
      };
      await api.post('/flows', payload);
      handleResetForm();
      void fetchData();
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el flujo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ margin: 0 }}>
          {formState.id ? 'Editar paso del flujo' : 'Nuevo paso del flujo'}
        </h2>
        <p style={{ marginTop: '0.25rem', color: '#64748b' }}>
          Crea menús, respuestas y derivaciones para automatizar la atención.
        </p>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            marginTop: '1rem',
          }}
        >
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Nombre interno</span>
            <input
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, name: event.target.value }))
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Tipo de paso</span>
            <select
              value={formState.type}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  type: event.target.value as FlowType,
                }))
              }
              style={inputStyle}
            >
              {FLOW_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Orden dentro del menú</span>
            <input
              type="number"
              value={formState.orderIndex}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  orderIndex: Number(event.target.value),
                }))
              }
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Padre</span>
            <select
              value={formState.parentId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setFormState((prev) => ({
                  ...prev,
                  parentId: value ? Number(value) : null,
                }));
              }}
              style={inputStyle}
            >
              <option value="">Sin padre (flujo principal)</option>
              {flattenFlows(flows).map((node) => (
                <option key={node.id} value={node.id}>
                  {renderNodeLabel(node, areaMap)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Derivar a área (opcional)</span>
            <select
              value={formState.areaId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setFormState((prev) => ({
                  ...prev,
                  areaId: value ? Number(value) : null,
                }));
              }}
              style={inputStyle}
              disabled={areas.length === 0}
            >
              <option value="">Sin asignar</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Disparador</span>
            <input
              value={formState.trigger}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  trigger: event.target.value,
                }))
              }
              placeholder="Ej: 1, soporte, *default*"
              style={inputStyle}
            />
          </label>
          <label
            style={{ display: 'grid', gap: '0.35rem', gridColumn: '1 / -1' }}
          >
            <span>Mensaje a enviar</span>
            <textarea
              value={formState.message}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  message: event.target.value,
                }))
              }
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              required
            />
          </label>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  isActive: event.target.checked,
                }))
              }
            />
            Paso activo
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting
                ? 'Guardando...'
                : formState.id
                ? 'Actualizar'
                : 'Crear paso'}
            </button>
            {formState.id && (
              <button
                type="button"
                onClick={handleResetForm}
                style={linkButtonStyle}
              >
                Cancelar edición
              </button>
            )}
            {error && <span style={{ color: '#ef4444' }}>{error}</span>}
          </div>
        </form>
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Mapa de flujos</h2>
            <p style={{ margin: 0, color: '#64748b' }}>
              Revisa la jerarquía de menús y pasos automáticos.
            </p>
          </div>
          <button
            onClick={() => void fetchData()}
            style={{
              border: '1px solid #0f172a',
              borderRadius: '8px',
              padding: '0.5rem 1.25rem',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Actualizar
          </button>
        </header>

        {loading ? (
          <p>Cargando flujos...</p>
        ) : flows.length === 0 ? (
          <p>Aún no hay flujos configurados.</p>
        ) : (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            {flows.map((node) => (
              <FlowTreeItem
                key={node.id}
                node={node}
                depth={0}
                areaMap={areaMap}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FlowTreeItem({
  node,
  depth,
  areaMap,
  onEdit,
  onDelete,
}: {
  node: FlowNode;
  depth: number;
  areaMap: Map<number, AreaItem>;
  onEdit: (node: FlowNode) => void;
  onDelete: (id: number) => void;
}) {
  const area = node.areaId ? areaMap.get(node.areaId) : null;
  const builderMeta = extractBuilderMetadata(node.metadata);

  return (
    <div
      style={{
        marginLeft: depth * 24,
        borderLeft: depth ? '2px solid #e2e8f0' : 'none',
        paddingLeft: depth ? '1rem' : 0,
        display: 'grid',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          background: '#f8fafc',
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'grid',
          gap: '0.35rem',
          border: node.isActive ? '1px solid #cbd5f5' : '1px dashed #cbd5f5',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>{node.name}</strong>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {builderMeta.messageKind && builderMeta.messageKind !== 'TEXT' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: '#e0f2fe',
                  color: '#0ea5e9',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {builderMeta.messageKind}
              </span>
            )}
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
              {flowTypeLabel(node.type)}
            </span>
          </div>
        </div>
        {node.trigger && (
          <div style={{ fontSize: '0.85rem', color: '#475569' }}>
            Disparador: <strong>{node.trigger}</strong>
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>
          {node.message}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Área destino: {area?.name ?? 'Sin asignar'} · Orden: {node.orderIndex}{' '}
          · Estado: {node.isActive ? 'Activo' : 'Inactivo'}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            style={linkButtonStyle}
            onClick={() => onEdit(node)}
            type="button"
          >
            Editar
          </button>
          <button
            style={{ ...linkButtonStyle, color: '#ef4444' }}
            onClick={() => onDelete(node.id)}
            type="button"
          >
            Eliminar
          </button>
        </div>
      </div>
      {node.children.length > 0 && (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {node.children.map((child) => (
            <FlowTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              areaMap={areaMap}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function flattenFlows(nodes: FlowNode[]): FlowNode[] {
  return nodes.flatMap((node) => [node, ...flattenFlows(node.children)]);
}

function renderNodeLabel(node: FlowNode, areaMap: Map<number, AreaItem>) {
  const area = node.areaId ? areaMap.get(node.areaId) : null;
  return `${node.name} (${flowTypeLabel(node.type)}${
    area ? ` · ${area.name}` : ''
  })`;
}

function flowTypeLabel(type: FlowType) {
  return (
    FLOW_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.65rem 1rem',
  borderRadius: '8px',
  border: '1px solid #cbd5f5',
};

const linkButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#2563eb',
  cursor: 'pointer',
  padding: 0,
  fontSize: '0.9rem',
};
// Archivo eliminado. Ver eliminacion-flows-log.md para detalles.
