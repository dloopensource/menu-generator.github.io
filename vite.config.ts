import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The `base` path is required for GitHub Pages deploys at
// /menu-generator.github.io/. Without it, asset URLs in dist/index.html
// are absolute (/assets/...) and 404 against the actual subpath.
export default defineConfig({
  base: "/menu-generator.github.io/",
  plugins: [react()],
});
