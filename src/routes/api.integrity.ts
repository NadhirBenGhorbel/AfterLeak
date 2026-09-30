import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFileRoute } from "@tanstack/react-router";
import dotenv from "dotenv";
import { getIntegrityReport } from "@/lib/integrity-layer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(projectRoot, ".env") });

export const Route = createFileRoute("/api/integrity")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const report = await getIntegrityReport();
          return new Response(JSON.stringify({ ok: true, report }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown integrity error";
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
