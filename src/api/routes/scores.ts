import { Request, Response, NextFunction } from 'express';
import { GrpcClient } from '../../grpc/types';
import { ErrorWithStatus } from '../../utils/types';

export function createScoresRoutes(client: GrpcClient, makeGrpcRequest: <T>(method: string, request: unknown) => Promise<T>) {
  const validateDateParams = (req: Request, required: string[]): ErrorWithStatus | null => {
    const missing = required.filter(param => !req.query[param]);
    if (missing.length > 0) {
      const error = new Error(`${missing.join(', ')} are required`) as ErrorWithStatus;
      error.status = 400;
      return error;
    }
    return null;
  };

  return {
    getScores: async (req: Request, res: Response, next: NextFunction) => {
      const validationError = validateDateParams(req, ['start_date', 'end_date']);
      if (validationError) return next(validationError);

      const { start_date, end_date } = req.query;
      try {
        const [categoryData, overallData] = await Promise.all([
          makeGrpcRequest<{ periods?: string[]; category_scores?: unknown[] }>('GetCategoryScores', { start_date, end_date }),
          makeGrpcRequest<{ score?: number }>('GetOverallScore', { start_date, end_date })
        ]);

        res.json({
          periods: categoryData.periods,
          category_scores: categoryData.category_scores,
          overall_score: overallData.score
        });
      } catch (err) {
        next(err);
      }
    },

    getAgentScores: async (req: Request, res: Response, next: NextFunction) => {
      const validationError = validateDateParams(req, ['start_date', 'end_date', 'agent_id']);
      if (validationError) return next(validationError);

      const { start_date, end_date, agent_id } = req.query;
      try {
        const response = await makeGrpcRequest('GetAgentScores', {
          start_date,
          end_date,
          agent_id: parseInt(agent_id as string)
        });
        res.json(response);
      } catch (err) {
        next(err);
      }
    },

    getCategoryScores: async (req: Request, res: Response, next: NextFunction) => {
      const validationError = validateDateParams(req, ['start_date', 'end_date', 'category_id']);
      if (validationError) return next(validationError);

      const { start_date, end_date, category_id } = req.query;
      try {
        const response = await makeGrpcRequest('GetCategoryDetails', {
          start_date,
          end_date,
          category_id: parseInt(category_id as string)
        });
        res.json(response);
      } catch (err) {
        next(err);
      }
    }
  };
}

