//app/set-password/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Loading state component
function LoadingState() {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="h-16 w-16 flex items-center justify-center rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-6"></div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Loading...
      </h1>
      <p className="text-muted-foreground">Please wait while we prepare your password setup.</p>
    </div>
  );
}

// Content component that uses useSearchParams
function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "Very Weak",
    color: "bg-red-500"
  });

  // Check password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength({
        score: 0,
        label: "Very Weak",
        color: "bg-red-500"
      });
      return;
    }

    // Simple password strength check
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1; // Uppercase
    if (/[a-z]/.test(password)) score += 1; // Lowercase
    if (/[0-9]/.test(password)) score += 1; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Special characters
    
    // Map score to strength label and color
    const strengthMap = [
      { score: 0, label: "Very Weak", color: "bg-red-500" },
      { score: 2, label: "Weak", color: "bg-orange-500" },
      { score: 4, label: "Medium", color: "bg-yellow-500" },
      { score: 5, label: "Strong", color: "bg-green-500" },
      { score: 6, label: "Very Strong", color: "bg-green-600" }
    ];
    
    // Find the appropriate strength level
    const strength = strengthMap.findLast(s => score >= s.score) || strengthMap[0];
    
    setPasswordStrength({
      score: score,
      label: strength.label,
      color: strength.color
    });
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);
    
    // Form validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (passwordStrength.score < 4) {
      setError("Please choose a stronger password");
      return;
    }
    
    setLoading(true);
    
    try {
      // Call the API to set the new password
      const response = await fetch('/api/auth/set-initial-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          password 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("Password set successfully!");
        // Redirect to dashboard after successful password set
        router.push('/dashboard');
      } else {
        setError(data.error || "Failed to set password");
        toast.error(data.error || "Failed to set password");
      }
    } catch (error) {
      setError("An error occurred while processing your request");
      toast.error("An error occurred while processing your request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="h-16 w-16 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/30 mb-6">
        <Lock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Set Your Password
      </h1>
      
      <div className="my-6 w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
      
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 w-full mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-destructive text-sm">
            {error}
          </p>
        </div>
      )}
      
      <p className="text-muted-foreground mb-8">
        Please set a strong password for your account. Your password should be at least 8 characters long and include a mix of uppercase letters, lowercase letters, numbers, and special characters.
      </p>
      
      <form onSubmit={handleSubmit} className="w-full">
        {/* Password Field */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1 text-left text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-input bg-background text-foreground focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          
          {/* Password Strength Meter */}
          <div className="mt-2">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${passwordStrength.color}`} 
                style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">Weak</span>
              <span className="text-xs font-medium text-foreground">{passwordStrength.label}</span>
              <span className="text-xs text-muted-foreground">Strong</span>
            </div>
          </div>
          
          {/* Password Requirements */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center">
              <CheckCircle2 className={`h-4 w-4 mr-1 ${password.length >= 8 ? 'text-green-500' : 'text-muted/40'}`} />
              <span className="text-xs text-muted-foreground">At least 8 characters</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className={`h-4 w-4 mr-1 ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-muted/40'}`} />
              <span className="text-xs text-muted-foreground">Uppercase letter</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className={`h-4 w-4 mr-1 ${/[a-z]/.test(password) ? 'text-green-500' : 'text-muted/40'}`} />
              <span className="text-xs text-muted-foreground">Lowercase letter</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className={`h-4 w-4 mr-1 ${/[0-9]/.test(password) ? 'text-green-500' : 'text-muted/40'}`} />
              <span className="text-xs text-muted-foreground">Number</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className={`h-4 w-4 mr-1 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-500' : 'text-muted/40'}`} />
              <span className="text-xs text-muted-foreground">Special character</span>
            </div>
          </div>
        </div>
        
        {/* Confirm Password Field */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-1 text-left text-foreground">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-input bg-background text-foreground focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="Enter password again"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {password && confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-sm text-destructive">Passwords don't match</p>
          )}
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full px-6 py-3 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 font-medium flex items-center justify-center ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// Main page with Suspense wrapper
export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
      <div className="w-full max-w-lg">
        <div className="glass-card p-8 py-12">
          <Suspense fallback={<LoadingState />}>
            <SetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
