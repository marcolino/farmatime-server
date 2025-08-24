import js from "@eslint/js";
import globals from "globals";
import * as espree from "espree";

export default [
  { 
    ignores: ["dist", "node_modules"] 
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      parser: espree,
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": "warn",
      "no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "indent": ["error", 2],
      "semi": ["error", "always"]
    }
  }
];
