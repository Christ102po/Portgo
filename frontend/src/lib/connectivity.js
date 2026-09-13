import { useEffect, useState } from "react";
import { isNetworkAvailable, subscribeForcedOffline } from "./offlineSimulation";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(isNetworkAvailable());

  useEffect(() => {
    function update() {
      setIsOnline(isNetworkAvailable());
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const unsubscribe = subscribeForcedOffline(update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      unsubscribe();
    };
  }, []);

  return isOnline;
}
