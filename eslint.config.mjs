import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Проектът има много Firestore-базирани колбекве (хлабаво типизирани данни по природа) —
    // правено error беше прекалено строго за соло разработчик проект. Сваляме на warning — продължава
    // да се вижда в Problems panel-а (за постепенно почистване), но вече не блокира билд-а и не залива
    // редактора с червени линии навсякъде.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Нито prefer-const, нито неескейпнатите кавички в JSX текст нямат реален функционален риск —
      // чисто стилови предпочитания. Никога не са чупили нещо в браузъра. Сваляме ги на warning,
      // за да не заливат редактора с червени линии при всяко отваряне на файл.
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
