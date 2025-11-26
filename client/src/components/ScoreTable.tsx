import React from 'react';
import type { ScoreData, CategoryScore, AgentScore } from '../api';

interface ScoreTableProps {
    data: ScoreData | null;
    reportType: 'overall' | 'agent' | 'category';
}

const ScoreTable: React.FC<ScoreTableProps> = ({ data, reportType }) => {
    if (!data) return null;

    const rows = data.category_scores || data.agent_scores || [];
    const firstColTitle = reportType === 'category' ? 'Agent' : 'Category';
    const periods = data.periods || [];

    return (
        <div className="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>{firstColTitle}</th>
                        <th>Ratings</th>
                        <th>Score</th>
                        {periods.map((period) => (
                            <th key={period}>{period}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const categoryRow = row as CategoryScore;
                        const agentRow = row as AgentScore;
                        const name = 'category' in categoryRow ? categoryRow.category : agentRow.agent_name;
                        
                        return (
                            <tr key={index}>
                                <td>{name}</td>
                                <td>{row.ratings_count}</td>
                                <td>{row.score}%</td>
                                {(row.period_scores || []).map((score, i) => (
                                    <td key={i}>{score === -1 || score === null ? 'N/A' : `${score}%`}</td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ScoreTable;
