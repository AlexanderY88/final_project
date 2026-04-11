import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { getProfile } from '../features/auth/authSlice';
import { fetchAllUsers, fetchChildBranches } from '../features/users/usersSlice';
import ConfirmationModal from '../components/ConfirmationModal';

const ADMIN_LAST_USER_KEY = 'adminDashboardLastUserId';

const getUserRoleLabel = (targetUser: {
  isAdmin?: boolean;
  isMainBrunch?: boolean;
} | null) => {
  if (!targetUser) return 'Branch User';
  if (targetUser.isAdmin) return 'Admin';
  if (targetUser.isMainBrunch) return 'Main Branch';
  return 'Child Branch';
};

const getDisplayIdentity = (targetUser: {
  isAdmin?: boolean;
  name?: { first?: string; last?: string };
} | null) => {
  if (!targetUser) return { primary: '-', secondary: '' };
  if (targetUser.isAdmin) {
    return {
      primary: `${targetUser.name?.first || ''} ${targetUser.name?.last || ''}`.trim(),
      secondary: '',
    };
  }
  return {
    primary: `Branch: ${targetUser.name?.first || '-'}`,
    secondary: `Manager: ${targetUser.name?.last || '-'}`,
  };
};

const adminContextPath = (basePath: string, userId: string) =>
  `${basePath}?userId=${userId}&from=admin-users`;

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, isLoading } = useAppSelector((state) => state.auth);
  const {
    users,
    childBranches,
    isLoading: usersLoading,
    error: usersError,
  } = useAppSelector((state) => state.users);

  const [expandedMainBranches, setExpandedMainBranches] = useState<Record<string, boolean>>({});
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);
  const [resumeUserId, setResumeUserId] = useState<string | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumePromptHandled, setResumePromptHandled] = useState(false);
  const source = searchParams.get('from');
  const mainBranchId = searchParams.get('mainBranchId');
  const selectedBranchUserId = searchParams.get('userId');

  useEffect(() => {
    if (!user) {
      dispatch(getProfile());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (user?.isAdmin) {
      dispatch(fetchAllUsers());
    }
    if (user?.isMainBrunch) {
      dispatch(fetchChildBranches());
    }
  }, [dispatch, user?.isAdmin, user?.isMainBrunch]);

  const role = getUserRoleLabel(user);

  const mainBranches = useMemo(
    () => users.filter((u) => u.isMainBrunch && !u.isAdmin),
    [users]
  );

  const usersById = useMemo(
    () => new Map(users.map((u) => [u._id, u])),
    [users]
  );

  const getChildrenForMainBranch = (mainBranchId: string, branchRefs?: string[]) => {
    const refs = (branchRefs || []).filter((id) => id !== mainBranchId);
    return refs
      .map((id) => usersById.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .filter((u) => !u.isMainBrunch && !u.isAdmin);
  };

  const adminSelectedUser = useMemo(
    () => users.find((u) => u._id === selectedAdminUserId) || null,
    [users, selectedAdminUserId]
  );

  const resumeUser = useMemo(
    () => (resumeUserId ? usersById.get(resumeUserId) || null : null),
    [resumeUserId, usersById]
  );

  const filteredUsers = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const fullName = `${u.name?.first || ''} ${u.name?.last || ''}`.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        u._id.toLowerCase().includes(q) ||
        fullName.includes(q)
      );
    });
  }, [users, adminSearch]);

  const selectedChildBranchForMain = useMemo(() => {
    if (!user?.isMainBrunch || !selectedBranchUserId) return null;
    return childBranches.find((branch) => branch._id === selectedBranchUserId) || null;
  }, [user?.isMainBrunch, selectedBranchUserId, childBranches]);

  useEffect(() => {
    if (!user?.isAdmin || usersLoading) return;

    const queryUserId = searchParams.get('userId');
    if (queryUserId) {
      setSelectedAdminUserId(queryUserId);
      localStorage.setItem(ADMIN_LAST_USER_KEY, queryUserId);
      setResumePromptHandled(true);
      return;
    }

    if (!resumePromptHandled && !selectedAdminUserId) {
      const savedUserId = localStorage.getItem(ADMIN_LAST_USER_KEY);
      if (savedUserId) {
        setResumeUserId(savedUserId);
        setShowResumeModal(true);
      }
      setResumePromptHandled(true);
    }
  }, [
    user?.isAdmin,
    usersLoading,
    searchParams,
    resumePromptHandled,
    selectedAdminUserId,
  ]);

  const handleSelectAdminUser = (id: string) => {
    setSelectedAdminUserId(id);
    localStorage.setItem(ADMIN_LAST_USER_KEY, id);
    setSearchParams({ userId: id });
  };

  const handleAdminBackToSearch = () => {
    if (source === 'admin-users') {
      navigate('/admin/users');
      return;
    }

    setSelectedAdminUserId(null);
    setAdminSearch('');
    localStorage.removeItem(ADMIN_LAST_USER_KEY);
    setSearchParams({});
  };

  const handleBackFromSelectedUser = () => {
    if (source === 'branches-list' && mainBranchId) {
      navigate(`/branches?userId=${mainBranchId}&from=admin-users`);
      return;
    }

    handleAdminBackToSearch();
  };

  const handleResumeYes = () => {
    setShowResumeModal(false);
    if (resumeUserId) {
      setSelectedAdminUserId(resumeUserId);
      setSearchParams({ userId: resumeUserId });
    }
  };

  const handleResumeNo = () => {
    setShowResumeModal(false);
    setResumeUserId(null);
    localStorage.removeItem(ADMIN_LAST_USER_KEY);
    setSelectedAdminUserId(null);
    setSearchParams({});
  };

  const toggleMainBranch = (id: string) => {
    setExpandedMainBranches((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[55vh] flex flex-col justify-center items-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-indigo-100"></div>
          <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-gray-600">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ConfirmationModal
        isOpen={showResumeModal}
        title="Continue With Last User?"
        message={resumeUser
          ? `Do you want to continue with ${resumeUser.email} (${resumeUser.name.first} ${resumeUser.name.last})?`
          : 'Do you want to continue with the last selected user?'}
        onConfirm={handleResumeYes}
        onCancel={handleResumeNo}
      />

      {user.isAdmin ? (
        <>
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="mt-1 text-indigo-100">Search users and open their dashboard context</p>
          </div>

          {selectedAdminUserId && adminSelectedUser ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackFromSelectedUser}
                  className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  {source === 'branches-list' && mainBranchId ? '← Back To Branches List' : '← Back To All Users'}
                </button>
                <span className="text-sm text-gray-500">Viewing as: {adminSelectedUser.email}</span>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Selected User Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">{adminSelectedUser.isAdmin ? 'Name' : 'Branch Name'}: </span><span>{adminSelectedUser.name.first}</span></div>
                  <div><span className="text-gray-500">{adminSelectedUser.isAdmin ? 'Last Name' : 'Manager'}: </span><span>{adminSelectedUser.name.last}</span></div>
                  <div><span className="text-gray-500">Email: </span><span>{adminSelectedUser.email}</span></div>
                  <div><span className="text-gray-500">Phone: </span><span>{adminSelectedUser.phone}</span></div>
                  <div><span className="text-gray-500">Location: </span><span>{adminSelectedUser.address.city}, {adminSelectedUser.address.country}</span></div>
                  <div>
                    <span className="text-gray-500">Role: </span>
                    <span>{getUserRoleLabel(adminSelectedUser)}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">
                  You are in admin selected-user mode. Use the actions below, then return with the back button.
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Link
                    to={adminContextPath('/products', adminSelectedUser._id)}
                    className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm text-center"
                  >
                    Products
                  </Link>
                  {adminSelectedUser.isMainBrunch && !adminSelectedUser.isAdmin && (
                    <Link
                      to={adminContextPath('/branches', adminSelectedUser._id)}
                      className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm text-center"
                    >
                      Branches
                    </Link>
                  )}
                  <Link
                    to={adminContextPath('/logs', adminSelectedUser._id)}
                    className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm text-center"
                  >
                    History
                  </Link>
                  <Link
                    to={adminContextPath('/profile', adminSelectedUser._id)}
                    className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm text-center"
                  >
                    Profile
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to={adminContextPath('/profile', adminSelectedUser._id)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                  >
                    Update User
                  </Link>
                  <button
                    type="button"
                    onClick={handleBackFromSelectedUser}
                    className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Search User</h2>
              <input
                type="text"
                placeholder="Search by email, user ID, first or last name"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
              />

              {usersLoading && <p className="text-sm text-gray-500">Loading users...</p>}
              {usersError && <p className="text-sm text-red-600">{usersError}</p>}

              {!usersLoading && !usersError && (
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {filteredUsers.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => handleSelectAdminUser(u._id)}
                      className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition"
                    >
                      <p className="font-medium text-gray-800">{getDisplayIdentity(u).primary}</p>
                      {getDisplayIdentity(u).secondary && (
                        <p className="text-xs text-gray-500">{getDisplayIdentity(u).secondary}</p>
                      )}
                      <p className="text-xs text-gray-500">{u.email} • {u._id}</p>
                    </button>
                  ))}

                  {filteredUsers.length === 0 && (
                    <p className="text-sm text-gray-500">No users match your search.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8">
            <h1 className="text-3xl font-bold">Welcome, {user.name.last}!</h1>
            <p className="mt-1 text-indigo-100">{role} • {user.email}</p>
          </div>

          <div className="main-branch-details-card bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Main Branch Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Business Name: </span><span>{user.name.first}</span></div>
              <div><span className="text-gray-500">Manager: </span><span>{user.name.last}</span></div>
              <div><span className="text-gray-500">Email: </span><span>{user.email}</span></div>
              <div><span className="text-gray-500">Phone: </span><span>{user.phone || 'Not set'}</span></div>
              <div><span className="text-gray-500">Location: </span><span>{user.address.city}, {user.address.country}</span></div>
            </div>
          </div>

          {user.isMainBrunch ? (
            <div className="child-branches-card bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Child Branches</h2>

              {selectedChildBranchForMain && (
                <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-sm text-indigo-900 font-medium">
                    Viewing context: {selectedChildBranchForMain.name.first} ({selectedChildBranchForMain.email})
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/products?userId=${selectedChildBranchForMain._id}&from=main-branch-dashboard`}
                      className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                    >
                      Open Branch Products
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSearchParams({})}
                      className="text-sm border border-indigo-200 bg-white text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                    >
                      Exit Branch Context
                    </button>
                  </div>
                </div>
              )}

              {usersLoading && <p className="text-sm text-gray-500">Loading child branches...</p>}

              {!usersLoading && childBranches.length === 0 ? (
                <div className="text-sm text-gray-500">
                  <p>No child branches found.</p>
                  <Link to="/branches" className="inline-block mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                    Create Child Branch
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {childBranches.map((branch) => (
                    <div key={branch._id} className="child-branch-item border border-gray-200 rounded-lg p-3">
                      <p className="font-medium text-gray-800">{branch.name.first} {branch.name.last}</p>
                      <p className="text-xs text-gray-500">{branch.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          to={`/branches?focusBranchId=${branch._id}&from=my-business`}
                          className="text-xs text-indigo-700 dark:text-white border border-indigo-200 px-2.5 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-700 transition"
                        >
                          Branch Details
                        </Link>
                        <Link
                          to={`/products?userId=${branch._id}&from=my-business`}
                          className="text-xs text-green-700 dark:text-white border border-green-200 px-2.5 py-1 rounded-md hover:bg-green-50 dark:hover:bg-green-700 transition"
                        >
                          Products
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-6">
              <p className="text-sm text-gray-600">You are logged in as a child branch user.</p>
            </div>
          )}
        </>
      )}

      {user.isAdmin && !selectedAdminUserId && (
        <div className="bg-white rounded-xl shadow-md p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Branch Structure</h2>
            <span className="text-sm text-gray-500">{mainBranches.length} main branches</span>
          </div>

          {usersLoading && (
            <div className="space-y-3" aria-label="Loading branches">
              {[1, 2, 3].map((item) => (
                <div key={item} className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
                  <div className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3.5 w-40 bg-gray-300 rounded"></div>
                      <div className="h-3 w-56 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-6 w-28 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {usersError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              {usersError}
            </div>
          )}

          {!usersLoading && !usersError && mainBranches.length > 0 && (
            <div className="space-y-3">
              {mainBranches.map((mainBranch) => {
                const children = getChildrenForMainBranch(mainBranch._id, mainBranch.brunches);
                const isOpen = !!expandedMainBranches[mainBranch._id];

                return (
                  <div key={mainBranch._id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleMainBranch(mainBranch._id)}
                      className="branch-accordion-trigger w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-800">Branch: {mainBranch.name.first}</p>
                        <p className="text-xs text-gray-500">Manager: {mainBranch.name.last}</p>
                        <p className="text-xs text-gray-500">{mainBranch.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-full">{children.length} child branches</span>
                        <span className="text-gray-500">{isOpen ? '▼' : '▶'}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 py-3 bg-white border-t border-gray-100">
                        {children.length === 0 ? (
                          <p className="text-sm text-gray-500">No child branches linked.</p>
                        ) : (
                          <ul className="space-y-2">
                            {children.map((child) => (
                              <li key={child._id} className="text-sm text-gray-700 flex items-center justify-between">
                                <span>Branch: {child.name.first} | Manager: {child.name.last}</span>
                                <span className="text-xs text-gray-500">{child.email}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
