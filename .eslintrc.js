module.exports = {
  root: true,
  extends: [
    'react-app',
    'react-app/jest'
  ],
  ignorePatterns: [
    'node_modules/**/*',
    'build/**/*',
    '**/*.min.js',
    '**/vendor/**/*'
  ],
  rules: {
    // Converting common errors to warnings
    'no-unused-expressions': 'warn',
    'no-sequences': 'warn',
    'no-mixed-operators': 'warn',
    'no-labels': 'warn',
    'no-label-var': 'warn',
    'no-extra-label': 'warn',
    'no-use-before-define': 'warn',
    'default-case': 'warn',
    'no-fallthrough': 'warn',
    'new-parens': 'warn',
    'no-restricted-globals': 'warn',
    'strict': 'warn',
    'no-undef': 'warn',
    'no-func-assign': 'warn',
    'eqeqeq': 'warn',
    'no-control-regex': 'warn',
    'no-unused-vars': 'warn',
    'no-cond-assign': 'warn',
    'no-loop-func': 'warn',
    
    // Testing Library rules
    'testing-library/prefer-screen-queries': 'warn',
    'testing-library/no-unnecessary-act': 'warn',
    'testing-library/no-wait-for-multiple-assertions': 'warn',
    'testing-library/no-node-access': 'warn'
  },
  overrides: [
    // Less strict rules for test files
    {
      files: ['**/*.test.js', '**/*.test.jsx', '**/*.test.ts', '**/*.test.tsx', '**/test-*.js', '**/parser-test-*.js'],
      rules: {
        'no-unused-vars': 'off',
        'testing-library/prefer-screen-queries': 'off',
        'testing-library/no-unnecessary-act': 'off',
        'testing-library/no-wait-for-multiple-assertions': 'off',
        'testing-library/no-node-access': 'off'
      }
    }
  ]
} 