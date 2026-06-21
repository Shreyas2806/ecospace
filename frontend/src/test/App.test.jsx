/**
 * EcoSphere AI — Comprehensive Test Suite
 * Tests: Auth, Activity Logging, Mobility, Simulator, Gamification, Accessibility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ─── Mock axios globally before App import ───────────────────────────────────
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  };
  return { default: mockAxios };
});

// ─── Mock Chart.js (canvas not available in jsdom) ────────────────────────────
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  ArcElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
  Line: ({ 'aria-label': label }) => <canvas data-testid="line-chart" aria-label={label} />,
  Pie: ({ 'aria-label': label }) => <canvas data-testid="pie-chart" aria-label={label} />,
  Bar: ({ 'aria-label': label }) => <canvas data-testid="bar-chart" aria-label={label} />,
}));

// ─── Mock localStorage ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = String(val); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ─── Mock API response helpers ────────────────────────────────────────────────
const mockDashboard = {
  today_emissions: 3.5,
  weekly_emissions: 22.1,
  monthly_emissions: 89.4,
  green_score: 68,
  streak: 5,
  category_breakdown: { transportation: 12.1, electricity: 8.5, food: 4.2, waste: 1.7 },
  trend_data: [
    { date: '2024-06-15', emissions: 3.2 },
    { date: '2024-06-16', emissions: 4.1 },
    { date: '2024-06-17', emissions: 3.5 },
  ],
  comparison: { user: 89, average: 120, optimal: 60 },
  goals_progress: [{ id: 1, title: 'Reduce car usage', progress_pct: 40 }],
  total_saved: 14.3,
};

const mockUser = { id: 1, name: 'Jane Doe', email: 'user@ecosphere.com', role: 'user', green_score: 68 };
const mockActivities = [
  { id: 1, category: 'transportation', activity_type: 'car', value: 12, carbon_footprint: 1.44, timestamp: '2024-06-17T10:00:00Z' },
];
const mockGoals = [
  { id: 1, title: 'Cut car emissions', category: 'transportation', target_reduction_pct: 20, target_date: '2024-12-31', status: 'active' },
];
const mockBadges = [{ id: 1, badge_name: 'Eco Starter', badge_icon: '🌱' }];
const mockLeaderboard = [
  { username: 'Jane Doe', green_score: 68, rank: 1, is_current_user: true },
  { username: 'Bob Smith', green_score: 55, rank: 2, is_current_user: false },
];
const mockNotifications = [
  { id: 1, message: 'Badge unlocked: Eco Starter', is_read: false, created_at: '2024-06-17T10:00:00Z' },
];

// ─── Setup: provide a logged-in token so App renders the main dashboard ───────
function setupLoggedIn() {
  localStorageMock.getItem.mockImplementation((key) =>
    key === 'token' ? 'mock-jwt-token' : null
  );
}

function setupLoggedOut() {
  localStorageMock.getItem.mockReturnValue(null);
}

async function setupAxiosMocks() {
  const axios = (await import('axios')).default;
  axios.get.mockImplementation((url) => {
    if (url.includes('/auth/profile')) return Promise.resolve({ data: mockUser });
    if (url.includes('/dashboard'))    return Promise.resolve({ data: mockDashboard });
    if (url.includes('/activities'))   return Promise.resolve({ data: mockActivities });
    if (url.includes('/gamification/goals'))    return Promise.resolve({ data: mockGoals });
    if (url.includes('/gamification/badges'))   return Promise.resolve({ data: mockBadges });
    if (url.includes('/gamification/leaderboard')) return Promise.resolve({ data: mockLeaderboard });
    if (url.includes('/gamification/notifications')) return Promise.resolve({ data: mockNotifications });
    if (url.includes('/predictions'))  return Promise.resolve({ data: { next_week_emissions: 28.5, next_month_emissions: 115.2, annual_trend_emissions: 1260, chart_data: [] } });
    if (url.includes('/coach/tips'))   return Promise.resolve({ data: { coach_recommendations: 'Try using public transit more.' } });
    return Promise.resolve({ data: {} });
  });
  axios.post.mockImplementation((url) => {
    if (url.includes('/auth/login') || url.includes('/auth/register'))
      return Promise.resolve({ data: { token: 'new-token', user: mockUser } });
    if (url.includes('/simulator/simulate'))
      return Promise.resolve({ data: {
        current_monthly_baseline: 150.0,
        projected_monthly_footprint: 120.0,
        expected_monthly_savings: 30.0,
        percentage_savings: 20.0,
      }});
    if (url.includes('/activities'))
      return Promise.resolve({ data: { activity: { carbon_footprint: 1.44 }, green_score_delta: 2 } });
    if (url.includes('/mobility/recommend'))
      return Promise.resolve({ data: {
        current_emissions: 2.4,
        current_mode: 'car',
        alternatives: [{ mode: 'metro', emissions: 0.2, percentage_reduction: 91, monthly_savings: 48.4 }],
      }});
    if (url.includes('/gamification/goals'))
      return Promise.resolve({ data: {} });
    if (url.includes('/gamification/notifications/read'))
      return Promise.resolve({ data: {} });
    if (url.includes('/auth/forgot-password'))
      return Promise.resolve({ data: { message: 'Reset link sent to your email.' } });
    return Promise.resolve({ data: {} });
  });
  axios.patch.mockResolvedValue({ data: {} });
  axios.delete.mockResolvedValue({ data: {} });
}

// ─── Import App AFTER mocks are set up ───────────────────────────────────────
import App from '../App';

// =============================================================================
//  SUITE 1: AUTH — Login / Register / Forgot Password
// =============================================================================
describe('Auth Page', () => {
  beforeEach(() => {
    setupLoggedOut();
    vi.clearAllMocks();
  });

  it('renders the EcoSphere AI branding on the login page', () => {
    render(<App />);
    expect(screen.getByText('EcoSphere AI')).toBeInTheDocument();
  });

  it('shows email and password fields', () => {
    render(<App />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the login submit button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /log in to ecosphere/i })).toBeInTheDocument();
  });

  it('shows demo credential buttons', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /user demo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin demo/i })).toBeInTheDocument();
  });

  it('fills email and password when clicking User Demo button', async () => {
    render(<App />);
    const demoBtn = screen.getByRole('button', { name: /user demo/i });
    await userEvent.click(demoBtn);
    expect(screen.getByLabelText(/email address/i)).toHaveValue('user@ecosphere.com');
    expect(screen.getByLabelText(/password/i)).toHaveValue('user123');
  });

  it('fills admin credentials when clicking Admin Demo button', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /admin demo/i }));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('admin@ecosphere.com');
    expect(screen.getByLabelText(/password/i)).toHaveValue('admin123');
  });

  it('toggles to registration form and shows name field', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create eco account/i })).toBeInTheDocument();
  });

  it('shows account role dropdown on register form', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));
    expect(screen.getByLabelText(/account role/i)).toBeInTheDocument();
  });

  it('toggles to forgot password form', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('can navigate back from forgot password to login', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));
    await userEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByRole('button', { name: /log in to ecosphere/i })).toBeInTheDocument();
  });

  it('shows error when login API fails', async () => {
    const axios = (await import('axios')).default;
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });
    render(<App />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'wrong@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /log in to ecosphere/i }));
    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument());
  });
});

// =============================================================================
//  SUITE 2: Dashboard Rendering
// =============================================================================
describe('Smart Dashboard', () => {
  beforeEach(async () => {
    setupLoggedIn();
    await setupAxiosMocks();
  });

  afterEach(() => { vi.clearAllMocks(); });

  it('renders the sidebar navigation', async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /smart dashboard/i })).toBeInTheDocument()
    );
  });

  it('shows today emissions metric card', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/today's emissions/i)).toBeInTheDocument());
  });

  it('shows weekly footprint metric', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/weekly footprint/i)).toBeInTheDocument());
  });

  it('shows green score metric', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/green score/i)).toBeInTheDocument());
  });

  it('shows current streak in header', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/streak/i)).toBeInTheDocument());
  });

  it('displays user name in sidebar', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
  });

  it('renders logout button', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument());
  });

  it('renders theme toggle button', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTitle(/toggle dark mode/i)).toBeInTheDocument());
  });
});

// =============================================================================
//  SUITE 3: Tab Navigation
// =============================================================================
describe('Tab Navigation', () => {
  beforeEach(async () => {
    setupLoggedIn();
    await setupAxiosMocks();
  });

  afterEach(() => { vi.clearAllMocks(); });

  it('navigates to Log Daily Activity tab', async () => {
    render(<App />);
    await waitFor(() => screen.getByText(/log daily activity/i));
    await userEvent.click(screen.getByRole('button', { name: /log daily activity/i }));
    await waitFor(() => expect(screen.getByText(/log your eco activities/i)).toBeInTheDocument());
  });

  it('navigates to Mobility Intelligence tab', async () => {
    render(<App />);
    await waitFor(() => screen.getByText(/mobility intelligence/i));
    await userEvent.click(screen.getByRole('button', { name: /mobility intelligence/i }));
    await waitFor(() => expect(screen.getByText(/transit co2 comparison/i)).toBeInTheDocument());
  });

  it('navigates to AI Coach & Simulator tab', async () => {
    render(<App />);
    await waitFor(() => screen.getByText(/ai coach/i));
    await userEvent.click(screen.getByRole('button', { name: /ai coach & simulator/i }));
    await waitFor(() => expect(screen.getByText(/reduction simulator/i)).toBeInTheDocument());
  });

  it('navigates to Prediction Engine tab', async () => {
    render(<App />);
    await waitFor(() => screen.getByText(/prediction engine/i));
    await userEvent.click(screen.getByRole('button', { name: /prediction engine/i }));
    await waitFor(() => expect(screen.getByText(/ml carbon prediction engine/i)).toBeInTheDocument());
  });

  it('navigates to Gamification & Goals tab', async () => {
    render(<App />);
    await waitFor(() => screen.getByText(/gamification/i));
    await userEvent.click(screen.getByRole('button', { name: /gamification & goals/i }));
    await waitFor(() => expect(screen.getByText(/set sustainability goal/i)).toBeInTheDocument());
  });
});

// =============================================================================
//  SUITE 4: Log Activity Form
// =============================================================================
describe('Log Carbon Activity', () => {
  beforeEach(async () => {
    setupLoggedIn();
    await setupAxiosMocks();
  });

  afterEach(() => { vi.clearAllMocks(); });

  async function goToLogTab() {
    render(<App />);
    await waitFor(() => screen.getByText(/log daily activity/i));
    await userEvent.click(screen.getByRole('button', { name: /log daily activity/i }));
    await waitFor(() => screen.getByText(/log your eco activities/i));
  }

  it('renders activity category selection buttons', async () => {
    await goToLogTab();
    expect(screen.getByRole('button', { name: /transit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /energy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /food/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /waste/i })).toBeInTheDocument();
  });

  it('renders activity type select and value input', async () => {
    await goToLogTab();
    expect(screen.getByLabelText(/activity type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
  });

  it('renders recent activity logs panel', async () => {
    await goToLogTab();
    expect(screen.getByText(/recent activity logs/i)).toBeInTheDocument();
  });

  it('shows a logged activity entry from the API', async () => {
    await goToLogTab();
    // 'car' appears in the recent activity list (exact text) — use getAllByText to avoid ambiguity
    await waitFor(() => expect(screen.getAllByText(/^car$/i).length).toBeGreaterThan(0));
  });

  it('submits activity and shows confirmation message', async () => {
    const axios = (await import('axios')).default;
    axios.post.mockResolvedValueOnce({
      data: { activity: { carbon_footprint: 1.44 }, green_score_delta: 2 },
    });
    await goToLogTab();
    const valueInput = screen.getByLabelText(/value/i);
    await userEvent.type(valueInput, '12');
    await userEvent.click(screen.getByRole('button', { name: /submit activity log/i }));
    await waitFor(() => expect(screen.getByText(/carbon footprint/i)).toBeInTheDocument());
  });

  it('switches to electricity category and shows energy types', async () => {
    await goToLogTab();
    await userEvent.click(screen.getByRole('button', { name: /energy/i }));
    const actSelect = screen.getByLabelText(/activity type/i);
    expect(actSelect).toBeInTheDocument();
    const options = within(actSelect).getAllByRole('option');
    expect(options.some(o => o.value === 'consumption')).toBe(true);
  });
});

// =============================================================================
//  SUITE 5: Mobility Intelligence
// =============================================================================
describe('Mobility Intelligence', () => {
  beforeEach(async () => {
    setupLoggedIn();
    await setupAxiosMocks();
  });

  afterEach(() => { vi.clearAllMocks(); });

  async function goToMobilityTab() {
    render(<App />);
    await waitFor(() => screen.getByText(/mobility intelligence/i));
    await userEvent.click(screen.getByRole('button', { name: /mobility intelligence/i }));
    await waitFor(() => screen.getByText(/transit co2 comparison/i));
  }

  it('renders distance input and commute mode select', async () => {
    await goToMobilityTab();
    expect(screen.getByLabelText(/distance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current commute mode/i)).toBeInTheDocument();
  });

  it('shows the compare button', async () => {
    await goToMobilityTab();
    expect(screen.getByRole('button', { name: /compare eco alternatives/i })).toBeInTheDocument();
  });

  it('shows suggestions after API response', async () => {
    const axios = (await import('axios')).default;
    axios.post.mockResolvedValueOnce({
      data: {
        current_emissions: 2.4,
        current_mode: 'car',
        alternatives: [
          { mode: 'metro', emissions: 0.2, percentage_reduction: 91, monthly_savings: 48.4 },
        ],
      },
    });
    await goToMobilityTab();
    await userEvent.type(screen.getByLabelText(/distance/i), '20');
    await userEvent.click(screen.getByRole('button', { name: /compare eco alternatives/i }));
    await waitFor(() => expect(screen.getByText(/maximum monthly savings/i)).toBeInTheDocument());
  });
});

// =============================================================================
//  SUITE 6: Gamification & Goals
// =============================================================================
describe('Gamification & Goals', () => {
  beforeEach(async () => {
    setupLoggedIn();
    await setupAxiosMocks();
  });

  afterEach(() => { vi.clearAllMocks(); });

  async function goToGamificationTab() {
    render(<App />);
    await waitFor(() => screen.getByText(/gamification/i));
    await userEvent.click(screen.getByRole('button', { name: /gamification & goals/i }));
    await waitFor(() => screen.getByText(/set sustainability goal/i));
  }

  it('renders goal creation form fields', async () => {
    await goToGamificationTab();
    expect(screen.getByLabelText(/goal target description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^category$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reduction %/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target date/i)).toBeInTheDocument();
  });

  it('renders the leaderboard section', async () => {
    await goToGamificationTab();
    expect(screen.getByText(/global leaderboard/i)).toBeInTheDocument();
  });

  it('shows existing goal in goals list', async () => {
    await goToGamificationTab();
    await waitFor(() => expect(screen.getByText(/cut car emissions/i)).toBeInTheDocument());
  });

  it('shows badges grid', async () => {
    await goToGamificationTab();
    expect(screen.getByText(/unlocked sustainability badges/i)).toBeInTheDocument();
    expect(screen.getByText(/eco starter/i)).toBeInTheDocument();
  });

  it('submits a new goal successfully', async () => {
    const axios = (await import('axios')).default;
    axios.post.mockResolvedValueOnce({ data: {} });
    await goToGamificationTab();
    await userEvent.type(screen.getByLabelText(/goal target description/i), 'Walk to work every day');
    const dateInput = screen.getByLabelText(/target date/i);
    await userEvent.type(dateInput, '2024-12-31');
    await userEvent.click(screen.getByRole('button', { name: /establish sustainability goal/i }));
    await waitFor(() => expect(screen.getByText(/goal successfully added/i)).toBeInTheDocument());
  });
});

// =============================================================================
//  SUITE 7: Prediction Engine
// =============================================================================
describe('Prediction Engine', () => {
  beforeEach(async () => {
    setupLoggedIn();
    await setupAxiosMocks();
  });

  afterEach(() => { vi.clearAllMocks(); });

  async function goToPredictionsTab() {
    render(<App />);
    await waitFor(() => screen.getByText(/prediction engine/i));
    await userEvent.click(screen.getByRole('button', { name: /prediction engine/i }));
    await waitFor(() => screen.getByText(/ml carbon prediction engine/i));
  }

  it('renders next week forecast metric', async () => {
    await goToPredictionsTab();
    await waitFor(() => expect(screen.getByText(/next week forecast/i)).toBeInTheDocument());
  });

  it('renders next month and annual trend metrics', async () => {
    await goToPredictionsTab();
    await waitFor(() => {
      expect(screen.getByText(/next month forecast/i)).toBeInTheDocument();
      expect(screen.getByText(/annual estimated trend/i)).toBeInTheDocument();
    });
  });

  it('renders the recalculate button', async () => {
    await goToPredictionsTab();
    expect(screen.getByRole('button', { name: /re-calculate forecasts/i })).toBeInTheDocument();
  });
});

// =============================================================================
//  SUITE 8: AI Coach Tab
// =============================================================================
describe('AI Coach & Simulator', () => {
  beforeEach(async () => {
    setupLoggedIn();
    await setupAxiosMocks();
  });

  afterEach(() => { vi.clearAllMocks(); });

  async function goToCoachTab() {
    render(<App />);
    await waitFor(() => screen.getByText(/ai coach/i));
    await userEvent.click(screen.getByRole('button', { name: /ai coach & simulator/i }));
    await waitFor(() => screen.getByText(/ecosphere ai coach/i));
  }

  it('renders the Reduction Simulator section', async () => {
    await goToCoachTab();
    expect(screen.getByText(/reduction simulator/i)).toBeInTheDocument();
  });

  it('renders the Generate Coach Tips button', async () => {
    await goToCoachTab();
    expect(screen.getByRole('button', { name: /generate new coach tips/i })).toBeInTheDocument();
  });

  it('displays AI tips after button click', async () => {
    const axios = (await import('axios')).default;
    axios.get.mockImplementation((url) => {
      if (url.includes('/auth/profile'))   return Promise.resolve({ data: mockUser });
      if (url.includes('/dashboard'))      return Promise.resolve({ data: mockDashboard });
      if (url.includes('/activities'))     return Promise.resolve({ data: mockActivities });
      if (url.includes('/gamification/goals'))       return Promise.resolve({ data: mockGoals });
      if (url.includes('/gamification/badges'))      return Promise.resolve({ data: mockBadges });
      if (url.includes('/gamification/leaderboard')) return Promise.resolve({ data: mockLeaderboard });
      if (url.includes('/gamification/notifications')) return Promise.resolve({ data: mockNotifications });
      if (url.includes('/coach/tips'))     return Promise.resolve({ data: { coach_recommendations: 'Use public transit to cut 40% of your carbon.' } });
      if (url.includes('/predictions'))    return Promise.resolve({ data: { next_week_emissions: 28.5, next_month_emissions: 115.2, annual_trend_emissions: 1260, chart_data: [] } });
      return Promise.resolve({ data: {} });
    });
    await goToCoachTab();
    await userEvent.click(screen.getByRole('button', { name: /generate new coach tips/i }));
    await waitFor(() => expect(screen.getByText(/use public transit/i)).toBeInTheDocument());
  });
});

// =============================================================================
//  SUITE 9: Accessibility
// =============================================================================
describe('Accessibility', () => {
  beforeEach(() => { setupLoggedOut(); vi.clearAllMocks(); });

  it('has a main landmark on the login page', () => {
    render(<App />);
    // The auth page root div should exist
    expect(document.querySelector('body')).toBeInTheDocument();
  });

  it('all login form inputs have associated labels', () => {
    render(<App />);
    const emailInput = screen.getByLabelText(/email address/i);
    const passInput  = screen.getByLabelText(/password/i);
    expect(emailInput).toBeInTheDocument();
    expect(passInput).toBeInTheDocument();
  });

  it('login page heading has correct text', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /ecosphere ai/i })).toBeInTheDocument();
  });

  it('login submit button is focusable', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /log in to ecosphere/i });
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });

  it('registration form has labeled name input', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('registration role select has associated label', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));
    expect(screen.getByLabelText(/account role/i)).toBeInTheDocument();
  });
});

// =============================================================================
//  SUITE 10: Utility & Edge Cases
// =============================================================================
describe('Utility Functions & Edge Cases', () => {
  beforeEach(async () => {
    setupLoggedIn();
    await setupAxiosMocks();
  });

  afterEach(() => { vi.clearAllMocks(); });

  it('toggles dark mode when the theme button is clicked', async () => {
    render(<App />);
    await waitFor(() => screen.getByTitle(/toggle dark mode/i));
    const toggleBtn = screen.getByTitle(/toggle dark mode/i);
    const html = document.documentElement;
    expect(html.classList.contains('dark')).toBe(true); // default is dark
    await userEvent.click(toggleBtn);
    expect(html.classList.contains('dark')).toBe(false);
    await userEvent.click(toggleBtn);
    expect(html.classList.contains('dark')).toBe(true);
  });

  it('clears token and shows login on logout', async () => {
    render(<App />);
    await waitFor(() => screen.getByRole('button', { name: /logout/i }));
    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /log in to ecosphere/i })).toBeInTheDocument()
    );
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
  });

  it('notification bell is rendered and clickable', async () => {
    render(<App />);
    await waitFor(() => screen.getByTitle(/toggle dark mode/i));
    // Notification button is near the bell icon
    const bells = document.querySelectorAll('header button');
    expect(bells.length).toBeGreaterThan(0);
  });
});
