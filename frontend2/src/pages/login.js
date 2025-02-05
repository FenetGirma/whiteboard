import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import axios from "axios";

export default function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const parseJwt = (token) => {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:8050/login",
        formData
      );
      console.log("Login successful:", response.data);

      const { token } = response.data;

      // Parse the username from the token
      const decodedToken = parseJwt(token);
      const username = decodedToken.username; // Adjust the key as per your token structure

      // Save token and username to local storage
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      const name = localStorage.getItem(username);
      console.log(name);

      window.location.href = "/whiteboard";
      // You can add logic to store the token or redirect the user
    } catch (error) {
      console.error(
        "Login failed:",
        error.response ? error.response.data : error.message
      );
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800 p-8 rounded-2xl shadow-xl w-96"
      >
        <h2 className="text-white text-3xl font-semibold text-center mb-6">
          Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 transition-all p-3 rounded-lg text-white font-semibold"
          >
            Login
          </button>
        </form>
        <p className="text-gray-400 text-center mt-4 text-sm">
          Don't have an account?{" "}
          <a href="/" className="text-blue-400 hover:underline">
            Register
          </a>
        </p>
      </motion.div>
    </div>
  );
}
