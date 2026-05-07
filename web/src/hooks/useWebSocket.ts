import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(vaultPath: string) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!vaultPath) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.hostname}:3001`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ type: 'sync_request', vaultPath }));
    };

    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    return () => {
      socket.close();
    };
  }, [vaultPath]);

  const send = useCallback((data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
