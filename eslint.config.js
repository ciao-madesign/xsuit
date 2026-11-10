import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "dist-firefox/**",
      "dist-edge/**",
      "dist-dev/**",
      "dist-dev-firefox/**",
      "dist-dev-edge/**",
      "node_modules/**",
      "scripts/*.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        chrome: "readonly",
        document: "readonly",
        window: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
  },
);
