import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Materiales } from "./pages/Materiales";
import { Orders } from "./pages/Orders";
import { Obras } from "./pages/Obras";
import { Proyectos } from "./pages/Proyectos";
import { Proveedores } from "./pages/Proveedores";
import { Contratistas } from "./pages/Contratistas";
import { Terceros } from "./pages/Terceros";
import { Historial } from "./pages/Historial";
import { Users } from "./pages/Users";

// Cargado bajo demanda: exceljs y jspdf son pesados y solo se necesitan en /reportes y /financiero.
const Reports = lazy(() => import("./pages/Reports").then((module) => ({ default: module.Reports })));
const Financiero = lazy(() => import("./pages/Financiero").then((module) => ({ default: module.Financiero })));

const ADMIN_CONTABILIDAD = ["ADMIN", "CONTABILIDAD"] as const;

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
        path="/proyectos"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Proyectos />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/proyectos/:proyectoId/obras"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Obras />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/terceros"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Terceros />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/proveedores"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Proveedores />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratistas"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Contratistas />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/materiales"
        element={
          <ProtectedRoute allowedRoles={["OBRA"]}>
            <AppLayout>
              <Materiales />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventario"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Inventory />
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
        path="/historial"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Historial />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Suspense fallback={<RouteFallback />}>
                <Reports />
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financiero"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_CONTABILIDAD]}>
            <AppLayout>
              <Suspense fallback={<RouteFallback />}>
                <Financiero />
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
