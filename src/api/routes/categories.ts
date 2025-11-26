import { Request, Response, NextFunction } from 'express';
import { GrpcClient } from '../../grpc/types';

export function createCategoriesRoutes(client: GrpcClient, makeGrpcRequest: <T>(method: string, request: unknown) => Promise<T>) {
  return {
    getCategories: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const response = await makeGrpcRequest<{ categories?: unknown[] }>('GetCategories', {});
        res.json(response.categories);
      } catch (err) {
        next(err);
      }
    }
  };
}

