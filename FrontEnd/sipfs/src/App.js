// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"; // Import Navigate
import { AuthProvider, useAuth } from "./context/AuthContext"; // Import AuthProvider
import DoPannel from "./pages/DoPannel";
import DrPannel from "./pages/DrPannel";
import AuthPage from "./pages/AuthPage";
import SignupPage from "./pages/SignupPage";


const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/DoPannel" element={<ProtectedRoute component={DoPannel} />} />
          <Route path="/DrPannel" element={<ProtectedRoute component={DrPannel} />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

const ProtectedRoute = ({ component: Component }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Component /> : <Navigate to="/" />;
};

export default App;
