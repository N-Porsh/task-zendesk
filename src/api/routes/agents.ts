import { Request, Response, NextFunction } from 'express';
import { GrpcClient } from '../../grpc/types';

export function createAgentsRoutes(client: GrpcClient, makeGrpcRequest: <T>(method: string, request: unknown) => Promise<T>) {
  return {
    getAgents: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const response = await makeGrpcRequest<{ agents?: unknown[] }>('GetAgents', {});
        res.json(response.agents);
      } catch (err) {
        next(err);
      }
    }
  };
}

