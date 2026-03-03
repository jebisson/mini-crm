import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ContactsPage from "./pages/ContactsPage";
import TasksPage from "./pages/TasksPage";
import NotesPage from "./pages/NotesPage";
import PipelinePage from "./pages/PipelinePage";
import AdminPage from "./pages/AdminPage";

function ProtectedRoute({ children }) {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <UserProfileProvider>
              <Layout />
            </UserProfileProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="contacts"  element={<ContactsPage />} />
        <Route path="tasks"     element={<TasksPage />} />
        <Route path="notes"     element={<NotesPage />} />
        <Route path="pipeline"  element={<PipelinePage />} />
        <Route path="admin"     element={<AdminPage />} />
      </Route>
    </Routes>
  );
}
