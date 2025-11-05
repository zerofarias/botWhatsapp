import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const socketUrl =
  import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.length
    ? import.meta.env.VITE_SOCKET_URL
    : '/';

export function useSocket() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      return;
    }

    // Evitar crear múltiples instancias
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    const instance = io(socketUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    instance.on('connect', () => {
      // Evitar mensaje duplicado
    });

    instance.on('disconnect', () => {
      // Socket desconectado
    });

    instance.on('connect_error', (error) => {
      console.error('[useSocket] Connection error:', error);
    });

    socketRef.current = instance;
    setSocket(instance);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  return socket;
}
