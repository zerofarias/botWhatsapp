import React, { useState } from 'react';
import '../../styles/ImageViewerModal.css';

type ImageViewerModalProps = {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  filename?: string;
};

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  filename = 'imagen.jpg',
}) => {
  const [zoom, setZoom] = useState(100);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar imagen:', error);
      alert('Error al descargar la imagen');
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 20, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 20, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="image-viewer-overlay" onClick={onClose} />
      <div className="image-viewer-modal">
        <div className="image-viewer-header">
          <div className="image-viewer-title">
            <span>Visor de imagen</span>
            <span className="zoom-display">{zoom}%</span>
          </div>
          <button
            className="image-viewer-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="image-viewer-container">
          <img
            src={imageUrl}
            alt="Imagen ampliada"
            className="image-viewer-image"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        </div>

        <div className="image-viewer-footer">
          <div className="image-viewer-controls">
            <button
              onClick={handleZoomOut}
              className="control-btn"
              title="Alejarse"
            >
              🔍−
            </button>
            <button
              onClick={handleResetZoom}
              className="control-btn"
              title="Restablecer zoom"
            >
              Restablecer
            </button>
            <button
              onClick={handleZoomIn}
              className="control-btn"
              title="Acercarse"
            >
              🔍+
            </button>
            <div className="control-divider"></div>
            <button
              onClick={handleDownload}
              className="download-btn"
              title="Descargar imagen"
            >
              ⬇️ Descargar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImageViewerModal;
