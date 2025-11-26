export type GrpcMethod = (request: unknown, callback: (err: Error | null, response: unknown) => void) => void;

export interface GrpcClient {
  GetAgents: GrpcMethod;
  GetCategories: GrpcMethod;
  GetCategoryScores: GrpcMethod;
  GetOverallScore: GrpcMethod;
  GetAgentScores: GrpcMethod;
  GetCategoryDetails: GrpcMethod;
  [key: string]: GrpcMethod | unknown;
}

