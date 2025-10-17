import { useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export function useSocket() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  const auth = useMemo(
    () => ({
      userId: user?.id,
      token: localStorage.getItem('token'),
    }),
    [user?.id]
  );

  useEffect(() => {
    if (!auth.userId) {
      return;
    }

    const instance = io('/', {
      auth,
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
    };
  }, [auth.userId]);

  return socket;
}
