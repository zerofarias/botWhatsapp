import { useEffect, useCallback } from 'react';

interface ImageModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export default function ImageModal({
  imageUrl,
  isOpen,
  onClose,
  alt = 'Imagen',
}: ImageModalProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="image-modal" onClick={handleBackdropClick}>
      <div className="image-modal__content">
        <button
          className="image-modal__close"
          onClick={onClose}
          aria-label="Cerrar imagen"
        >
          ✕
        </button>
        <img src={imageUrl} alt={alt} className="image-modal__image" />
        <div className="image-modal__footer">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="image-modal__download"
          >
            Abrir en nueva pestaña
          </a>
        </div>
      </div>
    </div>
  );
}
