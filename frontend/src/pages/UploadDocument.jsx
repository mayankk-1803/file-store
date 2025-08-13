import React, { useState } from 'react';
import { Upload, File, X, Plus } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const UploadDocument = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    customCategory: ''
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const categories = [
    'Education',
    'Healthcare', 
    'Government',
    'Finance',
    'Transport',
    'Other'
  ];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const uploadPromises = files.map(async (fileObj) => {
        const formDataToSend = new FormData();
        formDataToSend.append('file', fileObj.file);
        formDataToSend.append('title', formData.title || fileObj.name);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('category', formData.category === 'custom' ? formData.customCategory : formData.category);

        return axios.post('/api/documents/upload', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // You can update progress here if needed
          }
        });
      });

      await Promise.all(uploadPromises);
      
      toast.success(`${files.length} document(s) uploaded successfully!`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        customCategory: ''
      });
      setFiles([]);
      
      // Redirect to documents page
      setTimeout(() => {
        window.location.href = '/documents';
      }, 1500);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Document</h1>
        <p className="text-gray-600">
          Add new documents to your secure digital collection
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Document Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className="input-field"
                placeholder="Enter document title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                name="category"
                className="input-field"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category.toLowerCase()}>
                    {category}
                  </option>
                ))}
                <option value="custom">Other (specify below)</option>
              </select>
            </div>

            {formData.category === 'custom' && (
              <div className="md:col-span-2">
                <label htmlFor="customCategory" className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Category
                </label>
                <input
                  type="text"
                  id="customCategory"
                  name="customCategory"
                  className="input-field"
                  placeholder="Enter custom category"
                  value={formData.customCategory}
                  onChange={handleInputChange}
                  required={formData.category === 'custom'}
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="input-field"
                placeholder="Enter document description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h2>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Support for PDFs, images, and documents up to 10MB each
            </p>
            <input
              type="file"
              multiple
              className="hidden"
              id="file-upload"
              onChange={(e) => handleFiles(e.target.files)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
            />
            <label
              htmlFor="file-upload"
              className="btn-primary cursor-pointer inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Choose Files
            </label>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Selected Files</h3>
              <div className="space-y-2">
                {files.map((fileObj) => (
                  <div
                    key={fileObj.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <File className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{fileObj.name}</p>
                        <p className="text-xs text-gray-500">
                          {(fileObj.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(fileObj.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-3 border bg-purple-500 text-gray-700 rounded-lg hover:bg-purple-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="btn-primary bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </div>
            ) : (
              `Upload ${files.length} Document${files.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadDocument;