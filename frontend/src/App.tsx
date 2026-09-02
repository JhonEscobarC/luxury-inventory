import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Orders } from "./pages/Orders";
import { WhatsApp } from "./pages/WhatsApp";
import { Users } from "./pages/Users";

// Cargado bajo demanda: exceljs y jspdf son pesados y solo se necesitan en /reportes.
const Reports = lazy(() => import("./pages/Reports").then((module) => ({ default: module.Reports })));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="font-label-sm uppercase tracking-widest text-on-surface-variant">Cargando...</span>
    </div>
  );
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventario"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Inventory />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Orders />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <AppLayout>
              <WhatsApp />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AppLayout>
              <Users />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<RouteFallback />}>
                <Reports />
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
