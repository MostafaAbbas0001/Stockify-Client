import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env["STOCKIFY_API_URL"];
  const nitroPreset = process.env["NITRO_PRESET"] ?? "cloudflare-module";

  // Server routes read this at runtime. Keep it server-only: never expose it
  // through VITE_* or bundle it into browser code.
  if (!process.env["STOCKIFY_API_URL"] && backendUrl) {
    process.env["STOCKIFY_API_URL"] = backendUrl;
  }

  return {
    plugins: [
      tailwindcss(),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      ...(command === "build"
        ? [
            nitro({
              preset: nitroPreset,
              routeRules: {
                "/**": {
                  headers: {
                    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
                  },
                },
              },
            }),
          ]
        : []),
      react(),
    ],
    resolve: { tsconfigPaths: true },
  };
});
