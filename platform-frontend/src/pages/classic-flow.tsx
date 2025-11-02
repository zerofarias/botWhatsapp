import React, { useState, useEffect } from 'react';

// Corresponds to the Prisma model `flow_classic`
interface FlowStepBE {
  id: number;
  flow_id: number;
  parent_id: number | null;
  type: 'text' | 'wait' | 'trigger' | 'delay' | 'end';
  label: string;
  value: string | null;
  seconds: number | null;
  trigger_keyword: string | null;
  order_in_parent: number;
}

// Frontend representation with children for rendering
interface FlowStep extends Omit<FlowStepBE, 'id' | 'parent_id'> {
  id: number | string; // Can be a temporary string for new nodes
  parent_id: number | string | null;
  children: FlowStep[];
}

// Helper to build the tree structure for the UI
function buildTree(nodes: FlowStepBE[]): FlowStep[] {
  const nodeMap = new Map<number, FlowStep>();
  const roots: FlowStep[] = [];

  // First pass: create a map of nodes
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Second pass: build the tree
  nodes.forEach((node) => {
    const currentNode = nodeMap.get(node.id)!;
    if (node.parent_id !== null && nodeMap.has(node.parent_id)) {
      const parentNode = nodeMap.get(node.parent_id)!;
      parentNode.children.push(currentNode);
    } else {
      roots.push(currentNode);
    }
  });

  // Sort children by order_in_parent
  nodeMap.forEach((node) => {
    node.children.sort((a, b) => a.order_in_parent - b.order_in_parent);
  });
  roots.sort((a, b) => a.order_in_parent - b.order_in_parent);

  return roots;
}

// Helper to flatten the tree structure for the backend
function flattenTree(
  nodes: FlowStep[],
  flowId: number,
  parentId: number | null = null
): FlowStepBE[] {
  let flatList: FlowStepBE[] = [];
  nodes.forEach((node, index) => {
    const { children, ...rest } = node;
    const newNode: FlowStepBE = {
      ...rest,
      id: typeof node.id === 'number' ? node.id : 0, // Backend will assign a new ID
      flow_id: flowId,
      parent_id: parentId,
      order_in_parent: index,
      value: rest.value || null,
      seconds: rest.seconds || null,
      trigger_keyword: rest.trigger_keyword || null,
    };
    flatList.push(newNode);
    if (children && children.length > 0) {
      flatList = flatList.concat(
        flattenTree(
          children,
          flowId,
          typeof node.id === 'number' ? node.id : null
        )
      );
    }
  });
  return flatList;
}

const ClassicFlow: React.FC = () => {
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [currentStep, setCurrentStep] = useState<FlowStep | any>({});
  const [parentStepId, setParentStepId] = useState<string | number | null>(
    null
  );
  const [saved, setSaved] = useState(false);
  const flowId = 1; // This could be dynamic, from URL params for example

  // Load flow on mount
  useEffect(() => {
    async function fetchFlow() {
      try {
        const res = await fetch(`/api/classic-flow/${flowId}`);
        if (res.ok) {
          const data: FlowStepBE[] = await res.json();
          setSteps(buildTree(data));
        }
      } catch (err) {
        console.error('Error fetching flow:', err);
      }
    }
    fetchFlow();
  }, [flowId]);

  const typeColors: { [key in FlowStep['type']]: string } = {
    text: '#388e3c',
    wait: '#fbc02d',
    trigger: '#7b1fa2',
    delay: '#0288d1',
    end: '#d32f2f',
  };

  const addStep = (type: FlowStep['type']) => {
    const newStep: FlowStep = {
      id: `new-${Date.now()}`,
      type,
      label: `Paso de ${type}`,
      children: [],
      parent_id: null,
      flow_id: flowId,
      order_in_parent: steps.length,
      value: '',
      seconds: 0,
      trigger_keyword: '',
    };
    setSteps([...steps, newStep]);
    setCurrentStep(newStep);
  };

  const addChildStep = (parentId: string | number, type: FlowStep['type']) => {
    const add = (nodes: FlowStep[]): FlowStep[] =>
      nodes.map((node) => {
        if (node.id === parentId) {
          const newStep: FlowStep = {
            id: `new-${Date.now()}`,
            type,
            label: `Hijo de ${type}`,
            children: [],
            parent_id: parentId,
            flow_id: flowId,
            order_in_parent: node.children.length,
            value: '',
            seconds: 0,
            trigger_keyword: '',
          };
          setCurrentStep(newStep);
          return { ...node, children: [...node.children, newStep] };
        }
        return { ...node, children: node.children ? add(node.children) : [] };
      });

    setSteps(add(steps));
  };

  const updateStepProperty = (
    id: string | number,
    property: keyof FlowStep,
    value: any
  ) => {
    const update = (nodes: FlowStep[]): FlowStep[] =>
      nodes.map((node) => {
        if (node.id === id) {
          return { ...node, [property]: value };
        }
        return {
          ...node,
          children: node.children ? update(node.children) : [],
        };
      });
    setSteps(update(steps));
    if (currentStep.id === id) {
      setCurrentStep({ ...currentStep, [property]: value });
    }
  };

  function renderStepInfo(step: FlowStep) {
    switch (step.type) {
      case 'text':
        return (
          <div style={{ marginTop: 6 }}>
            <label style={{ fontWeight: 500, marginRight: 6 }}>Texto:</label>
            <input
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #bbb',
                minWidth: 120,
              }}
              value={step.value || ''}
              onChange={(e) =>
                updateStepProperty(step.id, 'value', e.target.value)
              }
              placeholder="Mensaje a enviar"
            />
          </div>
        );
      case 'delay':
        return (
          <div style={{ marginTop: 6 }}>
            <label style={{ fontWeight: 500, marginRight: 6 }}>Segundos:</label>
            <input
              type="number"
              min={1}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #bbb',
                width: 80,
              }}
              value={step.seconds || ''}
              onChange={(e) =>
                updateStepProperty(step.id, 'seconds', Number(e.target.value))
              }
              placeholder="Ej: 2"
            />
          </div>
        );
      case 'trigger':
        return (
          <div style={{ marginTop: 6 }}>
            <label style={{ fontWeight: 500, marginRight: 6 }}>Keyword:</label>
            <input
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #bbb',
                minWidth: 120,
              }}
              value={step.trigger_keyword || ''}
              onChange={(e) =>
                updateStepProperty(step.id, 'trigger_keyword', e.target.value)
              }
              placeholder="Palabra clave"
            />
          </div>
        );
      default:
        return null;
    }
  }

  function renderSteps(step: FlowStep, level = 0): JSX.Element {
    return (
      <li
        key={step.id}
        style={{
          marginBottom: 12,
          marginLeft: level * 32,
          borderLeft: level > 0 ? '2px solid #e0e0e0' : undefined,
          paddingLeft: 12,
          listStyle: 'none',
        }}
      >
        <div
          onClick={() => setCurrentStep(step)}
          style={{
            background: '#fff',
            border: `1.5px solid ${
              currentStep.id === step.id ? '#1976d2' : typeColors[step.type]
            }`,
            borderRadius: 8,
            boxShadow: '0 2px 8px #0001',
            padding: '10px 16px',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 220,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                background: typeColors[step.type],
                color: '#fff',
                borderRadius: 4,
                padding: '2px 8px',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {step.type.toUpperCase()}
            </span>
            <span style={{ fontWeight: 500 }}>{step.label}</span>
            <button
              style={{
                marginLeft: 'auto',
                background: '#f5f5f5',
                border: '1px solid #bbb',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setParentStepId(step.id);
              }}
            >
              ➕ Hijo
            </button>
          </div>
          {renderStepInfo(step)}
        </div>
        {parentStepId === step.id && (
          <div
            style={{
              margin: '8px 0 8px 32px',
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              style={{
                background: typeColors.text,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              onClick={() => {
                addChildStep(step.id, 'text');
                setParentStepId(null);
              }}
            >
              Texto
            </button>
            <button
              style={{
                background: typeColors.wait,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              onClick={() => {
                addChildStep(step.id, 'wait');
                setParentStepId(null);
              }}
            >
              Espera
            </button>
            <button
              style={{
                background: typeColors.trigger,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              onClick={() => {
                addChildStep(step.id, 'trigger');
                setParentStepId(null);
              }}
            >
              Trigger
            </button>
            <button
              style={{
                background: typeColors.delay,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              onClick={() => {
                addChildStep(step.id, 'delay');
                setParentStepId(null);
              }}
            >
              Demora
            </button>
            <button
              style={{
                background: typeColors.end,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              onClick={() => {
                addChildStep(step.id, 'end');
                setParentStepId(null);
              }}
            >
              END
            </button>
            <button
              style={{
                background: '#eee',
                color: '#333',
                border: '1px solid #bbb',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              onClick={() => setParentStepId(null)}
            >
              Cancelar
            </button>
          </div>
        )}
        {step.children && step.children.length > 0 && (
          <ol style={{ marginTop: 8, paddingLeft: 0 }}>
            {step.children.map((child) => renderSteps(child, level + 1))}
          </ol>
        )}
      </li>
    );
  }

  async function handleSave() {
    setSaved(true);
    const flatSteps = flattenTree(steps, flowId);
    try {
      await fetch(`/api/classic-flow/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flatSteps),
      });
    } catch (err) {
      console.error('Error saving flow:', err);
    }
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div
      style={{
        maxWidth: 700,
        margin: '0 auto',
        padding: 32,
        background: '#f7fafd',
        borderRadius: 12,
        boxShadow: '0 2px 16px #0001',
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#1976d2', marginBottom: 24 }}>
        Formulario Clásico de Flow
      </h2>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          style={{
            background: '#388e3c',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => addStep('text')}
        >
          + Texto
        </button>
        <button
          style={{
            background: '#fbc02d',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => addStep('wait')}
        >
          + Espera
        </button>
        <button
          style={{
            background: '#7b1fa2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => addStep('trigger')}
        >
          + Trigger
        </button>
        <button
          style={{
            background: '#0288d1',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => addStep('delay')}
        >
          + Demora
        </button>
        <button
          style={{
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => addStep('end')}
        >
          + END
        </button>
      </div>
      <div>
        <h4 style={{ color: '#333', marginBottom: 12 }}>
          Jerarquía de pasos del flujo:
        </h4>
        <ol style={{ paddingLeft: 0 }}>
          {steps.map((step) => renderSteps(step))}
        </ol>
      </div>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button
          onClick={handleSave}
          style={{
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 32px',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 1px 6px #0001',
          }}
        >
          Guardar
        </button>
        {saved && (
          <span style={{ marginLeft: 16, color: '#388e3c', fontWeight: 600 }}>
            ¡Guardado!
          </span>
        )}
      </div>
      <div
        style={{
          marginTop: 40,
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          boxShadow: '0 1px 6px #0001',
        }}
      >
        <h4 style={{ color: '#1976d2', marginBottom: 16 }}>
          Edición del paso actual
        </h4>
        {currentStep.id ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 500 }}>
                Tipo: <b>{currentStep.type}</b>
              </label>
            </div>
            <div>
              <label style={{ fontWeight: 500, marginRight: 8 }}>Label: </label>
              <input
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: '1px solid #bbb',
                  minWidth: 220,
                }}
                value={currentStep.label}
                onChange={(e) =>
                  updateStepProperty(currentStep.id, 'label', e.target.value)
                }
              />
            </div>
            {renderStepInfo(currentStep)}
          </>
        ) : (
          <p>Seleccione un paso o cree uno nuevo.</p>
        )}
      </div>
    </div>
  );
};

export default ClassicFlow;
