//app/verify/page.tsx
'use client';

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Loading state component
function LoadingState() {
  return (
    <>
      <div className="h-16 w-16 flex items-center justify-center rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-6"></div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Verifying Your Account
      </h1>
      <p className="text-muted-foreground">Please wait while we verify your email address...</p>
    </>
  );
}

// Main component that uses useSearchParams
function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [verificationStatus, setVerificationStatus] = React.useState('loading');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [userId, setUserId] = React.useState<number | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerificationStatus('error');
        setErrorMessage('Verification token is missing');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationStatus('success');
          // Save the user ID if returned from the API
          if (data.userId) {
            setUserId(data.userId);
          }
        } else {
          setVerificationStatus('error');
          setErrorMessage(data.error || 'Failed to verify email');
        }
      } catch (error) {
        setVerificationStatus('error');
        setErrorMessage('An error occurred during verification');
      }
    };

    verifyToken();
  }, [token]);

  const handleContinue = () => {
    // Redirect to set-password page with the userId parameter
    if (userId) {
      router.push(`/set-password?userId=${userId}`);
    } else {
      router.push('/set-password');
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const handleRequestNewVerification = () => {
    router.push('/request-verification');
  };

  return (
    <div className="flex flex-col items-center text-center">
      {verificationStatus === 'loading' && (
        <LoadingState />
      )}

      {verificationStatus === 'success' && (
        <>
          <div className="h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Email Verified Successfully!
          </h1>
          
          <div className="my-6 w-20 h-1 bg-gradient-to-r from-green-500 to-indigo-500 rounded-full"></div>
          
          <p className="text-muted-foreground mb-8">
            Your account has been successfully verified. Next, you need to set a password for your account to complete the setup process.
          </p>
          
          <button
            onClick={handleContinue}
            className="w-full px-6 py-3 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 font-medium flex items-center justify-center"
          >
            Set Your Password <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </>
      )}

      {verificationStatus === 'error' && (
        <>
          <div className="h-16 w-16 flex items-center justify-center rounded-full bg-red-100 mb-6">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Verification Failed
          </h1>
          
          <div className="my-6 w-20 h-1 bg-red-500 rounded-full"></div>
          
          <p className="text-muted-foreground mb-4">
            {errorMessage || "We couldn't verify your email address. The verification link may have expired or is invalid."}
          </p>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 w-full mb-8">
            <p className="text-destructive text-sm">
              If you believe this is an error, please try logging in or contact your administrator.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              onClick={handleBackToLogin}
              className="flex-1 px-6 py-3 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 font-medium"
            >
              Back to Login
            </button>
            
            <button
              onClick={handleRequestNewVerification}
              className="flex-1 px-6 py-3 rounded-xl border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-all duration-300 font-medium flex items-center justify-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Request New Link
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Main page with Suspense wrapper
export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
      <div className="w-full max-w-lg">
        <div className="glass-card p-8 py-12">
          <Suspense fallback={
            <div className="flex flex-col items-center text-center">
              <LoadingState />
            </div>
          }>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}