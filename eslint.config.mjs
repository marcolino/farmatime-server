import js from "@eslint/js";
import globals from "globals";

export default [
  { 
    ignores: ["dist", "node_modules"] 
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
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
