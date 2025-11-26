import '@testing-library/jest-dom';

// Mock the API module
jest.mock('./api', () => ({
  fetchAgents: jest.fn(),
  fetchCategories: jest.fn(),
  fetchScores: jest.fn(),
  fetchAgentScores: jest.fn(),
  fetchCategoryDetails: jest.fn(),
}));

// Mock console.error to make test output cleaner
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress React warnings
    if (typeof args[0] === 'string' && args[0].includes('Warning: ')) {
      return;
    }
    // Suppress expected error messages from error handling tests
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.includes('Failed to load initial data')) {
        return;
      }
      // Also check if it's an Error object with expected messages
      if (firstArg instanceof Error && firstArg.message === 'Network error') {
        return;
      }
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
