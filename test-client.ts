import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve(__dirname, 'scoring.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const scoringProto = grpc.loadPackageDefinition(packageDefinition).scoring as any;

function main() {
    const client = new scoringProto.ScoringService('localhost:50051', grpc.credentials.createInsecure());

    const startDate = '2024-10-01';
    const endDate = '2024-10-31';

    console.log(`Requesting scores for ${startDate} to ${endDate}`);

    client.GetCategoryScores({ start_date: startDate, end_date: endDate }, (err: any, response: any) => {
        if (err) {
            console.error('Error getting category scores:', err);
        } else {
            console.log('Category Scores:', JSON.stringify(response, null, 2));
        }
    });

    client.GetOverallScore({ start_date: startDate, end_date: endDate }, (err: any, response: any) => {
        if (err) {
            console.error('Error getting overall score:', err);
        } else {
            console.log('Overall Score:', JSON.stringify(response, null, 2));
        }
    });
}

main();
