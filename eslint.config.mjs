import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js"; // Importamos 'js' para usar sus configuraciones recomendadas
import pluginReact from "eslint-plugin-react";

export default defineConfig([
  // Incluimos las configuraciones recomendadas de @eslint/js directamente
  js.configs.recommended,

  // Configuración personalizada para nuestros archivos
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
    rules: {
      "react/react-in-jsx-scope": "off", // Deshabilita la regla que exige importar React en cada archivo
      // Otras reglas que necesites ajustar
    },
  },

  // Incluimos las configuraciones recomendadas de React
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    ...pluginReact.configs.recommended,
  },
]);