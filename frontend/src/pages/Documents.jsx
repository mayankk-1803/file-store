import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Download, Share2, Edit, Trash2, Eye } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ShareModal from '../components/ShareModal.jsx';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [shareModal, setShareModal] = useState({ isOpen: false, document: null });

  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents');
      setDocuments(response.data.documents);
    } catch (error) {
      toast.error('Error fetching documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/documents/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleDelete = async (documentId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await axios.delete(`/api/documents/${documentId}`);
        setDocuments(documents.filter(doc => doc._id !== documentId));
        toast.success('Document deleted successfully');
      } catch (error) {
        toast.error('Error deleting document');
      }
    }
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await axios.get(`/api/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error downloading document');
    }
  };

  const handleShare = (document) => {
    setShareModal({ isOpen: true, document });
  };

  const closeShareModal = () => {
    setShareModal({ isOpen: false, document: null });
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category) => {
    const colors = {
      education: 'bg-blue-100 text-blue-800',
      healthcare: 'bg-green-100 text-green-800',
      government: 'bg-red-100 text-red-800',
      finance: 'bg-yellow-100 text-yellow-800',
      transport: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category.toLowerCase()] || colors.other;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">My Documents</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              className="input-field pl-10 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Category Filter */}
          <select
            className="input-field"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category} className="capitalize">
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No documents found</h2>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Start by uploading your first document'
            }
          </p>
          <button
            onClick={() => window.location.href = '/upload'}
            className="btn-primary"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <div key={document._id} className="card p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <FileText className="h-6 w-6 text-primary-600" />
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                  {document.category}
                </span>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{document.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{document.description}</p>
              
              <div className="text-xs text-gray-500 mb-4">
                <p>Uploaded: {new Date(document.createdAt).toLocaleDateString()}</p>
                <p>Size: {(document.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(document._id, document.filename)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                
                <button 
                  onClick={() => handleShare(document)}
                  className="p-2 text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                
                <button 
                  onClick={() => handleDelete(document._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={closeShareModal}
        document={shareModal.document}
      />
    </div>
  );
};

export default Documents;