import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaUserTag, FaLock } from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const AuthPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); 
  const [role, setRole] = useState("Data Owner");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // const certificate = localStorage.getItem("certificate");

    try {
      const response = await axios.post("http://localhost:4000/login", {
        username,
        password,
        role,
        // certificate,
      });

      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        login(role);
        if (role === "Data Owner") {
          navigate("/DoPannel");
        } else if (role === "Data Requester") {
          navigate("/DrPannel");
        }
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error(error);
      if (error.response) {
        setError(error.response.data.message || "Login failed. Please try again.");
      } else {
        setError("Login failed. Please check your network connection.");
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-xy bg-size-400%">
      <div className="relative bg-white p-10 rounded-3xl shadow-xl w-full max-w-lg transform transition-all duration-300 hover:scale-105">
        <h2 className="text-4xl font-extrabold text-center mb-8 text-gray-800">
          Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex items-center border-b border-gray-300 py-3">
            <FaUser className="text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-lg"
              required
            />
          </div>


          <div className="flex items-center border-b border-gray-300 py-3">
            <FaLock className="text-gray-400 mr-3" />
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-lg"
              required
            />
          </div>

          <div className="flex items-center border-b border-gray-300 py-3">
            <FaUserTag className="text-gray-400 mr-3" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 text-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-lg"
            >
              <option value="Data Owner">Data Owner</option>
              <option value="Data Requester">Data Requester</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-pink-700 transition duration-300 transform hover:scale-105"
          >
            Log In
          </button>
        </form>

        <div className="text-right mt-6">
          <button
            className="text-indigo-600 hover:underline transition-all duration-200"
            onClick={() => navigate("/signup")}
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
