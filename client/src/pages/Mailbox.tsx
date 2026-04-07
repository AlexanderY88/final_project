import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { getMessages, closeMessage, reopenMessage, addMessageComment, ContactMessage } from '../services/messages';
import { toast } from 'react-toastify';

const SAFE_TEXT_REGEX = /^[A-Za-z0-9 .,?!]*$/;

const SUBJECT_LABELS: Record<string, string> = {
  general: 'General Inquiry',
  support: 'Technical Support',
  feedback: 'Feedback',
  other: 'Other',
};

type MessageSubject = 'general' | 'support' | 'feedback' | 'other';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function getCommentHistory(msg: ContactMessage) {
  const adminComments = Array.isArray(msg.adminComments) ? msg.adminComments : [];

  if (adminComments.length > 0) {
    return adminComments;
  }

  if (msg.adminComment) {
    return [
      {
        text: msg.adminComment,
        createdAt: msg.closedAt || msg.updatedAt,
      },
    ];
  }

  return [];
}

// ------- Message Detail Modal -------
interface MessageDetailProps {
  msg: ContactMessage;
  onClose: () => void;
  onMessageUpdated: (updated: ContactMessage, removeFromList?: boolean) => void;
}

const MessageDetail: React.FC<MessageDetailProps> = ({ msg, onClose, onMessageUpdated }) => {
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const commentHistory = getCommentHistory(msg);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setComment(val);
    if (val && !SAFE_TEXT_REGEX.test(val)) {
      setCommentError('Comment may only contain letters, digits, spaces, and . , ? !');
    } else {
      setCommentError('');
    }
  };

  const handleClose = async () => {
    if (comment && !SAFE_TEXT_REGEX.test(comment)) {
      setCommentError('Comment may only contain letters, digits, spaces, and . , ? !');
      return;
    }
    setClosing(true);
    try {
      const res = await closeMessage(msg._id, String(comment).trim());
      toast.success('Message marked as closed.');
      onMessageUpdated(res.data, true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to close message.');
    } finally {
      setClosing(false);
    }
  };

  const handleReopen = async () => {
    setReopening(true);
    try {
      const res = await reopenMessage(msg._id);
      toast.success('Message reopened.');
      onMessageUpdated(res.data, true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reopen message.');
    } finally {
      setReopening(false);
    }
  };

  const handleAddComment = async () => {
    const nextComment = String(comment).trim();

    if (!nextComment) {
      setCommentError('Comment is required.');
      return;
    }

    if (!SAFE_TEXT_REGEX.test(nextComment)) {
      setCommentError('Comment may only contain letters, digits, spaces, and . , ? !');
      return;
    }

    setAddingComment(true);
    try {
      const res = await addMessageComment(msg._id, nextComment);
      toast.success('Comment added.');
      setComment('');
      setCommentError('');
      onMessageUpdated(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add comment.');
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{SUBJECT_LABELS[msg.subject] || msg.subject}</h2>
              <p className="text-sm font-semibold text-indigo-700 mt-1">Message ID #{msg.messageNumber}</p>
              <p className="text-sm text-gray-500 mt-1">{formatDate(msg.createdAt)}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1 rounded">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sender info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1">
            <p className="text-sm"><span className="font-semibold text-gray-700">From:</span> {msg.name}</p>
            <p className="text-sm"><span className="font-semibold text-gray-700">Email:</span> {msg.email}</p>
            {msg.userId && (
              <p className="text-sm">
                <span className="font-semibold text-gray-700">Account:</span>{' '}
                {(msg.userId as any).name?.first} {(msg.userId as any).name?.last} — {(msg.userId as any).email}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Message:</p>
            <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 text-sm">{msg.message}</p>
          </div>

          {/* Status badge */}
          <div className="mb-4">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                msg.status === 'open'
                  ? 'bg-green-100 text-green-800'
                  : msg.status === 'reopened'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-200 text-slate-800'
              }`}
            >
              {msg.status === 'open' ? 'Open' : msg.status === 'reopened' ? 'Reopened' : 'Closed'}
            </span>
          </div>

          {/* Comment history */}
          {commentHistory.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Comment History:</p>
              <div className="space-y-3">
                {commentHistory.map((entry, index) => (
                  <div key={entry._id || `${entry.createdAt}-${index}`} className="bg-amber-100 rounded-lg p-3 text-sm border border-amber-300">
                    <p className="text-slate-800 whitespace-pre-wrap">{entry.text}</p>
                    <p className="text-xs text-slate-500 mt-2">{formatDate(entry.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4 mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Admin Comment
            </label>
            <textarea
              value={comment}
              onChange={handleCommentChange}
              rows={3}
              maxLength={2000}
              placeholder="Add a comment... (letters, digits, spaces, . , ? !)"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                commentError ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {commentError && <p className="mt-1 text-sm text-red-600">{commentError}</p>}
            <p className="mt-1 text-xs text-gray-400">Allowed: letters, digits, spaces, and . , ? !</p>

            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={handleAddComment}
                disabled={addingComment || closing || reopening || !!commentError}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {addingComment ? 'Saving Comment...' : 'Add Comment'}
              </button>

              {(msg.status === 'open' || msg.status === 'reopened') && (
                <button
                  onClick={handleClose}
                  disabled={closing || addingComment || reopening || !!commentError}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                  {closing ? 'Closing...' : 'Mark as Closed'}
                </button>
              )}

              {msg.status === 'closed' && (
                <button
                  onClick={handleReopen}
                  disabled={reopening || addingComment || closing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                  {reopening ? 'Reopening...' : 'Reopen Message'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------- Main Mailbox Page -------
const Mailbox: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [openFilter, setOpenFilter] = useState<'active' | 'open' | 'reopened'>('active');
  const [page, setPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState<'all' | MessageSubject>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  // Admin guard
  useEffect(() => {
    if (!user?.isAdmin) navigate('/');
  }, [user, navigate]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const statusForQuery = tab === 'closed' ? 'closed' : openFilter;
      const res = await getMessages({
        status: statusForQuery,
        page,
        search,
        subject: subjectFilter === 'all' ? undefined : subjectFilter,
      });
      setMessages(res.messages);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [tab, openFilter, page, search, subjectFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleTabChange = (newTab: 'open' | 'closed') => {
    setTab(newTab);
    setPage(1);
  };

  const handleOpenFilterChange = (value: 'active' | 'open' | 'reopened') => {
    setOpenFilter(value);
    setPage(1);
  };

  const handleSubjectFilterChange = (value: 'all' | MessageSubject) => {
    setSubjectFilter(value);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const handleMessageUpdated = (updated: ContactMessage, removeFromList = false) => {
    setMessages((prev) => {
      if (removeFromList) {
        return prev.filter((m) => m._id !== updated._id);
      }

      return prev.map((m) => (m._id === updated._id ? updated : m));
    });

    if (removeFromList) {
      setTotal((prev) => Math.max(0, prev - 1));
      setSelected(null);
      return;
    }

    setSelected(updated);
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Page title */}
        <div className="mb-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mailbox</h1>
            <p className="text-sm text-gray-500">Messages sent via Contact Us</p>
          </div>
        </div>

        {/* Open tab status filter */}
        {tab === 'open' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <button
              onClick={() => handleOpenFilterChange('active')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                openFilter === 'active'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleOpenFilterChange('open')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                openFilter === 'open'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => handleOpenFilterChange('reopened')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                openFilter === 'reopened'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Reopened
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => handleTabChange('open')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
              tab === 'open'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Open
            {tab === 'open' && total > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {total}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('closed')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
              tab === 'closed'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Closed
            {tab === 'closed' && total > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-300 text-slate-900">
                {total}
              </span>
            )}
          </button>
        </div>

        {/* Search + Subject Filter */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => handleSubjectFilterChange(e.target.value as 'all' | MessageSubject)}
            title="Filter by message theme"
            aria-label="Filter by message theme"
            className="w-full md:w-52 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="all">All themes</option>
            <option value="general">General Inquiry</option>
            <option value="support">Technical Support</option>
            <option value="feedback">Feedback</option>
            <option value="other">Other</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, subject, or message..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={handleSearchClear}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
            >
              Clear
            </button>
          )}
          </form>
        </div>

        {/* Results summary */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-3">
            {total === 0
              ? 'No messages found.'
              : `Showing ${messages.length} of ${total} message${total !== 1 ? 's' : ''} (page ${page} of ${pages})`}
          </p>
        )}

        {/* Messages list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="mx-auto w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">
              {tab === 'open'
                ? `No ${openFilter === 'active' ? 'messages' : openFilter + ' messages'}${search ? ' matching your search' : ''}.`
                : `No closed messages${search ? ' matching your search' : ''}.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
            {messages.map((msg) => (
              <div
                key={msg._id}
                onClick={() => setSelected(msg)}
                className="mailbox-message-row flex items-start gap-4 px-6 py-4 hover:bg-indigo-50 cursor-pointer transition duration-150"
              >
                <div className="flex-shrink-0 w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm uppercase">
                  {msg.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{msg.name}</p>
                      <p className="text-xs font-medium text-indigo-700">Message ID #{msg.messageNumber}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{msg.email}</p>
                  <p className="text-sm text-indigo-700 font-medium mt-0.5">
                    {SUBJECT_LABELS[msg.subject] || msg.subject}
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        msg.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : msg.status === 'reopened'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {msg.status === 'open' ? 'Open' : msg.status === 'reopened' ? 'Reopened' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-0.5">{msg.message}</p>
                </div>
                <svg className="flex-shrink-0 w-5 h-5 text-gray-300 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition duration-150"
            >
              ← Previous
            </button>

            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition duration-150 ${
                  p === page
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition duration-150"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selected && (
        <MessageDetail
          msg={selected}
          onClose={() => setSelected(null)}
          onMessageUpdated={handleMessageUpdated}
        />
      )}
    </div>
  );
};

export default Mailbox;
