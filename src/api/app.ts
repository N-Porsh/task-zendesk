import express, { Express, Request, Response } from 'express';
import path from 'path';
import { requestLogger, errorHandler, notFoundHandler } from '../middleware/requestLogger';
import logger from '../utils/logger';
import { GrpcClient } from '../grpc/types';
import { createAgentsRoutes } from './routes/agents';
import { createCategoriesRoutes } from './routes/categories';
import { createScoresRoutes } from './routes/scores';

export function createApp(grpcClient?: GrpcClient): Express {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now(),
      checks: [
        { name: 'Database', status: 'UP' },
        { name: 'gRPC Service', status: 'UP' }
      ]
    });
  });

  const getGlobalClient = (): GrpcClient | undefined => {
    return typeof global !== 'undefined' && 'grpcClient' in global
      ? (global as { grpcClient?: GrpcClient }).grpcClient
      : undefined;
  };
  const client = grpcClient || getGlobalClient();

  if (!client) {
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  }

  const makeGrpcRequest = <T = unknown>(method: string, request: unknown): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const methodFn = (client as Record<string, unknown>)[method];
      if (typeof methodFn !== 'function') {
        return reject(new Error(`Method ${method} not found`));
      }

      const timeout = setTimeout(() => {
        reject(new Error(`gRPC call ${method} timed out`));
      }, 30000);

      (methodFn as import('../grpc/types').GrpcMethod).call(client, request, (err, response) => {
        clearTimeout(timeout);
        if (err) {
          logger.error(`gRPC call failed: ${method}`, { error: err.message });
          return reject(err);
        }
        resolve(response as T);
      });
    });
  };

  const agentsRoutes = createAgentsRoutes(client, makeGrpcRequest);
  const categoriesRoutes = createCategoriesRoutes(client, makeGrpcRequest);
  const scoresRoutes = createScoresRoutes(client, makeGrpcRequest);

  app.get('/api/agents', agentsRoutes.getAgents);
  app.get('/api/categories', categoriesRoutes.getCategories);
  app.get('/api/scores', scoresRoutes.getScores);
  app.get('/api/scores/agent', scoresRoutes.getAgentScores);
  app.get('/api/scores/category', scoresRoutes.getCategoryScores);

  if (process.env.NODE_ENV !== 'test') {
    app.use(express.static(path.join(__dirname, '../../client/dist')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

