import React from 'react';
import type { FlowBuilderNode, FlowNodeData } from './types';

// Formularios visuales y tipados para cada tipo de nodo
import { StartNodeForm } from '../../components/flow-nodes/StartNodeForm';
import { TextNodeForm } from '../../components/flow-nodes/TextNodeForm';
import { CaptureNodeForm } from '../../components/flow-nodes/CaptureNodeForm';
import { ConditionalNodeForm } from '../../components/flow-nodes/ConditionalNodeForm';
import { DelayNodeForm } from '../../components/flow-nodes/DelayNodeForm';
import { ScheduleNodeForm } from '../../components/flow-nodes/ScheduleNodeForm';
import { RedirectBotNodeForm } from '../../components/flow-nodes/RedirectBotNodeForm';
import { RedirectAgentNodeForm } from '../../components/flow-nodes/RedirectAgentNodeForm';
import { AINodeForm } from '../../components/flow-nodes/AINodeForm';
import { SetVariableNodeForm } from '../../components/flow-nodes/SetVariableNodeForm';
import { NoteNodeForm } from '../../components/flow-nodes/NoteNodeForm';
import { EndNodeForm } from '../../components/flow-nodes/EndNodeForm';
//

interface NodeEditorProps {
  node: FlowBuilderNode;
  onChange: (updated: FlowBuilderNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
}

function updateNodeData<T extends FlowNodeData>(
  node: FlowBuilderNode,
  patch: Partial<T>
): FlowBuilderNode {
  return {
    ...node,
    data: {
      ...node.data,
      ...patch,
    } as FlowNodeData,
  };
}

const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  onChange,
  onDeleteNode,
  onDuplicateNode,
}) => {
  const handleUpdate = (patch: Partial<FlowNodeData>) => {
    onChange(updateNodeData(node, patch));
  };

  // handleTypeChange eliminado: no se usa

  // Eliminado: areaId ya no es parte de los tipos

  // Funciones de opciones solo para nodos tipo TEXT
  // Funciones de opciones eliminadas: no se usan en este componente

  // Eliminado: lógica de condiciones, ya que ningún nodo tiene 'conditions'

  // isButtons, isList, optionsTitle, renderSettings eliminados: no se usan

  const nodeTypeClass = `flow-node-type-${(
    node.data.type ||
    node.type ||
    ''
  ).toLowerCase()}`;
  // Renderizado modular según el tipo de nodo
  let nodeForm: React.ReactNode = null;

  // Detectar si es un nodo capturador (nodo TEXT con isCaptureNode flag)
  const isCaptureNode =
    node.data.type === 'TEXT' && (node.data as any)?.isCaptureNode === true;

  switch (node.data.type) {
    case 'START':
      nodeForm = <StartNodeForm />;
      break;
    case 'TEXT': {
      const data = node.data;

      // Renderizar CaptureNodeForm si es un nodo capturador
      if (isCaptureNode) {
        const derivedVariableName = (
          data.responseVariableName ??
          data.saveResponseToVariable ??
          ''
        ).toString();
        nodeForm = (
          <CaptureNodeForm
            message={data.message}
            variableName={derivedVariableName}
            variableType={data.responseVariableType ?? 'STRING'}
            audioModel={data.audioModel ?? null}
            imageModel={data.imageModel ?? null}
            onChange={({
              message,
              variableName,
              variableType,
              audioModel,
              imageModel,
            }) => {
              const normalizedVariable = (variableName ?? '').trim() || null;
              handleUpdate({
                message,
                waitForResponse: true,
                responseVariableName: normalizedVariable,
                responseVariableType: variableType ?? 'STRING',
                audioModel: audioModel ?? null,
                imageModel: imageModel ?? null,
                // Legacy compatibility
                saveResponseToVariable: normalizedVariable,
              });
            }}
          />
        );
      } else {
        // Renderizar TextNodeForm normal
        const derivedWait =
          typeof data.waitForResponse === 'boolean'
            ? data.waitForResponse
            : Boolean(data.responseVariableName || data.saveResponseToVariable);
        const derivedVariableName = (
          data.responseVariableName ??
          data.saveResponseToVariable ??
          ''
        ).toString();
        nodeForm = (
          <TextNodeForm
            value={data.message}
            waitForResponse={derivedWait}
            variableName={derivedVariableName}
            variableType={data.responseVariableType ?? 'STRING'}
            audioModel={data.audioModel ?? null}
            imageModel={data.imageModel ?? null}
            availableVariables={data.availableVariables}
            onChange={({
              value,
              waitForResponse,
              variableName,
              variableType,
              audioModel,
              imageModel,
            }) => {
              const normalizedVariable = (variableName ?? '').trim() || null;
              handleUpdate({
                message: value,
                waitForResponse,
                responseVariableName: waitForResponse
                  ? normalizedVariable
                  : null,
                responseVariableType: waitForResponse
                  ? variableType ?? 'STRING'
                  : undefined,
                audioModel: waitForResponse ? audioModel ?? null : null,
                imageModel: waitForResponse ? imageModel ?? null : null,
                // Legacy compatibility
                saveResponseToVariable: waitForResponse
                  ? normalizedVariable
                  : null,
              });
            }}
          />
        );
      }
      break;
    }
    case 'CAPTURE': {
      const data = node.data;
      nodeForm = (
        <CaptureNodeForm
          message={data.message}
          variableName={data.responseVariableName}
          variableType={data.responseVariableType ?? 'STRING'}
          audioModel={data.audioModel ?? null}
          imageModel={data.imageModel ?? null}
          availableVariables={data.availableVariables}
          onChange={({
            message,
            variableName,
            variableType,
            audioModel,
            imageModel,
          }) => {
            const normalizedVariable = (variableName ?? '').trim() || '';
            handleUpdate({
              message,
              responseVariableName: normalizedVariable,
              responseVariableType: variableType ?? 'STRING',
              audioModel: audioModel ?? null,
              imageModel: imageModel ?? null,
              waitForResponse: true,
            });
          }}
        />
      );
      break;
    }
    case 'CONDITIONAL': {
      const data = node.data;
      nodeForm = (
        <ConditionalNodeForm
          sourceVariable={data.sourceVariable}
          evaluations={data.evaluations}
          defaultLabel={data.defaultLabel}
          availableVariables={data.availableVariables}
          onChange={({ sourceVariable, evaluations, defaultLabel }) =>
            handleUpdate({ sourceVariable, evaluations, defaultLabel })
          }
        />
      );
      break;
    }
    case 'DELAY': {
      const data = node.data;
      nodeForm = (
        <DelayNodeForm
          seconds={data.seconds}
          onChange={({ seconds }) => handleUpdate({ seconds })}
        />
      );
      break;
    }
    case 'SCHEDULE': {
      const data = node.data;
      nodeForm = (
        <ScheduleNodeForm
          week={data.week}
          onChange={(week) => handleUpdate({ week })}
        />
      );
      break;
    }
    case 'REDIRECT_BOT': {
      const data = node.data;
      nodeForm = (
        <RedirectBotNodeForm
          targetBotId={data.targetBotId}
          botOptions={[]}
          onChange={({ targetBotId }) => handleUpdate({ targetBotId })}
        />
      );
      break;
    }
    case 'REDIRECT_AGENT': {
      const data = node.data;
      nodeForm = (
        <RedirectAgentNodeForm
          agentId={data.agentId}
          agentOptions={[]}
          onChange={({ agentId }) => handleUpdate({ agentId })}
        />
      );
      break;
    }
    case 'AI': {
      const data = node.data;
      nodeForm = (
        <AINodeForm
          prompt={data.prompt}
          model={data.model}
          modelOptions={['gpt-3.5', 'gpt-4']}
          onChange={({ prompt, model }) => handleUpdate({ prompt, model })}
        />
      );
      break;
    }
    case 'SET_VARIABLE': {
      const data = node.data;
      nodeForm = (
        <SetVariableNodeForm
          variable={data.variable}
          value={data.value}
          availableVariables={data.availableVariables}
          onChange={({ variable, value }) => handleUpdate({ variable, value })}
        />
      );
      break;
    }
    case 'NOTE': {
      const data = node.data;
      nodeForm = (
        <NoteNodeForm
          value={data.value}
          availableVariables={data.availableVariables}
          onChange={({ value }) => handleUpdate({ value })}
        />
      );
      break;
    }
    case 'END':
      nodeForm = <EndNodeForm />;
      break;
    default:
      nodeForm = <div>Tipo de nodo no soportado.</div>;
  }

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
      <div className="node-editor__content">{nodeForm}</div>
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

// OptionCard eliminado: no se usa en este componente

export default NodeEditor;
