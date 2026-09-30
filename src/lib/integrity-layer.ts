import path from "node:path";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import datasetBaseCsv from "../dataset_base_outil.csv?raw";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const CHAIN_FILE_PATH = path.join(projectRoot, ".data", "integrity-chain.json");

export interface IntegritySourceSnapshot {
  source: string;
  status: "ok" | "unavailable" | "skipped";
  fetchedAt: string;
  recordCount: number;
  digest: string;
  note?: string;
  sample?: Array<{ id: string; title: string }>;
}

export interface IntegrityChainEntry {
  index: number;
  previousHash: string;
  hash: string;
  capturedAt: string;
  sources: IntegritySourceSnapshot[];
  sourceCount: number;
}

export interface IntegrityReport {
  blockIndex: number;
  previousHash: string;
  currentHash: string;
  capturedAt: string;
  sourceCount: number;
  integrityStatus: "ok" | "tampered";
  verification: {
    valid: boolean;
    issue?: string;
  };
  sources: IntegritySourceSnapshot[];
}

interface IntegrityChainStore {
  entries: IntegrityChainEntry[];
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, childValue]) => `${JSON.stringify(key)}:${stableStringify(childValue)}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashContent(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseCsvLine(line: string): string[] {
  return line.split(",").map((value) => value.trim());
}

function parseLocalDatasetSnapshot(): IntegritySourceSnapshot {
  const lines = datasetBaseCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return {
      source: "local-breach-dataset",
      status: "ok",
      fetchedAt: new Date().toISOString(),
      recordCount: 0,
      digest: hashContent({ source: "local-breach-dataset", recordCount: 0 }),
      note: "Aucune ligne de données détectée.",
    };
  }

  const headers = parseCsvLine(lines[0]);
  const records = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });

  const uniqueEmails = new Set(records.map((record) => normalizeEmail(String(record.EmailUtilisateur ?? ""))).filter(Boolean));
  const sample = records.slice(0, 3).map((record, index) => ({
    id: `dataset-${index + 1}`,
    title: `${String(record.site_structure ?? "Source inconnue")}`,
  }));

  return {
    source: "local-breach-dataset",
    status: "ok",
    fetchedAt: new Date().toISOString(),
    recordCount: records.length,
    digest: hashContent({
      source: "local-breach-dataset",
      recordCount: records.length,
      uniqueEmails: Array.from(uniqueEmails).slice(0, 10),
      sample,
    }),
    sample,
    note: `${records.length} entrées locales disponibles et ${uniqueEmails.size} profils distincts détectés.`,
  };
}

async function fetchJsonWithTimeout<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AfterLeak/1.0 (+https://afterleak.local)",
        ...headers,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchTextWithTimeout(url: string, headers?: Record<string, string>): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/plain, application/rss+xml, application/xml",
        "User-Agent": "AfterLeak/1.0 (+https://afterleak.local)",
        ...headers,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buildCisaKevSnapshot(): Promise<IntegritySourceSnapshot> {
  const payload = await fetchJsonWithTimeout<{ vulnerabilities?: Array<Record<string, unknown>> }>(
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
  );
  const vulnerabilities = payload?.vulnerabilities ?? [];

  return {
    source: "cisa-kev",
    status: vulnerabilities.length ? "ok" : "unavailable",
    fetchedAt: new Date().toISOString(),
    recordCount: vulnerabilities.length,
    digest: hashContent({ source: "cisa-kev", vulnerabilities: vulnerabilities.slice(0, 5) }),
    sample: vulnerabilities.slice(0, 3).map((item, index) => ({
      id: `cisa-${index + 1}`,
      title: String((item?.cveID as string | undefined) ?? `KEV-${index + 1}`),
    })),
    note: vulnerabilities.length ? `${vulnerabilities.length} entrées KEV récupérées.` : "Aucune donnée KEV disponible à ce moment.",
  };
}

async function buildNvdSnapshot(): Promise<IntegritySourceSnapshot> {
  const payload = await fetchJsonWithTimeout<{ vulnerabilities?: Array<Record<string, unknown>> }>(
    "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=5",
  );
  const vulnerabilities = payload?.vulnerabilities ?? [];

  return {
    source: "nvd-cve",
    status: vulnerabilities.length ? "ok" : "unavailable",
    fetchedAt: new Date().toISOString(),
    recordCount: vulnerabilities.length,
    digest: hashContent({ source: "nvd-cve", vulnerabilities: vulnerabilities.slice(0, 5) }),
    sample: vulnerabilities.slice(0, 3).map((item, index) => ({
      id: `nvd-${index + 1}`,
      title: String((item?.id as string | undefined) ?? `CVE-${index + 1}`),
    })),
    note: vulnerabilities.length ? `${vulnerabilities.length} CVE récupérées depuis NVD.` : "Aucune donnée NVD disponible à ce moment.",
  };
}

async function buildCertFrSnapshot(): Promise<IntegritySourceSnapshot> {
  const text = await fetchTextWithTimeout("https://www.cert.ssi.gouv.fr/feed/");

  if (!text) {
    return {
      source: "cert-fr-rss",
      status: "unavailable",
      fetchedAt: new Date().toISOString(),
      recordCount: 0,
      digest: hashContent({ source: "cert-fr-rss", text: "" }),
      note: "Le flux CERT-FR n’a pas répondu à temps.",
    };
  }

  const items = [...text.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1] ?? "");
  const sample = items.slice(0, 3).map((item, index) => {
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
    return {
      id: `cert-${index + 1}`,
      title: titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || `CERT-${index + 1}`,
    };
  });

  return {
    source: "cert-fr-rss",
    status: items.length ? "ok" : "unavailable",
    fetchedAt: new Date().toISOString(),
    recordCount: items.length,
    digest: hashContent({ source: "cert-fr-rss", items: items.slice(0, 5) }),
    sample,
    note: items.length ? `${items.length} éléments CERT-FR extraits.` : "Aucun élément CERT-FR trouvé dans le flux.",
  };
}

async function buildMitreSnapshot(): Promise<IntegritySourceSnapshot> {
  const text = await fetchTextWithTimeout("https://cve.mitre.org/data/downloads/allitems.xml");

  if (!text) {
    return {
      source: "mitre-cve",
      status: "unavailable",
      fetchedAt: new Date().toISOString(),
      recordCount: 0,
      digest: hashContent({ source: "mitre-cve", text: "" }),
      note: "Le flux MITRE n’a pas répondu à temps.",
    };
  }

  const matches = [...text.matchAll(/<item[^>]+name="(CVE-[^"]+)"/gi)].map((match) => match[1]);
  const sample = matches.slice(0, 3).map((value, index) => ({ id: `mitre-${index + 1}`, title: value }));

  return {
    source: "mitre-cve",
    status: matches.length ? "ok" : "unavailable",
    fetchedAt: new Date().toISOString(),
    recordCount: matches.length,
    digest: hashContent({ source: "mitre-cve", cves: matches.slice(0, 5) }),
    sample,
    note: matches.length ? `${matches.length} références MITRE détectées.` : "Aucune référence MITRE trouvée.",
  };
}

async function buildHibpSnapshot(): Promise<IntegritySourceSnapshot> {
  const apiKey = process.env.HIBP_API_KEY?.trim();
  if (!apiKey) {
    return {
      source: "hibp",
      status: "skipped",
      fetchedAt: new Date().toISOString(),
      recordCount: 0,
      digest: hashContent({ source: "hibp", skipped: true }),
      note: "HIBP non sollicité : aucune clé API disponible.",
    };
  }

  const payload = await fetchJsonWithTimeout<{ breachCount?: number }>("https://haveibeenpwned.com/api/v3/breaches", {
    "hibp-api-key": apiKey,
    "Content-Type": "application/json",
  });

  return {
    source: "hibp",
    status: payload?.breachCount ? "ok" : "unavailable",
    fetchedAt: new Date().toISOString(),
    recordCount: payload?.breachCount ?? 0,
    digest: hashContent({ source: "hibp", breachCount: payload?.breachCount ?? 0 }),
    note: payload?.breachCount ? `HIBP a répondu avec ${payload.breachCount} entrées.` : "HIBP n’a pas renvoyé de données exploitables.",
  };
}

async function readChainStore(): Promise<IntegrityChainStore> {
  try {
    const raw = await readFile(CHAIN_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<IntegrityChainStore>;
    return { entries: Array.isArray(parsed.entries) ? (parsed.entries as IntegrityChainEntry[]) : [] };
  } catch {
    return { entries: [] };
  }
}

async function writeChainStore(store: IntegrityChainStore): Promise<void> {
  await mkdir(path.dirname(CHAIN_FILE_PATH), { recursive: true });
  await writeFile(CHAIN_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function verifyChain(entries: IntegrityChainEntry[]): { valid: boolean; issue?: string } {
  if (!entries.length) {
    return { valid: true };
  }

  let previousHash = "genesis";
  for (const entry of entries) {
    const expectedHash = hashContent({
      index: entry.index,
      previousHash,
      capturedAt: entry.capturedAt,
      sources: entry.sources,
    });

    if (entry.hash !== expectedHash) {
      return { valid: false, issue: `Le bloc ${entry.index} ne correspond plus à la chaîne attendue.` };
    }

    previousHash = entry.hash;
  }

  return { valid: true };
}

export async function getIntegrityReport(): Promise<IntegrityReport> {
  const [localSnapshot, cisaSnapshot, nvdSnapshot, certSnapshot, mitreSnapshot, hibpSnapshot] = await Promise.all([
    Promise.resolve(parseLocalDatasetSnapshot()),
    buildCisaKevSnapshot(),
    buildNvdSnapshot(),
    buildCertFrSnapshot(),
    buildMitreSnapshot(),
    buildHibpSnapshot(),
  ]);

  const sources = [localSnapshot, cisaSnapshot, nvdSnapshot, certSnapshot, mitreSnapshot, hibpSnapshot];
  const previousStore = await readChainStore();
  const previousHash = previousStore.entries.length ? previousStore.entries[previousStore.entries.length - 1].hash : "genesis";
  const capturedAt = new Date().toISOString();
  const blockIndex = previousStore.entries.length + 1;
  const currentHash = hashContent({
    index: blockIndex,
    previousHash,
    capturedAt,
    sources,
  });

  const chainEntry: IntegrityChainEntry = {
    index: blockIndex,
    previousHash,
    hash: currentHash,
    capturedAt,
    sources,
    sourceCount: sources.length,
  };

  const nextStore: IntegrityChainStore = {
    entries: [...previousStore.entries, chainEntry],
  };

  await writeChainStore(nextStore);

  const verification = verifyChain(nextStore.entries);

  return {
    blockIndex,
    previousHash,
    currentHash,
    capturedAt,
    sourceCount: sources.length,
    integrityStatus: verification.valid ? "ok" : "tampered",
    verification,
    sources,
  };
}
