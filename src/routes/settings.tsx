import { createFileRoute } from "@tanstack/react-router";
import { Bell, Shield, Key, Moon, Database, Smartphone, Fingerprint } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Paramètres — AfterLeak" }] }),
  component: Settings,
});

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`w-11 h-6 rounded-full p-0.5 transition ${on ? "bg-primary" : "bg-muted"}`}>
      <span className={`block w-5 h-5 rounded-full bg-background shadow transition ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Settings() {
  const [s, setS] = useState({ dark: true, push: true, email: true, telegram: false, mfa: true, passkey: false, retention: true });
  const items: { icon: any; title: string; desc: string; key: keyof typeof s }[] = [
    { icon: Moon, title: "Mode sombre", desc: "Interface adaptée aux longues sessions d'analyse.", key: "dark" },
    { icon: Smartphone, title: "Notifications push mobiles", desc: "Alerte immédiate en cas de nouvelle fuite critique.", key: "push" },
    { icon: Bell, title: "Notifications par email", desc: "Synthèse hebdomadaire de votre exposition.", key: "email" },
    { icon: Bell, title: "Notifications Telegram", desc: "Recevoir les alertes sur votre canal privé.", key: "telegram" },
    { icon: Shield, title: "Double authentification (2FA)", desc: "Renforce l'accès à votre compte AfterLeak.", key: "mfa" },
    { icon: Fingerprint, title: "Passkey (clé d'accès)", desc: "Connexion sans mot de passe via Touch ID, Face ID ou Windows Hello.", key: "passkey" },
    { icon: Database, title: "Conservation longue durée", desc: "Conserver l'historique d'analyse au-delà de 90 jours.", key: "retention" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="mx-auto max-w-3xl w-full px-6 py-10 space-y-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">Paramètres</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Personnalisez votre AfterLeak</h1>
        </div>

        <div className="glass rounded-2xl divide-y divide-border/40">
          {items.map((it) => (
            <div key={it.key} className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center">
                <it.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{it.title}</div>
                <div className="text-sm text-muted-foreground">{it.desc}</div>
              </div>
              <Toggle on={s[it.key]} onChange={(v) => setS((st) => ({ ...st, [it.key]: v }))} />
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 font-display font-semibold mb-3"><Key className="w-4 h-4 text-primary" /> Clé API personnelle</div>
          <div className="rounded-lg bg-background/60 border border-border/40 p-3 font-mono text-xs">sk_live_••••••••••••a3f2</div>
          <p className="text-xs text-muted-foreground mt-2">Utilisée pour vos intégrations Slack, Telegram et webhooks personnalisés.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
