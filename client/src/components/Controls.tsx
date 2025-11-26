import React from 'react';
import type { Agent, Category } from '../api';

interface ControlsProps {
    startDate: string;
    endDate: string;
    reportType: 'overall' | 'agent' | 'category';
    agentId: string;
    categoryId: string;
    agents: Agent[];
    categories: Category[];
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onReportTypeChange: (type: 'overall' | 'agent' | 'category') => void;
    onAgentChange: (id: string) => void;
    onCategoryChange: (id: string) => void;
    onFetch: () => void;
}

const Controls: React.FC<ControlsProps> = ({
    startDate,
    endDate,
    reportType,
    agentId,
    categoryId,
    agents,
    categories,
    onStartDateChange,
    onEndDateChange,
    onReportTypeChange,
    onAgentChange,
    onCategoryChange,
    onFetch,
}) => {
    return (
        <div className="controls">
            <div className="control-group">
                <label htmlFor="start-date">Start Date:</label>
                <input
                    type="date"
                    id="start-date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                />
            </div>

            <div className="control-group">
                <label htmlFor="end-date">End Date:</label>
                <input
                    type="date"
                    id="end-date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                />
            </div>

            <div className="control-group">
                <label htmlFor="report-type">Report Type:</label>
                <select
                    id="report-type"
                    value={reportType}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'overall' || value === 'agent' || value === 'category') {
                            onReportTypeChange(value);
                        }
                    }}
                >
                    <option value="overall">Overall</option>
                    <option value="agent">By Agent</option>
                    <option value="category">By Category</option>
                </select>
            </div>

            {reportType === 'agent' && (
                <div className="control-group">
                    <label htmlFor="agent-select">Agent:</label>
                    <select
                        id="agent-select"
                        value={agentId}
                        onChange={(e) => onAgentChange(e.target.value)}
                    >
                        <option value="">Select Agent</option>
                        {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                                {agent.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {reportType === 'category' && (
                <div className="control-group">
                    <label htmlFor="category-select">Category:</label>
                    <select
                        id="category-select"
                        value={categoryId}
                        onChange={(e) => onCategoryChange(e.target.value)}
                    >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <button onClick={onFetch}>Get Scores</button>
        </div>
    );
};

export default Controls;
