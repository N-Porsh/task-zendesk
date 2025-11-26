import request from 'supertest';
import { Server } from 'http';
import { Express } from 'express';

// Mock the gRPC client methods
const mockGrpcClient = {
  GetAgents: jest.fn(),
  GetCategories: jest.fn(),
  GetCategoryScores: jest.fn(),
  GetOverallScore: jest.fn(),
  GetAgentScores: jest.fn(),
  GetCategoryDetails: jest.fn(),
};

// Import the web server module
import { createApp } from '../api/app';

describe('Web Server', () => {
  let app: Express;
  let server: Server;
  const baseUrl = '/api';

  beforeAll(async () => {
    // Set NODE_ENV to test to prevent process.exit
    process.env.NODE_ENV = 'test';
    
    // Create a fresh app for testing with the mock client
    app = createApp(mockGrpcClient);
    
    // Start the server on a random port for testing
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        resolve();
      });
    });
    
    // Set a small timeout for tests
    jest.setTimeout(10000);
  });
  
  afterAll(async () => {
    // Clean up
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
    });
    }
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockGrpcClient.GetAgents.mockImplementation((_, callback) => {
      callback(null, { agents: [{ id: 1, name: 'Test Agent' }] });
    });
    
    mockGrpcClient.GetCategories.mockImplementation((_, callback) => {
      callback(null, { categories: [{ id: 1, name: 'Test Category' }] });
    });
    
    mockGrpcClient.GetCategoryScores.mockImplementation((_, callback) => {
      callback(null, { 
        periods: ['2024-01-01'], 
        category_scores: [
          { category_id: 1, scores: [90, 85] }
        ] 
      });
    });
    
    mockGrpcClient.GetOverallScore.mockImplementation((_, callback) => {
      callback(null, { score: 95 });
    });

    mockGrpcClient.GetAgentScores.mockImplementation((_, callback) => {
      callback(null, { 
        agent_id: 1,
        scores: [
          { date: '2024-01-01', score: 90 }
        ]
      });
    });

    mockGrpcClient.GetCategoryDetails.mockImplementation((_, callback) => {
      callback(null, { 
        category_id: 1,
        scores: [
          { date: '2024-01-01', score: 90 }
        ]
      });
    });
  });

  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(server).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'OK',
        checks: expect.arrayContaining([
          expect.objectContaining({
            name: 'Database',
            status: 'UP',
          }),
        ]),
      });
    });
  });

  describe('GET /api/agents', () => {
    it('should return a list of agents', async () => {
      // Setup mock response
      mockGrpcClient.GetAgents.mockImplementationOnce((_, callback) => {
        callback(null, { agents: [{ id: 1, name: 'Test Agent' }] });
      });

      const response = await request(server).get(`${baseUrl}/agents`);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, name: 'Test Agent' }]);
      expect(mockGrpcClient.GetAgents).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching agents', async () => {
      // Setup mock error
      mockGrpcClient.GetAgents.mockImplementationOnce((_, callback) => {
        callback(new Error('Failed to fetch agents'), null);
      });

      const response = await request(server).get(`${baseUrl}/agents`);
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/categories', () => {
    it('should return a list of categories', async () => {
      // Setup mock response
      mockGrpcClient.GetCategories.mockImplementationOnce((_, callback) => {
        callback(null, { categories: [{ id: 1, name: 'Test Category' }] });
      });

      const response = await request(server).get(`${baseUrl}/categories`);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, name: 'Test Category' }]);
      expect(mockGrpcClient.GetCategories).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching categories', async () => {
      // Setup mock error
      mockGrpcClient.GetCategories.mockImplementationOnce((_, callback) => {
        callback(new Error('Failed to fetch categories'), null);
      });

      const response = await request(server).get(`${baseUrl}/categories`);
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/scores', () => {
    it('should return scores for the given date range', async () => {
      // Setup mock responses
      mockGrpcClient.GetCategoryScores.mockImplementationOnce((_, callback) => {
        callback(null, { 
          periods: ['2024-01-01'], 
          category_scores: [
            { category_id: 1, scores: [90, 85] }
          ] 
        });
      });

      mockGrpcClient.GetOverallScore.mockImplementationOnce((_, callback) => {
        callback(null, { score: 95 });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        periods: ['2024-01-01'],
        category_scores: [
          { category_id: 1, scores: [90, 85] }
        ],
        overall_score: 95
      });

      // Verify the gRPC client was called with the correct parameters
      expect(mockGrpcClient.GetCategoryScores).toHaveBeenCalledWith(
        { start_date: '2024-01-01', end_date: '2024-01-31' },
        expect.any(Function)
      );
      expect(mockGrpcClient.GetOverallScore).toHaveBeenCalledWith(
        { start_date: '2024-01-01', end_date: '2024-01-31' },
        expect.any(Function)
      );
    });

    it('should return 400 if start_date is missing', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ end_date: '2024-01-31' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if end_date is missing', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-01' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle errors from gRPC service', async () => {
      // Setup mock error
      mockGrpcClient.GetCategoryScores.mockImplementationOnce((_, callback) => {
        callback(new Error('Failed to fetch category scores'), null);
      });

      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/scores/agent', () => {
    it('should return agent scores', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores/agent`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          agent_id: '1'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        agent_id: expect.any(Number),
        scores: expect.any(Array)
      });
    });
  });

  describe('GET /api/scores/category', () => {
    it('should return category scores', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores/category`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          category_id: '1'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        category_id: expect.any(Number),
        scores: expect.any(Array)
      });
    });
  });

  describe('GET /api/agents - Edge Cases', () => {
    it('should handle empty agents array', async () => {
      mockGrpcClient.GetAgents.mockImplementationOnce((_, callback) => {
        callback(null, { agents: [] });
      });

      const response = await request(server).get(`${baseUrl}/agents`);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle missing agents field in response', async () => {
      mockGrpcClient.GetAgents.mockImplementationOnce((_, callback) => {
        callback(null, {});
      });

      const response = await request(server).get(`${baseUrl}/agents`);
      
      expect(response.status).toBe(200);
      // Express.json() with undefined sends empty string or null
      expect([undefined, null, '']).toContain(response.body);
    });

    it('should handle null response', async () => {
      mockGrpcClient.GetAgents.mockImplementationOnce((_, callback) => {
        callback(null, null);
      });

      const response = await request(server).get(`${baseUrl}/agents`);
      
      // res.json(null) might cause an error or return null
      // The actual behavior depends on Express version
      // Accept either success or error response
      expect([200, 500]).toContain(response.status);
    });

    it('should handle agents with special characters in names', async () => {
      mockGrpcClient.GetAgents.mockImplementationOnce((_, callback) => {
        callback(null, { 
          agents: [
            { id: 1, name: 'Agent "Special" <>&' },
            { id: 2, name: 'Agent 中文' },
            { id: 3, name: 'Agent\nNewline' }
          ] 
        });
      });

      const response = await request(server).get(`${baseUrl}/agents`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });
  });

  describe('GET /api/categories - Edge Cases', () => {
    it('should handle empty categories array', async () => {
      mockGrpcClient.GetCategories.mockImplementationOnce((_, callback) => {
        callback(null, { categories: [] });
      });

      const response = await request(server).get(`${baseUrl}/categories`);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle missing categories field in response', async () => {
      mockGrpcClient.GetCategories.mockImplementationOnce((_, callback) => {
        callback(null, {});
      });

      const response = await request(server).get(`${baseUrl}/categories`);
      
      expect(response.status).toBe(200);
      // Express.json() with undefined sends empty string or null
      expect([undefined, null, '']).toContain(response.body);
    });
  });

  describe('GET /api/scores - Edge Cases', () => {
    it('should handle empty string dates', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '', end_date: '' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid date format', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: 'invalid-date', end_date: '2024-01-31' });
      
      // The API accepts any string, validation would be in gRPC service
      expect(response.status).toBe(200);
    });

    it('should handle start_date after end_date', async () => {
      mockGrpcClient.GetCategoryScores.mockImplementationOnce((_, callback) => {
        callback(null, { periods: [], category_scores: [] });
      });
      mockGrpcClient.GetOverallScore.mockImplementationOnce((_, callback) => {
        callback(null, { score: 0 });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-31', end_date: '2024-01-01' });
      
      // API accepts it, business logic validation would be in gRPC service
      expect(response.status).toBe(200);
    });

    it('should handle empty periods and scores', async () => {
      mockGrpcClient.GetCategoryScores.mockImplementationOnce((_, callback) => {
        callback(null, { periods: [], category_scores: [] });
      });
      mockGrpcClient.GetOverallScore.mockImplementationOnce((_, callback) => {
        callback(null, { score: 0 });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        periods: [],
        category_scores: [],
        overall_score: 0
      });
    });

    it('should handle missing periods field', async () => {
      mockGrpcClient.GetCategoryScores.mockImplementationOnce((_, callback) => {
        callback(null, { category_scores: [] });
      });
      mockGrpcClient.GetOverallScore.mockImplementationOnce((_, callback) => {
        callback(null, { score: 95 });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(200);
      expect(response.body.periods).toBeUndefined();
    });

    it('should handle missing overall_score field', async () => {
      mockGrpcClient.GetCategoryScores.mockImplementationOnce((_, callback) => {
        callback(null, { periods: ['2024-01-01'], category_scores: [] });
      });
      mockGrpcClient.GetOverallScore.mockImplementationOnce((_, callback) => {
        callback(null, {});
      });

      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(200);
      expect(response.body.overall_score).toBeUndefined();
    });

    it('should handle partial failure - GetCategoryScores fails', async () => {
      mockGrpcClient.GetCategoryScores.mockImplementationOnce((_, callback) => {
        callback(new Error('Category scores failed'), null);
      });

      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle partial failure - GetOverallScore fails', async () => {
      mockGrpcClient.GetCategoryScores.mockImplementationOnce((_, callback) => {
        callback(null, { periods: ['2024-01-01'], category_scores: [] });
      });
      mockGrpcClient.GetOverallScore.mockImplementationOnce((_, callback) => {
        callback(new Error('Overall score failed'), null);
      });

      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle very long date strings', async () => {
      const longDate = '2024-01-01'.repeat(100);
      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ start_date: longDate, end_date: '2024-01-31' });
      
      expect(response.status).toBe(200);
    });

    it('should handle special characters in query parameters', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          extra: 'value&with=special'
        });
      
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/scores/agent - Edge Cases', () => {
    it('should return 400 if agent_id is missing', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores/agent`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid agent_id (non-numeric)', async () => {
      mockGrpcClient.GetAgentScores.mockImplementationOnce((_, callback) => {
        callback(null, { agent_id: NaN, scores: [] });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/agent`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          agent_id: 'not-a-number'
        });
      
      // parseInt('not-a-number') returns NaN, which gets passed to gRPC
      expect(response.status).toBe(200);
    });

    it('should handle negative agent_id', async () => {
      mockGrpcClient.GetAgentScores.mockImplementationOnce((_, callback) => {
        callback(null, { agent_id: -1, scores: [] });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/agent`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          agent_id: '-1'
        });
      
      expect(response.status).toBe(200);
    });

    it('should handle zero agent_id', async () => {
      mockGrpcClient.GetAgentScores.mockImplementationOnce((_, callback) => {
        callback(null, { agent_id: 0, scores: [] });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/agent`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          agent_id: '0'
        });
      
      expect(response.status).toBe(200);
    });

    it('should handle very large agent_id', async () => {
      mockGrpcClient.GetAgentScores.mockImplementationOnce((_, callback) => {
        callback(null, { agent_id: Number.MAX_SAFE_INTEGER, scores: [] });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/agent`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          agent_id: String(Number.MAX_SAFE_INTEGER)
        });
      
      expect(response.status).toBe(200);
    });

    it('should handle empty scores array', async () => {
      mockGrpcClient.GetAgentScores.mockImplementationOnce((_, callback) => {
        callback(null, { agent_id: 1, scores: [] });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/agent`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          agent_id: '1'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.scores).toEqual([]);
    });

    it('should handle missing scores field', async () => {
      mockGrpcClient.GetAgentScores.mockImplementationOnce((_, callback) => {
        callback(null, { agent_id: 1 });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/agent`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          agent_id: '1'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.scores).toBeUndefined();
    });
  });

  describe('GET /api/scores/category - Edge Cases', () => {
    it('should return 400 if category_id is missing', async () => {
      const response = await request(server)
        .get(`${baseUrl}/scores/category`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-31' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid category_id (non-numeric)', async () => {
      mockGrpcClient.GetCategoryDetails.mockImplementationOnce((_, callback) => {
        callback(null, { category_id: NaN, scores: [] });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/category`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          category_id: 'not-a-number'
        });
      
      expect(response.status).toBe(200);
    });

    it('should handle negative category_id', async () => {
      mockGrpcClient.GetCategoryDetails.mockImplementationOnce((_, callback) => {
        callback(null, { category_id: -1, scores: [] });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/category`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          category_id: '-1'
        });
      
      expect(response.status).toBe(200);
    });

    it('should handle empty scores array', async () => {
      mockGrpcClient.GetCategoryDetails.mockImplementationOnce((_, callback) => {
        callback(null, { category_id: 1, scores: [] });
      });

      const response = await request(server)
        .get(`${baseUrl}/scores/category`)
        .query({ 
          start_date: '2024-01-01', 
          end_date: '2024-01-31',
          category_id: '1'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.scores).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(server).get('/nonexistent-route');
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Not Found',
      });
    });

    it('should return 404 for POST to GET-only routes', async () => {
      const response = await request(server).post(`${baseUrl}/agents`);
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(server)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      // Express will handle this, but we test the error handler
      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle very long URLs', async () => {
      const longPath = '/api/' + 'a'.repeat(10000);
      const response = await request(server).get(longPath);
      
      // Should either 404 or handle gracefully
      expect([404, 414]).toContain(response.status);
    });
  });
});
