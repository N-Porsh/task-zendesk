import React, { useState, useEffect } from 'react';
import Controls from './components/Controls';
import ScoreTable from './components/ScoreTable';
import OverallScore from './components/OverallScore';
import { fetchAgents, fetchCategories, fetchScores } from './api';
import type { Agent, Category, ScoreData } from './api';
import './index.css';

const App: React.FC = () => {
  const [startDate, setStartDate] = useState('2024-10-01');
  const [endDate, setEndDate] = useState('2024-10-31');
  const [reportType, setReportType] = useState<'overall' | 'agent' | 'category'>('overall');
  const [agentId, setAgentId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [agents, setAgents] = useState<Agent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [agentsData, categoriesData] = await Promise.all([
          fetchAgents(),
          fetchCategories()
        ]);
        setAgents(agentsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    };
    loadInitialData();
  }, []);

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    if (reportType === 'agent' && !agentId) {
      setError('Please select an agent.');
      return;
    }
    if (reportType === 'category' && !categoryId) {
      setError('Please select a category.');
      return;
    }

    setLoading(true);
    setError('');
    setScoreData(null);

    try {
      const data = await fetchScores(startDate, endDate, reportType, agentId, categoryId);
      setScoreData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount (optional, or wait for user)
  useEffect(() => {
    if (agents.length > 0 && categories.length > 0) {
      handleFetch();
    }
  }, [agents, categories]); // Fetch once data is loaded, or just let user click? 
  // The original script.js did initial fetch. Let's do it too but we need to be careful about dependency loops.
  // Actually, better to just call handleFetch once after initial data load.

  return (
    <div className="container">
      <header>
        <h1>Ticket Scoring Dashboard</h1>
      </header>

      <Controls
        startDate={startDate}
        endDate={endDate}
        reportType={reportType}
        agentId={agentId}
        categoryId={categoryId}
        agents={agents}
        categories={categories}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onReportTypeChange={setReportType}
        onAgentChange={setAgentId}
        onCategoryChange={setCategoryId}
        onFetch={handleFetch}
      />

      {loading && <div id="loading">Loading...</div>}
      {error && <div id="error">{error}</div>}

      {scoreData && (
        <>
          {reportType === 'overall' && (
            <OverallScore score={scoreData.overall_score} />
          )}
          <ScoreTable data={scoreData} reportType={reportType} />
        </>
      )}
    </div>
  );
};

export default App;
