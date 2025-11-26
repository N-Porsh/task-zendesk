import { ServerUnaryCall, sendUnaryData, status } from '@grpc/grpc-js';
import db from './db';
import { aggregateScores, calculateOverallScore, aggregateScoresByAgent } from './scoring';

interface DateRangeRequest {
    start_date: string;
    end_date: string;
}

interface AgentScoreRequest {
    start_date: string;
    end_date: string;
    agent_id: number;
}

interface CategoryDetailsRequest {
    start_date: string;
    end_date: string;
    category_id: number;
}

interface CategoryScore {
    category: string;
    ratings_count: number;
    period_scores: number[];
    score: number;
}

interface AgentScore {
    agent_name: string;
    ratings_count: number;
    period_scores: number[];
    score: number;
}

interface CategoryScoresResponse {
    periods: string[];
    category_scores: CategoryScore[];
}

interface AgentScoresResponse {
    periods: string[];
    agent_scores: AgentScore[];
}

interface OverallScoreResponse {
    score: number;
}

interface Empty { }

interface Agent {
    id: number;
    name: string;
}

interface AgentsResponse {
    agents: Agent[];
}

interface Category {
    id: number;
    name: string;
}

interface CategoriesResponse {
    categories: Category[];
}

export async function getCategoryScores(
    call: ServerUnaryCall<DateRangeRequest, CategoryScoresResponse>,
    callback: sendUnaryData<CategoryScoresResponse>
) {
    const { start_date, end_date } = call.request;
    try {
        const ratings = await db.getRatings(start_date, end_date);
        const aggregated = aggregateScores(ratings, start_date, end_date);

        const response: CategoryScoresResponse = {
            periods: aggregated.periods,
            category_scores: aggregated.category_scores.map(cs => ({
                category: cs.category,
                ratings_count: cs.ratings_count,
                period_scores: cs.period_scores.map(s => s === null ? -1 : s),
                score: cs.score
            }))
        };

        callback(null, response);
    } catch (err) {
        console.error('Error getting category scores:', err);
        callback({ code: status.INTERNAL, details: 'Internal server error' }, null);
    }
}

export async function getOverallScore(
    call: ServerUnaryCall<DateRangeRequest, OverallScoreResponse>,
    callback: sendUnaryData<OverallScoreResponse>
) {
    const { start_date, end_date } = call.request;
    try {
        const ratings = await db.getRatings(start_date, end_date);
        const score = calculateOverallScore(ratings);
        callback(null, { score });
    } catch (err) {
        console.error('Error getting overall score:', err);
        callback({ code: status.INTERNAL, details: 'Internal server error' }, null);
    }
}

export async function getAgents(
    call: ServerUnaryCall<Empty, AgentsResponse>,
    callback: sendUnaryData<AgentsResponse>
) {
    try {
        const agents = await db.getAgents();
        callback(null, { agents });
    } catch (err) {
        console.error('Error fetching agents:', err);
        callback({ code: status.INTERNAL, details: 'Internal server error' }, null);
    }
}

export async function getCategories(
    call: ServerUnaryCall<Empty, CategoriesResponse>,
    callback: sendUnaryData<CategoriesResponse>
) {
    try {
        const categories = await db.getCategories();
        callback(null, { categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        callback({ code: status.INTERNAL, details: 'Internal server error' }, null);
    }
}

export async function getAgentScores(
    call: ServerUnaryCall<AgentScoreRequest, CategoryScoresResponse>,
    callback: sendUnaryData<CategoryScoresResponse>
) {
    const { start_date, end_date, agent_id } = call.request;
    try {
        const ratings = await db.getRatings(start_date, end_date, { agentId: agent_id });
        const aggregated = aggregateScores(ratings, start_date, end_date);

        const response: CategoryScoresResponse = {
            periods: aggregated.periods,
            category_scores: aggregated.category_scores.map(cs => ({
                category: cs.category,
                ratings_count: cs.ratings_count,
                period_scores: cs.period_scores.map(s => s === null ? -1 : s),
                score: cs.score
            }))
        };

        callback(null, response);
    } catch (err) {
        console.error('Error getting agent scores:', err);
        callback({ code: status.INTERNAL, details: 'Internal server error' }, null);
    }
}

export async function getCategoryDetails(
    call: ServerUnaryCall<CategoryDetailsRequest, AgentScoresResponse>,
    callback: sendUnaryData<AgentScoresResponse>
) {
    const { start_date, end_date, category_id } = call.request;
    try {
        const ratings = await db.getRatings(start_date, end_date, { categoryId: category_id });
        const aggregated = aggregateScoresByAgent(ratings, start_date, end_date);

        const response: AgentScoresResponse = {
            periods: aggregated.periods,
            agent_scores: aggregated.agent_scores.map(as => ({
                agent_name: as.agent_name,
                ratings_count: as.ratings_count,
                period_scores: as.period_scores.map(s => s === null ? -1 : s),
                score: as.score
            }))
        };

        callback(null, response);
    } catch (err) {
        console.error('Error getting category details:', err);
        callback({ code: status.INTERNAL, details: 'Internal server error' }, null);
    }
}
