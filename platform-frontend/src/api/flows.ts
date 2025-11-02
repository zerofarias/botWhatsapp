import type {
  FlowGraphPayload,
  FlowGraphResponse,
  SaveGraphResponse,
} from '../views/FlowBuilder/types';
import { api } from '../services/api';

export async function saveFlowGraph(
  graph: FlowGraphPayload
): Promise<SaveGraphResponse> {
  const { data } = await api.post<SaveGraphResponse>(
    '/flows/save-graph',
    graph
  );
  return data;
}

export async function getFlowGraph(botId: number): Promise<FlowGraphResponse> {
  const { data } = await api.get<FlowGraphResponse>('/flows/graph', {
    params: { botId },
  });
  return data;
}
