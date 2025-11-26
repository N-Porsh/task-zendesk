// Global test setup
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { Logger } from 'winston';

// Create a mock logger to prevent logging during tests
jest.mock('../src/utils/logger', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global teardown
afterAll(async () => {
  // Clean up any resources if needed
});
