import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@vernoxy-pulse/api-client';
import { useAuth } from '@/features/auth/context/AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinProject: (projectId: number | string) => void;
  leaveProject: (projectId: number | string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  joinProject: () => {},
  leaveProject: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only connect if authenticated
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = getAccessToken();
    const socketUrl =
      import.meta.env.VITE_API_URL ||
      (window.location.port === '5173'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : window.location.origin);

    const s = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('[Socket] Connected to server, id:', s.id);
      setIsConnected(true);
      // Re-join any active rooms upon connection/reconnection
      activeRoomsRef.current.forEach((pId) => {
        s.emit('join:project', { projectId: pId });
        console.log('[Socket] Joined project room on connect:', pId);
      });
    });

    s.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setIsConnected(false);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.emp_id]);

  const activeRoomsRef = useRef<Set<number>>(new Set());

  const joinProject = React.useCallback((projectId: number | string) => {
    const id = Number(projectId);
    if (!id || isNaN(id)) return;
    activeRoomsRef.current.add(id);
    if (socketRef.current) {
      socketRef.current.emit('join:project', { projectId: id });
      console.log('[Socket] Emitted join:project:', id);
    }
  }, []);

  const leaveProject = React.useCallback((projectId: number | string) => {
    const id = Number(projectId);
    if (!id || isNaN(id)) return;
    activeRoomsRef.current.delete(id);
    if (socketRef.current) {
      socketRef.current.emit('leave:project', { projectId: id });
      console.log('[Socket] Emitted leave:project:', id);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinProject, leaveProject }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
