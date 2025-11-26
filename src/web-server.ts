import express, { Request, Response } from 'express';
import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const app = express();
const port = 3000;

const PROTO_PATH = path.resolve(__dirname, '../scoring.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const scoringProto = grpc.loadPackageDefinition(packageDefinition).scoring as any;
const client = new scoringProto.ScoringService('localhost:50051', grpc.credentials.createInsecure());

app.use(express.static(path.join(__dirname, '../client/dist')));

interface ScoresQuery {
    start_date?: string;
    end_date?: string;
    agent_id?: string;
    category_id?: string;
}

const makeGrpcRequest = (method: string, request: any) => new Promise<any>((resolve, reject) => {
    client[method](request, (err: any, response: any) => {
        if (err) return reject(err);
        resolve(response);
    });
});

app.get('/api/agents', async (req, res) => {
    try {
        const response = await makeGrpcRequest('GetAgents', {});
        res.json(response.agents);
    } catch (err) {
        console.error('gRPC error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const response = await makeGrpcRequest('GetCategories', {});
        res.json(response.categories);
    } catch (err) {
        console.error('gRPC error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/scores', async (req: Request<{}, {}, {}, ScoresQuery>, res: Response) => {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
        res.status(400).json({ error: 'start_date and end_date are required' });
        return;
    }

    const request = { start_date, end_date };

    try {
        const [categoryData, overallData] = await Promise.all([
            makeGrpcRequest('GetCategoryScores', request),
            makeGrpcRequest('GetOverallScore', request)
        ]);

        res.json({
            periods: categoryData.periods,
            category_scores: categoryData.category_scores,
            overall_score: overallData.score
        });
    } catch (err) {
        console.error('gRPC error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/scores/agent', async (req: Request<{}, {}, {}, ScoresQuery>, res: Response) => {
    const { start_date, end_date, agent_id } = req.query;

    if (!start_date || !end_date || !agent_id) {
        res.status(400).json({ error: 'start_date, end_date, and agent_id are required' });
        return;
    }

    try {
        const response = await makeGrpcRequest('GetAgentScores', { start_date, end_date, agent_id: parseInt(agent_id) });
        res.json(response);
    } catch (err) {
        console.error('gRPC error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/scores/category', async (req: Request<{}, {}, {}, ScoresQuery>, res: Response) => {
    const { start_date, end_date, category_id } = req.query;

    if (!start_date || !end_date || !category_id) {
        res.status(400).json({ error: 'start_date, end_date, and category_id are required' });
        return;
    }

    try {
        const response = await makeGrpcRequest('GetCategoryDetails', { start_date, end_date, category_id: parseInt(category_id) });
        res.json(response);
    } catch (err) {
        console.error('gRPC error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Web server running at http://localhost:${port}`);
});
