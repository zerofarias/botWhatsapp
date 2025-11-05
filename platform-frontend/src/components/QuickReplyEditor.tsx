import React, { useState } from 'react';
import {
  quickReplyService,
  type QuickReply,
  type CreateQuickReplyInput,
} from '../services/quickReply.service';
import './QuickReplyEditor.css';

interface QuickReplyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (reply: QuickReply) => void;
  editingReply?: QuickReply | null;
}

const QuickReplyEditor: React.FC<QuickReplyEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  editingReply,
}) => {
  const [formData, setFormData] = useState<CreateQuickReplyInput>({
    title: editingReply?.title ?? '',
    content: editingReply?.content ?? '',
    shortcut: editingReply?.shortcut ?? '',
    isGlobal: editingReply?.isGlobal ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación
    if (!formData.title?.trim()) {
      setError('El título es requerido');
      return;
    }
    if (!formData.content?.trim()) {
      setError('El contenido es requerido');
      return;
    }
    if (formData.shortcut && !formData.shortcut.startsWith('/')) {
      setError('El atajo debe comenzar con /');
      return;
    }

    setLoading(true);
    try {
      let savedReply: QuickReply;
      if (editingReply) {
        savedReply = await quickReplyService.update(editingReply.id, formData);
      } else {
        savedReply = await quickReplyService.create(formData);
      }
      onSave?.(savedReply);
      onClose();
    } catch (err: unknown) {
      setError('Error al guardar la respuesta rápida');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quick-reply-editor-overlay">
      <div className="quick-reply-editor">
        <div className="quick-reply-editor__header">
          <h2>
            {editingReply
              ? 'Editar Respuesta Rápida'
              : 'Nueva Respuesta Rápida'}
          </h2>
          <button
            className="quick-reply-editor__close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="quick-reply-editor__form">
          <div className="form-group">
            <label htmlFor="title">Título *</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ej: Saludo inicial"
              maxLength={100}
            />
            <small>{formData.title?.length ?? 0}/100</small>
          </div>

          <div className="form-group">
            <label htmlFor="shortcut">Atajo (ej: /saludo)</label>
            <input
              id="shortcut"
              type="text"
              name="shortcut"
              value={formData.shortcut ?? ''}
              onChange={handleChange}
              placeholder="Ej: /saludo"
              pattern="^/.*"
            />
            <small>Comienza con / para activar en el chat</small>
          </div>

          <div className="form-group">
            <label htmlFor="content">Contenido *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Escribe el contenido de la respuesta rápida..."
              rows={6}
              maxLength={1000}
            />
            <small>{formData.content?.length ?? 0}/1000</small>
          </div>

          <div className="form-group form-group--checkbox">
            <label htmlFor="isGlobal">
              <input
                id="isGlobal"
                type="checkbox"
                name="isGlobal"
                checked={formData.isGlobal ?? false}
                onChange={handleChange}
              />
              Disponible para todos (Global)
            </label>
            <small>
              {formData.isGlobal
                ? 'Esta respuesta rápida está disponible para todos los usuarios'
                : 'Esta respuesta rápida es solo para ti'}
            </small>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="quick-reply-editor__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickReplyEditor;
