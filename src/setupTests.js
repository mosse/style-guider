// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables
process.env = {
    ...process.env,
    NODE_ENV: 'test',
    REACT_APP_ANTHROPIC_API_KEY: 'test-api-key',
    REACT_APP_ANTHROPIC_API_URL: 'https://api.anthropic.com/v1',
    REACT_APP_ANTHROPIC_MODEL: 'claude-3-sonnet-20240229'
};
