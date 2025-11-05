import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const socketUrl =
  import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.length
    ? import.meta.env.VITE_SOCKET_URL
    : '/';

export function useSocket() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return;
    }

    const instance = io(socketUrl, {
      withCredentials: true,
    });

    instance.on('connect', () => {
      console.log('[useSocket] Socket connected successfully');
    });

    instance.on('disconnect', () => {
      console.log('[useSocket] Socket disconnected');
    });

    instance.on('connect_error', (error) => {
      console.error('[useSocket] Connection error:', error);
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
    };
  }, [user]);

  return socket;
}
