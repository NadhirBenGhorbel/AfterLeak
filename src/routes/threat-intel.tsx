import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Radio, AlertTriangle, Activity, Skull, Globe2, TrendingUp, Database, ShieldCheck, RefreshCw } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { THREAT_FEED, severityColor } from "@/lib/mock-data";
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/threat-intel")({
  head: () => ({
    meta: [
      { title: "Threat Intelligence — AfterLeak" },
      { name: "description", content: "Renseignement cyber en temps réel : ransomware, infostealers, fuites d'identifiants." },
    ],
  }),
  component: ThreatIntel,
});

function ThreatIntel() {
  const [threatSummary, setThreatSummary] = useState<null | {
    conclusion: string;
    threatIntelSummary?: string;
    threatFlags?: string[];
    threatActions?: string[];
    strengthTips?: string[];
    timeline?: Array<{ title: string; summary: string }>;
  }>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadThreatIntel(forceRefresh = false) {
    if (!forceRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "threat-intel", integrity: { source: "threat-intel-page", refresh: forceRefresh } }),
      });
      const body = await response.json();
      if (response.ok && body?.advice) {
        setThreatSummary(body.advice);
      }
    } catch {
      setThreatSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    void (async () => {
      await loadThreatIntel();
      if (ignore) return;
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const trend = useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
    h: `${i}h`,
    leaks: 60 + Math.round(Math.sin(i / 3) * 18 + Math.cos(i / 5) * 10),
  })), []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="mx-auto max-w-7xl w-full px-6 py-10 space-y-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">Threat Intelligence</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Le pouls de la cybermenace mondiale</h1>
          <p className="text-muted-foreground mt-2">Flux temps réel agrégé depuis 276 sources publiques et privées.</p>
        </div>

        <section className="grid md:grid-cols-4 gap-4">
          {[
            { icon: AlertTriangle, label: "Fuites détectées (24 h)", value: "1 248", trend: "+18%" },
            { icon: Skull, label: "Campagnes ransomware actives", value: "47", trend: "+3" },
            { icon: Activity, label: "Infostealers en circulation", value: "312", trend: "+12" },
            { icon: Database, label: "Identifiants compromis (24 h)", value: "9,4 M", trend: "+22%" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-5">
              <s.icon className="w-5 h-5 text-primary mb-3" />
              <div className="font-display text-3xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                {s.label} <span className="text-success">{s.trend}</span>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-semibold">Renseignement consolidé</div>
                <div className="text-xs text-muted-foreground">Sources locales et publiques reliées à une chaîne d’intégrité</div>
              </div>
              <button
                onClick={() => void loadThreatIntel(true)}
                className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 transition hover:border-primary/40 hover:text-primary"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Actualisation…" : "Actualiser"}
              </button>
            </div>
            <div className="mt-4 rounded-[24px] border border-primary/20 bg-background/70 p-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Chargement du résumé…</div>
              ) : threatSummary ? (
                <div className="space-y-3">
                  <p className="text-sm leading-7 text-foreground/95">{threatSummary.threatIntelSummary ?? threatSummary.conclusion}</p>
                  <div className="flex flex-wrap gap-2">
                    {(threatSummary.threatFlags ?? ["Dataset local", "CISA KEV", "NVD", "CERT-FR", "MITRE"]).slice(0, 6).map((flag) => (
                      <span key={flag} className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">{flag}</span>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/70 p-3 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">Signal IA</div>
                    <p className="mt-1 leading-6">{threatSummary.conclusion}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">Le résumé de veille est indisponible pour le moment, mais les sources sont toujours visibles ci-dessous.</p>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-6">
            <div className="font-display font-semibold mb-3">Éléments prioritaires</div>
            <div className="space-y-3">
              {(threatSummary?.threatActions ?? ["Vérifier l’exposition des mots de passe", "Corriger les services déjà exposés", "Activer la 2FA sur les comptes sensibles"]).map((action) => (
                <div key={action} className="rounded-[18px] border border-border/50 bg-background/60 p-3 text-sm text-foreground/90">{action}</div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display font-semibold">Volume d'identifiants fuités (24 h)</div>
                <div className="text-xs text-muted-foreground">Mise à jour toutes les 60 s</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> En direct
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="t1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.21 40)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.72 0.21 40)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis dataKey="h" tick={{ fill: "oklch(0.68 0.03 260)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "oklch(0.68 0.03 260)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }} />
                  <Area dataKey="leaks" stroke="oklch(0.72 0.21 40)" fill="url(#t1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="font-display font-semibold mb-1">Top pays attaqués</div>
            <div className="text-xs text-muted-foreground mb-4">Sur les dernières 24 h</div>
            <ul className="space-y-3">
              {[
                { c: "🇫🇷 France", v: 28 },
                { c: "🇺🇸 États-Unis", v: 22 },
                { c: "🇩🇪 Allemagne", v: 14 },
                { c: "🇬🇧 Royaume-Uni", v: 11 },
                { c: "🇨🇦 Canada", v: 9 },
                { c: "🇧🇪 Belgique", v: 7 },
              ].map((p) => (
                <li key={p.c}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{p.c}</span><span className="text-muted-foreground font-mono">{p.v}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${p.v * 3}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-display font-semibold flex items-center gap-2"><Radio className="w-4 h-4 text-primary" /> Flux d'alertes</div>
              <div className="text-xs text-muted-foreground">Évènements en provenance des analystes AfterLeak</div>
            </div>
          </div>
          <ul className="divide-y divide-border/40">
            {THREAT_FEED.map((f) => (
              <li key={f.title} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Globe2 className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium">{f.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{f.time} · {f.tag}</div>
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${severityColor(f.severity)}`}>{f.severity}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid md:grid-cols-3 gap-5">
          {[
            { name: "LockBit 4.0", type: "Ransomware-as-a-Service", victims: "1 247 victimes", growth: "+34%" },
            { name: "RedLine", type: "Infostealer", victims: "82 000 stealers logs", growth: "+12%" },
            { name: "Akira", type: "Ransomware", victims: "418 victimes", growth: "+18%" },
          ].map((g) => (
            <div key={g.name} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="font-display font-semibold">{g.name}</div>
                <TrendingUp className="w-4 h-4 text-danger" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{g.type}</div>
              <div className="mt-4 text-sm">{g.victims}</div>
              <div className="mt-1 text-xs text-danger">{g.growth} sur 30 j</div>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
