import { Server, ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import path from 'path';

export function createMockGrpcServer() {
  const PROTO_PATH = path.resolve(__dirname, '../scoring.proto');
  const packageDefinition = loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const scoringProto = grpc.loadPackageDefinition(packageDefinition).scoring as any;
  const server = new grpc.Server();
  
  const mockService = {
    GetAgents: jest.fn(),
    GetCategories: jest.fn(),
    GetCategoryScores: jest.fn(),
    GetOverallScore: jest.fn(),
    GetAgentScores: jest.fn(),
    GetCategoryDetails: jest.fn(),
  };

  server.addService(scoringProto.ScoringService.service, {
    GetAgents: (
      call: ServerUnaryCall<any, any>,
      callback: sendUnaryData<any>
    ) => {
      mockService.GetAgents(call.request, callback);
    },
    GetCategories: (
      call: ServerUnaryCall<any, any>,
      callback: sendUnaryData<any>
    ) => {
      mockService.GetCategories(call.request, callback);
    },
    GetCategoryScores: (
      call: ServerUnaryCall<any, any>,
      callback: sendUnaryData<any>
    ) => {
      mockService.GetCategoryScores(call.request, callback);
    },
    GetOverallScore: (
      call: ServerUnaryCall<any, any>,
      callback: sendUnaryData<any>
    ) => {
      mockService.GetOverallScore(call.request, callback);
    },
    GetAgentScores: (
      call: ServerUnaryCall<any, any>,
      callback: sendUnaryData<any>
    ) => {
      mockService.GetAgentScores(call.request, callback);
    },
    GetCategoryDetails: (
      call: ServerUnaryCall<any, any>,
      callback: sendUnaryData<any>
    ) => {
      mockService.GetCategoryDetails(call.request, callback);
    },
  });

  const bindServer = () => {
    return new Promise<number>((resolve, reject) => {
      server.bindAsync(
        '0.0.0.0:0',
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
          if (err) {
            return reject(err);
          }
          server.start();
          resolve(port);
        }
      );
    });
  };

  const stopServer = () => {
    return new Promise<void>((resolve) => {
      server.tryShutdown(() => {
        resolve();
      });
    });
  };

  return {
    mockService,
    start: bindServer,
    stop: stopServer,
  };
}

export type MockGrpcServer = ReturnType<typeof createMockGrpcServer>;
