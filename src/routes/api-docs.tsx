import { createFileRoute } from "@tanstack/react-router";
import { Code2, Copy, Key } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API — AfterLeak" },
      { name: "description", content: "Documentation de l'API AfterLeak pour intégrer l'intelligence cyber dans vos applications." },
    ],
  }),
  component: ApiDocs,
});

const ENDPOINTS = [
  { m: "GET", p: "/v1/exposure", d: "Liste l'exposition d'une adresse email" },
  { m: "GET", p: "/v1/breaches", d: "Renvoie toutes les fuites associées" },
  { m: "GET", p: "/v1/risk", d: "Score d'exposition calculé en temps réel" },
  { m: "GET", p: "/v1/recommendations", d: "Recommandations priorisées personnalisées" },
  { m: "GET", p: "/v1/timeline", d: "Chronologie complète des fuites" },
  { m: "GET", p: "/v1/threat-analysis", d: "Synthèse IA des menaces actives" },
];

function ApiDocs() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="mx-auto max-w-7xl w-full px-6 py-10 space-y-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">Développeurs</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">API AfterLeak</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Intégrez l'intelligence cyber AfterLeak dans vos applications métier. REST, JSON, authentification par clé API.
          </p>
        </div>

        <section className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 font-display font-semibold"><Code2 className="w-4 h-4 text-primary" /> Endpoints</div>
            <div className="divide-y divide-border/40">
              {ENDPOINTS.map((e) => (
                <div key={e.p} className="py-3 flex items-center gap-4">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-success/15 text-success border border-success/30 font-mono">{e.m}</span>
                  <code className="font-mono text-sm text-primary">{e.p}</code>
                  <span className="text-sm text-muted-foreground ml-auto">{e.d}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 font-display font-semibold mb-3"><Key className="w-4 h-4 text-primary" /> Authentification</div>
            <p className="text-sm text-muted-foreground mb-4">Toutes les requêtes nécessitent un en-tête <code className="text-primary font-mono">X-API-Key</code>.</p>
            <div className="rounded-lg bg-background/60 border border-border/40 p-3 font-mono text-xs flex items-center justify-between">
              <span>sk_live_••••••••••••a3f2</span>
              <button className="text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <div className="font-display font-semibold mb-3">Exemple de requête</div>
          <pre className="rounded-xl bg-background/70 border border-border/40 p-5 overflow-x-auto text-sm font-mono leading-relaxed">
{`curl https://api.sentinel.io/v1/exposure \\
  -H "X-API-Key: sk_live_xxxxxxxx" \\
  -d "email=client@entreprise.fr"

# Réponse
{
  "email": "client@entreprise.fr",
  "score": 82,
  "status": "Risque élevé",
  "breaches": 6,
  "categories": {
    "passwords": 4,
    "phone": 2,
    "address": 1
  },
  "recommendations": [
    { "priority": "Critique", "action": "Activez la 2FA Google" }
  ]
}`}
          </pre>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
