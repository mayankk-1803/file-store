import React, { useState } from 'react';
import { X, Mail, Calendar, Eye, Download, Send } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ShareModal = ({ isOpen, onClose, document }) => {
  const [formData, setFormData] = useState({
    email: '',
    permissions: 'view',
    expiresIn: '7'
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/documents/share', {
        documentId: document._id,
        email: formData.email,
        permissions: formData.permissions,
        expiresIn: parseInt(formData.expiresIn)
      });

      toast.success('Document shared successfully!');
      onClose();
      
      // Reset form
      setFormData({
        email: '',
        permissions: 'view',
        expiresIn: '7'
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sharing document');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Document Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-1">{document?.title}</h3>
            <p className="text-sm text-gray-600 capitalize">{document?.category}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Share with Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="input-field pl-10"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label htmlFor="permissions" className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <select
                id="permissions"
                name="permissions"
                className="input-field"
                value={formData.permissions}
                onChange={handleInputChange}
              >
                <option value="view">View Only</option>
                <option value="download">View & Download</option>
              </select>
              <div className="mt-2 text-xs text-gray-500">
                {formData.permissions === 'view' ? (
                  <div className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    Recipient can only view the document
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Download className="h-3 w-3 mr-1" />
                    Recipient can view and download the document
                  </div>
                )}
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label htmlFor="expiresIn" className="block text-sm font-medium text-gray-700 mb-2">
                Access Expires In
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="expiresIn"
                  name="expiresIn"
                  className="input-field pl-10"
                  value={formData.expiresIn}
                  onChange={handleInputChange}
                >
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="">Never Expires</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Share Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;