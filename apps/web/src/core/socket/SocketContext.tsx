import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@vernoxy-pulse/api-client';
import { useAuth } from '../../context/AuthContext';

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
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;

    const s = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => {
      console.log('[Socket] Connected to server, id:', s.id);
      setIsConnected(true);
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

  const joinProject = (projectId: number | string) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('join:project', { projectId });
    }
  };

  const leaveProject = (projectId: number | string) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('leave:project', { projectId });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinProject, leaveProject }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
