import { createFileRoute } from "@tanstack/react-router";
import { Building2, Users, Crown, ShieldAlert, FileDown, TrendingUp } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Surveillance entreprise — AfterLeak" },
      { name: "description", content: "Surveillez l'exposition cyber de votre organisation, vos employés et vos dirigeants." },
    ],
  }),
  component: Business,
});

function Business() {
  const dept = [
    { dept: "Direction", exposés: 12 },
    { dept: "Finance", exposés: 28 },
    { dept: "RH", exposés: 19 },
    { dept: "Ingénierie", exposés: 47 },
    { dept: "Ventes", exposés: 33 },
    { dept: "Support", exposés: 22 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="mx-auto max-w-7xl w-full px-6 py-10 space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Entreprise</div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">acme-corp.fr · Surveillance active</h1>
            <p className="text-muted-foreground mt-2">438 employés surveillés · 12 dirigeants protégés · mise à jour il y a 4 minutes</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass hover:border-primary/40 text-sm">
            <FileDown className="w-4 h-4" /> Télécharger le rapport PDF
          </button>
        </div>

        <section className="grid md:grid-cols-4 gap-4">
          {[
            { icon: ShieldAlert, label: "Score de risque organisation", value: "68 / 100", tone: "text-warning" },
            { icon: Users, label: "Employés exposés", value: "161 / 438", tone: "text-danger" },
            { icon: Crown, label: "Dirigeants à risque critique", value: "3 / 12", tone: "text-critical" },
            { icon: Building2, label: "Domaines surveillés", value: "7", tone: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-5">
              <s.icon className={`w-5 h-5 mb-3 ${s.tone}`} />
              <div className="font-display text-3xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <div className="font-display font-semibold mb-1">Exposition par département</div>
            <div className="text-xs text-muted-foreground mb-4">Comptes employés détectés dans des fuites</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={dept}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis dataKey="dept" tick={{ fill: "oklch(0.68 0.03 260)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "oklch(0.68 0.03 260)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="exposés" fill="oklch(0.78 0.18 200)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="font-display font-semibold mb-1">Employés les plus exposés</div>
            <div className="text-xs text-muted-foreground mb-4">Classement par score individuel</div>
            <ul className="space-y-3">
              {[
                { n: "Camille Laurent", r: "DAF", s: 94 },
                { n: "Julien Moreau", r: "CTO", s: 89 },
                { n: "Sarah Benali", r: "DRH", s: 82 },
                { n: "Pierre Garcia", r: "Lead Dev", s: 78 },
                { n: "Léa Dupont", r: "Resp. Ventes", s: 71 },
              ].map((u) => (
                <li key={u.n} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted/30">
                  <div>
                    <div className="font-medium">{u.n}</div>
                    <div className="text-xs text-muted-foreground">{u.r}</div>
                  </div>
                  <div className={`font-mono text-sm ${u.s >= 85 ? "text-critical" : u.s >= 70 ? "text-danger" : "text-warning"}`}>{u.s}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <div className="font-display font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Fuites récentes touchant votre organisation</div>
          <ul className="divide-y divide-border/40">
            {[
              { c: "Slack (2024)", n: "12 employés", s: "Élevé" },
              { c: "Atlassian (2023)", n: "47 employés", s: "Critique" },
              { c: "LinkedIn (2021)", n: "138 employés", s: "Élevé" },
              { c: "Dropbox (2022)", n: "8 employés", s: "Moyen" },
            ].map((b) => (
              <li key={b.c} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.c}</div>
                  <div className="text-xs text-muted-foreground">{b.n} concernés</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted/40 border border-border/40">{b.s}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
