import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSalesImportExportControllerListRights,
  useSalesImportExportControllerSetRights,
  getSalesImportExportControllerListRightsQueryKey,
} from '@vernoxy-pulse/api-client';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { Pagination } from '../components/common/Pagination';
import { getInitials, getAvatarColor } from '../utils/formatters';
import { parseApiError } from '../utils/error';
import type { SalesUserRightsItem } from '../types/sales.types';
import {
  ShieldCheck,
  Search,
  UploadCloud,
  DownloadCloud,
  Users,
  Info,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export const RightsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [activeMutations, setActiveMutations] = useState<Record<number, boolean>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const {
    data: rightsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useSalesImportExportControllerListRights({
    query: {
      staleTime: 1000 * 60 * 2,
    },
  });

  const parsedUsers = useMemo<SalesUserRightsItem[]>(() => {
    const raw = (rightsResponse as unknown as { data?: SalesUserRightsItem[] })?.data ?? rightsResponse;
    if (Array.isArray(raw)) {
      return raw as SalesUserRightsItem[];
    }
    return [];
  }, [rightsResponse]);

  const setRightsMutation = useSalesImportExportControllerSetRights();

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return parsedUsers;
    return parsedUsers.filter((u) => {
      const nameMatch = u.name.toLowerCase().includes(query);
      const idMatch = String(u.emp_id).includes(query);
      return nameMatch || idMatch;
    });
  }, [parsedUsers, searchQuery]);

  // Pages of 10; a search or fewer people never leaves you on a page that no longer exists.
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary counts
  const stats = useMemo(() => {
    const total = parsedUsers.length;
    const canImportCount = parsedUsers.filter((u) => u.is_admin || u.can_import).length;
    const canExportCount = parsedUsers.filter((u) => u.is_admin || u.can_export).length;
    const adminCount = parsedUsers.filter((u) => u.is_admin).length;
    return { total, canImportCount, canExportCount, adminCount };
  }, [parsedUsers]);

  const handleToggle = async (
    user: SalesUserRightsItem,
    field: 'can_import' | 'can_export',
    currentVal: boolean,
  ) => {
    if (user.is_admin) return; // Admins cannot have their rights revoked

    const empId = user.emp_id;
    const nextVal = !currentVal;
    const updatePayload = {
      can_import: field === 'can_import' ? nextVal : user.can_import,
      can_export: field === 'can_export' ? nextVal : user.can_export,
    };

    setActiveMutations((prev) => ({ ...prev, [empId]: true }));
    setFeedbackMessage(null);

    // Snapshot previous query data for optimistic rollback
    const queryKey = getSalesImportExportControllerListRightsQueryKey();
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistic cache update
    queryClient.setQueryData(queryKey, (old: unknown) => {
      const list = (old as unknown as { data?: SalesUserRightsItem[] })?.data ?? old;
      if (!Array.isArray(list)) return old;
      return list.map((item: SalesUserRightsItem) => {
        if (item.emp_id === empId) {
          return {
            ...item,
            [field]: nextVal,
          };
        }
        return item;
      });
    });

    try {
      await setRightsMutation.mutateAsync({
        empId,
        data: updatePayload,
      });

      setFeedbackMessage({
        type: 'success',
        text: `Permissions updated for ${user.name}.`,
      });

      // Clear success feedback after 3 seconds
      setTimeout(() => {
        setFeedbackMessage((prev) => (prev?.type === 'success' ? null : prev));
      }, 3000);
    } catch (err) {
      // Rollback on failure
      queryClient.setQueryData(queryKey, previousData);
      const parsed = parseApiError(err);
      setFeedbackMessage({
        type: 'error',
        text: parsed.message || `Failed to update permissions for ${user.name}.`,
      });
    } finally {
      setActiveMutations((prev) => {
        const next = { ...prev };
        delete next[empId];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60 shadow-2xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Sales Permissions
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage Import and Export capabilities for Sales representatives and team members
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500 truncate">Total Sales Users</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500 truncate">Can Import</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900">{stats.canImportCount}</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <DownloadCloud className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500 truncate">Can Export</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900">{stats.canExportCount}</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500 truncate">Administrators</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900">{stats.adminCount}</div>
          </div>
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs sm:text-sm">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900">Permissions Policy Notice</p>
          <p className="text-blue-800 leading-relaxed">
            Administrators inherently hold full Import and Export privileges by system role. Toggling
            rights for Sales users applies instantaneously with zero downtime.
          </p>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline hover:no-underline font-semibold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by sales representative name or employee ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium self-center sm:self-auto">
          Showing {filteredUsers.length} of {parsedUsers.length} team members
        </div>
      </div>

      {/* Table & Cards Container */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-xs">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">Failed to load permissions</h3>
          <p className="text-sm text-slate-500 mb-4">{parseApiError(error).message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No matching team members found' : 'No sales users found'}
          description={
            searchQuery
              ? `No sales team member matched "${searchQuery}". Try a different name or ID.`
              : 'There are currently no sales team members configured in the system.'
          }
          actionLabel={searchQuery ? 'Clear search' : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Sales Representative</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6 text-center">Can Import Companies</th>
                  <th className="py-3.5 px-6 text-center">Can Export Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedUsers.map((user) => {
                  const isMutating = Boolean(activeMutations[user.emp_id]);
                  const avatarColor = getAvatarColor(user.name);
                  const initials = getInitials(user.name);

                  return (
                    <tr
                      key={user.emp_id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Name & Initials */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 shrink-0 rounded-xl ${avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-xs`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {user.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              EMP-{user.emp_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        {user.is_admin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                            <Shield className="h-3 w-3 text-indigo-600" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                            Sales Rep
                          </span>
                        )}
                      </td>

                      {/* Can Import Switch */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center">
                          {user.is_admin ? (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 cursor-not-allowed"
                              title="Admins inherently possess Import permissions"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                              Always Enabled
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <label
                                className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
                                aria-label={`Toggle import rights for ${user.name}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={user.can_import}
                                  disabled={isMutating}
                                  onChange={() => handleToggle(user, 'can_import', user.can_import)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                              </label>
                              {isMutating && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Can Export Switch */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center">
                          {user.is_admin ? (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 cursor-not-allowed"
                              title="Admins inherently possess Export permissions"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                              Always Enabled
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <label
                                className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
                                aria-label={`Toggle export rights for ${user.name}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={user.can_export}
                                  disabled={isMutating}
                                  onChange={() => handleToggle(user, 'can_export', user.can_export)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                              </label>
                              {isMutating && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {pagedUsers.map((user) => {
              const isMutating = Boolean(activeMutations[user.emp_id]);
              const avatarColor = getAvatarColor(user.name);
              const initials = getInitials(user.name);

              return (
                <div key={user.emp_id} className="p-4 space-y-4">
                  {/* User info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 shrink-0 rounded-xl ${avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-xs`}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{user.name}</div>
                        <div className="text-xs text-slate-400 font-mono">EMP-{user.emp_id}</div>
                      </div>
                    </div>
                    {user.is_admin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                        <Shield className="h-3 w-3 text-indigo-600" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Sales Rep
                      </span>
                    )}
                  </div>

                  {/* Mobile Switches */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {/* Can Import */}
                    <div className="flex items-center justify-between min-h-[44px]">
                      <div className="flex items-center gap-2">
                        <UploadCloud className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">Can Import</span>
                      </div>
                      {user.is_admin ? (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                          Always Enabled
                        </span>
                      ) : (
                        <label
                          className="relative inline-flex items-center min-h-[44px] min-w-[44px] cursor-pointer"
                          aria-label={`Toggle import rights for ${user.name}`}
                        >
                          <input
                            type="checkbox"
                            checked={user.can_import}
                            disabled={isMutating}
                            onChange={() => handleToggle(user, 'can_import', user.can_import)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                      )}
                    </div>

                    {/* Can Export */}
                    <div className="flex items-center justify-between min-h-[44px]">
                      <div className="flex items-center gap-2">
                        <DownloadCloud className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">Can Export</span>
                      </div>
                      {user.is_admin ? (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                          Always Enabled
                        </span>
                      ) : (
                        <label
                          className="relative inline-flex items-center min-h-[44px] min-w-[44px] cursor-pointer"
                          aria-label={`Toggle export rights for ${user.name}`}
                        >
                          <input
                            type="checkbox"
                            checked={user.can_export}
                            disabled={isMutating}
                            onChange={() => handleToggle(user, 'can_export', user.can_export)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredUsers.length} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};
