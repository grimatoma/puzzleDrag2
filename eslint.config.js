import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
    },
    files: ["**/*.{js,jsx}"],
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    files: ["src/__tests__/**/*.js"],
    languageOptions: { globals: { ...globals.node } },
  },
];
