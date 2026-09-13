import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface text-center">
      <h1 className="text-4xl font-bold text-graphite">404</h1>
      <p className="text-slate-500">This page doesn&apos;t exist.</p>
      <Link to="/">
        <Button>Go to Kiosk</Button>
      </Link>
    </div>
  );
}
