import { useState, useEffect } from 'react';
import { onStatusChange } from '../lib/sync';
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';

export default function SyncIndicator() {
  const [status, setStatus] = useState('online');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsub = onStatusChange(({ status: s, pendingCount: c }) => {
      setStatus(s);
      setPendingCount(c);
    });
    return unsub;
  }, []);

  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-1 text-xs text-yellow-600 shrink-0" title="Sincronizando...">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span className="hidden sm:inline">Sincronizando</span>
      </div>
    );
  }

  if (status === 'offline' && pendingCount > 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-red-500 shrink-0" title={`${pendingCount} cambios pendientes por sincronizar`}>
        <CloudOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0" title="Sin conexión">
        <WifiOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-green-600 shrink-0" title="Conectado">
      <Wifi className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Conectado</span>
    </div>
  );
}
