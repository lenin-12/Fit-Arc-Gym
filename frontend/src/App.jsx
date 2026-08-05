import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import PrivateLayout from './layouts/PrivateLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Public Components & Pages
import Hero from './components/Hero/Hero';
import Programs from './components/Programs/Programs';
import Reasons from './components/Reasons/Reasons';
import Plans from './components/Plans/Plans';
import Testimonials from './components/Testimonials/Testimonials';
import Join from './components/Join/Join';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AboutPage from './pages/AboutPage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';

// Authenticated Dashboard Pages
import Overview from './components/dashboard/Overview';
import AICoachPage from './pages/AICoachPage';
import WorkoutPage from './pages/WorkoutPage';
import DietPage from './pages/DietPage';
import PlanPage from './pages/PlanPage';
import PaymentPage from './pages/PaymentPage';
import ProfilePage from './pages/ProfilePage';
// import ProgressPage from './pages/ProgressPage';

const LandingPage = () => {
  return (
    <div className="App">
      <Hero />
      <Programs />
      <Reasons />
      <Plans />
      <Testimonials />
      <Join />
    </div>
  );
};

function App() {
  return (
    <Routes>
      {/* 1. PUBLIC LAYOUT ROUTES */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* 2. PROTECTED PRIVATE LAYOUT ROUTES (JWT Verified) */}
      <Route
        element={
          <ProtectedRoute>
            <PrivateLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Overview />} />
        <Route path="/dashboard/ai-coach" element={<AICoachPage />} />
        <Route path="/dashboard/workout" element={<WorkoutPage />} />
        <Route path="/dashboard/diet" element={<DietPage />} />
        <Route path="/dashboard/plan" element={<PlanPage />} />
        <Route path="/dashboard/payment" element={<PaymentPage />} />
        <Route path="/dashboard/profile" element={<ProfilePage />} />
        {/* <Route path="/dashboard/progress" element={<ProgressPage />} /> */}

        {/* Shortcuts mapped cleanly inside PrivateLayout */}
        <Route path="/ai-coach" element={<AICoachPage />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/diet" element={<DietPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {/* <Route path="/progress" element={<ProgressPage />} /> */}
      </Route>

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
