//app/verification-sent/page.tsx
'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle } from "lucide-react";

export default function VerificationSentPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern dark:bg-gray-900">
      <div className="w-full max-w-lg">
        <div className="glass-card p-8 py-12 dark:bg-gray-800/90 dark:border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 mb-6">
              <Mail className="h-8 w-8 text-indigo-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Verification Email Sent
            </h1>
            
            <div className="my-6 w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
            </p>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg p-4 w-full mb-8">
              <p className="text-indigo-800 dark:text-indigo-300 text-sm">
                <span className="font-semibold">Note:</span> If you don't see the email in your inbox, please check your spam folder. The email was sent from <span className="font-mono text-indigo-700 dark:text-indigo-400">ai@apexexperts.net</span>
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}