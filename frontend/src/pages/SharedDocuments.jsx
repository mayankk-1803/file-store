import React, { useState, useEffect } from 'react';
import { Share2, Users, Eye, Calendar, Mail, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const SharedDocuments = () => {
  const [sharedByMe, setSharedByMe] = useState([]);
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [activeTab, setActiveTab] = useState('shared-by-me');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSharedDocuments();
  }, []);

  const fetchSharedDocuments = async () => {
    try {
      const { data } = await axios.get('/api/documents/shared');
      setSharedByMe(data.sharedByMe || []);
      setSharedWithMe(data.sharedWithMe || []);
    } catch (error) {
      console.error('Error fetching shared documents:', error);
      toast.error('Error fetching shared documents');
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async (shareId) => {
    if (window.confirm('Are you sure you want to revoke this share?')) {
      try {
        await axios.delete(`/api/documents/share/${shareId}`);
        setSharedByMe((prev) => prev.filter((share) => share._id !== shareId));
        toast.success('Share revoked successfully');
      } catch (error) {
        console.error('Error revoking share:', error);
        toast.error('Error revoking share');
      }
    }
  };

  const handleDownloadShared = async (shareToken, filename) => {
    try {
      const response = await axios.get(
        `/api/documents/shared/${shareToken}/download`,
        { responseType: 'blob' }
      );

      if (!response.data || response.data.size === 0) {
        toast.error('File is empty or could not be downloaded');
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading shared document:', error);
      toast.error('Error downloading shared document');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shared Documents</h1>
        <p className="text-gray-600">
          Manage documents you've shared and view documents shared with you
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('shared-by-me')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shared-by-me'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shared by Me ({sharedByMe.length})
          </button>
          <button
            onClick={() => setActiveTab('shared-with-me')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shared-with-me'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shared with Me ({sharedWithMe.length})
          </button>
        </nav>
      </div>

      {/* Shared by Me */}
      {activeTab === 'shared-by-me' && (
        <div>
          {sharedByMe.length === 0 ? (
            <div className="text-center py-12">
              <Share2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No shared documents
              </h2>
              <p className="text-gray-600 mb-6">
                You haven't shared any documents yet. Go to your documents to start sharing.
              </p>
              <button
                onClick={() => (window.location.href = '/documents')}
                className="btn-primary"
              >
                View My Documents
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedByMe.map((share) => (
                <div key={share._id} className="card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary-100 rounded-lg">
                        <Share2 className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {share.document?.title || 'Untitled'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {share.document?.category || 'Uncategorized'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {share.sharedWithEmail}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Shared {new Date(share.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {share.permissions || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          share.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {share.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => revokeShare(share._id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shared with Me */}
      {activeTab === 'shared-with-me' && (
        <div>
          {sharedWithMe.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No shared documents
              </h2>
              <p className="text-gray-600">
                No one has shared documents with you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedWithMe.map((share) => (
                <div key={share._id} className="card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-secondary-100 rounded-lg">
                        <Users className="h-6 w-6 text-secondary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {share.document?.title || 'Untitled'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {share.document?.category || 'Uncategorized'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            Shared by {share.sharedBy?.name || 'Unknown'}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(share.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {share.permissions || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          share.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {share.isActive ? 'Available' : 'Expired'}
                      </span>
                      {share.isActive && (
                        <button
                          onClick={() =>
                            handleDownloadShared(
                              share.shareToken,
                              share.document?.title
                            )
                          }
                          className="btn-secondary text-sm py-1 px-3 flex items-center space-x-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SharedDocuments;
