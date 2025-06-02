// components/AddMemberPage.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Shield, Lock, CheckCircle2, Crown, ArrowLeft, Sparkles, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface AddMemberForm {
  name: string;
  email: string;
  password: string;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  experienceLevel: '' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  interests: string;
  notificationsEnabled: boolean;
}

export default function AddMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<AddMemberForm>({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    experienceLevel: '',
    interests: '',
    notificationsEnabled: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const generatePassword = () => {
    // Generate a secure password with 12 characters
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    setFormData(prev => ({ ...prev, password }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/organization/members/add', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          experienceLevel: formData.experienceLevel,
          interests: formData.interests,
          notificationsEnabled: formData.notificationsEnabled
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || 'Failed to create member');
      }

      toast.success('Member added and verification email sent successfully!');
      router.push('/dashboard/members');
    } catch (err: any) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.push('/dashboard/members');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center mb-4">
        <button 
          onClick={goBack} 
          className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New Member</h1>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="glass-card p-8 dark:bg-gray-800 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field pl-10 w-full"
                  placeholder="e.g. Jane Doe"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10 w-full"
                  placeholder="e.g. jane@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Temporary Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-20 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  placeholder="Enter a temporary password"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex">
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs px-1 py-0.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mr-1"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                  <button 
                    type="button"
                    onClick={generatePassword}
                    className="text-xs bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors flex items-center"
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> Generate
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Password must be at least 8 characters long.
              </p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Role</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input-field pl-10 w-full"
                >
                  <option value="USER">User</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Experience Level</label>
              <select
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="input-field w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Select Experience Level</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium mb-1">Interests</label>
            <textarea
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              className="input-field w-full h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              placeholder="Member's interests (e.g., data analysis, AI, reporting)"
            ></textarea>
          </div>

          {/* Preferences */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Preferences</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notificationsEnabled"
                  name="notificationsEnabled"
                  checked={formData.notificationsEnabled}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <label htmlFor="notificationsEnabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable Notifications
                </label>
              </div>
            </div>
          </div>

          {/* Submit and Cancel buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`btn-primary px-6 py-2.5 flex items-center justify-center ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create & Send Verification
                </>
              )}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="btn-secondary px-6 py-2.5 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Tips Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Member Management Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Role Definitions</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="font-medium text-gray-500 flex items-center">
                  <Crown className="h-4 w-4 mr-1 text-red-500" />
                  Admin:
                </dt>
                <dd>Full access to all system features, user management, and settings.</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-gray-500 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-blue-500" />
                  Manager:
                </dt>
                <dd>Can manage data and queries, but limited user management capabilities.</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-gray-500 flex items-center">
                  <User className="h-4 w-4 mr-1 text-green-500" />
                  User:
                </dt>
                <dd>Can run queries and view data, but cannot modify system settings.</dd>
              </div>
            </dl>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Best Practices</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2" />
                <span>Limit the number of administrators to maintain security.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2" />
                <span>Regularly review member roles and remove access for those who no longer need it.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2" />
                <span>Ensure all members have verified their email addresses.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}