import React from 'react';
import type { ScoreData } from '../api';

interface ScoreTableProps {
    data: ScoreData | null;
    reportType: 'overall' | 'agent' | 'category';
}

const ScoreTable: React.FC<ScoreTableProps> = ({ data, reportType }) => {
    if (!data) return null;

    const rows = data.category_scores || data.agent_scores || [];
    const firstColTitle = reportType === 'category' ? 'Agent' : 'Category';

    return (
        <div className="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>{firstColTitle}</th>
                        <th>Ratings</th>
                        <th>Score</th>
                        {data.periods.map((period) => (
                            <th key={period}>{period}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={index}>
                            <td>{(row as any).category || (row as any).agent_name}</td>
                            <td>{row.ratings_count}</td>
                            <td>{row.score}%</td>
                            {row.period_scores.map((score, i) => (
                                <td key={i}>{score === -1 || score === null ? 'N/A' : `${score}%`}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ScoreTable;
