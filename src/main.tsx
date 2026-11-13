import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import "./wallet/appkit";
import Profile from "./pages/Profile";
import Docs from "./pages/Docs";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Discover from "./pages/Discover";
import PoolDetails from "./pages/PoolDetails";
import LiquidityStudio from "./pages/LiquidityStudio";
import Analytics from "./pages/Analytics";
// Loaded on demand so the database client is not part of the public site bundle.
const Admin = lazy(() => import("./pages/Admin"));

// The hosted artifact build cannot use real URL paths, so it keeps the route in memory.
const Router = import.meta.env.VITE_ARTIFACT ? MemoryRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route index element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="discover" element={<Discover />} />
          <Route path="pool/:id" element={<PoolDetails />} />
          <Route path="studio" element={<LiquidityStudio />} />
          <Route path="positions" element={<Navigate to="/profile" replace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
          <Route path="docs" element={<Docs />} />
          <Route path="docs/:slug" element={<Docs />} />
        </Route>
      </Routes>
    </Router>
  </StrictMode>,
);
