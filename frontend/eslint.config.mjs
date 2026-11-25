import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { boundaries } from "./scripts/structure/eslint-boundaries.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaries,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
