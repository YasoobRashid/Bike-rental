import { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

import Login from './pages/Login';
import OwnerDashboard from './pages/OwnerDashboard';
import RenterDashboard from './pages/RenterDashboard';

const ProtectedRoute = ({ children, allowedRole }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div className="p-5 text-center">Loading...</div>;
    if (!user) return <Navigate to="/" />;
    if (allowedRole && user.role !== allowedRole) return <Navigate to="/" />;
    return children;
};

export default function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Login />} />
                
                <Route path="/owner" element={
                    <ProtectedRoute allowedRole="owner">
                        <OwnerDashboard />
                    </ProtectedRoute>
                } />
                
                <Route path="/renter" element={
                    <ProtectedRoute allowedRole="renter">
                        <RenterDashboard />
                    </ProtectedRoute>
                } />
            </Routes>
        </AuthProvider>
    );
}