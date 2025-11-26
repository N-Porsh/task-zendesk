import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, isSameDay, isSameWeek } from 'date-fns';
import { RatingRow } from './db';

export interface CategoryScore {
    category: string;
    ratings_count: number;
    period_scores: (number | null)[];
    score: number;
}

export interface AgentScore {
    agent_name: string;
    ratings_count: number;
    period_scores: (number | null)[];
    score: number;
}

export interface AggregatedScores {
    periods: string[];
    category_scores: CategoryScore[];
}

export interface AggregatedAgentScores {
    periods: string[];
    agent_scores: AgentScore[];
}

export function calculateCategoryScore(ratings: RatingRow[]): number {
    if (!ratings?.length) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const count = ratings.length;
    return Math.round((sum / (count * 5)) * 100);
}

export function calculateOverallScore(ratings: RatingRow[]): number {
    if (!ratings?.length) return 0;
    const weightedSum = ratings.reduce((acc, rating) => acc + (rating.rating * rating.weight), 0);
    const maxWeightedSum = ratings.reduce((acc, rating) => acc + (5 * rating.weight), 0);

    return maxWeightedSum === 0 ? 0 : Math.round((weightedSum / maxWeightedSum) * 100);
}

function getIntervals(startDate: string, endDate: string) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isWeekly = diffDays > 31;

    const intervals = isWeekly
        ? eachWeekOfInterval({ start, end })
        : eachDayOfInterval({ start, end });

    return { intervals, isWeekly };
}

export function aggregateScores(ratings: RatingRow[], startDate: string, endDate: string): AggregatedScores {
    const { intervals, isWeekly } = getIntervals(startDate, endDate);

    const ratingsByCategory: Record<string, RatingRow[]> = {};
    ratings.forEach(rating => {
        if (!ratingsByCategory[rating.category_name]) {
            ratingsByCategory[rating.category_name] = [];
        }
        ratingsByCategory[rating.category_name].push(rating);
    });

    const result: CategoryScore[] = [];

    for (const categoryName in ratingsByCategory) {
        const categoryRatings = ratingsByCategory[categoryName];
        const periodScores = intervals.map(intervalStart => {
            const intervalRatings = isWeekly
                ? categoryRatings.filter(rating => isSameWeek(parseISO(rating.created_at), intervalStart))
                : categoryRatings.filter(rating => isSameDay(parseISO(rating.created_at), intervalStart));

            if (intervalRatings.length === 0) return null;
            return calculateCategoryScore(intervalRatings);
        });

        const totalScore = calculateCategoryScore(categoryRatings);

        result.push({
            category: categoryName,
            ratings_count: categoryRatings.length,
            period_scores: periodScores,
            score: totalScore
        });
    }

    return {
        periods: intervals.map(d => format(d, 'yyyy-MM-dd')),
        category_scores: result
    };
}

export function aggregateScoresByAgent(ratings: RatingRow[], startDate: string, endDate: string): AggregatedAgentScores {
    const { intervals, isWeekly } = getIntervals(startDate, endDate);

    const ratingsByAgent: Record<string, RatingRow[]> = {};
    ratings.forEach(rating => {
        const agentName = rating.reviewee_name || `Unknown Agent ${rating.reviewee_id}`;
        if (!ratingsByAgent[agentName]) {
            ratingsByAgent[agentName] = [];
        }
        ratingsByAgent[agentName].push(rating);
    });

    const result: AgentScore[] = [];

    for (const agentName in ratingsByAgent) {
        const agentRatings = ratingsByAgent[agentName];
        const periodScores = intervals.map(intervalStart => {
            const intervalRatings = isWeekly
                ? agentRatings.filter(rating => isSameWeek(parseISO(rating.created_at), intervalStart))
                : agentRatings.filter(rating => isSameDay(parseISO(rating.created_at), intervalStart));

            if (intervalRatings.length === 0) return null;
            return calculateCategoryScore(intervalRatings);
        });

        const totalScore = calculateCategoryScore(agentRatings);

        result.push({
            agent_name: agentName,
            ratings_count: agentRatings.length,
            period_scores: periodScores,
            score: totalScore
        });
    }

    return {
        periods: intervals.map(d => format(d, 'yyyy-MM-dd')),
        agent_scores: result
    };
}
