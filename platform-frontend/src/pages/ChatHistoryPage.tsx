import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ChatHistoryPage.css';
// Define types for the data we'll be fetching
type Conversation = {
  id: string;
  userPhone: string;
  contactName: string;
  // Add other conversation properties if needed
};

type ChatHistoryItem = {
  type: 'message' | 'label';
  // Properties for messages
  id?: string;
  senderType?: 'USER' | 'OPERATOR' | 'BOT';
  content?: string;
  createdAt?: string;
  // Properties for labels
  label?: string;
  timestamp?: string;
};

type UniquePhone = {
  phone: string;
  name: string;
};

export default function ChatHistoryPage() {
  const [uniquePhones, setUniquePhones] = useState<UniquePhone[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Fetch all conversations to build the list of unique phone numbers
    axios
      .get('/api/conversations')
      .then((response) => {
        const conversations: Conversation[] = response.data;
        const phoneMap = new Map<string, string>();
        conversations.forEach((conv) => {
          if (!phoneMap.has(conv.userPhone)) {
            phoneMap.set(conv.userPhone, conv.contactName || conv.userPhone);
          }
        });
        const phones: UniquePhone[] = Array.from(phoneMap, ([phone, name]) => ({
          phone,
          name,
        }));
        setUniquePhones(phones);
      })
      .catch((error) => {
        console.error('Error fetching conversations:', error);
      });
  }, []);

  useEffect(() => {
    if (!selectedPhone) {
      setChatHistory([]);
      return;
    }

    setLoadingHistory(true);
    axios
      .get(`/api/conversations/history/${selectedPhone}`)
      .then((response) => {
        setChatHistory(response.data);
      })
      .catch((error) => {
        console.error(`Error fetching history for ${selectedPhone}:`, error);
        setChatHistory([]);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [selectedPhone]);

  const handleSelectPhone = (phone: string) => {
    setSelectedPhone(phone);
  };

  return (
    <div className="chat-history-layout">
      <div className="chat-list-panel">
        <div className="chat-list-header">Chats</div>
        <div className="chat-list">
          {uniquePhones.map((item) => (
            <div
              key={item.phone}
              className={`chat-list-item ${
                selectedPhone === item.phone ? 'selected' : ''
              }`}
              onClick={() => handleSelectPhone(item.phone)}
            >
              <div className="chat-list-item__name">{item.name}</div>
              <div className="chat-list-item__phone">{item.phone}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="chat-view-panel">
        {loadingHistory ? (
          <div className="chat-view-placeholder">Cargando historial...</div>
        ) : selectedPhone ? (
          <div className="chat-history-container">
            {chatHistory.map((item, index) => {
              if (item.type === 'label') {
                return (
                  <div key={`label-${index}`} className="chat-label">
                    {item.label}
                  </div>
                );
              }
              if (item.type === 'message') {
                const senderClass =
                  item.senderType === 'USER' ? 'user' : 'other';
                return (
                  <div
                    key={item.id || `msg-${index}`}
                    className={`chat-bubble chat-bubble--${senderClass}`}
                  >
                    <div className="chat-bubble__sender">{item.senderType}</div>
                    <div className="chat-bubble__content">{item.content}</div>
                    <div className="chat-bubble__timestamp">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ''}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ) : (
          <div className="chat-view-placeholder">
            <div>
              <h2>Selecciona un chat</h2>
              <p>Elige una conversación de la lista para ver el historial.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
