import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Si necesitas usar 'process', agrégalo aquí
        process: "readonly",
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: pluginReact,
    },
    settings: {
      react: {
        version: "detect", // Detecta automáticamente la versión de React
      },
    },
    extends: [
      "plugin:react/recommended", // Reglas recomendadas para React
      "js/recommended",
    ],
    rules: {
      "react/react-in-jsx-scope": "off", // Deshabilita la regla que exige importar React en cada archivo
      // Otras reglas que necesites ajustar
    },
  },
]);
