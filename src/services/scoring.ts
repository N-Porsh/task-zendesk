import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, isSameDay, isSameWeek } from 'date-fns';
import { RatingRow } from '../database/db';

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

function groupRatings(
    ratings: RatingRow[],
    getKey: (rating: RatingRow) => string
): Record<string, RatingRow[]> {
    const grouped: Record<string, RatingRow[]> = {};
    ratings.forEach(rating => {
        const key = getKey(rating);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(rating);
    });
    return grouped;
}

function calculatePeriodScores(
    ratings: RatingRow[],
    intervals: Date[],
    isWeekly: boolean
): (number | null)[] {
    return intervals.map(intervalStart => {
        const intervalRatings = isWeekly
            ? ratings.filter(r => isSameWeek(parseISO(r.created_at), intervalStart))
            : ratings.filter(r => isSameDay(parseISO(r.created_at), intervalStart));
        return intervalRatings.length === 0 ? null : calculateCategoryScore(intervalRatings);
    });
}

export function aggregateScores(ratings: RatingRow[], startDate: string, endDate: string): AggregatedScores {
    const { intervals, isWeekly } = getIntervals(startDate, endDate);
    const ratingsByCategory = groupRatings(ratings, r => r.category_name);

    const category_scores: CategoryScore[] = Object.entries(ratingsByCategory).map(([category, categoryRatings]) => ({
        category,
        ratings_count: categoryRatings.length,
        period_scores: calculatePeriodScores(categoryRatings, intervals, isWeekly),
        score: calculateCategoryScore(categoryRatings)
    }));

    return {
        periods: intervals.map(d => format(d, 'yyyy-MM-dd')),
        category_scores
    };
}

export function aggregateScoresByAgent(ratings: RatingRow[], startDate: string, endDate: string): AggregatedAgentScores {
    const { intervals, isWeekly } = getIntervals(startDate, endDate);
    const ratingsByAgent = groupRatings(ratings, r => r.reviewee_name || `Unknown Agent ${r.reviewee_id}`);

    const agent_scores: AgentScore[] = Object.entries(ratingsByAgent).map(([agentName, agentRatings]) => ({
        agent_name: agentName,
        ratings_count: agentRatings.length,
        period_scores: calculatePeriodScores(agentRatings, intervals, isWeekly),
        score: calculateCategoryScore(agentRatings)
    }));

    return {
        periods: intervals.map(d => format(d, 'yyyy-MM-dd')),
        agent_scores
    };
}

