import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteFooter, SiteNav } from "@/components/site-nav";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard/$email", params: { email: user?.email ?? "demo@afterleak.com" } });
    }
  }, [isAuthenticated, navigate, user?.email]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate({ to: "/dashboard/$email", params: { email: email.trim() || "demo@afterleak.com" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <div className="glass-strong rounded-3xl p-8 md:p-10">
            <h1 className="text-3xl md:text-4xl font-bold">Connexion à AfterLeak</h1>
            <div className="mt-6 text-sm text-muted-foreground">
              Pas encore de compte ? <Link to="/auth/register" className="font-medium text-primary hover:underline">Créer un compte</Link>
            </div>
          </div>

          <div className="glass rounded-3xl p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Adresse email</label>
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="w-full bg-transparent outline-none"
                    placeholder="vous@entreprise.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Mot de passe</label>
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    className="w-full bg-transparent outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
              >
                {isSubmitting ? "Connexion..." : "Se connecter"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
