import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FullscreenProvider } from "@/contexts/FullscreenContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthPage } from "@/pages/auth/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DailyWorkPage } from "@/pages/DailyWorkPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { TicketsPage } from "@/pages/TicketsPage";
import { QRScannerPage } from "@/pages/QRScannerPage";
import { ScannerPage } from "./pages/ScannerPage";
import { BatchManagementPage } from "./pages/BatchManagementPage";
import { PressingDisplayPage } from "./pages/PressingDisplayPage";
import { RoomsPage } from "@/pages/RoomsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import ContainersPage from "@/pages/ContainersPage";
import SessionsPage from "@/pages/SessionsPage";
import "./i18n";
import { OperatorScannerPage } from "@/pages/OperatorScannerPage";
import { EmployeeScannerPage } from "@/pages/EmployeeScannerPage";
import { BatchLoadingTestPage } from "@/pages/BatchLoadingTestPage";

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
        <FullscreenProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/" element={<DailyWorkPage />} />
                <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'operator']}><DashboardPage /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute roles={['admin', 'operator']}><ClientsPage /></ProtectedRoute>} />
                <Route path="/tickets" element={<ProtectedRoute roles={['admin', 'operator']}><TicketsPage /></ProtectedRoute>} />
                <Route path="/containers" element={<ProtectedRoute roles={['admin', 'operator']}><ContainersPage /></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute roles={['admin', 'operator']}><SessionsPage /></ProtectedRoute>} />
                {/* <Route path="/qr" element={<QRScannerPage />} /> */}
                <Route path="/scanner" element={<ScannerPage />} />
                <Route path="/operator-scanner" element={<ProtectedRoute roles={['operator']}><OperatorScannerPage /></ProtectedRoute>} />
                <Route path="/employee-scanner" element={<ProtectedRoute roles={['employee']}><EmployeeScannerPage /></ProtectedRoute>} />
                <Route path="/batch-management" element={<ProtectedRoute roles={['admin', 'operator', 'presser']}><BatchManagementPage /></ProtectedRoute>} />
                <Route path="/pressing-display" element={<PressingDisplayPage />} />
                <Route path="/rooms" element={<ProtectedRoute roles={['admin', 'operator']}><RoomsPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute roles={['admin', 'operator']}><HistoryPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
                <Route path="/batch-loading-test" element={<ProtectedRoute roles={['admin']}><BatchLoadingTestPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </FullscreenProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;