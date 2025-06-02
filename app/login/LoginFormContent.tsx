'use client';

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Cpu } from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function LoginFormContent({ isRegister = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';
  const { setUserId, userId } = useUser();
  
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: isRegister ? "" : undefined,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [passwordsMatch, setPasswordsMatch] = React.useState(true);

  // Check if user is already logged in
  useEffect(() => {
      if (userId) {
        router.push('/dashboard');
      }
  }, [router, userId]);
  
  // Check if passwords match when either password or confirm password changes
  useEffect(() => {
    if (isRegister && formData.password && formData.confirmPassword) {
      setPasswordsMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordsMatch(true); // Reset to true when fields are empty
    }
  }, [formData.password, formData.confirmPassword, isRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match for registration
    if (isRegister && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name
        }),
        credentials: 'include', // Important: include credentials to receive cookies
      });
  
      const data = await response.json();
  
      if (response.ok) {
        if (isRegister) {
          router.push("/verification-sent");
        } else {
          // Store user data in context for client-side access
          if (data.userId) {
            setUserId(data.userId);
            localStorage.setItem('userId', data.userId.toString());
                     
          }
          
          // Redirect to the original page the user was trying to access,
          // or to dashboard if they went directly to login
          router.push(from);
        }
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError("Failed to connect to server");
    }
  
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="glass-card p-8">
        <div className="flex justify-center mb-8">
          <Cpu className="w-12 h-12 text-indigo-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-2">
          {isRegister ? "Create Account" : "Welcome Back"}
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 text-center mb-8">
          {isRegister 
            ? "Sign up to continue your AI-powered experience" 
            : "Sign in to continue your AI-powered experience"}
        </p>

        {/* Display redirect message if coming from a protected page */}
        {!isRegister && from !== '/dashboard' && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <p className="text-blue-800 dark:text-blue-300 text-sm">Please log in to access the requested page</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-lg px-4 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="Enter your name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-lg px-4 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-lg px-4 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm mb-2">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border ${
                  !passwordsMatch && formData.confirmPassword ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'
                } rounded-lg px-4 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
                placeholder="Confirm your password"
                required
              />
              {!passwordsMatch && formData.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isRegister && !passwordsMatch)}
            className="btn-primary w-full h-12 relative overflow-hidden font-mono text-sm sm:text-base px-6 py-3 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Please wait...
              </div>
            ) : (
              isRegister ? "Sign Up" : "Sign In"
            )}
          </button>

          <p className="text-center text-gray-600 dark:text-gray-300">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}