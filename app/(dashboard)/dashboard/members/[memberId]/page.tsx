'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, Mail, Shield, Lock, CheckCircle2, AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface MemberData {
  ID: number;
  NAME: string;
  EMAIL: string;
  ROLE: string;
  EXPERIENCE_LEVEL: string;
  INTERESTS: string;
  NOTIFICATIONS_ENABLED: 'Y' | 'N';
  HAS_COMPLETED_ONBOARDING: 'Y' | 'N';
  IS_VERIFIED: 'Y' | 'N';
}

export default function EditMemberPage() {
  const { memberId } = useParams();
  const router = useRouter();

  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<MemberData>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchMember() {
      try {
        const res = await fetch(`/api/organization/members/${memberId}`, {
          credentials: 'include'
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setMember(data);
        setFormData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMember();
  }, [memberId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked ? 'Y' : 'N' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Update failed: ${res.status}`);
      }
      
      toast.success('Member updated successfully');
      router.push('/dashboard/members');
    } catch (err: any) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    router.push('/dashboard/members');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="glass-card p-8 flex justify-center items-center py-12 dark:bg-gray-800 dark:border-gray-700">
          <div className="h-8 w-8 border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mr-3"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading member information...</p>
        </div>
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="glass-card p-8 flex flex-col items-center text-center py-12 dark:bg-gray-800 dark:border-gray-700">
          <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
          <h1 className="text-xl font-bold mb-2 dark:text-gray-100">Error Loading Member</h1>
          <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
          <button 
            onClick={goBack}
            className="btn-primary px-6 py-2 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
          </button>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="glass-card p-8 flex flex-col items-center text-center py-12 dark:bg-gray-800 dark:border-gray-700">
          <User className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h1 className="text-xl font-bold mb-2 dark:text-gray-100">Member Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The member you're looking for doesn't exist or you don't have permission to view it.</p>
          <button 
            onClick={goBack}
            className="btn-primary px-6 py-2 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-center">
        <button 
          onClick={goBack} 
          className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Member</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="glass-card p-8 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center mb-8">
          <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xl font-bold mr-4">
            {member.NAME.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{member.NAME}</h2>
            <p className="text-gray-500 dark:text-gray-400">{member.EMAIL}</p>
            <div className="mt-1 flex items-center">
              {member.IS_VERIFIED === 'Y' ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  name="NAME"
                  value={formData.NAME || ''}
                  onChange={handleChange}
                  className="input-field pl-10 w-full"
                  placeholder="Enter member's name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  name="EMAIL"
                  type="email"
                  value={formData.EMAIL || ''}
                  onChange={handleChange}
                  className="input-field pl-10 w-full"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Role</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <select
                  name="ROLE"
                  value={formData.ROLE || ''}
                  onChange={handleChange}
                  className="input-field pl-10 w-full"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="USER">User</option>
                </select>
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-sm font-medium mb-1">Experience Level</label>
              <select
                name="EXPERIENCE_LEVEL"
                value={formData.EXPERIENCE_LEVEL || ''}
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
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Interests</label>
            <textarea
              name="INTERESTS"
              value={formData.INTERESTS || ''}
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
                  id="notifications"
                  name="NOTIFICATIONS_ENABLED"
                  checked={formData.NOTIFICATIONS_ENABLED === 'Y'}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <label htmlFor="notifications" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable Notifications
                </label>
              </div>
            </div>
          </div>

          {/* Submit and Cancel buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className={`btn-primary px-6 py-2.5 flex items-center justify-center ${
                isSaving ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="btn-secondary px-6 py-2.5 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}