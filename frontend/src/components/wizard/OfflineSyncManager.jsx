import { useEffect, useRef } from "react";
import { apiClient } from "../../lib/apiClient";
import { getQueue, removeFromQueue } from "../../lib/offlineQueue";
import { isNetworkAvailable, subscribeForcedOffline } from "../../lib/offlineSimulation";
import { useToast } from "../ui/Toast";

export function OfflineSyncManager() {
  const { showToast } = useToast();
  const isSyncingRef = useRef(false);

  async function syncQueue() {
    if (isSyncingRef.current || !isNetworkAvailable()) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    let syncedCount = 0;
    for (const record of queue) {
      if (!isNetworkAvailable()) break;
      try {
        await apiClient.post(record.endpoint, record.payload);
        removeFromQueue(record.localId);
        syncedCount += 1;
      } catch {
        // still offline or the request failed again — leave it queued for the next attempt
        break;
      }
    }
    isSyncingRef.current = false;

    if (syncedCount > 0) {
      showToast({
        title: "Offline records synced",
        description: `${syncedCount} passenger log(s) uploaded to the server.`,
        variant: "success",
      });
    }
  }

  useEffect(() => {
    syncQueue();
    window.addEventListener("online", syncQueue);
    const unsubscribe = subscribeForcedOffline(syncQueue);
    return () => {
      window.removeEventListener("online", syncQueue);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
