const waiters: Array<() => void> = [];
const activeTasks = new Map<
  number,
  { id: number; label: string; startedAt: number }
>();
let nextTaskId = 1;

/**
 * Registra una tarea de larga duración para que el shutdown espere antes de matar el proceso.
 * Devuelve una función que se debe invocar cuando la tarea finalice.
 */
export function beginTrackedTask(label: string): () => void {
  const id = nextTaskId++;
  activeTasks.set(id, { id, label, startedAt: Date.now() });

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    activeTasks.delete(id);
    if (activeTasks.size === 0) {
      while (waiters.length) {
        const resolve = waiters.pop();
        resolve?.();
      }
    }
  };
}

export function getPendingTaskCount(): number {
  return activeTasks.size;
}

export function getPendingTaskSummary() {
  return Array.from(activeTasks.values()).map((task) => ({
    id: task.id,
    label: task.label,
    durationMs: Date.now() - task.startedAt,
  }));
}

/**
 * Espera a que las tareas pendientes terminen o hasta que se alcance el timeout.
 */
export async function waitForTrackedTasks(timeoutMs = 5000) {
  if (activeTasks.size === 0) {
    return;
  }

  await Promise.race([
    new Promise<void>((resolve) => waiters.push(resolve)),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
