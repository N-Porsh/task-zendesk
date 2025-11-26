import axios from 'axios';

export interface Agent {
    id: number;
    name: string;
}

export interface Category {
    id: number;
    name: string;
}

export interface ScoreData {
    periods: string[];
    category_scores?: CategoryScore[];
    agent_scores?: AgentScore[];
    overall_score?: number;
}

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

export const fetchAgents = async (): Promise<Agent[]> => {
    const response = await axios.get('/api/agents');
    return response.data;
};

export const fetchCategories = async (): Promise<Category[]> => {
    const response = await axios.get('/api/categories');
    return response.data;
};

export const fetchScores = async (
    startDate: string,
    endDate: string,
    reportType: 'overall' | 'agent' | 'category',
    agentId?: string,
    categoryId?: string
): Promise<ScoreData> => {
    let url = `/api/scores?start_date=${startDate}&end_date=${endDate}`;

    if (reportType === 'agent' && agentId) {
        url = `/api/scores/agent?start_date=${startDate}&end_date=${endDate}&agent_id=${agentId}`;
    } else if (reportType === 'category' && categoryId) {
        url = `/api/scores/category?start_date=${startDate}&end_date=${endDate}&category_id=${categoryId}`;
    }

    const response = await axios.get(url);
    return response.data;
};
