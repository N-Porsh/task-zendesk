import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import * as api from './api';

// Mock the API responses
const mockAgents = [
  { id: 1, name: 'Agent 1' },
  { id: 2, name: 'Agent 2' },
];

const mockCategories = [
  { id: 1, name: 'Category 1' },
  { id: 2, name: 'Category 2' },
];

const mockScores = {
  periods: ['2024-10-01', '2024-10-08'],
  category_scores: [
    { 
      category: 'Category 1', 
      ratings_count: 10, 
      score: 87.5, 
      period_scores: [85, 90] 
    },
    { 
      category: 'Category 2', 
      ratings_count: 8, 
      score: 77.5, 
      period_scores: [75, 80] 
    },
  ],
  overall_score: 82.5,
};

describe('App', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up mock implementations
    (api.fetchAgents as jest.Mock).mockResolvedValue(mockAgents);
    (api.fetchCategories as jest.Mock).mockResolvedValue(mockCategories);
    (api.fetchScores as jest.Mock).mockResolvedValue(mockScores);
  });

  it('renders the app and loads initial data', async () => {
    render(<App />);
    
    // Check if the app title is rendered
    expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    
    // Check if loading states are handled
    await waitFor(() => {
      expect(api.fetchAgents).toHaveBeenCalled();
      expect(api.fetchCategories).toHaveBeenCalled();
    });
  });

  it('fetches and displays scores when form is submitted', async () => {
    render(<App />);
    
    // Wait for initial data to load and auto-fetch to complete
    await waitFor(() => {
      expect(api.fetchAgents).toHaveBeenCalled();
      expect(api.fetchCategories).toHaveBeenCalled();
    });
    
    // The App auto-fetches scores when agents and categories are loaded
    await waitFor(() => {
      expect(api.fetchScores).toHaveBeenCalledWith('2024-10-01', '2024-10-31', 'overall', '', '');
    });
    
    // Check if the score is displayed (text is split across elements: "Overall Score: " + "82.5" + "%")
    const overallScoreHeading = await screen.findByText('Overall Score:');
    expect(overallScoreHeading).toBeInTheDocument();
    // The score value should be in the same container
    expect(overallScoreHeading.closest('.overall-score')).toHaveTextContent('82.5');
  });

  it('shows error message when required fields are missing', async () => {
    render(<App />);
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(api.fetchAgents).toHaveBeenCalled();
    });
    
    // Set report type to agent but don't select an agent
    const reportTypeSelect = screen.getByLabelText(/report type/i);
    fireEvent.change(reportTypeSelect, { target: { value: 'agent' } });
    
    // Click the fetch button
    const fetchButton = screen.getByRole('button', { name: /get scores/i });
    fireEvent.click(fetchButton);
    
    // Check if error message is shown
    expect(await screen.findByText('Please select an agent.')).toBeInTheDocument();
  });

  describe('Edge Cases', () => {
    it('handles empty agents list', async () => {
      (api.fetchAgents as jest.Mock).mockResolvedValueOnce([]);
      (api.fetchCategories as jest.Mock).mockResolvedValueOnce(mockCategories);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchAgents).toHaveBeenCalled();
      });
      
      // App should still render without crashing
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles empty categories list', async () => {
      (api.fetchAgents as jest.Mock).mockResolvedValueOnce(mockAgents);
      (api.fetchCategories as jest.Mock).mockResolvedValueOnce([]);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchCategories).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles network error when fetching agents', async () => {
      (api.fetchAgents as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (api.fetchCategories as jest.Mock).mockResolvedValueOnce(mockCategories);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchAgents).toHaveBeenCalled();
      });
      
      // App should still render, error is logged to console
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles network error when fetching categories', async () => {
      (api.fetchAgents as jest.Mock).mockResolvedValueOnce(mockAgents);
      (api.fetchCategories as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchCategories).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles network error when fetching scores', async () => {
      (api.fetchScores as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch scores'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchAgents).toHaveBeenCalled();
        expect(api.fetchCategories).toHaveBeenCalled();
      });
      
      // Wait for auto-fetch to complete and show error
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      // Error message should be displayed
      expect(await screen.findByText(/Failed to fetch scores/i)).toBeInTheDocument();
    });

    it('handles empty score data', async () => {
      const emptyScores = {
        periods: [],
        category_scores: [],
        overall_score: 0,
      };
      
      (api.fetchScores as jest.Mock).mockResolvedValueOnce(emptyScores);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      // App should render without crashing
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles missing overall_score in response', async () => {
      const scoresWithoutOverall = {
        periods: ['2024-10-01'],
        category_scores: mockScores.category_scores,
      };
      
      (api.fetchScores as jest.Mock).mockResolvedValueOnce(scoresWithoutOverall);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      // OverallScore component should handle undefined gracefully
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles missing category_scores in response', async () => {
      const scoresWithoutCategories = {
        periods: ['2024-10-01'],
        overall_score: 82.5,
      };
      
      (api.fetchScores as jest.Mock).mockResolvedValueOnce(scoresWithoutCategories);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      // ScoreTable should handle empty data gracefully
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles missing periods in response', async () => {
      const scoresWithoutPeriods = {
        category_scores: mockScores.category_scores,
        overall_score: 82.5,
      };
      
      (api.fetchScores as jest.Mock).mockResolvedValueOnce(scoresWithoutPeriods);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles error when category is required but not selected', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchAgents).toHaveBeenCalled();
      });
      
      // Set report type to category but don't select a category
      const reportTypeSelect = screen.getByLabelText(/report type/i);
      fireEvent.change(reportTypeSelect, { target: { value: 'category' } });
      
      const fetchButton = screen.getByRole('button', { name: /get scores/i });
      fireEvent.click(fetchButton);
      
      expect(await screen.findByText('Please select a category.')).toBeInTheDocument();
    });

    it('handles rapid button clicks (race condition)', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchAgents).toHaveBeenCalled();
      });
      
      const fetchButton = screen.getByRole('button', { name: /get scores/i });
      
      // Click multiple times rapidly
      fireEvent.click(fetchButton);
      fireEvent.click(fetchButton);
      fireEvent.click(fetchButton);
      
      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
    });

    it('handles date change after initial load', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      // Change start date
      const startDateInput = screen.getByLabelText(/start date/i);
      fireEvent.change(startDateInput, { target: { value: '2024-11-01' } });
      
      // Click fetch button
      const fetchButton = screen.getByRole('button', { name: /get scores/i });
      fireEvent.click(fetchButton);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalledWith('2024-11-01', '2024-10-31', 'overall', '', '');
      });
    });

    it('handles very long agent/category names', async () => {
      const longNameAgents = [
        { id: 1, name: 'A'.repeat(1000) },
        { id: 2, name: 'Agent with special chars: <>&"\'`' },
      ];
      
      (api.fetchAgents as jest.Mock).mockResolvedValueOnce(longNameAgents);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchAgents).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('handles null/undefined response from API', async () => {
      (api.fetchScores as jest.Mock).mockResolvedValueOnce(null);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      // App should handle null gracefully
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });

    it('clears error message on successful fetch after error', async () => {
      // First, trigger an error
      (api.fetchScores as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      // Error should be shown
      expect(await screen.findByText(/Network error/i)).toBeInTheDocument();
      
      // Then, succeed on next fetch
      (api.fetchScores as jest.Mock).mockResolvedValueOnce(mockScores);
      
      const fetchButton = screen.getByRole('button', { name: /get scores/i });
      fireEvent.click(fetchButton);
      
      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Network error/i)).not.toBeInTheDocument();
      });
    });

    it('handles empty dates', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchAgents).toHaveBeenCalled();
      });
      
      // Clear start date
      const startDateInput = screen.getByLabelText(/start date/i);
      fireEvent.change(startDateInput, { target: { value: '' } });
      
      const fetchButton = screen.getByRole('button', { name: /get scores/i });
      fireEvent.click(fetchButton);
      
      // Should show error
      expect(await screen.findByText(/Please select both start and end dates/i)).toBeInTheDocument();
    });

    it('handles agent scores response format', async () => {
      const agentScores = {
        periods: ['2024-10-01', '2024-10-08'],
        agent_scores: [
          {
            agent_name: 'Agent 1',
            ratings_count: 5,
            score: 90,
            period_scores: [85, 95],
          },
        ],
      };
      
      (api.fetchScores as jest.Mock).mockResolvedValueOnce(agentScores);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.fetchAgents).toHaveBeenCalled();
      });
      
      // Change to agent report type and select agent
      const reportTypeSelect = screen.getByLabelText(/report type/i);
      fireEvent.change(reportTypeSelect, { target: { value: 'agent' } });
      
      const agentSelect = screen.getByLabelText(/agent/i);
      fireEvent.change(agentSelect, { target: { value: '1' } });
      
      const fetchButton = screen.getByRole('button', { name: /get scores/i });
      fireEvent.click(fetchButton);
      
      await waitFor(() => {
        expect(api.fetchScores).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Ticket Scoring Dashboard')).toBeInTheDocument();
    });
  });
});
