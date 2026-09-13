const QUEUE_KEY = "portgo_offline_queue";

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(endpoint, payload) {
  const queue = getQueue();
  const record = {
    localId: `OFFLINE-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    endpoint,
    payload,
    queuedAt: new Date().toISOString(),
  };
  queue.push(record);
  saveQueue(queue);
  return record;
}

export function removeFromQueue(localId) {
  saveQueue(getQueue().filter((r) => r.localId !== localId));
}

export function queueSize() {
  return getQueue().length;
}
