import { Link } from "react-router-dom";
import { buttonClasses } from "../components/ui/buttonStyles";
import { Logo } from "../components/ui/Logo";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

function NotFound() {
  useDocumentMeta({
    title: "Page not found",
    description: "The page you are looking for does not exist.",
  });

  return (
    <div className="ambient-glow relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 text-center">
      <Logo size="lg" />
      <p className="mt-10 font-display text-7xl font-bold text-gradient sm:text-8xl">
        404
      </p>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground sm:text-2xl">
        This page took a wrong turn
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Unlike your webhooks, this request couldn't be retried. Head back home.
      </p>
      <Link
        to="/"
        className={buttonClasses("primary", "md") + " mt-8 text-white"}
      >
        Back to home
      </Link>
    </div>
  );
}

export default NotFound;
