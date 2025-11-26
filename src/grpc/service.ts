import { ServerUnaryCall, sendUnaryData, status } from '@grpc/grpc-js';
import db from '../database/db';
import { aggregateScores, calculateOverallScore, aggregateScoresByAgent } from '../services/scoring';

const handleError = (callback: sendUnaryData<unknown>) => {
  callback({ code: status.INTERNAL, details: 'Internal server error' }, null);
};

const mapPeriodScores = (scores: (number | null)[]): number[] => {
  return scores.map(s => s === null ? -1 : s);
};

export async function getCategoryScores(
    call: ServerUnaryCall<{ start_date: string; end_date: string }, unknown>,
    callback: sendUnaryData<unknown>
) {
    try {
        const { start_date, end_date } = call.request;
        const ratings = await db.getRatings(start_date, end_date);
        const aggregated = aggregateScores(ratings, start_date, end_date);

        callback(null, {
            periods: aggregated.periods,
            category_scores: aggregated.category_scores.map(cs => ({
                category: cs.category,
                ratings_count: cs.ratings_count,
                period_scores: mapPeriodScores(cs.period_scores),
                score: cs.score
            }))
        });
    } catch (err) {
        handleError(callback);
    }
}

export async function getOverallScore(
    call: ServerUnaryCall<{ start_date: string; end_date: string }, unknown>,
    callback: sendUnaryData<unknown>
) {
    try {
        const { start_date, end_date } = call.request;
        const ratings = await db.getRatings(start_date, end_date);
        const score = calculateOverallScore(ratings);
        callback(null, { score });
    } catch (err) {
        handleError(callback);
    }
}

export async function getAgents(
    _call: ServerUnaryCall<unknown, unknown>,
    callback: sendUnaryData<unknown>
) {
    try {
        const agents = await db.getAgents();
        callback(null, { agents });
    } catch (err) {
        handleError(callback);
    }
}

export async function getCategories(
    _call: ServerUnaryCall<unknown, unknown>,
    callback: sendUnaryData<unknown>
) {
    try {
        const categories = await db.getCategories();
        callback(null, { categories });
    } catch (err) {
        handleError(callback);
    }
}

export async function getAgentScores(
    call: ServerUnaryCall<{ start_date: string; end_date: string; agent_id: number }, unknown>,
    callback: sendUnaryData<unknown>
) {
    try {
        const { start_date, end_date, agent_id } = call.request;
        const ratings = await db.getRatings(start_date, end_date, { agentId: agent_id });
        const aggregated = aggregateScores(ratings, start_date, end_date);

        callback(null, {
            periods: aggregated.periods,
            category_scores: aggregated.category_scores.map(cs => ({
                category: cs.category,
                ratings_count: cs.ratings_count,
                period_scores: mapPeriodScores(cs.period_scores),
                score: cs.score
            }))
        });
    } catch (err) {
        handleError(callback);
    }
}

export async function getCategoryDetails(
    call: ServerUnaryCall<{ start_date: string; end_date: string; category_id: number }, unknown>,
    callback: sendUnaryData<unknown>
) {
    try {
        const { start_date, end_date, category_id } = call.request;
        const ratings = await db.getRatings(start_date, end_date, { categoryId: category_id });
        const aggregated = aggregateScoresByAgent(ratings, start_date, end_date);

        callback(null, {
            periods: aggregated.periods,
            agent_scores: aggregated.agent_scores.map(as => ({
                agent_name: as.agent_name,
                ratings_count: as.ratings_count,
                period_scores: mapPeriodScores(as.period_scores),
                score: as.score
            }))
        });
    } catch (err) {
        handleError(callback);
    }
}

