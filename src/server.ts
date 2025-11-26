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

const scoringProto = grpc.loadPackageDefinition(packageDefinition).scoring as any;

function main() {
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
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Server running at ${address}`);
    });
}

main();
