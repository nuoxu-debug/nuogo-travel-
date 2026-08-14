import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["**/dist/**", "**/node_modules/**", ".worktrees/**", ".artifacts/**"] },
  js.configs.recommended,
  {
    files: ["client/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2022 }
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/prop-types": "off",
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^(?:_|[A-Z].*Context$)",
        destructuredArrayIgnorePattern: "^_"
      }]
    }
  },
  {
    files: ["server/**/*.js", "shared/**/*.js", "tests/e2e/**/*.js", "playwright.config.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.node, ...globals.es2022 } },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] }
  },
  {
    files: ["**/*.test.{js,jsx}", "tests/e2e/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
];
