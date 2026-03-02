import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "next-themes";

// Pages
import Login from "./pages/Login";
import VecinoHome from "./pages/vecino/Home";
import VecinoCalendar from "./pages/vecino/Calendar";
import VecinoMeetings from "./pages/vecino/Meetings";
import VecinoEvents from "./pages/vecino/Events";
import VecinoProfile from "./pages/vecino/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminMeetings from "./pages/admin/Meetings";
import AdminEvents from "./pages/admin/Events";
import AdminHouses from "./pages/admin/Houses";
import AdminUsers from "./pages/admin/Users";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  return <VecinoHome />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Vecino Routes */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/calendario" element={<ProtectedRoute allowedRoles={['VECINO']}><VecinoCalendar /></ProtectedRoute>} />
            <Route path="/reuniones" element={<ProtectedRoute allowedRoles={['VECINO']}><VecinoMeetings /></ProtectedRoute>} />
            <Route path="/eventos" element={<ProtectedRoute allowedRoles={['VECINO']}><VecinoEvents /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute allowedRoles={['VECINO']}><VecinoProfile /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/reuniones" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminMeetings /></ProtectedRoute>} />
            <Route path="/admin/eventos" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminEvents /></ProtectedRoute>} />
            <Route path="/admin/casas" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminHouses /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminUsers /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
