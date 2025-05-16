import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUser, FaUserTag, FaShieldAlt, FaBriefcase, FaLock, FaCodeBranch, FaHeart } from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import { Link } from "react-router-dom";

const SignupPage = () => {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("Data Owner");
  const [interest, setInterest] = useState([]);
  const [requestRole, setRequestRole] = useState("Developer_user");
  const [expertise, setExpertise] = useState("No Expertise");
  const [password, setPassword] = useState("");
  const [languages, setLanguages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const policySet = { requestRole, interest, expertise, languages }; 
      const response = await axios.post("http://localhost:4000/users", { username, role, policySet, password });
      navigate("/");
    } catch (error) {
      console.error("Signup error:", error);
      setError(error.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInterestChange = (e) => {
    const value = e.target.value;
    setInterest((prevInterest) =>
      prevInterest.includes(value)
        ? prevInterest.filter((item) => item !== value)
        : [...prevInterest, value]
    );
  };

  const handleLanguageChange = (e) => {
    const value = e.target.value;
    setLanguages((prevLanguages) =>
      prevLanguages.includes(value)
        ? prevLanguages.filter((item) => item !== value)
        : [...prevLanguages, value]
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-400 to-blue-500 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg ">
        <h2 className="text-4xl font-bold text-center mb-8 text-gray-800">Create an Account</h2>

        {error && <p className="text-red-500 text-center mb-6">{error}</p>}

        <form onSubmit={handleSignup} className="space-y-8">
          <div className="flex items-center border-b-2 border-gray-200 py-2">
            <FaUser className="text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 text-gray-700 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center border-b-2 border-gray-200 py-2">
            <FaUserTag className="text-gray-400 mr-3" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 text-gray-700 bg-transparent focus:outline-none"
            >
              <option value="Data Owner">Owner</option>
              <option value="Data Requester">Requester</option>
            </select>
          </div>

          {role === "Data Requester" && (
            <>
              <div className="flex items-center border-b-2 border-gray-200 py-2">
                <FaCodeBranch className="text-gray-400 mr-3" />
                <select
                  value={requestRole}
                  onChange={(e) => setRequestRole(e.target.value)}
                  className="w-full px-4 py-2 text-gray-700 bg-transparent focus:outline-none"
                >
                  <option value="Developer_user">Developer</option>
                </select>
              </div>

              <div className="py-2">
                <div className="flex mr-2">
                  <FaHeart className="text-gray-400 mr-3 mt-1" />
                  <div className="font-semibold text-gray-700 mb-4"> Select your areas of interest:</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                    <input
                      type="checkbox"
                      value="Web Design"
                      checked={interest.includes("Web Design")}
                      onChange={handleInterestChange}
                      className="mr-3"
                    />
                    <span className="font-medium">Web Design</span>
                  </label>
                  <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                    <input
                      type="checkbox"
                      value="Windows Development"
                      checked={interest.includes("Windows Development")}
                      onChange={handleInterestChange}
                      className="mr-3"
                    />
                    <span className="font-medium">Windows Development</span>
                  </label>
                  <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                    <input
                      type="checkbox"
                      value="Mobile Apps"
                      checked={interest.includes("Mobile Apps")}
                      onChange={handleInterestChange}
                      className="mr-3"
                    />
                    <span className="font-medium">Mobile Apps</span>
                  </label>
                  <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                    <input
                      type="checkbox"
                      value="AI and Machine Learning"
                      checked={interest.includes("AI and Machine Learning")}
                      onChange={handleInterestChange}
                      className="mr-3"
                    />
                    <span className="font-medium">AI and Machine Learning</span>
                  </label>
                  <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                    <input
                      type="checkbox"
                      value="Cybersecurity"
                      checked={interest.includes("Cybersecurity")}
                      onChange={handleInterestChange}
                      className="mr-3"
                    />
                    <span className="font-medium">Cybersecurity</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {role === "Data Requester" && requestRole === "Developer_user" && (
            <div className="py-2">
              <div className="flex mr-2">
                <FaHeart className="text-gray-400 mr-3 mt-1" />
                <div className="font-semibold text-gray-700 mb-4">Select programming languages you know:</div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                  <input
                    type="checkbox"
                    value="Java"
                    checked={languages.includes("Java")}
                    onChange={handleLanguageChange}
                    className="mr-3"
                  />
                  <span className="font-medium">Java</span>
                </label>
                <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                  <input
                    type="checkbox"
                    value="Python"
                    checked={languages.includes("Python")}
                    onChange={handleLanguageChange}
                    className="mr-3"
                  />
                  <span className="font-medium">Python</span>
                </label>
                <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                  <input
                    type="checkbox"
                    value="JavaScript"
                    checked={languages.includes("JavaScript")}
                    onChange={handleLanguageChange}
                    className="mr-3"
                  />
                  <span className="font-medium">JavaScript</span>
                </label>
                <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                  <input
                    type="checkbox"
                    value="C++"
                    checked={languages.includes("C++")}
                    onChange={handleLanguageChange}
                    className="mr-3"
                  />
                  <span className="font-medium">C++</span>
                </label>
                <label className="flex items-center text-gray-700 bg-gray-100 p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out">
                  <input
                    type="checkbox"
                    value="Ruby"
                    checked={languages.includes("Ruby")}
                    onChange={handleLanguageChange}
                    className="mr-3"
                  />
                  <span className="font-medium">Ruby</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center border-b-2 border-gray-200 py-2">
            <FaLock className="text-gray-400 mr-3" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 text-gray-700 focus:outline-none"
              required
            />
          </div>

          <div className="text-center">
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out"
              disabled={loading}
            >
              {loading ? <ClipLoader size={20} color="#fff" /> : "Sign Up"}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/" 
              className="text-blue-500 hover:underline font-medium"
            >
              Log in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default SignupPage;
