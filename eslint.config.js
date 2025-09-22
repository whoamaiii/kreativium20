import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import jsxA11y from "eslint-plugin-jsx-a11y";
import i18nextPlugin from "eslint-plugin-i18next";

export default tseslint.config(
  { ignores: ["dist", "*.config.ts", "*.config.js", "validate-components.ts", "validate-style.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "react": reactPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      "i18next": i18nextPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Remove deprecated shim allowlist now that migration is complete
      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: []
        }
      ],
      // Disallow literal UI strings in JSX. Allow numbers and a curated whitelist.
      "react/jsx-no-literals": [
        "warn",
        {
          noStrings: true,
          // Allow strings in props/attributes (e.g., className for Tailwind, aria-*)
          ignoreProps: true,
          noAttributeStrings: false,
          allowedStrings: [
            "OK",
            "Ok",
            "URL",
            "API",
            "ID",
            "ms",
            "KB",
            "MB",
            "GB",
            // Allow common punctuation/unit tokens in JSX without forcing i18n
            ":",
            "-",
            "%",
            "(",
            ")",
            "•",
            "/",
            "x"
          ],
        },
      ],
      // i18n guardrail: ensure strings are translated via t() or <Trans />. Do not allow literals in markup or attributes (including aria-*)
      "i18next/no-literal-string": [
        "warn",
        {
          // Check only visible text nodes in markup for now. Attributes and non-UI strings are ignored.
          markupOnly: true,
          onlyAttribute: false,
          validateTemplate: true,
          ignoreCallee: ["t", "i18n.t"],
          ignoreAttribute: [
            "id",
            "key",
            "htmlFor",
            "className",
            "data-testid",
            "data-testId",
            "data-test",
            "testId",
            "role"
          ],
          components: ["Trans"],
        },
      ],
      // A11y rules
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/label-has-associated-control": ["warn", { assert: "either" }],
      "jsx-a11y/control-has-associated-label": ["warn"],
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/no-autofocus": ["warn", { ignoreNonDOM: true }],
      "jsx-a11y/no-static-element-interactions": "warn",

      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "vars": "all",
          "args": "after-used",
          "ignoreRestSiblings": true,
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          "allowShortCircuit": true,
          "allowTernary": true,
          "allowTaggedTemplates": true
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "no-case-declarations": "warn",
      "no-prototype-builtins": "warn",
      "no-unreachable": "error",
      "no-dead-code": "off", // TypeScript handles this
      // Memory leak prevention rules
      "react/no-array-index-key": "warn",
      "no-console": "error",
      "no-restricted-syntax": [
        "warn",
        {
          "selector": "CallExpression[callee.property.name='addEventListener'][arguments.length > 1]:not(:has(Identifier[name='useEffect'], Identifier[name='useLayoutEffect']))",
          "message": "addEventListener should be used inside useEffect with proper cleanup to prevent memory leaks"
        },
        {
          "selector": "CallExpression[callee.name=/^(setInterval|setTimeout)$/][arguments.length > 0]:not(:has(Identifier[name='useEffect'], Identifier[name='useLayoutEffect']))",
          "message": "setInterval/setTimeout should be used inside useEffect with proper cleanup (clearInterval/clearTimeout) to prevent memory leaks"
        },
        {
          "selector": "NewExpression[callee.name='Worker']:not(:has(Identifier[name='useEffect'], Identifier[name='useLayoutEffect']))",
          "message": "Worker instantiation should be managed through custom hooks with proper cleanup (worker.terminate()) to prevent memory leaks"
        },
        {
          "selector": "JSXAttribute[name.name='style'][value.type='JSXExpressionContainer'][value.expression.type='ObjectExpression']",
          "message": "Avoid inline styles (style={{}}). Use Tailwind CSS classes or CSS custom properties for styling. See rule 3wIMH0UDSwsNj5RYGo17Vg. Exception: Radix primitives with // RADIX_INLINE_STYLE_ALLOWED comment."
        }
      ],
      // Flag but do not fail builds on these opinions while migrating
      "no-empty": "warn"
    },
  },
  {
    // Override for scripts and tests with different tsconfig and relaxed rules
    files: ["scripts/**/*.ts", "tests/**/*"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.scripts.json',
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      // Scripts and tests can use console for output/debugging
      "no-console": "off",
      // Relax i18n rules for scripts as they typically don't have UI strings
      "i18next/no-literal-string": "warn",
      "react/jsx-no-literals": "off",
      "no-restricted-syntax": "off"
    }
  },
  {
    files: ["src/lib/storageUtils.ts", "**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}", "tests/**/*.ts"],
    rules: {
      "no-restricted-syntax": "off",
      // Tests can use console for debugging
      "no-console": "off",
      // During tests we relax i18n literal checks to reduce friction when building fixtures
      "i18next/no-literal-string": "off",
      "react/jsx-no-literals": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);