import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut, UserRound } from "lucide-react";
import teamBravo from "../teambravo.png";
import { useAuth } from "@/lib/auth-context";

export function SiteNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate({ to: "/auth/login" });
  }
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/40 blur-md rounded-lg group-hover:bg-primary/60 transition" />
            <img
              src={teamBravo}
              alt="Team Bravo"
              className="relative w-9 h-9 rounded-lg object-cover border border-border/60"
            />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none">AfterLeak</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Cyber Exposure</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {[
            { to: "/", label: "Accueil" },
            { to: "/threat-intel", label: "Threat Intelligence" },
            { to: "/business", label: "Entreprises" },
            { to: "/api-docs", label: "API" },
            { to: "/settings", label: "Paramètres" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
              activeProps={{ className: "text-foreground bg-muted/60" }}
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard/$email"
                params={{ email: user?.email ?? "demo@afterleak.com" }}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition glow"
              >
                <UserRound className="w-4 h-4" /> {user?.name ?? "Compte"}
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md border border-border/60 bg-background/70 hover:bg-muted/50 transition"
              >
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </>
          ) : (
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition glow"
            >
              <LogIn className="w-4 h-4" /> Se connecter
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={teamBravo} alt="Team Bravo" className="w-4 h-4 rounded object-cover" />
            <span className="font-display font-bold">AfterLeak</span>
          </div>
          <p className="text-muted-foreground">La plateforme française de renseignement sur l'exposition cyber.</p>
        </div>
        <div>
          <div className="font-medium mb-3">Produit</div>
          <ul className="space-y-2 text-muted-foreground">
            <li>Surveillance personnelle</li><li>Monitoring entreprise</li><li>API publique</li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Ressources</div>
          <ul className="space-y-2 text-muted-foreground">
            <li>Documentation</li><li>Blog cyber</li><li>Rapports trimestriels</li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Légal</div>
          <ul className="space-y-2 text-muted-foreground">
            <li>RGPD</li><li>Politique de confidentialité</li><li>Conditions</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40 py-5 text-center text-xs text-muted-foreground">
        © 2026 AfterLeak. Conçu en France. Hébergé en Europe.
      </div>
    </footer>
  );
}
