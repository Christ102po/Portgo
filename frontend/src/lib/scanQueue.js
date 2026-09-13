const QUEUE_KEY = "portgo_offline_scan_queue";

export function getScanQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueScan(code) {
  const queue = getScanQueue();
  const record = {
    localId: `SCAN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    code,
    queuedAt: new Date().toISOString(),
  };
  queue.push(record);
  saveQueue(queue);
  return record;
}

export function removeFromScanQueue(localId) {
  saveQueue(getScanQueue().filter((r) => r.localId !== localId));
}

export function scanQueueSize() {
  return getScanQueue().length;
}
