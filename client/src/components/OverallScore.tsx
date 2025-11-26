import React from 'react';

interface OverallScoreProps {
    score?: number;
}

const OverallScore: React.FC<OverallScoreProps> = ({ score }) => {
    if (score === undefined) return null;

    return (
        <div className="overall-score">
            <h2>Overall Score: <span>{score}%</span></h2>
        </div>
    );
};

export default OverallScore;
