import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { FiArrowRight, FiMenu, FiX } from "react-icons/fi";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../theme/ThemeToggle";
import { buttonClasses } from "../ui/buttonStyles";
import { useAuth } from "../../contexts/AuthContext";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const auth = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass border-b border-border py-2.5" : "py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 lg:flex"
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive
                    ? "text-indigo-500 dark:text-indigo-300"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {auth.isAuthenticated ? (
            <Link
              to="/dashboard"
              className={buttonClasses("primary", "sm") + " text-white"}
            >
              Dashboard <FiArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link to="/signin" className={buttonClasses("ghost", "sm")}>
                Sign in
              </Link>
              <Link
                to="/signup"
                className={buttonClasses("primary", "sm") + " text-white"}
              >
                Get started <FiArrowRight aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-xl border border-border text-foreground lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <motion.nav
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.25 }}
          aria-label="Mobile navigation"
          className="glass overflow-hidden border-t border-border lg:hidden"
        >
          <div className="flex flex-col gap-1 px-5 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between gap-3 px-3 pb-2">
              <ThemeToggle />
              {auth.isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className={buttonClasses("primary", "sm") + " text-white"}
                >
                  Dashboard <FiArrowRight aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Link
                      to="/signin"
                      className={buttonClasses("outline", "sm")}
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      className={buttonClasses("primary", "sm") + " text-white"}
                      onClick={() => setMenuOpen(false)}
                    >
                      Get started
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.nav>
      )}
    </motion.header>
  );
}
