import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, User } from "lucide-react";
import axios from "axios";

export default function Registration() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:8050/register",
        formData
      );
      console.log("Registration successful:", response.data);
      alert("Registration successful!");
      window.location.href = "/login";
    } catch (error) {
      // Check if the error response status is 409 (Conflict)
      if (error.response && error.response.status === 500) {
        alert("Email or username already exists. Please use a different one.");
      } else {
        console.error(
          "Registration failed:",
          error.response ? error.response.data : error.message
        );
        alert("Registration failed. Please try again.");
      }
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
          Register
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" size={20} />
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
            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
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
            Sign Up
          </button>
        </form>
        <p className="text-gray-400 text-center mt-4 text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-blue-400 hover:underline">
            Login
          </a>
        </p>
      </motion.div>
    </div>
  );
}
