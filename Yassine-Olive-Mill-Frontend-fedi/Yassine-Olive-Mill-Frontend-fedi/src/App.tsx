import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthPage } from "@/pages/auth/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { TicketsPage } from "@/pages/TicketsPage";
import { QRScannerPage } from "@/pages/QRScannerPage";
import { RoomsPage } from "@/pages/RoomsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import ContainersPage from "@/pages/ContainersPage";
import SessionsPage from "@/pages/SessionsPage";
import "./i18n";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    console.log("App component mounted");
    // Initialize RTL support
    const savedLang = localStorage.getItem('olive-mill-language') || 'ar';
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;
    console.log("RTL support initialized, language:", savedLang);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/clients" element={<ProtectedRoute roles={['admin', 'operator']}><ClientsPage /></ProtectedRoute>} />
                <Route path="/tickets" element={<ProtectedRoute roles={['admin', 'operator']}><TicketsPage /></ProtectedRoute>} />
                <Route path="/containers" element={<ProtectedRoute roles={['admin', 'operator']}><ContainersPage /></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute roles={['admin', 'operator']}><SessionsPage /></ProtectedRoute>} />
                <Route path="/qr" element={<QRScannerPage />} />
                <Route path="/rooms" element={<ProtectedRoute roles={['admin', 'operator']}><RoomsPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute roles={['admin', 'operator']}><HistoryPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;