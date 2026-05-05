// WebSocket Notification System
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface WebSocketMessage {
  type: string;
  data: any;
}

// WebSocket Hook
export function useWebSocket(url?: string) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // For demo purposes, simulate WebSocket with polling
    // In production, replace with: new WebSocket(url || 'ws://localhost:3000/ws')
    
    setConnected(true);
    console.log('[WebSocket] Connected (simulated)');
    
    // Simulate receiving notifications every 30 seconds
    const interval = setInterval(() => {
      const demoNotifications: Notification[] = [
        {
          id: `notif-${Date.now()}`,
          type: 'info',
          title: 'Real-time Update',
          message: 'System is running smoothly',
          timestamp: new Date(),
          read: false,
        },
      ];
      
      setNotifications(prev => [...demoNotifications, ...prev].slice(0, 50));
    }, 30000);

    return () => {
      clearInterval(interval);
      setConnected(false);
    };
  }, [url]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Not connected, cannot send message');
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      read: false,
      ...notification,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    sendMessage,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };
}

// Notification Hook for Components
export function useNotifications() {
  return useWebSocket();
}
