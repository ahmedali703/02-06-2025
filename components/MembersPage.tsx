// components/MembersPage.tsx
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
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Types
interface Member {
  ID: number;
  NAME: string;
  EMAIL: string;
  ROLE: string;
  IS_VERIFIED: string;
  CREATED_AT: string;
  LAST_LOGIN_DATE?: string;
}

interface FilterOptions {
  role: string;
  status: string;
}

export default function MembersPage() {
  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    role: 'all',
    status: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedMember, setExpandedMember] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [deletingMember, setDeletingMember] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const router = useRouter();
  const itemsPerPage = 10;

  // Fetch members data
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Calculate pagination
        const offset = (currentPage - 1) * itemsPerPage;
        
        // Build query parameters
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          search: searchTerm,
          role: filters.role,
          status: filters.status
        });
        
        const response = await fetch(`/api/organization/members?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch members: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        setMembers(data.members || []);
        setTotalMembers(data.totalCount || 0);
        setTotalPages(Math.ceil((data.totalCount || 0) / itemsPerPage));
      } catch (err: any) {
        console.error('Error fetching members:', err);
        setError(err.message || 'Failed to load members');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };
    
    fetchMembers();
  }, [currentPage, searchTerm, filters, isRefreshing]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle filter changes
  const handleFilterChange = (name: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle member deletion
  const handleDeleteMember = async (memberId: number) => {
    try {
      setDeletingMember(memberId);
      
      const response = await fetch(`/api/organization/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete member');
      }
      
      // Remove member from local state
      setMembers(members.filter(member => member.ID !== memberId));
      setShowDeleteConfirm(null);
      toast.success('Member deleted successfully');
    } catch (err: any) {
      console.error('Error deleting member:', err);
      toast.error(err.message || 'Failed to delete member');
    } finally {
      setDeletingMember(null);
    }
  };

  // Handle role change
  const handleRoleChange = async (memberId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/organization/members/${memberId}/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member role');
      }
      
      // Update member role in local state
      setMembers(members.map(member => 
        member.ID === memberId ? { ...member, ROLE: newRole } : member
      ));
      
      toast.success('Member role updated successfully');
    } catch (err: any) {
      console.error('Error updating member role:', err);
      toast.error(err.message || 'Failed to update member role');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="h-4 w-4" />;
      case 'MANAGER':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // Filter menu options
  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'ADMIN', label: 'Administrators' },
    { value: 'MANAGER', label: 'Managers' },
    { value: 'USER', label: 'Regular Users' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'verified', label: 'Verified' },
    { value: 'unverified', label: 'Unverified' }
  ];

  // Filtered members
  const filteredMembers = members;

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card p-8 text-center">
          <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Loading members...</h3>
          <p className="mt-2 text-sm text-gray-500">Please wait while we fetch the member data.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card p-8 text-center">
          <XCircle className="h-12 w-12 text-red-600 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Failed to load members</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Organization Members
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization members, their roles and permissions.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link 
            href="/dashboard/members/add"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <div className="glass-card p-6 mb-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <form onSubmit={handleSearch} className="relative mb-4 md:mb-0 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
          </div>
          <div className="mt-4 md:mt-0 md:ml-4 flex items-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button
              onClick={handleRefresh}
              className={`ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isRefreshing ? 'animate-spin text-indigo-600' : ''
              }`}
              disabled={isRefreshing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange('role', option.value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      filters.role === option.value
                        ? 'bg-indigo-100 text-indigo-800 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange('status', option.value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      filters.status === option.value
                        ? 'bg-indigo-100 text-indigo-800 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Members list */}
      <div className="glass-card p-6 mb-8">
        {/* Stats */}
        <div className="border-b border-gray-200 pb-4 mb-6">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Members</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{totalMembers}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Administrators</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {members.filter(m => m.ROLE === 'ADMIN').length}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Managers</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {members.filter(m => m.ROLE === 'MANAGER').length}
              </dd>
            </div>
          </dl>
        </div>

        {/* Empty state */}
        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try changing your search or filters'
                : 'Get started by adding a new member'}
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/members/add"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Link>
            </div>
          </div>
        )}

        {/* Members table */}
        {filteredMembers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Member
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Joined
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Last Login
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <tr key={member.ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.NAME}</div>
                          <div className="text-sm text-gray-500">{member.EMAIL}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.ROLE)}`}>
                        {getRoleIcon(member.ROLE)}
                        <span className="ml-1">{member.ROLE}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.IS_VERIFIED === 'Y' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.CREATED_AT)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.LAST_LOGIN_DATE ? formatDate(member.LAST_LOGIN_DATE) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setExpandedMember(expandedMember === member.ID ? null : member.ID)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        
                        {/* Action Menu */}
                        {expandedMember === member.ID && (
                          <div className="absolute right-0 z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                              <Link
                                href={`/dashboard/members/${member.ID}`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                role="menuitem"
                              >
                                <User className="h-4 w-4 mr-2" />
                                View Profile
                              </Link>
                              <Link
                                href={`/dashboard/members/${member.ID}/edit`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                role="menuitem"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Member
                              </Link>
                              {/* Role Management Dropdown */}
                              <div className="relative group">
                                <button className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                                  <Shield className="h-4 w-4 mr-2" />
                                  Change Role
                                </button>
                                <div className="hidden group-hover:block absolute left-full top-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                                  <div className="py-1">
                                    {['ADMIN', 'MANAGER', 'USER'].map((role) => (
                                      <button
                                        key={role}
                                        onClick={() => handleRoleChange(member.ID, role)}
                                        className={`w-full flex items-center px-4 py-2 text-sm ${
                                          member.ROLE === role
                                            ? 'bg-indigo-100 text-indigo-900 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                      >
                                        {getRoleIcon(role)}
                                        <span className="ml-2">{role}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setShowDeleteConfirm(member.ID)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100 hover:text-red-900"
                                role="menuitem"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Member
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Delete Confirmation Dialog */}
                        {showDeleteConfirm === member.ID && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
                              <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete <span className="font-medium">{member.NAME}</span>? This action cannot be undone.
                              </p>
                              <div className="flex justify-end gap-4">
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member.ID)}
                                  disabled={deletingMember === member.ID}
                                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                                    deletingMember === member.ID
                                      ? 'bg-red-400'
                                      : 'bg-red-600 hover:bg-red-700'
                                  }`}
                                >
                                  {deletingMember === member.ID ? (
                                    <div className="flex items-center">
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Deleting...
                                    </div>
                                  ) : (
                                    'Delete Member'
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-3 flex items-center justify-between border-t border-gray-200 mt-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${
                  currentPage === 1
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${
                  currentPage === totalPages
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalMembers)}</span>{' '}
                  to <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalMembers)}</span>{' '}
                  of <span className="font-medium">{totalMembers}</span> members
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${
                      currentPage === 1
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    let pageNumber: number;
                    // Always show first page, last page, current page, and pages around current
                    if (totalPages <= 5) {
                      pageNumber = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = idx + 1;
                      if (idx === 4) pageNumber = totalPages;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + idx;
                      if (idx === 0) pageNumber = 1;
                    } else {
                      pageNumber = currentPage - 2 + idx;
                      if (idx === 0) pageNumber = 1;
                      if (idx === 4) pageNumber = totalPages;
                    }
                    
                    // Show ellipsis instead of a button
                    if ((idx === 1 && pageNumber !== 2) || (idx === 3 && pageNumber !== totalPages - 1)) {
                      return (
                        <span
                          key={idx}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          currentPage === pageNumber
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-600 z-10'
                            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                        } text-sm font-medium`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${
                      currentPage === totalPages
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Help and guidance section */}
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