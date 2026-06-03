// IndexedDB wrapper for offline cache + write queue
const DB_NAME = 'betty-dental-cache';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('api-cache')) {
        const store = db.createObjectStore('api-cache', { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('write-queue')) {
        const queue = db.createObjectStore('write-queue', { keyPath: 'id', autoIncrement: true });
        queue.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Cache API response
export async function cachePut(method, url, data) {
  try {
    const db = await openDB();
    const tx = db.transaction('api-cache', 'readwrite');
    tx.objectStore('api-cache').put({
      key: `${method}:${url}`,
      data,
      timestamp: Date.now(),
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
    db.close();
  } catch (err) {
    console.warn('[DB] cachePut error:', err);
  }
}

// Read cached API response
export async function cacheGet(method, url) {
  try {
    const db = await openDB();
    const tx = db.transaction('api-cache', 'readonly');
    const store = tx.objectStore('api-cache');
    const result = await new Promise((resolve, reject) => {
      const req = store.get(`${method}:${url}`);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    db.close();
    return result ? result.data : null;
  } catch (err) {
    console.warn('[DB] cacheGet error:', err);
    return null;
  }
}

// Queue a write operation for later sync
export async function queueAdd(method, url, body) {
  try {
    const db = await openDB();
    const tx = db.transaction('write-queue', 'readwrite');
    const entry = {
      method,
      url,
      body: body || null,
      timestamp: Date.now(),
      retries: 0,
    };
    const req = tx.objectStore('write-queue').add(entry);
    const id = await new Promise((resolve, reject) => {
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
    db.close();
    return id;
  } catch (err) {
    console.warn('[DB] queueAdd error:', err);
    return null;
  }
}

// Get all queued writes
export async function queueGetAll() {
  try {
    const db = await openDB();
    const tx = db.transaction('write-queue', 'readonly');
    const store = tx.objectStore('write-queue');
    const result = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    db.close();
    return result || [];
  } catch (err) {
    console.warn('[DB] queueGetAll error:', err);
    return [];
  }
}

// Remove a processed write from queue
export async function queueRemove(id) {
  try {
    const db = await openDB();
    const tx = db.transaction('write-queue', 'readwrite');
    tx.objectStore('write-queue').delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
    db.close();
  } catch (err) {
    console.warn('[DB] queueRemove error:', err);
  }
}

// Get pending writes count
export async function getPendingCount() {
  try {
    const all = await queueGetAll();
    return all.length;
  } catch {
    return 0;
  }
}

// Clear entire cache
export async function cacheClear() {
  try {
    const db = await openDB();
    const tx = db.transaction('api-cache', 'readwrite');
    tx.objectStore('api-cache').clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
    db.close();
  } catch (err) {
    console.warn('[DB] cacheClear error:', err);
  }
}
