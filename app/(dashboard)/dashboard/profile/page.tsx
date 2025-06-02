'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Building, 
  Briefcase, 
  Calendar, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Key,
  EyeIcon,
  EyeOffIcon,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// User profile interface
interface UserProfile {
  ID: number;
  NAME: string;
  EMAIL: string;
  ROLE?: string;
  EXPERIENCE_LEVEL?: string;
  CREATED_AT?: string;
  UPDATED_AT?: string;
  HAS_COMPLETED_ONBOARDING?: string;
  NOTIFICATIONS_ENABLED?: string;
  organization?: {
    ORG_ID: number;
    ORG_NAME: string;
    ORG_STATUS: string;
    DATABASE_TYPE: string;
    CREATED_AT: string;
  };
}

// Interface for password change
interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfilePage() {
  // State variables
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editableProfile, setEditableProfile] = useState<Partial<UserProfile>>({});
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications'>('general');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [showPasswords, setShowPasswords] = useState<{current: boolean; new: boolean; confirm: boolean}>({
    current: false,
    new: false,
    confirm: false
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/user/me', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const userData = await response.json();
        setUserProfile(userData);
        setEditableProfile({
          NAME: userData.NAME,
          EMAIL: userData.EMAIL,
          ROLE: userData.ROLE,
          EXPERIENCE_LEVEL: userData.EXPERIENCE_LEVEL,
          NOTIFICATIONS_ENABLED: userData.NOTIFICATIONS_ENABLED
        });
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);

  // Handle input change for profile data
  const handleInputChange = (field: string, value: string) => {
    setEditableProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle changes to password fields
  const handlePasswordChange = (field: keyof PasswordChange, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear password error when typing
    if (passwordError) {
      setPasswordError(null);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Handle save profile
  const saveProfile = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableProfile),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const updatedData = await response.json();
      
      // Update the profile data with the response
      setUserProfile(prev => prev ? { ...prev, ...updatedData } : updatedData);
      setSuccessMessage('Profile updated successfully');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const changePassword = async () => {
    try {
      // Basic validation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New password and confirmation do not match');
        return;
      }
      
      if (passwordData.newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        return;
      }
      
      setIsChangingPassword(true);
      setPasswordError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }
      
      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setSuccessMessage('Password changed successfully');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Toggle notifications
  const toggleNotifications = async () => {
    try {
      const newValue = editableProfile.NOTIFICATIONS_ENABLED === 'Y' ? 'N' : 'Y';
      
      setEditableProfile(prev => ({
        ...prev,
        NOTIFICATIONS_ENABLED: newValue
      }));
      
      // Save the change immediately
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ NOTIFICATIONS_ENABLED: newValue }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Revert the change on error
        setEditableProfile(prev => ({
          ...prev,
          NOTIFICATIONS_ENABLED: prev.NOTIFICATIONS_ENABLED === 'Y' ? 'Y' : 'N'
        }));
        throw new Error('Failed to update notifications setting');
      }
      
      // Update userProfile state
      setUserProfile(prev => prev ? {
        ...prev,
        NOTIFICATIONS_ENABLED: newValue
      } : null);
      
      setSuccessMessage('Notification preferences updated');
      
      // Auto-hide success message
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error toggling notifications:', err);
      setError('Failed to update notification preferences');
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-300 dark:bg-gray-800"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#6c5ce7] dark:text-indigo-400 mb-1">User Profile</h1>
              <p className="text-gray-500 dark:text-gray-400">
                View and manage your account settings
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'general' 
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <User className="h-4 w-4" />
              <span>General</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'security' 
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Key className="h-4 w-4" />
              <span>Security</span>
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'notifications' 
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Notifications</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3"
        >
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-green-800 dark:text-green-300 font-medium">Success</p>
            <p className="text-green-600 dark:text-green-400 text-sm mt-1">{successMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            {/* Profile Information Card */}
            <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Profile Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                    <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                    <input
                      type="text"
                      value={editableProfile.NAME || ''}
                      onChange={(e) => handleInputChange('NAME', e.target.value)}
                      className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800"
                      placeholder="Your name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                    <input
                      type="email"
                      value={editableProfile.EMAIL || ''}
                      onChange={(e) => handleInputChange('EMAIL', e.target.value)}
                      className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800"
                      placeholder="Your email"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                    <Briefcase className="h-5 w-5 text-gray-400 mr-2" />
                    <select
                      value={editableProfile.ROLE || ''}
                      onChange={(e) => handleInputChange('ROLE', e.target.value)}
                      className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800"
                    >
                      <option value="">Select a role</option>
                      <option value="ADMIN">Administrator</option>
                      <option value="MANAGER">Manager</option>
                      <option value="USER">Regular User</option>
                      <option value="ANALYST">Data Analyst</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Experience Level
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                    <Briefcase className="h-5 w-5 text-gray-400 mr-2" />
                    <select
                      value={editableProfile.EXPERIENCE_LEVEL || ''}
                      onChange={(e) => handleInputChange('EXPERIENCE_LEVEL', e.target.value)}
                      className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800"
                    >
                      <option value="">Select experience level</option>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="EXPERT">Expert</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Organization Information Card */}
            <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Organization</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-lg font-medium text-gray-800 dark:text-gray-100">
                    {userProfile?.organization?.ORG_NAME || 'No Organization'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Organization Status</p>
                    <p className="text-base text-gray-800 dark:text-gray-200">
                      {userProfile?.organization?.ORG_STATUS === 'Y' ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Database Type</p>
                    <p className="text-base text-gray-800 dark:text-gray-200">
                      {userProfile?.organization?.DATABASE_TYPE || 'Not set'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Created On</p>
                    <p className="text-base text-gray-800 dark:text-gray-200">
                      {formatDate(userProfile?.organization?.CREATED_AT)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                    <p className="text-base text-gray-800 dark:text-gray-200">
                      {formatDate(userProfile?.CREATED_AT)}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Link
                    href="/dashboard/organization"
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Building className="h-4 w-4" />
                    <span>Manage Organization</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* Change Password Card */}
            <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Change Password</h2>
              
              {/* Password Error Message */}
              {passwordError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-600 dark:text-red-400 text-sm">{passwordError}</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.current ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.new ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Password must be at least 8 characters long.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.confirm ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={changePassword}
                  disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                    isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500'
                  }`}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Changing...</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      <span>Change Password</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Account Information Card */}
            <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Account Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">Account Created</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(userProfile?.CREATED_AT)}</p>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">Last Updated</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(userProfile?.UPDATED_AT)}</p>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">Account Verification</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {userProfile?.HAS_COMPLETED_ONBOARDING === 'Y' ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {userProfile?.HAS_COMPLETED_ONBOARDING === 'Y' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-8">
            {/* Email Notifications Card */}
            <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Email Notifications</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">Enable Email Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive email updates about your account activity.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editableProfile.NOTIFICATIONS_ENABLED === 'Y'}
                      onChange={toggleNotifications}
                      className="sr-only peer"
                    />
                    <div className="h-6 w-10 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500 italic">
                    Note: You will still receive essential emails like password resets and security notifications regardless of this setting.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Notification Preferences Card */}
            <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Notification Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">Query Results</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when your queries are processed.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="h-6 w-10 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">Usage Alerts</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts when your query usage is high.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="h-6 w-10 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">Organization Updates</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get updates about your organization.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="h-6 w-10 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">Marketing Communications</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get latest product updates and offers.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="h-6 w-10 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Preferences</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}