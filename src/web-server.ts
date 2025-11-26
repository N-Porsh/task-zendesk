import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { requestLogger, errorHandler, notFoundHandler } from './middleware/requestLogger';
import logger from './utils/logger';

interface ScoresQuery {
    start_date?: string;
    end_date?: string;
    agent_id?: string;
    category_id?: string;
}

type GrpcMethod = (request: unknown, callback: (err: Error | null, response: unknown) => void) => void;

// gRPC client from @grpc/grpc-js has methods directly on the instance
interface GrpcClient {
    GetAgents: GrpcMethod;
    GetCategories: GrpcMethod;
    GetCategoryScores: GrpcMethod;
    GetOverallScore: GrpcMethod;
    GetAgentScores: GrpcMethod;
    GetCategoryDetails: GrpcMethod;
    [key: string]: GrpcMethod | unknown;
}

interface ErrorWithStatus extends Error {
    status?: number;
}

export function createApp(grpcClient?: GrpcClient): Express {
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());
  
  // Request logging
  app.use(requestLogger);
  
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    const healthcheck = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now(),
      checks: [
        {
          name: 'Database',
          status: 'UP',
        },
        {
          name: 'gRPC Service',
          status: 'UP',
        },
      ],
    };
    
    try {
      // Here you could add actual checks for database and gRPC service
      res.status(200).json(healthcheck);
    } catch (error) {
      healthcheck.message = error instanceof Error ? error.message : 'Unknown error';
      healthcheck.checks[0].status = 'DOWN';
      logger.error('Health check failed', { error });
      res.status(503).json(healthcheck);
    }
  });

  // Use the provided client or the global client
  const getGlobalClient = (): GrpcClient | undefined => {
    if (typeof global !== 'undefined' && 'grpcClient' in global) {
      return (global as { grpcClient?: GrpcClient }).grpcClient;
    }
    return undefined;
  };
  const client = grpcClient || getGlobalClient();

  if (client) {
    const makeGrpcRequest = <T = unknown>(method: string, request: unknown): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        try {
          // Access method directly from client to preserve gRPC internal structure
          const clientRecord = client as Record<string, unknown>;
          const methodFn = clientRecord[method];
          
          if (!methodFn || typeof methodFn !== 'function') {
            logger.error(`gRPC method ${method} not found or not a function`, {
              method,
              type: typeof methodFn,
              availableMethods: Object.keys(clientRecord).filter(k => typeof clientRecord[k] === 'function')
            });
            reject(new Error(`Method ${method} not found on gRPC client`));
            return;
          }
          
          // Set a timeout for the gRPC call
          const timeout = setTimeout(() => {
            reject(new Error(`gRPC call ${method} timed out after 30 seconds`));
          }, 30000);
          
          // Call the method with client as 'this' context to preserve gRPC internal state
          // Use call() to ensure the method has access to the client's internal structure
          (methodFn as GrpcMethod).call(client, request, (err: Error | null, response: unknown) => {
            clearTimeout(timeout);
            if (err) {
              logger.error(`gRPC call ${method} failed`, { 
                method, 
                error: {
                  name: err.name,
                  message: err.message,
                  code: (err as { code?: number }).code,
                  details: (err as { details?: string }).details
                },
                request 
              });
              return reject(err);
            }
            resolve(response as T);
          });
        } catch (error) {
          logger.error(`Error calling gRPC method ${method}`, { 
            method, 
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : String(error),
            request 
          });
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    };

    app.get('/api/agents', async (req, res, next) => {
        try {
            const response = await makeGrpcRequest<{ agents?: unknown[] }>('GetAgents', {});
            res.json(response.agents);
        } catch (err) {
            logger.error('Failed to fetch agents', { error: err });
            next(err);
        }
    });

    app.get('/api/categories', async (req, res, next) => {
        try {
            const response = await makeGrpcRequest<{ categories?: unknown[] }>('GetCategories', {});
            res.json(response.categories);
        } catch (err) {
            logger.error('Failed to fetch categories', { error: err });
            next(err);
        }
    });

    app.get('/api/scores', async (req: Request<Record<string, never>, Record<string, never>, Record<string, never>, ScoresQuery>, res: Response, next: NextFunction) => {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            const error = new Error('start_date and end_date are required') as ErrorWithStatus;
            error.status = 400;
            return next(error);
        }

        const request = { start_date, end_date };

        try {
            const [categoryData, overallData] = await Promise.all([
                makeGrpcRequest<{ periods?: string[]; category_scores?: unknown[] }>('GetCategoryScores', request),
                makeGrpcRequest<{ score?: number }>('GetOverallScore', request)
            ]);

            res.json({
                periods: categoryData.periods,
                category_scores: categoryData.category_scores,
                overall_score: overallData.score
            });
        } catch (err) {
            logger.error('Failed to fetch scores', { error: err, request });
            next(err);
        }
    });

    app.get('/api/scores/agent', async (req: Request<Record<string, never>, Record<string, never>, Record<string, never>, ScoresQuery>, res: Response, next: NextFunction) => {
        const { start_date, end_date, agent_id } = req.query;

        if (!start_date || !end_date || !agent_id) {
            const error = new Error('start_date, end_date, and agent_id are required') as ErrorWithStatus;
            error.status = 400;
            return next(error);
        }

        try {
            const response = await makeGrpcRequest('GetAgentScores', { 
                start_date, 
                end_date, 
                agent_id: parseInt(agent_id) 
            });
            res.json(response);
        } catch (err) {
            logger.error('Failed to fetch agent scores', { 
                error: err, 
                params: { start_date, end_date, agent_id } 
            });
            next(err);
        }
    });

    app.get('/api/scores/category', async (req: Request<Record<string, never>, Record<string, never>, Record<string, never>, ScoresQuery>, res: Response, next: NextFunction) => {
        const { start_date, end_date, category_id } = req.query;

        if (!start_date || !end_date || !category_id) {
            const error = new Error('start_date, end_date, and category_id are required') as ErrorWithStatus;
            error.status = 400;
            return next(error);
        }

        try {
            const response = await makeGrpcRequest('GetCategoryDetails', { start_date, end_date, category_id: parseInt(category_id) });
            res.json(response);
        } catch (err) {
            logger.error('Failed to fetch category scores', { error: err });
            next(err);
        }
    });
  }
  
  // Serve static files (only in production)
  if (process.env.NODE_ENV !== 'test') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
  }

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);
  
  return app;
}

// Create a gRPC client factory function
export function createGrpcClient() {
    const PROTO_PATH = path.resolve(__dirname, '../scoring.proto');

    // Load the protobuf
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

    // Load the gRPC package definition
    const loadedPackage = grpc.loadPackageDefinition(packageDefinition);
    const scoringProto = loadedPackage.scoring as {
        ScoringService?: new (address: string, credentials: grpc.ChannelCredentials, options?: grpc.ChannelOptions) => GrpcClient;
    };
    
    if (!scoringProto || !scoringProto.ScoringService) {
        throw new Error('Failed to load gRPC service definition');
    }

    const grpcAddress = process.env.GRPC_SERVER || 'localhost:50051';
    
    // Create and return the gRPC client
    const client = new scoringProto.ScoringService(
        grpcAddress,
        grpc.credentials.createInsecure()
    );
    
    // Verify client methods exist (for debugging)
    const methods = ['GetAgents', 'GetCategories', 'GetCategoryScores', 'GetOverallScore', 'GetAgentScores', 'GetCategoryDetails'];
    const availableMethods = methods.filter(m => typeof (client as Record<string, unknown>)[m] === 'function');
    logger.info(`gRPC client created for ${grpcAddress}`, {
        availableMethods,
        totalMethods: availableMethods.length
    });
    
    if (availableMethods.length === 0) {
        logger.warn('No gRPC methods found on client', {
            clientKeys: Object.keys(client).slice(0, 20),
            clientType: typeof client
        });
    }
    
    return client;
}

// Create the gRPC client
export let client: GrpcClient | undefined;

try {
    client = createGrpcClient();
    logger.info('gRPC client initialized successfully');
} catch (error) {
    logger.error('Failed to initialize gRPC client', { error });
    if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
    }
}

// Create the Express app with the client
const app = createApp(client);
const port = process.env.PORT || 3000;

// Create server instance
const server = app.listen(port, () => {
  logger.info(`Web server running at http://localhost:${port}`);
  logger.info(`Health check available at http://localhost:${port}/health`);
});

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // In production, you might want to gracefully shut down
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Only start the server if this file is run directly
if (require.main !== module) {
  server.close();
}

export { app };
export default server;

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // In production, you might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
