import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow';
import type {
  ScheduleNodeData,
  ScheduleDay,
  ScheduleWeek,
} from '../../../views/FlowBuilder/types';

const DAY_DEFINITIONS: Array<{
  key: keyof ScheduleWeek;
  short: string;
  label: string;
}> = [
  { key: 'monday', short: 'L', label: 'Lunes' },
  { key: 'tuesday', short: 'M', label: 'Martes' },
  { key: 'wednesday', short: 'X', label: 'Miércoles' },
  { key: 'thursday', short: 'J', label: 'Jueves' },
  { key: 'friday', short: 'V', label: 'Viernes' },
  { key: 'saturday', short: 'S', label: 'Sábado' },
  { key: 'sunday', short: 'D', label: 'Domingo' },
];

const OPEN_HANDLE_ID = 'schedule-open';
const CLOSED_HANDLE_ID = 'schedule-closed';

function formatRange(range: ScheduleDay): string {
  const from = range.from ? range.from : '--:--';
  const to = range.to ? range.to : '--:--';
  return `${from} - ${to}`;
}

export const ScheduleNode: React.FC<NodeProps<ScheduleNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setLabelValue(data.label);
  }, [data.label]);

  const scheduleRows = useMemo(() => {
    const rows: Array<{
      key: string;
      short: string;
      label: string;
      ranges: ScheduleDay[];
    }> = [];

    for (const def of DAY_DEFINITIONS) {
      const ranges = Array.isArray(data.week?.[def.key])
        ? (data.week?.[def.key] as ScheduleDay[])
        : [];

      if (ranges.length) {
        rows.push({
          key: def.key,
          short: def.short,
          label: def.label,
          ranges,
        });
      }
    }

    return rows;
  }, [data.week]);

  const hasSchedules = scheduleRows.length > 0;

  const handleLabelCommit = () => {
    setIsEditing(false);
    const trimmed = labelValue.trim();
    if (!trimmed || trimmed === data.label) {
      setLabelValue(data.label);
      return;
    }

    setNodes((previousNodes) =>
      previousNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                label: trimmed,
              },
            }
          : node
      )
    );
  };

  return (
    <div
      className={`schedule-node ${selected ? 'schedule-node--selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} style={{ top: '50%' }} />

      <div className="schedule-node__header">
        <span className="schedule-node__chip">Horarios</span>
        {isEditing ? (
          <input
            ref={inputRef}
            className="schedule-node__input"
            value={labelValue}
            onChange={(event) => setLabelValue(event.target.value)}
            onBlur={handleLabelCommit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleLabelCommit();
              } else if (event.key === 'Escape') {
                setLabelValue(data.label);
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="schedule-node__title"
            onDoubleClick={() => setIsEditing(true)}
          >
            {data.label || 'Nodo sin nombre'}
          </button>
        )}
      </div>

      <div className="schedule-node__body">
        {hasSchedules ? (
          scheduleRows.map((row) => (
            <div key={row.key} className="schedule-node__day">
              <div className="schedule-node__day-chip" title={row.label}>
                {row.short}
              </div>
              <div className="schedule-node__ranges">
                {row.ranges.map((range, idx) => (
                  <span key={`${row.key}-${idx}`}>{formatRange(range)}</span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="schedule-node__placeholder">
            Sin horarios configurados
          </div>
        )}
      </div>

      <div className="schedule-node__branches">
        <div className="schedule-node__branch">
          <span>Dentro de horario</span>
          <Handle
            type="source"
            position={Position.Right}
            id={OPEN_HANDLE_ID}
            style={{ top: 'calc(100% - 64px)' }}
          />
        </div>
        <div className="schedule-node__branch schedule-node__branch--closed">
          <span>Fuera de horario</span>
          <Handle
            type="source"
            position={Position.Right}
            id={CLOSED_HANDLE_ID}
            style={{ top: 'calc(100% - 28px)' }}
          />
        </div>
      </div>
    </div>
  );
};
