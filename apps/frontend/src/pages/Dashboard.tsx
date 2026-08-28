import { FiArrowRight, FiBox, FiMapPin, FiFileText } from "react-icons/fi";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useAuth } from "../contexts/AuthContext";

const comingSoon = [
  {
    icon: FiMapPin,
    title: "Destinations",
    description:
      "Register customer endpoints, generate signing secrets, pause & resume.",
  },
  {
    icon: FiBox,
    title: "Events",
    description:
      "Ingest events with idempotency keys and fan out to subscribers.",
  },
  {
    icon: FiFileText,
    title: "Delivery logs",
    description:
      "Every attempt with status, latency and errors — plus one-click replay.",
  },
];

function Dashboard() {
  useDocumentMeta({
    title: "Dashboard",
    description: "Your Relayo delivery dashboard.",
  });

  const { user } = useAuth();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your webhook command center is being built.
          </p>
        </div>
        <Badge>
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-500" />
          Auth flow complete — you're signed in
        </Badge>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-foreground">
          What's coming next
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Following the Relayo build order: tenant + destination models, then
          the ingestion API, durable queue and delivery workers.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {comingSoon.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-dashed border-border p-5"
            >
              <item.icon
                className="text-indigo-500 dark:text-indigo-300"
                aria-hidden="true"
              />
              <h3 className="mt-3 font-display text-sm font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-500 dark:text-indigo-300">
          Next milestone: tenant creation & destinations CRUD{" "}
          <FiArrowRight aria-hidden="true" />
        </p>
      </Card>
    </div>
  );
}

export default Dashboard;
