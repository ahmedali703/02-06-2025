//app/request-verification/page.tsx
'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function RequestVerificationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Send request to resend verification email
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success("Verification email sent successfully!");
      } else {
        setError(data.error || 'Failed to send verification email');
        toast.error(`Error: ${data.error || 'Failed to send verification email'}`);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
      <div className="w-full max-w-lg">
        <div className="glass-card p-8 py-12">
          <div className="flex flex-col items-center text-center">
            {!success ? (
              <>
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-indigo-100 mb-6">
                  <Mail className="h-8 w-8 text-indigo-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  Request Verification Email
                </h1>
                
                <div className="my-6 w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                
                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4 w-full mb-6 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800 text-sm">
                      {error}
                    </p>
                  </div>
                )}
                
                <p className="text-gray-600 mb-8">
                  Enter your email address to request a new verification link. If you have an account with us, we'll send you an email with verification instructions.
                </p>
                
                <form onSubmit={handleSubmit} className="w-full">
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-1 text-left">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex-1 px-6 py-3 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 font-medium flex items-center justify-center ${
                        loading ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Verification <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 font-medium"
                      disabled={loading}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  Verification Email Sent!
                </h1>
                
                <div className="my-6 w-20 h-1 bg-gradient-to-r from-green-500 to-indigo-500 rounded-full"></div>
                
                <p className="text-gray-600 mb-8">
                  We've sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to verify your account.
                </p>
                
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 w-full mb-8">
                  <p className="text-indigo-800 text-sm">
                    <span className="font-semibold">Note:</span> If you don't see the email in your inbox, please check your spam folder. The email was sent from <span className="font-mono text-indigo-700">ai@apexexperts.net</span>
                  </p>
                </div>
                
                <button
                  onClick={handleBackToLogin}
                  className="w-full px-6 py-3 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 font-medium"
                >
                  Back to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}