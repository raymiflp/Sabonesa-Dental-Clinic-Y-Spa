// Sync Manager — monitors online/offline, processes write queue
import { queueGetAll, queueRemove, getPendingCount } from './db';
import { API_BASE } from '../api';

const API = `${API_BASE}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let _status = navigator.onLine ? 'online' : 'offline';
let _pendingCount = 0;
let _listeners = [];
let _processing = false;
let _intervalId = null;
let _cleanup = null;

function notify() {
  _listeners.forEach((cb) => cb({ status: _status, pendingCount: _pendingCount }));
}

export function getStatus() {
  return _status;
}

export function getPendingCountSync() {
  return _pendingCount;
}

export function onStatusChange(callback) {
  _listeners.push(callback);
  // Immediately notify with current state
  callback({ status: _status, pendingCount: _pendingCount });
  return () => {
    _listeners = _listeners.filter((cb) => cb !== callback);
  };
}

async function refreshPendingCount() {
  _pendingCount = await getPendingCount();
  notify();
}

async function processQueue() {
  if (_processing) return;
  _processing = true;
  _status = 'syncing';
  notify();

  try {
    const queue = await queueGetAll();
    if (queue.length === 0) {
      _status = navigator.onLine ? 'online' : 'offline';
      _processing = false;
      notify();
      return;
    }

    // Process in order (oldest first)
    for (const entry of queue) {
      try {
        const res = await fetch(`${API}${entry.url}`, {
          method: entry.method,
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: entry.body || undefined,
        });

        if (res.ok) {
          await queueRemove(entry.id);
        } else if (res.status >= 400 && res.status < 500) {
          // Client error — skip this entry (likely deleted on server already)
          await queueRemove(entry.id);
        } else {
          // Server error (5xx) — keep in queue for retry
          console.warn('[Sync] Server error on replay, will retry:', entry.url, res.status);
        }
      } catch (err) {
        // Still offline — stop processing
        console.warn('[Sync] Still offline, stopping queue processing');
        break;
      }
    }
  } catch (err) {
    console.warn('[Sync] Error processing queue:', err);
  }

  await refreshPendingCount();
  _status = navigator.onLine ? 'online' : 'offline';
  _processing = false;
  notify();
}

function handleOnline() {
  _status = 'online';
  notify();
  // Try to process queue
  processQueue();
}

function handleOffline() {
  _status = 'offline';
  refreshPendingCount();
}

// Start monitoring
export function initSync() {
  // Clean up any existing listeners before setting up new ones
  _cleanup && _cleanup();

  // Initial state
  _status = navigator.onLine ? 'online' : 'offline';
  refreshPendingCount();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Periodic sync check every 30 seconds when online
  _intervalId = setInterval(() => {
    if (navigator.onLine && !_processing) {
      processQueue();
    }
  }, 30000);

  // Process any pending queue immediately on init
  if (navigator.onLine) {
    setTimeout(processQueue, 2000);
  }

  _cleanup = () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (_intervalId) clearInterval(_intervalId);
    _cleanup = null;
  };

  return _cleanup;
}

// Manually trigger sync (called after API mutations come back online)
export function triggerSync() {
  if (navigator.onLine && !_processing) {
    processQueue();
  }
}
