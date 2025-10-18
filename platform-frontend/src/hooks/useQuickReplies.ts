import { useState, useEffect, useCallback } from 'react';
import {
  quickReplyService,
  type QuickReply,
} from '../services/quickReply.service';

interface UseQuickRepliesOptions {
  onShortcutDetected?: (content: string) => void;
  templateVariables?: Record<string, string | undefined>;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const useQuickReplies = (options?: UseQuickRepliesOptions) => {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar quick replies
  const loadQuickReplies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const replies = await quickReplyService.list();
      setQuickReplies(replies);
      return replies;
    } catch (err) {
      console.error('Error loading quick replies:', err);
      setError('Error al cargar respuestas rápidas');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al montar
  useEffect(() => {
    loadQuickReplies();
  }, [loadQuickReplies]);

  // Buscar por shortcut
  const findByShortcut = useCallback(
    (shortcut: string): QuickReply | undefined => {
      return quickReplies.find(
        (reply) => reply.shortcut?.toLowerCase() === shortcut.toLowerCase()
      );
    },
    [quickReplies]
  );

  const formatQuickReplyContent = useCallback(
    (content: string): string => {
      if (!content) {
        return content;
      }

      let formatted = content;
      const variables = options?.templateVariables ?? {};

      Object.entries(variables).forEach(([rawKey, rawValue]) => {
        if (!rawValue) return;

        const key = rawKey.trim();
        if (!key) return;

        const value = rawValue;
        const patterns = new Set<string>([
          key,
          key.toUpperCase(),
          key.toLowerCase(),
        ]);

        patterns.forEach((patternKey) => {
          const bracketRegex = new RegExp(
            `\\[${escapeRegExp(patternKey)}\\]`,
            'g'
          );
          const braceRegex = new RegExp(
            `\\{${escapeRegExp(patternKey)}\\}`,
            'g'
          );
          const templateRegex = new RegExp(
            `\\$\\{${escapeRegExp(patternKey)}\\}`,
            'g'
          );

          formatted = formatted
            .replace(bracketRegex, value)
            .replace(braceRegex, value)
            .replace(templateRegex, value);
        });
      });

      return formatted;
    },
    [options?.templateVariables]
  );

  // Detectar shortcuts en texto
  const detectShortcut = useCallback(
    (
      text: string
    ): { detected: boolean; shortcut?: string; reply?: QuickReply } => {
      // Buscar shortcuts que empiecen con /
      const shortcutMatch = text.match(/^(\/\w+)$/);

      if (shortcutMatch) {
        const shortcut = shortcutMatch[1];
        const reply = findByShortcut(shortcut);

        if (reply) {
          return { detected: true, shortcut, reply };
        }
      }

      return { detected: false };
    },
    [findByShortcut]
  );

  // Procesar input y expandir shortcuts
  const processInput = useCallback(
    (
      text: string
    ): { shouldExpand: boolean; content?: string; reply?: QuickReply } => {
      const detection = detectShortcut(text);

      if (detection.detected && detection.reply) {
        const formattedContent = formatQuickReplyContent(
          detection.reply.content
        );
        if (options?.onShortcutDetected) {
          options.onShortcutDetected(formattedContent);
        }
        return {
          shouldExpand: true,
          content: formattedContent,
          reply: detection.reply,
        };
      }

      return { shouldExpand: false };
    },
    [detectShortcut, formatQuickReplyContent, options]
  );

  // Obtener sugerencias de shortcuts mientras escribe
  const getSuggestions = useCallback(
    (text: string): QuickReply[] => {
      if (!text.startsWith('/')) {
        return [];
      }

      const searchTerm = text.toLowerCase();

      return quickReplies
        .filter((reply) => {
          if (!reply.shortcut) return false;
          return reply.shortcut.toLowerCase().startsWith(searchTerm);
        })
        .slice(0, 5); // Limitar a 5 sugerencias
    },
    [quickReplies]
  );

  return {
    quickReplies,
    loading,
    error,
    loadQuickReplies,
    findByShortcut,
    detectShortcut,
    processInput,
    getSuggestions,
    formatQuickReplyContent,
  };
};
