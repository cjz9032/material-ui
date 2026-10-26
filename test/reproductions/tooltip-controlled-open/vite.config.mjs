import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig } from "vite";
const require = createRequire(import.meta.url);
export default defineConfig({
  resolve: {
    alias: {
      "tooltip-repro-fixed": join(
        dirname(require.resolve("@mui/material/Tooltip")),
        "Tooltip.repro-fixed.mjs",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "@mui/material/Tooltip",
      "@mui/material/styles",
      "tooltip-repro-fixed",
      "react",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
});
