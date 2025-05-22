import eslint from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import noOnlyTests from "eslint-plugin-no-only-tests";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  prettierConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
        projectService: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
    plugins: {
      jsdoc,
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
      unicorn,
      "no-only-tests": noOnlyTests,
    },
    settings: {
      react: {
        // Automatically picks the installed React version
        version: "detect",
      },
      "import/extensions": [".js", ".jsx"],
      "import/parsers:": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },
    ignores: [
      "vite.config.ts",
      ".eslintrc.cjs",
      "dist",
      "build",
      "node_modules",
    ],
    rules: {
      /**
       * Best Practices
       * These rules relate to better ways of doing things to help you avoid problems
       */

      "no-alert": "warn",

      "no-redeclare": "off",

      // Override default eslint rule to only show a warning in empty blocks.
      "no-empty": "warn",

      // Enforce dot notation whenever possible
      "dot-notation": "warn",

      // Require Radix Parameter
      radix: "warn",

      // Disallow unused expressions
      "no-unused-expressions": "off",

      // Require the use of `===` and `!==`
      eqeqeq: "warn",

      // Enforce consistent brace style for all control statements
      curly: ["warn", "all"],

      // Disallow hard to read nested ternary operators
      "no-nested-ternary": "warn",

      /**
       * Variables
       * These rules relate to variable declarations
       */
      // Allow the use of variables before they are defined
      "@typescript-eslint/no-use-before-define": "off",

      /**
       * Stylistic Issues
       * These rules relate to style guidelines, and are therefore quite subjective
       */
      // Disallow `if` statements as the only statement in `else` blocks
      "no-lonely-if": "warn",

      // Enforce the consistent use of double quotes
      quotes: [
        "warn",
        "double",
        {
          avoidEscape: true,
        },
      ],

      // Require semicolons instead of ASI
      semi: "warn",

      // Require Brace Style
      "brace-style": [
        "warn",
        "1tbs",
        {
          allowSingleLine: true,
        },
      ],

      // Requires trailing commas for the last element or property in objects (if not in same line as `]` or `}`)
      "comma-dangle": [
        "warn",
        {
          arrays: "always-multiline",
          objects: "always-multiline",
          imports: "always-multiline",
          exports: "always-multiline",
          functions: "never",
        },
      ],

      // Enforce consistent indentation across the application
      "no-tabs": "warn",

      // Enforce a maximum line length. It ignores lines that contain import.
      "max-len": [
        "warn",
        {
          code: 130,
          ignorePattern: "^import .*",
          ignoreStrings: true,
          ignoreUrls: true,
          ignoreTemplateLiterals: true,
        },
      ],

      // Require the use of function declarations instead of function expressions
      "func-style": ["warn", "declaration"],

      /* Comments */
      // Enforce consistent spacing after the `//` or `/*` in a comment
      "spaced-comment": "warn",

      // Enforce a particular style for multiline comments
      "multiline-comment-style": ["warn", "separate-lines"],

      // Disallow comments in same line as code
      "line-comment-position": "warn",

      // Require quotes around object literal property names
      "quote-props": ["warn", "as-needed"],

      /**
       * ECMAScript 6
       * These rules relate to ES6, also known as ES2015
       */
      // Import Sorting
      // TODO: Find config which plays well with import organizing feature of IDEs
      // "import/order": ["warn", { alphabetize: { order: "asc" } }],

      // Require template literals instead of string concatenation
      "prefer-template": "warn",

      // Disallow specified modules when loaded by `import`
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            // Do not allow any usage of underscore, as we prefer lodash
            "underscore",
            "underscore/*",

            // Only allow import of top-level lodash package
            // Unused parts will be removed by webpack
            // More information: https://lodash.com/per-method-packages
            "lodash/*",

            // Do not allow usage of moment, as it is not actively developed anymore
            // More information: https://momentjs.com/docs/#/-project-status/
            // Usage of moment should be limited to packages encapsulating the usage, making removing moment easier
            "moment",

            // Do not allow to use the non-typed originals of useDispatch & useSelector
            {
              name: "react-redux",
              importNames: ["useDispatch", "useSelector"],
              message:
                "Please use the typed 'useAppDispatch' or 'useAppSelector' instead.",
            },
            // Do not allow to use the non-typed originals of useParams & Params
            {
              name: "react-router-dom",
              importNames: ["useParams, Params"],
              message:
                "Please use the typed 'useAppParams', 'RouteParams' or 'Partial<RouteParams>' instead.",
            },
            {
              name: "react-router-dom",
              importNames: ["Navigate , NavLink"],
              message:
                "Please use 'PreservingNavigate' or 'PreservingNavLink' component instead.",
            },
            {
              name: "@api/core-api-token-manager",
              importNames: ["CoreApiTokenManager"],
              message:
                "Please use 'getCachedTokenProvider', 'useCachedTokenProvider', " +
                "'getCachedCompanyTokenProvider' or 'useCachedCompanyTokenProvider' from the app itself " +
                "to ensure that we request a single token per project as long as it's valid.",
            },
            
          ],
          patterns: [
            {
              group: ["./**", "../**", "**/./**", "**/../**"],
              message:
                'Relative imports with any number of "../" or "./" are not allowed. Use path mapping instead',
            },
            // Importing the wrong config can lead to nasty "works in dev" bugs. Better whitelist all places with eslint-disable.
            {
              group: [
                "@src/runtime-config-*",
                "!@src/runtime-config-base",
                "!@src/runtime-config-types",
              ],
              message:
                "You probably wanted to import '@src/runtime-config' instead.",
            },
          ],
        },
      ],

      "no-restricted-syntax": [
        "warn",
        {
          selector: "MemberExpression > Identifier[name='getUserProjectToken']",
          message:
            "Please use 'getCachedTokenProvider' or 'useCachedTokenProvider' from the app itself " +
            "to ensure that we request a single token per project as long as it's valid.",
        },
      ],

      // Require parentheses around arrow function arguments
      "arrow-parens": ["warn", "always"],

      // Prefer a `for-of` loop over a standard `for` loop if the index is only used to access the array being iterated
      "@typescript-eslint/prefer-for-of": "warn",

      // Do not allow default exports
      "import/no-default-export": "warn",

      /**
       * TypeScript-specific
       */

      // Rules for enforcing naming conventions
      "@typescript-eslint/naming-convention": [
        "warn",
        // Casing rules
        {
          selector: "default",
          format: ["camelCase", "PascalCase"],
          filter: {
            // & is added to exclude css class names specifically MUI css class names
            // aria-labelledby is from MUI package
            regex: "&|aria-labelledby|aria-label",
            match: false,
          },
        },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
        },
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },

        // Require booleans to start with a whitelisted verb
        ...[
          "variable",
          "parameter",
          "property",
          "parameterProperty",
          "accessor",
        ].map((selector) => ({
          selector,
          types: ["boolean"],
          // "format" is required, but the camelcase rule already enforces it
          format: [],
          prefix: [
            "is",
            "are",
            "should",
            "has",
            "have",
            "can",
            "did",
            "will",
            "was",
            "were",
          ],
        })),

        // Require all interfaces to be prefixed with "I"
        {
          selector: "interface",
          format: ["PascalCase"],
          // prefix: ["I"],
        },
      ],

      // Require explicit return types on functions and class methods (only functions which are part of a declaration will be checked)
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
        },
      ],

      // Bans “// @ts-ignore” and all other typescript-disabling comments from being used
      "@typescript-eslint/ban-ts-comment": "warn",

      // Reduce the severity of ban-types to warning to not break builds due to new rules.
      "@typescript-eslint/no-restricted-types": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",

      // Allow explicit type declarations for variables or parameters initialized to a number, string, or boolean
      "@typescript-eslint/no-inferrable-types": "off",

      // End import from eslint-config-base

      // Import from eslint-config-react

      /**
       * plugin:react/recommended:
       */
      // react/display-name
      // react/jsx-no-comment-textnodes
      // react/jsx-no-duplicate-props
      // react/jsx-no-target-blank
      // react/jsx-no-undef
      // react/jsx-uses-react
      // react/jsx-uses-vars
      // react/no-children-prop
      // react/no-danger-with-children
      // react/no-deprecated
      // react/no-direct-mutation-state
      // react/no-find-dom-node
      // react/no-is-mounted
      // react/no-render-return-value
      // react/no-string-refs
      // react/no-unknown-property
      // react/prop-types
      // react/react-in-jsx-scope
      // react/require-render-return

      // warn when key prop is missing in arrays
      "react/jsx-key": "warn",

      // Enforces consistent naming for boolean props
      "react/boolean-prop-naming": "warn",

      // Prevent usage of dangerous JSX properties
      "react/no-danger": "warn",
      // Prevent problem with children and props.dangerouslySetInnerHTML
      "react/no-danger-with-children": "warn",

      // Prevent usage of deprecated methods
      "react/no-deprecated": "warn",

      // Prevent `this` from being used in stateless functional components
      "react/no-this-in-sfc": "warn",

      // Prevent usage of unsafe lifecycle methods
      "react/no-unsafe": "warn",

      // Enforce ES5 or ES6 class for React Components
      // TODO: This is workaround to mark class components as warning, but not indicating functional components as preferred
      "react/prefer-es6-class": ["warn", "never"],

      // Prevent extra closing tags for components without children
      "react/self-closing-comp": "warn",

      // Prevent void DOM elements (e.g. `<img />`, `<hr />`) from receiving children
      "react/void-dom-elements-no-children": "error",

      /**
       * JSX-specific
       */
      // Prevent usage of `.bind()` in JSX props
      "react/jsx-no-bind": [
        "error",
        { allowArrowFunctions: true, allowFunctions: true },
      ],

      // Prevent usage of `javascript:` URLs
      // TODO: enable when rule is released
      // "react/jsx-no-script-url": "error",

      // Disallow unnecessary fragments
      "react/jsx-no-useless-fragment": "warn",

      // Enforce shorthand form for React fragments
      "react/jsx-fragments": "error",

      // Enforce PascalCase for user-defined JSX components
      "react/jsx-pascal-case": "error",

      // Change forbidden characters to allow single- and double quotes (which are not allowed by default)
      "react/no-unescaped-entities": ["warn", { forbid: [">", "}"] }],

      /**
       * Hooks
       */
      // Checks rules of Hooks
      "react-hooks/rules-of-hooks": "error",

      // Checks effect dependencies
      "react-hooks/exhaustive-deps": "warn",

      // TODO: Consider the following:
      // https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/forbid-component-props.md
      // https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/forbid-dom-props.md
      // https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/jsx-no-target-blank.md

      // End import from eslint-config-react

      // suppress errors for missing 'import React' in files
      "react/react-in-jsx-scope": "off",

      // suppress errors for Prop spreading is forbidden like {...props}
      "react/jsx-props-no-spreading": "off",

      // Disallows magic numbers
      "@typescript-eslint/no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 1, 0, 2, 100],
          ignoreArrayIndexes: true,
        },
      ],

      // "npm run lint-ci" includes "--max-warnings 0", so a warning is enough.
      "no-console": ["warn"],
      "no-debugger": ["warn"],
      // Prevent us from having focused tests.
      "no-only-tests/no-only-tests": "warn",

      // Prevent trailing space in a new line
      "no-trailing-spaces": ["warn", { skipBlankLines: true }],

      // Disable some rules from "plugin:@typescript-eslint/recommended-requiring-type-checking"
      // which seem either too strict, or which are currently failing too often.
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
      // We use unused expressions in some cases to check if a function is called
      "@typescript-eslint/no-unused-expressions": "off",
      // We often compare enums to strings from api calls
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          vars: "all",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      // Some code use double "undefined" in arguments (an optional arguments typed as undefined too)
      "@typescript-eslint/no-duplicate-type-constituents": "off",
      // React throws non errors objects for the suspend system
      "@typescript-eslint/only-throw-error": "off",
      // This rule prevents passing async callback to non async components properties
      "@typescript-eslint/no-misused-promises": "off",
      // Some code reject with strings or other objects
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      // For type guards purposes we often create unions with unknown or string
      "@typescript-eslint/no-redundant-type-constituents": "off",
      // We have code that await on non promises
      "@typescript-eslint/await-thenable": "off",
      // Some types in the monorepo are "empty", meaning they do not add anything to the parent type
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    // Override for code that should avoid the window object, to make the code usable from SharedWorker:
    // API calls, SharedWorker, Config
    files: [
      "src/runtime-config*.ts",
      "src/context-providers/**/*.ts",
      "src/api/**/*.ts",
    ],
    rules: {
      // Use `globalThis` instead of `window` where possible
      "unicorn/prefer-global-this": "warn",
    },
  },
  {
    // This objects contains rules customization only for test files
    files: ["**/*.spec.ts", "**/*.spec.tsx", "**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      globals: globals.jest,
    },

    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      // Jest apis uses any everywhere for mocking
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/await-thenable": "off",
      // Chai apis sometimes uses unused expressions
      "@typescript-eslint/no-unused-expressions": "off",
      // Allow unnecessary condition in tests
      "@typescript-eslint/no-unnecessary-condition": "off",
      // Importing the default export is useful for mocks
      "import/default": "off",
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
