import React from 'react';
import type { ConversationSummary } from '../../types/chat';
import ConversationListItem from './ConversationListItem';

const FILTER_OPTIONS = [
  { label: 'Todos', value: 'all' },
  { label: 'Asignados a mí', value: 'mine' },
  { label: 'No asignados', value: 'unassigned' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Activos', value: 'active' },
  { label: 'Cerrados', value: 'closed' },
];

type ConversationListProps = {
  loading: boolean;
  conversations: ConversationSummary[];
  selectedId: string | null;
  unreadConversations: Set<string>;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  onConversationSelect: (id: string) => void;
};

const ConversationList: React.FC<ConversationListProps> = ({
  loading,
  conversations,
  selectedId,
  unreadConversations,
  searchTerm,
  onSearchTermChange,
  filter,
  onFilterChange,
  onConversationSelect,
}) => {
  // Agrupar por usuario (userPhone)

  return (
    <aside className="conversation-list-panel">
      <header className="conversation-list-header">
        <div className="conversation-list-search">
          <input
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Buscar o iniciar un nuevo chat"
          />
        </div>
        <div className="conversation-list-filters">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`conversation-filter-btn${
                filter === option.value
                  ? ' conversation-filter-btn--active'
                  : ''
              }`}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      <div className="conversation-list-items">
        {loading ? (
          <div className="conversation-list-empty">Cargando...</div>
        ) : conversations.length > 0 ? (
          // Mostrar solo el último chat por usuario/contacto
          (() => {
            const latestByUser: Record<string, ConversationSummary> = {};
            for (const conv of conversations) {
              const label =
                conv.contact?.name?.trim() ||
                conv.contactName?.trim() ||
                conv.userPhone;
              if (
                !latestByUser[label] ||
                new Date(conv.lastActivity) >
                  new Date(latestByUser[label].lastActivity)
              ) {
                latestByUser[label] = conv;
              }
            }
            return Object.values(latestByUser).map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === selectedId}
                isUnread={unreadConversations.has(conv.id)}
                onSelect={() => onConversationSelect(conv.id)}
              />
            ));
          })()
        ) : (
          <div className="conversation-list-empty">No hay conversaciones.</div>
        )}
      </div>
    </aside>
  );
};

export default ConversationList;
