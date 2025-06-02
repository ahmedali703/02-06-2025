'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Crown,
  UserPlus,
  AlertCircle,
  ArrowRight,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// Types
interface Member {
  ID: number;
  NAME: string;
  EMAIL: string;
  ROLE: string;
  IS_VERIFIED: string;
  CREATED_AT: string;
  EXPERIENCE_LEVEL?: string;
  NOTIFICATIONS_ENABLED?: string;
  HAS_COMPLETED_ONBOARDING?: string;
  LAST_LOGIN_DATE?: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

// Delete Confirmation Modal Component
const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, member, onClose, onConfirm, isDeleting }) => {
  if (!isOpen || !member) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-center mb-2 dark:text-gray-100">Delete Member</h3>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          Are you sure you want to delete <span className="font-semibold">{member.NAME}</span>? This action cannot be undone.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg transition-colors flex items-center justify-center"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Deleting...
              </>
            ) : (
              'Delete Member'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MembersPage() {
  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    member: Member | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    member: null,
    isDeleting: false
  });
  
  // Fetch members data
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/organization/members', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }
        
        const data = await response.json();
        setMembers(data.members || []);
        setFilteredMembers(data.members || []);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching members');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchMembers();
  }, [isRefreshing]);

  // Filter members based on search term and filters
  useEffect(() => {
    if (!members.length) return;
    
    let result = [...members];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(member => 
        member.NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.EMAIL.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(member => 
        member.ROLE === roleFilter
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(member => 
        member.IS_VERIFIED === statusFilter
      );
    }
    
    setFilteredMembers(result);
  }, [searchTerm, roleFilter, statusFilter, members]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  // Handle delete member
  const handleDeleteClick = (member: Member) => {
    setDeleteModal({
      isOpen: true,
      member,
      isDeleting: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.member) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      const res = await fetch(`/api/organization/members/${deleteModal.member.ID}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Delete failed: ${res.status}`);
      }
      
      // Remove the deleted member from the list
      setMembers(prev => prev.filter(m => m.ID !== deleteModal.member?.ID));
      toast.success(`${deleteModal.member.NAME} has been removed successfully`);
      setDeleteModal({ isOpen: false, member: null, isDeleting: false });
    } catch (err) {
      console.error('Error deleting member:', err);
      toast.error(`Error: ${err instanceof Error ? err.message : 'Failed to delete member'}`);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, member: null, isDeleting: false });
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Render role badge
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
            <Shield className="w-3 h-3 mr-1" />
            Manager
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
            <User className="w-3 h-3 mr-1" />
            User
          </span>
        );
    }
  };

  // Render verification status
  const renderVerificationStatus = (isVerified: string) => {
    return isVerified === 'Y' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Verified
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
        <XCircle className="w-3 h-3 mr-1" />
        Unverified
      </span>
    );
  };

  // Determine user avatar initials and color
  const getUserAvatar = (name: string) => {
    const initials = name.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    // Generate a consistent background color based on the name
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-indigo-100 text-indigo-600',
      'bg-purple-100 text-purple-600', 
      'bg-pink-100 text-pink-600',
      'bg-red-100 text-red-600',
      'bg-orange-100 text-orange-600',
      'bg-amber-100 text-amber-600',
      'bg-yellow-100 text-yellow-600',
      'bg-lime-100 text-lime-600',
      'bg-green-100 text-green-600',
      'bg-emerald-100 text-emerald-600',
      'bg-teal-100 text-teal-600',
      'bg-cyan-100 text-cyan-600',
    ];
    
    // Use a hash function to get a consistent index
    const hashCode = name.split('').reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);
    
    const colorIndex = Math.abs(hashCode) % colors.length;
    
    return {
      initials,
      colorClass: colors[colorIndex]
    };
  };

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="glass-card p-8 flex justify-center items-center py-12 dark:bg-gray-800 dark:border-gray-700">
          <RefreshCw className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading members...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="glass-card p-8 text-center py-12 dark:bg-gray-800 dark:border-gray-700">
          <XCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Failed to load members</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button 
            onClick={handleRefresh}
            className="btn-primary px-6 py-2 flex items-center justify-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Team Members</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your organization's members and their roles</p>
          </div>
          <Link 
            href="/dashboard/members/add"
            className="btn-primary px-4 py-2 flex items-center justify-center gap-2 shadow-md"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Member</span>
          </Link>
        </div>
        
        {/* Search */}
        <div className="glass-card p-4 mb-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {showFilters ? '▲' : '▼'}
              </button>
              
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="ADMIN">Admins</option>
                    <option value="MANAGER">Managers</option>
                    <option value="USER">Users</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="Y">Verified</option>
                    <option value="N">Unverified</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Members list */}
      {filteredMembers.length === 0 ? (
        <div className="glass-card p-10 text-center dark:bg-gray-800 dark:border-gray-700">
          <User className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">No members found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Start adding members to your organization'}
          </p>
          {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' ? (
            <button
              onClick={clearFilters}
              className="btn-secondary px-4 py-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Clear Filters
            </button>
          ) : (
            <Link href="/dashboard/members/add" className="btn-primary px-4 py-2 inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Member
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMembers.map((member, index) => {
                  const avatar = getUserAvatar(member.NAME);
                  
                  return (
                    <motion.tr 
                      key={member.ID}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${avatar.colorClass} flex items-center justify-center`}>
                            <span className="font-medium">{avatar.initials}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.NAME}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{member.EMAIL}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderRoleBadge(member.ROLE)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderVerificationStatus(member.IS_VERIFIED)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                          {formatDate(member.CREATED_AT)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {member.LAST_LOGIN_DATE ? (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                            {formatDate(member.LAST_LOGIN_DATE)}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link 
                            href={`/dashboard/members/${member.ID}`}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                            onClick={() => handleDeleteClick(member)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredMembers.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredMembers.length} of {members.length} members
              </div>
              {filteredMembers.length < members.length && (
                <button 
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal 
        isOpen={deleteModal.isOpen}
        member={deleteModal.member}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
}