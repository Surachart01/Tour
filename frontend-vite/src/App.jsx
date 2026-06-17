import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import MainLayout from './components/MainLayout.jsx';
import Login from './pages/auth/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Import newly migrated pages
import Hotels from './pages/Hotels.jsx';
import Tours from './pages/Tours.jsx';
import Excursions from './pages/Excursions.jsx';
import Transfers from './pages/Transfers.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Agents from './pages/Agents.jsx';
import Users from './pages/Users.jsx';
import Markups from './pages/Markups.jsx';
import StopSales from './pages/StopSales.jsx';
import OtherCharges from './pages/OtherCharges.jsx';
import Tools from './pages/Tools.jsx';
import Activities from './pages/Activities.jsx';
import Quotation from './pages/Quotation.jsx';
import AddTrip from './pages/AddTrip.jsx';
import Bookings from './pages/Bookings.jsx';
import Payment from './pages/Payment.jsx';
import Itinerary from './pages/Itinerary.jsx';
import Analytics from './pages/Analytics.jsx';
import Profile from './pages/Profile.jsx';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
}

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0284c7', // Sky-600 Slate Blue
          borderRadius: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        components: {
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#f0f9ff',
            itemSelectedColor: '#0284c7',
            itemHoverBg: '#f8fafc',
          },
          Card: {
            boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
          }
        }
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="activities" element={<Activities />} />
              <Route path="agents" element={<Agents />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="excursions" element={<Excursions />} />
              <Route path="hotels" element={<Hotels />} />
              <Route path="markups" element={<Markups />} />
              <Route path="other-charges" element={<OtherCharges />} />
              <Route path="stop-sales" element={<StopSales />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="tools" element={<Tools />} />
              <Route path="tours" element={<Tours />} />
              <Route path="transfers" element={<Transfers />} />
              <Route path="users" element={<Users />} />
              <Route path="quotation" element={<Quotation />} />
              <Route path="quotation/add" element={<AddTrip />} />
              <Route path="payment" element={<Payment />} />
              <Route path="itinerary" element={<Itinerary />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;

