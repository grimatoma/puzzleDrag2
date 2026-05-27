import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

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
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2022 },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name=/^(state|next|s|ns)$/] TSAsExpression TSAsExpression > TSUnknownKeyword",
          message: "Do not cast reducer state through `unknown`; add the field to GameState instead.",
        },
        {
          selector: "Identifier[name=/^(state|next|s|ns)$/] > TSAsExpression > TSUnknownKeyword",
          message: "Do not cast reducer state through `unknown`; add the field to GameState instead.",
        },
      ],
      "no-undef": "off",
    },
  },
  {
    files: ["src/__tests__/**/*.{js,ts}"],
    languageOptions: { globals: { ...globals.node } },
  },
];
