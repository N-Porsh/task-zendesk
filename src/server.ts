import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import * as service from './service';

const PROTO_PATH = path.resolve(__dirname, '../scoring.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

interface ScoringService {
    service: grpc.ServiceDefinition<unknown>;
}

const loadedPackage = grpc.loadPackageDefinition(packageDefinition);
const scoringProto = loadedPackage.scoring as {
    ScoringService?: ScoringService;
} | undefined;

function main() {
    if (!scoringProto || !scoringProto.ScoringService) {
        console.error('Failed to load gRPC service definition');
        process.exit(1);
    }
    
    const server = new grpc.Server();
    server.addService(scoringProto.ScoringService.service, {
        GetCategoryScores: service.getCategoryScores,
        GetOverallScore: service.getOverallScore,
        GetAgents: service.getAgents,
        GetCategories: service.getCategories,
        GetAgentScores: service.getAgentScores,
        GetCategoryDetails: service.getCategoryDetails
    });

    const address = '0.0.0.0:50051';
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, _port) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Server running at ${address}`);
    });
}

main();
