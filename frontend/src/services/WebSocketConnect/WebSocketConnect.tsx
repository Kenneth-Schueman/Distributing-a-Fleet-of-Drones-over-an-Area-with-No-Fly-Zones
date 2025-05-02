import { useState, useEffect } from 'react';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed' | 'timeout';

interface WebSocketHookReturn {
    isConnected: boolean;
    socket: WebSocket | null;
    status: ConnectionStatus;
    statusMessage: string;
}

const useWebSocket = (
    url: string, 
    options = { 
        pingInterval: 30000,
        connectionTimeout: 5000 
    }
): WebSocketHookReturn => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [isConnected, setIsConnected] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Connecting to server...');

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let pingIntervalId: NodeJS.Timeout;

        const ws = new WebSocket(url);
        setSocket(ws);

        // Set connection timeout
        timeoutId = setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                setStatus('timeout');
                setStatusMessage('Connection timed out. Please try again.');
                ws.close();
            }
        }, options.connectionTimeout);

        ws.onopen = () => {
            clearTimeout(timeoutId);
            setIsConnected(true);
            setStatus('connected');
            setStatusMessage('Connected to server');

            // Set up ping interval
            pingIntervalId = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, options.pingInterval);
        };

        ws.onerror = (error) => {
            clearTimeout(timeoutId);
            setStatus('failed');
            setStatusMessage('Connection failed. Please check your network and try again.');
            console.error('WebSocket error:', error);
        };

        ws.onclose = (event) => {
            clearTimeout(timeoutId);
            clearInterval(pingIntervalId);
            setIsConnected(false);
            
            if (status !== 'timeout' && status !== 'failed') {
                setStatus('disconnected');
                setStatusMessage(
                    event.wasClean 
                        ? 'Disconnected from server. Please reconnect.'
                        : 'Connection lost unexpectedly. Please try again.'
                );
            }
        };

        return () => {
            clearTimeout(timeoutId);
            clearInterval(pingIntervalId);
            ws.close();
        };
    }, [url, options.pingInterval, options.connectionTimeout]);

    return { isConnected, socket, status, statusMessage };
};

export default useWebSocket;