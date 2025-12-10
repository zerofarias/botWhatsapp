import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { api } from '../services/api';
import { FiWifi, FiWifiOff, FiAlertTriangle, FiX, FiRefreshCw } from 'react-icons/fi';
import './WhatsAppStatusBanner.css';

type SessionStatus = 
  | 'CONNECTED' 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'QR' 
  | 'UNPAIRED' 
  | 'STOPPED'
  | 'UNKNOWN';

interface BotStatusResponse {
  record: {
    status: string;
  };
  cache?: {
    status: string;
  } | null;
}

export default function WhatsAppStatusBanner() {
  const [status, setStatus] = useState<SessionStatus>('UNKNOWN');
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const socket = useSocket();

  const normalizeStatus = (rawStatus: string): SessionStatus => {
    const upper = rawStatus.toUpperCase();
    if (upper.includes('CONNECTED') || upper === 'READY' || upper === 'OPEN') {
      return 'CONNECTED';
    }
    if (upper.includes('DISCONNECT') || upper === 'CLOSED') {
      return 'DISCONNECTED';
    }
    if (upper === 'CONNECTING' || upper === 'INITIALIZING') {
      return 'CONNECTING';
    }
    if (upper === 'QR' || upper.includes('QRCODE')) {
      return 'QR';
    }
    if (upper === 'UNPAIRED' || upper === 'NOTLOGGED') {
      return 'UNPAIRED';
    }
    if (upper === 'STOPPED' || upper === 'INACTIVE') {
      return 'STOPPED';
    }
    return 'UNKNOWN';
  };

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get<BotStatusResponse>('/bot/status');
      const rawStatus = response.data.cache?.status ?? response.data.record?.status ?? 'UNKNOWN';
      const normalized = normalizeStatus(rawStatus);
      setStatus(normalized);
    } catch (error) {
      console.error('[WhatsAppBanner] Failed to fetch status', error);
      setStatus('DISCONNECTED');
    }
  }, []);

  // Fetch initial status
  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    const onStatus = (payload: string) => {
      const newStatus = normalizeStatus(payload);
      setStatus(newStatus);
      
      // Si se reconecta, resetear el dismissed
      if (newStatus === 'CONNECTED') {
        setDismissed(false);
      }
    };

    const onQr = () => {
      setStatus('QR');
      setDismissed(false); // Mostrar banner cuando hay nuevo QR
    };

    socket.on('session:status', onStatus);
    socket.on('session:qr', onQr);

    return () => {
      socket.off('session:status', onStatus);
      socket.off('session:qr', onQr);
    };
  }, [socket]);

  const handleRetry = async () => {
    setLoading(true);
    try {
      await api.post('/bot/start');
      await fetchStatus();
    } catch (error) {
      console.error('[WhatsAppBanner] Failed to start bot', error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar si está conectado o si el usuario lo cerró
  if (status === 'CONNECTED' || dismissed) {
    return null;
  }

  // No mostrar en estado desconocido inicial
  if (status === 'UNKNOWN') {
    return null;
  }

  const getBannerConfig = () => {
    switch (status) {
      case 'DISCONNECTED':
        return {
          icon: <FiWifiOff />,
          title: 'WhatsApp desconectado',
          message: 'La conexión con WhatsApp se ha perdido. Los mensajes no se enviarán ni recibirán.',
          type: 'error' as const,
          showRetry: true,
        };
      case 'QR':
      case 'UNPAIRED':
        return {
          icon: <FiAlertTriangle />,
          title: 'Escanea el código QR',
          message: 'Ve al Dashboard > Estado del bot para escanear el código QR con tu teléfono.',
          type: 'warning' as const,
          showRetry: false,
        };
      case 'CONNECTING':
        return {
          icon: <FiWifi />,
          title: 'Conectando a WhatsApp...',
          message: 'Estableciendo conexión con WhatsApp. Esto puede tomar unos segundos.',
          type: 'info' as const,
          showRetry: false,
        };
      case 'STOPPED':
        return {
          icon: <FiWifiOff />,
          title: 'Bot detenido',
          message: 'El bot está detenido. Haz clic en "Reintentar" para iniciarlo.',
          type: 'warning' as const,
          showRetry: true,
        };
      default:
        return {
          icon: <FiAlertTriangle />,
          title: 'Estado desconocido',
          message: 'No se pudo determinar el estado de WhatsApp.',
          type: 'info' as const,
          showRetry: true,
        };
    }
  };

  const config = getBannerConfig();

  return (
    <div className={`whatsapp-status-banner whatsapp-status-banner--${config.type}`}>
      <div className="whatsapp-status-banner__icon">
        {config.icon}
      </div>
      <div className="whatsapp-status-banner__content">
        <strong className="whatsapp-status-banner__title">{config.title}</strong>
        <span className="whatsapp-status-banner__message">{config.message}</span>
      </div>
      <div className="whatsapp-status-banner__actions">
        {config.showRetry && (
          <button 
            className={`whatsapp-status-banner__retry${loading ? ' loading' : ''}`}
            onClick={handleRetry}
            disabled={loading}
            title="Reintentar conexión"
          >
            <span className={loading ? 'spinning' : ''}>
              <FiRefreshCw />
            </span>
            {loading ? 'Iniciando...' : 'Reintentar'}
          </button>
        )}
        <button 
          className="whatsapp-status-banner__dismiss"
          onClick={() => setDismissed(true)}
          title="Cerrar notificación"
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}
