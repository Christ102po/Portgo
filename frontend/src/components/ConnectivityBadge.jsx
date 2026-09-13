import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "../lib/connectivity";
import { cn } from "../lib/cn";

export function ConnectivityBadge() {
  const isOnline = useOnlineStatus();

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        isOnline ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-red-400/15 text-red-300 ring-1 ring-red-400/30"
      )}
      title={isOnline ? "Connected to the cloud" : "No connection — passenger logs saved locally"}
    >
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isOnline ? "Online (Cloud Synced)" : "Offline (Local Backup)"}
    </span>
  );
}
