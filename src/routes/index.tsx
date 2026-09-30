import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Shield, Building2, Activity, Database, Eye, Radio, ArrowRight, Lock, Zap, Brain } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import teamBravo from "../teambravo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AfterLeak — Sachez ce que les attaquants savent de vous" },
      { name: "description", content: "Plateforme française de renseignement sur l'exposition cyber. Surveillez vos fuites, analysez votre risque, agissez avant les cybercriminels." },
      { property: "og:title", content: "AfterLeak — Cyber Exposure Platform" },
      { property: "og:description", content: "Transformez les données de fuites en intelligence cyber actionnable." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = email.trim() || "demo@afterleak.com";
    navigate({ to: "/dashboard/$email", params: { email: target } });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg animate-drift-grid" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute -right-20 top-10 h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-3xl animate-pulse-orb" />
        <div className="absolute -left-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl animate-pulse-orb" />
        <motion.img
          src={teamBravo}
          alt="Team Bravo"
          initial={{ opacity: 0.1, scale: 0.92, rotate: -4 }}
          animate={{ opacity: 0.18, scale: 1.02, rotate: -1, y: [-8, 8, -8] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute right-0 top-8 h-[36rem] w-[36rem] object-contain mix-blend-screen blur-[0.5px]"
        />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              42,7 milliards d'identifiants analysés en temps réel
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
              Sachez ce que <span className="text-gradient">les attaquants</span><br />savent de vous.
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Surveillez votre exposition numérique, analysez votre risque et recevez des recommandations
              actionnables avant que les cybercriminels n'exploitent vos données.
            </p>

            <form onSubmit={submit} className="mt-10 w-full max-w-2xl">
              <div className="glass-strong rounded-2xl p-2 flex items-center gap-2 glow">
                <div className="pl-3 text-muted-foreground">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  placeholder="Entrez votre adresse email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent outline-none py-3 text-base placeholder:text-muted-foreground/70"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm hover:opacity-90 transition"
                >
                  Analyser l'exposition <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
                <Link
                  to="/business"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass text-foreground hover:bg-muted/40 transition"
                >
                  <Building2 className="w-4 h-4" /> Surveillance entreprise
                </Link>
                <Link
                  to="/auth/register"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass text-foreground hover:bg-muted/40 transition"
                >
                  <Shield className="w-4 h-4" /> Créer un compte
                </Link>
                <span className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" /> Aucune donnée stockée sans consentement
                </span>
              </div>
            </form>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { icon: Database, value: "14 832", label: "Bases de fuites indexées" },
              { icon: Eye, value: "12,3 Md", label: "Comptes analysés" },
              { icon: Activity, value: "847 M", label: "Identifiants surveillés" },
              { icon: Radio, value: "276", label: "Flux de menaces actifs" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-5">
                <s.icon className="w-5 h-5 text-primary mb-3" />
                <div className="font-display text-3xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why different */}
      <section className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-14">
          <div className="text-xs uppercase tracking-widest text-primary font-medium mb-3">Pourquoi AfterLeak</div>
          <h2 className="text-4xl font-bold max-w-2xl mx-auto">Pas une simple recherche de fuite. Un véritable analyste cyber personnel.</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { icon: Eye, title: "Ce qui a fuité", desc: "Cartographie complète de vos données exposées, par catégorie et par source." },
            { icon: Zap, title: "Le niveau de danger", desc: "Score d'exposition calculé en temps réel selon la circulation active." },
            { icon: Brain, title: "Ce qu'un attaquant peut faire", desc: "Reconstitution du profil attaquant et des vecteurs probables." },
            { icon: Shield, title: "Ce que vous devez faire", desc: "Plan d'action priorisé, étape par étape, avec délais recommandés." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-6 hover:border-primary/40 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="font-display font-semibold text-lg mb-2">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="glass-strong rounded-3xl p-10 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(43,103,255,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(89,71,255,0.1),transparent_28%)]" />
          <div className="absolute inset-0 grid-bg opacity-20 animate-drift-grid" />
          <div className="relative grid md:grid-cols-[0.85fr_1.15fr] gap-10 items-center">
            <div>
              <div className="text-xs uppercase tracking-widest text-primary font-medium mb-3">Méthode Team Bravo</div>
              <h2 className="text-4xl font-bold mb-4">Protéger. Analyser. Prévenir.</h2>
              <p className="text-muted-foreground mb-6">
                Une lecture plus froide, plus opérationnelle et moins gadget des fuites: ce qui a fuité,
                comment cela se recoupe et ce que vous devez faire en premier selon le niveau de danger.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
                  <Shield className="w-4 h-4" /> Priorisation réelle
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-2 text-foreground">
                  <Brain className="w-4 h-4" /> Corrélation multi-source
                </span>
              </div>
            </div>
            <div className="relative h-72 rounded-3xl overflow-hidden border border-white/8 bg-[linear-gradient(135deg,rgba(4,10,22,0.96),rgba(11,20,40,0.94))]">
              <motion.img
                src={teamBravo}
                alt="Team Bravo"
                initial={{ opacity: 0.18, scale: 0.96 }}
                animate={{ opacity: 0.3, scale: 1.04, y: [-6, 6, -6] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute right-0 top-1/2 h-[24rem] w-[24rem] -translate-y-1/2 object-contain mix-blend-screen"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,10,24,0.92),rgba(3,10,24,0.35))]" />
              <div className="absolute inset-0 grid-bg opacity-25 animate-drift-grid" />
              <div className="absolute left-0 right-0 top-8 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
              <div className="relative flex h-full flex-col justify-between p-6">
                <div className="space-y-3 max-w-sm">
                  {[
                    "Reconnaissance des données visibles",
                    "Corrélation identité, contact et surface d'accès",
                    "Priorisation des remédiations par danger concret",
                  ].map((item, index) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.08, duration: 0.45 }}
                      className="inline-flex items-center gap-3 rounded-2xl border border-white/8 bg-background/50 px-4 py-3 text-sm"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">0{index + 1}</span>
                      {item}
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Intelligence active</div>
                    <div className="mt-1 font-display text-2xl font-semibold">Lecture cyber tactique</div>
                  </div>
                  <Link
                    to="/dashboard/$email" params={{ email: "demo@afterleak.com" }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
                  >
                    Voir un profil <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
