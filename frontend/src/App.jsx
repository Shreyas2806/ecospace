import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Leaf, Activity, Car, Zap, Coffee, Trash2, ShieldAlert, Award, 
  Sparkles, Calendar, Compass, User, LogOut, Sun, Moon, 
  TrendingUp, Play, Trophy, Users, BarChart3, PlusCircle, 
  CheckCircle2, ChevronRight, Bell, HelpCircle, FileText
} from 'lucide-react';

// Import Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = '/api';

export default function App() {
  // Authentication states
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  
  // Auth Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState('user');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Dashboard state
  const [dashData, setDashData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Activities log form state
  const [logCategory, setLogCategory] = useState('transportation');
  const [logType, setLogType] = useState('car');
  const [logValue, setLogValue] = useState('');
  const [logStatus, setLogStatus] = useState('');
  const [recentActivities, setRecentActivities] = useState([]);

  // Mobility intel state
  const [mobDistance, setMobDistance] = useState('');
  const [mobCurrentMode, setMobCurrentMode] = useState('car');
  const [mobResults, setMobResults] = useState(null);

  // AI Coach state
  const [coachTips, setCoachTips] = useState('');
  const [loadingCoach, setLoadingCoach] = useState(false);

  // Simulator state
  const [simDistance, setSimDistance] = useState(15);
  const [simMode, setSimMode] = useState('car');
  const [simElectricity, setSimElectricity] = useState(8);
  const [simAcHours, setSimAcHours] = useState(4);
  const [simDiet, setSimDiet] = useState('non-vegetarian');
  const [simWaste, setSimWaste] = useState(2);
  const [simResult, setSimResult] = useState(null);

  // ML Predictions state
  const [mlData, setMlData] = useState(null);
  const [loadingMl, setLoadingMl] = useState(false);

  // Goals & Leaderboard state
  const [goals, setGoals] = useState([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('transportation');
  const [newGoalReduction, setNewGoalReduction] = useState('20');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [goalStatusMsg, setGoalStatusMsg] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [badges, setBadges] = useState([]);

  // Admin state
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminReport, setAdminReport] = useState(null);

  // Axios configuration
  const api = axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  // Handle dark mode class toggling
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Load user profile & data when token is present
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchProfile();
      fetchDashboard();
      fetchActivities();
      fetchGoalsAndBadges();
      fetchLeaderboard();
      fetchNotifications();
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUser(res.data);
      if (res.data.role === 'admin') {
        fetchAdminData();
      }
    } catch (err) {
      handleAuthFailure();
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setDashData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities');
      setRecentActivities(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGoalsAndBadges = async () => {
    try {
      const resG = await api.get('/gamification/goals');
      setGoals(resG.data);
      const resB = await api.get('/gamification/badges');
      setBadges(resB.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/gamification/leaderboard');
      setLeaderboard(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/gamification/notifications');
      setNotifications(res.data);
      setHasUnreadNotif(res.data.some(n => !n.is_read));
    } catch (err) {
      console.error(err);
    }
  };

  const readAllNotifications = async () => {
    try {
      await api.post('/gamification/notifications/read');
      setHasUnreadNotif(false);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const resA = await api.get('/admin/analytics');
      setAdminAnalytics(resA.data);
      const resU = await api.get('/admin/users');
      setAdminUsers(resU.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthFailure = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  // Auth Submit Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      const res = await api.post('/auth/login', { email: authEmail, password: authPassword });
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Login failed. Check details.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      await api.post('/auth/register', { 
        name: authName, 
        email: authEmail, 
        password: authPassword, 
        role: authRole 
      });
      setAuthMessage('Account registered successfully! You can now log in.');
      setIsRegistering(false);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Registration failed.');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      const res = await api.post('/auth/forgot-password', { email: authEmail });
      setAuthMessage(res.data.message);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Failed to request reset link.');
    }
  };

  // Activity Log Submit
  const handleLogActivity = async (e) => {
    e.preventDefault();
    setLogStatus('');
    try {
      const res = await api.post('/activities', {
        category: logCategory,
        activity_type: logType,
        value: logValue
      });
      setLogStatus(`Logged! Carbon Footprint: ${res.data.activity.carbon_footprint.toFixed(2)} kg CO2. Green Score delta: ${res.data.green_score_delta >= 0 ? '+' : ''}${res.data.green_score_delta}`);
      setLogValue('');
      fetchDashboard();
      fetchActivities();
      fetchLeaderboard();
      fetchNotifications();
      fetchProfile();
    } catch (err) {
      setLogStatus('Failed to log activity. Verify inputs.');
    }
  };

  // Mobility recommendations
  const handleMobilityCheck = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/mobility/recommend', {
        distance: mobDistance,
        current_mode: mobCurrentMode
      });
      setMobResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // AI coach tips
  const triggerCoach = async () => {
    setLoadingCoach(true);
    try {
      const res = await api.get('/coach/tips');
      setCoachTips(res.data.coach_recommendations);
    } catch (err) {
      setCoachTips('Failed to get coach recommendations.');
    } finally {
      setLoadingCoach(false);
    }
  };

  // Simulator handler
  const triggerSimulation = async () => {
    try {
      const res = await api.post('/simulator/simulate', {
        transport_distance: simDistance,
        transport_mode: simMode,
        electricity_kwh: simElectricity,
        ac_hours: simAcHours,
        diet_type: simDiet,
        waste_kg: simWaste
      });
      setSimResult(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Run initial simulation on tab mount
  useEffect(() => {
    if (activeTab === 'coach' && token) {
      triggerSimulation();
    }
  }, [activeTab]);

  // Run ML Predictions
  const triggerPredictions = async () => {
    setLoadingMl(true);
    try {
      const res = await api.get('/predictions');
      setMlData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMl(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'predictions' && token) {
      triggerPredictions();
    }
  }, [activeTab]);

  // Goals submission
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setGoalStatusMsg('');
    try {
      await api.post('/gamification/goals', {
        title: newGoalTitle,
        category: newGoalCategory,
        target_reduction_pct: newGoalReduction,
        target_date: newGoalDate
      });
      setGoalStatusMsg('Goal successfully added!');
      setNewGoalTitle('');
      setNewGoalDate('');
      fetchGoalsAndBadges();
      fetchNotifications();
    } catch (err) {
      setGoalStatusMsg('Failed to create goal.');
    }
  };

  const handleCompleteGoal = async (goalId) => {
    try {
      await api.patch(`/gamification/goals/${goalId}/complete`);
      fetchGoalsAndBadges();
      fetchDashboard();
      fetchNotifications();
      fetchProfile();
      fetchLeaderboard();
    } catch (err) {
      console.error(err);
    }
  };

  // Admin Action handlers
  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete user failed.');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const res = await api.get('/admin/report');
      setAdminReport(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Render activity sub-categories helper
  const categoryTypes = {
    transportation: ['car', 'bike', 'bus', 'metro', 'train', 'flight', 'walking'],
    electricity: ['consumption', 'ac_usage', 'appliance'],
    food: ['vegetarian', 'non-vegetarian', 'vegan'],
    waste: ['plastic', 'food_waste', 'paper']
  };

  const getUnitName = (cat, type) => {
    if (cat === 'transportation') return 'km';
    if (cat === 'electricity') return type === 'consumption' ? 'kWh' : 'hours';
    if (cat === 'food') return 'meals';
    if (cat === 'waste') return 'kg';
    return 'units';
  };

  // Auth view component
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 relative overflow-hidden font-sans">
        {/* Floating animated blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl shadow-2xl relative z-10 mx-4">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 animate-pulse">
              <Leaf size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">EcoSphere AI</h1>
            <p className="text-slate-400 mt-2 text-sm">AI-Powered Carbon Footprint Awareness & Mobility</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{authError}</span>
            </div>
          )}

          {authMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              {authMessage}
            </div>
          )}

          {!isForgotPassword ? (
            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Jane Doe"
                    value={authName} 
                    onChange={e => setAuthName(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com"
                  value={authEmail} 
                  onChange={e => setAuthEmail(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Account Role</label>
                  <select 
                    value={authRole} 
                    onChange={e => setAuthRole(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/80 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  >
                    <option value="user" className="bg-slate-800">User (Standard Dashboard)</option>
                    <option value="admin" className="bg-slate-800">Admin (Platform Analytics)</option>
                  </select>
                </div>
              )}

              <button type="submit" className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition duration-200 mt-2 shadow-lg shadow-emerald-500/20">
                {isRegistering ? 'Create Eco Account' : 'Log In to EcoSphere'}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 mt-4">
                <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setAuthMessage(''); }} className="hover:text-emerald-400 transition">
                  {isRegistering ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
                {!isRegistering && (
                  <button type="button" onClick={() => { setIsForgotPassword(true); setAuthError(''); setAuthMessage(''); }} className="hover:text-emerald-400 transition">
                    Forgot Password?
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com"
                  value={authEmail} 
                  onChange={e => setAuthEmail(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <button type="submit" className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition duration-200 mt-2 shadow-lg shadow-emerald-500/20">
                Send Reset Link
              </button>

              <div className="text-center text-xs text-slate-400 mt-4">
                <button type="button" onClick={() => { setIsForgotPassword(false); setAuthError(''); setAuthMessage(''); }} className="hover:text-emerald-400 transition">
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Quick-start tip */}
          <div className="mt-8 pt-6 border-t border-slate-700/30 text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Demo Credentials</span>
            <div className="flex justify-center gap-4 text-xs">
              <button onClick={() => { setAuthEmail('user@ecosphere.com'); setAuthPassword('user123'); setIsRegistering(false); }} className="px-2.5 py-1 rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/50 text-emerald-400 font-mono transition text-[11px]">
                User Demo
              </button>
              <button onClick={() => { setAuthEmail('admin@ecosphere.com'); setAuthPassword('admin123'); setIsRegistering(false); }} className="px-2.5 py-1 rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/50 text-teal-400 font-mono transition text-[11px]">
                Admin Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard calculations/charts definitions
  const pieData = dashData ? {
    labels: ['Transportation', 'Electricity', 'Food', 'Waste'],
    datasets: [{
      data: [
        dashData.category_breakdown.transportation,
        dashData.category_breakdown.electricity,
        dashData.category_breakdown.food,
        dashData.category_breakdown.waste,
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.75)', // Transportation Green
        'rgba(234, 179, 8, 0.75)',  // Electricity Yellow
        'rgba(249, 115, 22, 0.75)',  // Food Orange
        'rgba(99, 102, 241, 0.75)',  // Waste Indigo
      ],
      borderColor: darkMode ? 'rgba(15, 23, 42, 1)' : 'rgba(255, 255, 255, 1)',
      borderWidth: 2
    }]
  } : null;

  const trendData = dashData ? {
    labels: dashData.trend_data.map(d => d.date),
    datasets: [{
      fill: true,
      label: 'Daily Footprint (kg CO2)',
      data: dashData.trend_data.map(d => d.emissions),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      tension: 0.35,
      borderWidth: 3,
      pointRadius: 4,
      pointBackgroundColor: '#22c55e'
    }]
  } : null;

  const barData = dashData ? {
    labels: ['Your Monthly', 'City Average', 'Target Goal'],
    datasets: [{
      label: 'Carbon Footprint Comparison (kg CO2 / Month)',
      data: [dashData.comparison.user, dashData.comparison.average, dashData.comparison.optimal],
      backgroundColor: [
        'rgba(34, 197, 94, 0.85)',
        'rgba(148, 163, 184, 0.5)',
        'rgba(13, 148, 136, 0.85)'
      ],
      borderRadius: 6
    }]
  } : null;

  // ML Prediction Chart data mapping
  const predictionChartData = mlData ? {
    labels: mlData.chart_data.map(d => d.date),
    datasets: [
      {
        label: 'Historical Log (kg CO2)',
        data: mlData.chart_data.map(d => d.type === 'history' ? d.emissions : null),
        borderColor: '#22c55e',
        backgroundColor: '#22c55e',
        borderWidth: 3,
        pointRadius: 5,
        spanGaps: false
      },
      {
        label: 'ML Forecast Trend',
        data: mlData.chart_data.map(d => d.type === 'prediction' ? d.emissions : (d.date === mlData.chart_data.filter(x => x.type === 'history').slice(-1)[0]?.date ? d.emissions : null)),
        borderColor: '#06b6d4',
        borderDash: [5, 5],
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#06b6d4',
        spanGaps: true
      }
    ]
  } : null;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between p-5 relative z-20 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-8 px-2">
            <Leaf className="text-emerald-500" size={28} />
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">EcoSphere AI</span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              <Activity size={18} />
              <span>Smart Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('log')} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'log' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              <PlusCircle size={18} />
              <span>Log Daily Activity</span>
            </button>

            <button 
              onClick={() => setActiveTab('mobility')} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'mobility' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              <Compass size={18} />
              <span>Mobility Intelligence</span>
            </button>

            <button 
              onClick={() => setActiveTab('coach')} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'coach' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              <Sparkles size={18} />
              <span>AI Coach & Simulator</span>
            </button>

            <button 
              onClick={() => setActiveTab('predictions')} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'predictions' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              <TrendingUp size={18} />
              <span>Prediction Engine</span>
            </button>

            <button 
              onClick={() => setActiveTab('gamification')} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'gamification' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              <Trophy size={18} />
              <span>Gamification & Goals</span>
            </button>

            {user?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('admin')} 
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'admin' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
              >
                <Users size={18} />
                <span>Admin Panel</span>
              </button>
            )}
          </nav>
        </div>

        {/* User Card & Settings */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
          <div className="flex items-center gap-3 px-1.5">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold leading-none truncate">{user?.name}</h4>
              <p className="text-[10px] text-slate-500 truncate mt-1">{user?.email}</p>
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider">{user?.role}</span>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 pt-1">
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={handleAuthFailure} 
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative min-w-0 max-h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <Leaf className="text-emerald-500 md:hidden" size={24} />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs">
              {activeTab === 'dashboard' && 'Smart Dashboard'}
              {activeTab === 'log' && 'Log Carbon Activity'}
              {activeTab === 'mobility' && 'Mobility Intelligence'}
              {activeTab === 'coach' && 'AI Sustainability Coach'}
              {activeTab === 'predictions' && 'Carbon Prediction Engine'}
              {activeTab === 'gamification' && 'Gamification & Streaks'}
              {activeTab === 'admin' && 'Admin Control Panel'}
            </h2>
          </div>

          {/* Quick Notification Tray & Info */}
          <div className="flex items-center gap-4">
            {dashData && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <span>🔥 Streak:</span>
                <span className="font-bold">{dashData.streak} days</span>
              </div>
            )}

            {/* Notification Menu */}
            <div className="relative">
              <button 
                onClick={() => { setShowNotifMenu(!showNotifMenu); if (hasUnreadNotif) readAllNotifications(); }} 
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition relative"
              >
                <Bell size={18} />
                {hasUnreadNotif && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </button>
              
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 text-xs space-y-3 max-h-96 overflow-y-auto">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b dark:border-slate-800 pb-2">Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No recent notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-2 rounded-lg ${n.is_read ? 'bg-slate-50 dark:bg-slate-800/30 text-slate-500' : 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 font-semibold'}`}>
                        {n.message}
                        <span className="block text-[9px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">
          
          {/* TAB 1: SMART DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Metrics cards */}
              {dashData ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Today's Emissions</span>
                      <h3 className="text-3xl font-extrabold mt-1 text-slate-800 dark:text-slate-100">{dashData.today_emissions.toFixed(2)} <span className="text-xs font-normal text-slate-400">kg CO2</span></h3>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Leaf size={24} />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Weekly Footprint</span>
                      <h3 className="text-3xl font-extrabold mt-1 text-slate-800 dark:text-slate-100">{dashData.weekly_emissions.toFixed(2)} <span className="text-xs font-normal text-slate-400">kg CO2</span></h3>
                    </div>
                    <div className="p-3.5 rounded-xl bg-yellow-500/10 text-yellow-500">
                      <Zap size={24} />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Monthly Total</span>
                      <h3 className="text-3xl font-extrabold mt-1 text-slate-800 dark:text-slate-100">{dashData.monthly_emissions.toFixed(2)} <span className="text-xs font-normal text-slate-400">kg CO2</span></h3>
                    </div>
                    <div className="p-3.5 rounded-xl bg-orange-500/10 text-orange-500">
                      <Coffee size={24} />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Green Score</span>
                      <h3 className="text-3xl font-extrabold mt-1 text-slate-800 dark:text-slate-100">{dashData.green_score}<span className="text-xs font-normal text-slate-400">/100</span></h3>
                    </div>
                    <div className="p-3.5 rounded-xl bg-teal-500/10 text-teal-500">
                      <Award size={24} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">Loading Dashboard Metrics...</div>
              )}

              {/* Charts grid */}
              {dashData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Line chart */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm lg:col-span-2 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Emission Trend (Last 7 Days)</h4>
                    <div className="h-64">
                      {trendData && <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false }} />}
                    </div>
                  </div>

                  {/* Category breakdown pie */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4 flex flex-col justify-between">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Category Breakdown</h4>
                    <div className="h-56 flex items-center justify-center">
                      {pieData && <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom comparison & goals row */}
              {dashData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar chart comparison */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">How You Compare</h4>
                    <div className="h-64">
                      {barData && <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />}
                    </div>
                  </div>

                  {/* Goals progress */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                      <span>Active Goal Reduction Progress</span>
                      <button onClick={() => setActiveTab('gamification')} className="text-xs text-emerald-500 hover:underline">Manage Goals</button>
                    </h4>
                    
                    {dashData.goals_progress.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        No active goals. Head to Goals tab to create one!
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {dashData.goals_progress.map(g => (
                          <div key={g.id} className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>{g.title}</span>
                              <span className="text-emerald-500">{g.progress_pct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                                style={{ width: `${g.progress_pct}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total carbon saved card */}
                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-500">
                        <Trophy size={20} />
                      </div>
                      <div>
                        <h5 className="text-xs text-slate-400 font-semibold">Total Mobility Savings</h5>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{dashData.total_saved.toFixed(2)} kg CO2 saved</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOG CARBON ACTIVITY */}
          {activeTab === 'log' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              {/* Form panel */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm lg:col-span-2 space-y-6">
                <div className="flex items-center gap-3">
                  <PlusCircle className="text-emerald-500" size={24} />
                  <h3 className="text-lg font-bold">Log Your Eco Activities</h3>
                </div>

                <form onSubmit={handleLogActivity} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Activity Category</label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { key: 'transportation', label: 'Transit', icon: <Car size={16} /> },
                        { key: 'electricity', label: 'Energy', icon: <Zap size={16} /> },
                        { key: 'food', label: 'Food', icon: <Coffee size={16} /> },
                        { key: 'waste', label: 'Waste', icon: <Trash2 size={16} /> }
                      ].map(cat => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => { setLogCategory(cat.key); setLogType(categoryTypes[cat.key][0]); }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-2 transition ${logCategory === cat.key ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
                        >
                          {cat.icon}
                          <span>{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Activity Type</label>
                      <select 
                        value={logType} 
                        onChange={e => setLogType(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                      >
                        {categoryTypes[logCategory].map(type => (
                          <option key={type} value={type} className="bg-slate-900 text-slate-100 capitalize">{type.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Value ({getUnitName(logCategory, logType)})</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required 
                        placeholder="Enter amount"
                        value={logValue} 
                        onChange={e => setLogValue(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 shadow-md transition">
                    Submit Activity Log
                  </button>

                  {logStatus && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold text-center">
                      {logStatus}
                    </div>
                  )}
                </form>
              </div>

              {/* Side panel showing recent logged activities */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Recent Activity Logs</h4>
                {recentActivities.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-12">No activities logged yet.</p>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {recentActivities.map(act => (
                      <div key={act.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg text-white ${act.category === 'transportation' ? 'bg-emerald-500' : act.category === 'electricity' ? 'bg-yellow-500' : act.category === 'food' ? 'bg-orange-500' : 'bg-indigo-500'}`}>
                            {act.category === 'transportation' && <Car size={16} />}
                            {act.category === 'electricity' && <Zap size={16} />}
                            {act.category === 'food' && <Coffee size={16} />}
                            {act.category === 'waste' && <Trash2 size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold capitalize">{act.activity_type.replace('_', ' ')}</p>
                            <span className="text-[10px] text-slate-500">{act.value.toFixed(1)} {getUnitName(act.category, act.activity_type)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-rose-500">+{act.carbon_footprint.toFixed(2)} kg</p>
                          <span className="text-[9px] text-slate-500">{new Date(act.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SUSTAINABLE MOBILITY INTELLIGENCE */}
          {activeTab === 'mobility' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              {/* Form input */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <Compass className="text-emerald-500" size={24} />
                  <h3 className="text-lg font-bold">Transit CO2 Comparison</h3>
                </div>

                <form onSubmit={handleMobilityCheck} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distance (km)</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="e.g. 20"
                      value={mobDistance} 
                      onChange={e => setMobDistance(e.target.value)} 
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Commute Mode</label>
                    <select 
                      value={mobCurrentMode} 
                      onChange={e => setMobCurrentMode(e.target.value)} 
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="car" className="bg-slate-900 text-slate-100">Car</option>
                      <option value="bus" className="bg-slate-900 text-slate-100">Bus</option>
                      <option value="metro" className="bg-slate-900 text-slate-100">Metro</option>
                      <option value="train" className="bg-slate-900 text-slate-100">Train</option>
                      <option value="flight" className="bg-slate-900 text-slate-100">Flight</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 shadow-md transition">
                    Compare Eco Alternatives
                  </button>
                </form>
              </div>

              {/* Suggestions Results */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm lg:col-span-2 space-y-6">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Sustainable Alternative Suggestions</h4>
                
                {!mobResults ? (
                  <div className="text-center py-24 text-slate-500 text-xs">
                    Enter trip details on the left to view green options.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Current Single-Trip Emissions</span>
                        <p className="text-2xl font-black text-rose-500 mt-1">{mobResults.current_emissions.toFixed(2)} kg CO2</p>
                        <span className="text-[10px] text-slate-500 capitalize">via {mobResults.current_mode}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Maximum Monthly Savings</span>
                        <p className="text-2xl font-black text-emerald-500 mt-1">
                          {mobResults.alternatives.length > 0 ? mobResults.alternatives[0].monthly_savings.toFixed(1) : '0'} kg CO2
                        </p>
                        <span className="text-[10px] text-slate-500">Assuming 44 trips / month</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Recommended Transit Choices:</span>
                      
                      {mobResults.alternatives.length === 0 ? (
                        <p className="text-xs text-emerald-500 font-semibold">Your current mode is already optimized! Awesome job!</p>
                      ) : (
                        mobResults.alternatives.map(alt => (
                          <div key={alt.mode} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                {alt.mode === 'metro' && <Compass size={18} />}
                                {alt.mode === 'bus' && <Car size={18} />}
                                {alt.mode === 'bike' && <Activity size={18} />}
                                {alt.mode === 'walking' && <Leaf size={18} />}
                              </div>
                              <div>
                                <p className="text-sm font-bold capitalize">{alt.mode}</p>
                                <p className="text-xs text-slate-400">Emissions: {alt.emissions.toFixed(2)} kg CO2 (saves {alt.percentage_reduction.toFixed(0)}%)</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-500">-{alt.monthly_savings.toFixed(1)} kg CO2/mo</p>
                              <span className="text-[9px] font-semibold text-slate-400">Monthly Savings</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AI SUSTAINABILITY COACH & SIMULATOR */}
          {activeTab === 'coach' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              {/* Simulator Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-emerald-500" size={24} />
                  <h3 className="text-lg font-bold">Reduction Simulator</h3>
                </div>

                <div className="space-y-4">
                  {/* Commute */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Daily Commute distance:</span>
                      <span className="text-emerald-500">{simDistance} km</span>
                    </div>
                    <input 
                      type="range" min="1" max="100" 
                      value={simDistance} onChange={e => { setSimDistance(e.target.value); triggerSimulation(); }} 
                      className="w-full accent-emerald-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <select 
                      value={simMode} onChange={e => { setSimMode(e.target.value); triggerSimulation(); }} 
                      className="w-full px-2.5 py-1.5 rounded-lg border dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs mt-1"
                    >
                      <option value="car">Car (Baseline)</option>
                      <option value="metro">Metro</option>
                      <option value="bus">Bus</option>
                      <option value="walking">Walking / Cycling</option>
                    </select>
                  </div>

                  {/* Electricity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Electricity Consumption:</span>
                      <span className="text-yellow-500">{simElectricity} kWh/day</span>
                    </div>
                    <input 
                      type="range" min="1" max="30" 
                      value={simElectricity} onChange={e => { setSimElectricity(e.target.value); triggerSimulation(); }} 
                      className="w-full accent-yellow-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* AC Hours */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>AC Daily usage hours:</span>
                      <span className="text-yellow-500">{simAcHours} hours</span>
                    </div>
                    <input 
                      type="range" min="0" max="24" 
                      value={simAcHours} onChange={e => { setSimAcHours(e.target.value); triggerSimulation(); }} 
                      className="w-full accent-yellow-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Food */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold">Diet Habit Style:</label>
                    <select 
                      value={simDiet} onChange={e => { setSimDiet(e.target.value); triggerSimulation(); }} 
                      className="w-full px-2.5 py-1.5 rounded-lg border dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs"
                    >
                      <option value="vegetarian">Vegetarian</option>
                      <option value="non-vegetarian">Non-Vegetarian</option>
                      <option value="vegan">Vegan</option>
                    </select>
                  </div>

                  {/* Waste */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Daily Waste generation:</span>
                      <span className="text-indigo-500">{simWaste} kg</span>
                    </div>
                    <input 
                      type="range" min="0" max="10" step="0.5" 
                      value={simWaste} onChange={e => { setSimWaste(e.target.value); triggerSimulation(); }} 
                      className="w-full accent-indigo-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Simulation Output metrics */}
                {simResult && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between font-semibold">
                      <span>Current Baseline:</span>
                      <span>{simResult.current_monthly_baseline.toFixed(1)} kg CO2</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span>Projected Footprint:</span>
                      <span>{simResult.projected_monthly_footprint.toFixed(1)} kg CO2</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-500 border-t dark:border-slate-800 pt-2 text-sm">
                      <span>Expected Savings:</span>
                      <span>-{simResult.expected_monthly_savings.toFixed(1)} kg CO2</span>
                    </div>
                    <div className="flex justify-between font-semibold text-emerald-400">
                      <span>Percent Reduction:</span>
                      <span>{simResult.percentage_savings.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Coach Tips Chat/Recommendations Panel */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm lg:col-span-2 space-y-6 flex flex-col justify-between min-h-[450px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="text-emerald-500" size={24} />
                      <div>
                        <h3 className="text-lg font-bold">EcoSphere AI Coach</h3>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Powered by Gemini AI</span>
                      </div>
                    </div>
                    <button 
                      onClick={triggerCoach} 
                      disabled={loadingCoach}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition"
                    >
                      {loadingCoach ? 'Analyzing...' : 'Generate New Coach Tips'}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 max-h-[350px] overflow-y-auto pr-1 text-slate-700 dark:text-slate-300 text-xs leading-relaxed space-y-3">
                    {coachTips ? (
                      <div className="whitespace-pre-wrap">{coachTips}</div>
                    ) : (
                      <div className="text-center py-24 text-slate-500">
                        Click "Generate New Coach Tips" to get tailored, AI-powered carbon savings advice based on your dashboard logs!
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t dark:border-slate-800 flex items-center gap-2 text-[10px] text-slate-400">
                  <HelpCircle size={14} />
                  <span>The AI analyzes your logged Transportation, Electricity, Food, and Waste frequencies dynamically.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CARBON PREDICTION ENGINE */}
          {activeTab === 'predictions' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="text-emerald-500" size={24} />
                    <div>
                      <h3 className="text-lg font-bold">ML Carbon Prediction Engine</h3>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Linear Regression Historical Modeling</span>
                    </div>
                  </div>
                  <button 
                    onClick={triggerPredictions} 
                    disabled={loadingMl}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition"
                  >
                    {loadingMl ? 'Forecasting...' : 'Re-calculate Forecasts'}
                  </button>
                </div>

                {mlData ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Next Week Forecast</span>
                      <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{mlData.next_week_emissions.toFixed(1)} kg CO2</p>
                      <span className="text-[10px] text-slate-500">Aggregated predicted sum (7 days)</span>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Next Month Forecast</span>
                      <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{mlData.next_month_emissions.toFixed(1)} kg CO2</p>
                      <span className="text-[10px] text-slate-500">Aggregated predicted sum (30 days)</span>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Annual Estimated Trend</span>
                      <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{mlData.annual_trend_emissions.toFixed(1)} kg CO2</p>
                      <span className="text-[10px] text-slate-500">Assuming current logging velocity</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-6 text-slate-500">Loading ML Forecast estimates...</p>
                )}

                {/* Prediction chart */}
                {mlData && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Historical vs ML Forecast Output Paths</h4>
                    <div className="h-80">
                      {predictionChartData && <Line data={predictionChartData} options={{ responsive: true, maintainAspectRatio: false }} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: GAMIFICATION & GOALS */}
          {activeTab === 'gamification' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              {/* Left Column: Create Goals & Badges list */}
              <div className="space-y-8 lg:col-span-2">
                
                {/* Create Goal Form */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-emerald-500" size={24} />
                    <h3 className="text-lg font-bold">Set Sustainability Goal</h3>
                  </div>

                  <form onSubmit={handleCreateGoal} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Goal Target description</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Reduce transportation emissions by 20%"
                        value={newGoalTitle} 
                        onChange={e => setNewGoalTitle(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                        <select 
                          value={newGoalCategory} 
                          onChange={e => setNewGoalCategory(e.target.value)} 
                          className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                        >
                          <option value="transportation">Transportation</option>
                          <option value="electricity">Electricity</option>
                          <option value="food">Food</option>
                          <option value="waste">Waste</option>
                          <option value="overall">Overall</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reduction %</label>
                        <select 
                          value={newGoalReduction} 
                          onChange={e => setNewGoalReduction(e.target.value)} 
                          className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                        >
                          <option value="10">10%</option>
                          <option value="15">15%</option>
                          <option value="20">20%</option>
                          <option value="30">30%</option>
                          <option value="50">50%</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Date</label>
                        <input 
                          type="date" 
                          required 
                          value={newGoalDate} 
                          onChange={e => setNewGoalDate(e.target.value)} 
                          className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 shadow-md transition">
                      Establish Sustainability Goal
                    </button>

                    {goalStatusMsg && (
                      <p className="text-center text-xs font-semibold text-emerald-500">{goalStatusMsg}</p>
                    )}
                  </form>
                </div>

                {/* Goals List */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold">Your Sustainability Goals</h3>
                  {goals.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">No goals created yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {goals.map(g => (
                        <div key={g.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">{g.title}</h5>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${g.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {g.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 capitalize">Target: Reduce {g.category} emissions by {g.target_reduction_pct}% before {new Date(g.target_date).toLocaleDateString()}</p>
                          </div>
                          {g.status === 'active' && (
                            <button 
                              onClick={() => handleCompleteGoal(g.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition"
                            >
                              Complete Goal
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Badges Grid */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold">Unlocked Sustainability Badges</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: 'Eco Starter', icon: '🌱', desc: 'Welcome to EcoSphere AI! Account created.' },
                      { name: 'Green Warrior', icon: '🛡️', desc: 'Maintained logging streak of 3+ days.' },
                      { name: 'Climate Champion', icon: '🏆', desc: 'Maintained logging streak of 7+ days.' },
                      { name: 'Carbon Neutral Hero', icon: '🌍', desc: 'Achieved green score >= 80 or finished 3 goals.' }
                    ].map(badge => {
                      const isUnlocked = badges.some(b => b.badge_name === badge.name);
                      return (
                        <div 
                          key={badge.name} 
                          className={`p-4 rounded-xl border text-center space-y-2 flex flex-col items-center justify-center transition ${isUnlocked ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-100' : 'bg-slate-100/30 dark:bg-slate-800/10 border-slate-200 dark:border-slate-900 opacity-40'}`}
                        >
                          <span className="text-3xl">{badge.icon}</span>
                          <h5 className="text-xs font-bold leading-tight">{badge.name}</h5>
                          <span className="text-[9px] text-slate-400 leading-tight block">{badge.desc}</span>
                          {isUnlocked && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-semibold">Unlocked</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Leaderboard Column */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <Trophy className="text-yellow-500" size={24} />
                  <h3 className="text-lg font-bold">Global Leaderboard</h3>
                </div>

                <div className="space-y-4">
                  {leaderboard.map((item, idx) => (
                    <div 
                      key={item.username} 
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${item.is_current_user ? 'bg-emerald-500/10 border-emerald-500/30 font-bold' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-yellow-500/20 text-yellow-600' : idx === 1 ? 'bg-slate-400/20 text-slate-500' : idx === 2 ? 'bg-amber-600/20 text-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {item.rank}
                        </span>
                        <span className="text-xs capitalize">{item.username}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-500">{item.green_score} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ADMIN DASHBOARD */}
          {activeTab === 'admin' && user?.role === 'admin' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Analytics row */}
              {adminAnalytics ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Users</span>
                      <h3 className="text-3xl font-extrabold mt-1">{adminAnalytics.total_users}</h3>
                    </div>
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Users size={24} />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Activities Logged</span>
                      <h3 className="text-3xl font-extrabold mt-1">{adminAnalytics.total_activities_logged}</h3>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Activity size={24} />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Carbon Saved</span>
                      <h3 className="text-3xl font-extrabold mt-1 text-emerald-500">{adminAnalytics.total_carbon_saved.toFixed(1)} <span className="text-xs font-normal text-slate-400">kg</span></h3>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Leaf size={24} />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Common Emission Source</span>
                      <h3 className="text-lg font-extrabold mt-1.5 capitalize text-rose-500">{adminAnalytics.most_common_source.replace('_', ' ')}</h3>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-500">
                      <ShieldAlert size={24} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">Loading Admin Analytics summaries...</div>
              )}

              {/* User management and City analytics row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Users List Table */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm lg:col-span-2 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Manage Platform Users</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] text-slate-500 uppercase tracking-wider border-b dark:border-slate-800">
                        <tr>
                          <th className="pb-3">Name</th>
                          <th className="pb-3">Email</th>
                          <th className="pb-3">Role</th>
                          <th className="pb-3 text-right">Green Score</th>
                          <th className="pb-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {adminUsers.map(u => (
                          <tr key={u.id}>
                            <td className="py-3 capitalize font-semibold">{u.name}</td>
                            <td className="py-3 text-slate-500">{u.email}</td>
                            <td className="py-3 capitalize"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-400'}`}>{u.role}</span></td>
                            <td className="py-3 text-right font-mono font-bold text-emerald-500">{u.green_score}</td>
                            <td className="py-3 text-center">
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition"
                                title="Delete User"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* City wise analytics */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">City-wise Carbon Savings</h4>
                  {adminAnalytics && (
                    <div className="space-y-4">
                      {adminAnalytics.city_analytics.map(city => (
                        <div key={city.city} className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{city.city} ({city.users} users)</span>
                            <span className="text-emerald-500">{city.saved_co2.toFixed(1)} kg saved</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500"
                              style={{ width: `${Math.min(100, (city.saved_co2 / (adminAnalytics.total_carbon_saved || 1)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Reports generator panel */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="text-indigo-500" size={24} />
                    <div>
                      <h3 className="text-lg font-bold">Generate Platform Report</h3>
                      <p className="text-xs text-slate-500">Extract global carbon stats and user activity logs</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateReport} 
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                  >
                    Generate Global Report JSON
                  </button>
                </div>

                {adminReport && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Generated Summary Report:</span>
                    <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                      {JSON.stringify(adminReport, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
