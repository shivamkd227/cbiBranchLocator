import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "src", "data");

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function saveMasterPlugin(): Plugin {
  return {
    name: "save-cbi-master",
    configureServer(server) {
      server.middlewares.use(
          "/api/save-master",
          (
              request: IncomingMessage,
              response: ServerResponse,
              next: () => void
          ) => {
            if (request.method !== "POST") {
              next();
              return;
            }

            void readBody(request)
                .then((raw) => {
                  const payload = JSON.parse(raw) as {
                    branches: unknown;
                    zones: unknown;
                    regions: unknown;
                    districts: unknown;
                  };

                  if (
                      !Array.isArray(payload.branches) ||
                      payload.branches.length === 0
                  ) {
                    throw new Error(
                        "Refusing to overwrite the branch master with an empty list"
                    );
                  }

                  fs.mkdirSync(dataDir, { recursive: true });

                  fs.writeFileSync(
                      path.join(dataDir, "branches.json"),
                      JSON.stringify(payload.branches)
                  );

                  fs.writeFileSync(
                      path.join(dataDir, "zones.json"),
                      JSON.stringify(payload.zones, null, 2)
                  );

                  fs.writeFileSync(
                      path.join(dataDir, "regions.json"),
                      JSON.stringify(payload.regions, null, 2)
                  );

                  fs.writeFileSync(
                      path.join(dataDir, "districts.json"),
                      JSON.stringify(payload.districts)
                  );

                  response.statusCode = 200;
                  response.setHeader("Content-Type", "application/json");
                  response.end(
                      JSON.stringify({
                        ok: true,
                        branches: payload.branches.length,
                      })
                  );
                })
                .catch((error: unknown) => {
                  response.statusCode = 500;
                  response.setHeader("Content-Type", "application/json");
                  response.end(
                      JSON.stringify({
                        ok: false,
                        error:
                            error instanceof Error ? error.message : "Save failed",
                      })
                  );
                });
          }
      );
    },
  };
}

export default defineConfig({
  // 👇 ADD THIS FOR GITHUB PAGES
  base: "/cbiBranchLocator/",

  plugins: [
    {
      name: "geojson-import",
      transform(code, id) {
        if (id.split("?")[0].endsWith(".geojson")) {
          return {
            code: `export default ${code}`,
            map: null,
          };
        }

        return null;
      },
    },
    saveMasterPlugin(),
    react(),
  ],

  server: {
    port: 5173,
    host: "127.0.0.1",

    proxy: {
      "/api/cbi-locator": {
        target: "https://centralbank.bank.in",
        changeOrigin: true,
        secure: true,
        rewrite: () => "/branch_locators/load-cs.php",

        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader(
                "Referer",
                "https://centralbank.bank.in/en/Branch-locators"
            );
            proxyReq.setHeader("User-Agent", "Mozilla/5.0");
          });
        },
      },
    },
  },
});