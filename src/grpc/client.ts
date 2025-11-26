import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import logger from '../utils/logger';
import { GrpcClient } from './types';

export function createGrpcClient(): GrpcClient {
  const PROTO_PATH = path.resolve(__dirname, '../../scoring.proto');
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  const loadedPackage = grpc.loadPackageDefinition(packageDefinition);
  const scoringProto = loadedPackage.scoring as {
    ScoringService?: new (address: string, credentials: grpc.ChannelCredentials) => GrpcClient;
  };

  if (!scoringProto?.ScoringService) {
    throw new Error('Failed to load gRPC service definition');
  }

  const address = process.env.GRPC_SERVER || 'localhost:50051';
  return new scoringProto.ScoringService(address, grpc.credentials.createInsecure());
}

export let client: GrpcClient | undefined;

try {
  client = createGrpcClient();
  logger.info('gRPC client initialized');
} catch (error) {
  logger.error('Failed to initialize gRPC client', { error });
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

