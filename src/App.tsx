import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AvailablePrintersPage } from './pages/AvailablePrintersPage';
import { NewRequestPage } from './pages/NewRequestPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { StudentRequestDetailsPage } from './pages/StudentRequestDetailsPage';
import { ProfessorDashboardPage } from './pages/ProfessorDashboardPage';
import { ProfessorReviewPage } from './pages/ProfessorReviewPage';
import { PcAdminDashboardPage } from './pages/PcAdminDashboardPage';
import { PcFinalApprovalPage } from './pages/PcFinalApprovalPage';
import { PcLogPage } from './pages/PcLogPage';
import { PrinterAccessPage } from './pages/PrinterAccessPage';
import {
  MaterialsPage,
  GuidelinesPage,
  HelpPage,
} from './pages/SupportInfoPages';

const ShellRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell>{children}</AppShell>
);

export const App: React.FC = () => {
  return (
    <AppProvider>
      <Routes>
        {/* Root redirects to Login or Student Dashboard */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Screen 1 — Login Page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Screen 2 — Student Dashboard */}
        <Route
          path="/student/dashboard"
          element={
            <ShellRoute>
              <StudentDashboardPage />
            </ShellRoute>
          }
        />

        {/* Screen 3 — Available Printers */}
        <Route
          path="/student/printers"
          element={
            <ShellRoute>
              <AvailablePrintersPage />
            </ShellRoute>
          }
        />

        {/* Screen 4 — New Printer Request Form */}
        <Route
          path="/student/requests/new"
          element={
            <ShellRoute>
              <NewRequestPage />
            </ShellRoute>
          }
        />

        {/* Screen 5 — My Requests */}
        <Route
          path="/student/requests"
          element={
            <ShellRoute>
              <MyRequestsPage />
            </ShellRoute>
          }
        />

        {/* Screen 6 — Student Request Details */}
        <Route
          path="/student/requests/:id"
          element={
            <ShellRoute>
              <StudentRequestDetailsPage />
            </ShellRoute>
          }
        />

        {/* Screen 7 — Professor Dashboard */}
        <Route
          path="/professor/dashboard"
          element={
            <ShellRoute>
              <ProfessorDashboardPage />
            </ShellRoute>
          }
        />

        {/* Screen 8 — Professor Review */}
        <Route
          path="/professor/requests/:id/review"
          element={
            <ShellRoute>
              <ProfessorReviewPage />
            </ShellRoute>
          }
        />

        {/* Screen 9 — PC Administrator Dashboard */}
        <Route
          path="/pc/dashboard"
          element={
            <ShellRoute>
              <PcAdminDashboardPage />
            </ShellRoute>
          }
        />

        {/* Screen 10 — PC Final Approval */}
        <Route
          path="/pc/requests/:id/review"
          element={
            <ShellRoute>
              <PcFinalApprovalPage />
            </ShellRoute>
          }
        />

        {/* Screen 11 — PC Log */}
        <Route
          path="/pc/log"
          element={
            <ShellRoute>
              <PcLogPage />
            </ShellRoute>
          }
        />

        {/* Screen 12 — Printer Access */}
        <Route
          path="/student/access/:id"
          element={
            <ShellRoute>
              <PrinterAccessPage />
            </ShellRoute>
          }
        />

        {/* Supporting Student Navigation Routes */}
        <Route
          path="/student/materials"
          element={
            <ShellRoute>
              <MaterialsPage />
            </ShellRoute>
          }
        />
        <Route
          path="/student/guidelines"
          element={
            <ShellRoute>
              <GuidelinesPage />
            </ShellRoute>
          }
        />
        <Route
          path="/student/help"
          element={
            <ShellRoute>
              <HelpPage />
            </ShellRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppProvider>
  );
};

export default App;
