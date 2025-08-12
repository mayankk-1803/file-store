import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, Share2, TrendingUp, Users, Clock, Shield } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../utils/AuthContext.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    recentDocuments: [],
    sharedDocuments: 0,
    categories: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/documents/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Upload Document',
      description: 'Add a new document to your collection',
      icon: Upload,
      link: '/upload',
      color: 'bg-primary-500 hover:bg-primary-600'
    },
    {
      title: 'View Documents',
      description: 'Browse all your documents',
      icon: FileText,
      link: '/documents',
      color: 'bg-secondary-500 hover:bg-secondary-600'
    },
    {
      title: 'Shared Documents',
      description: 'Manage shared documents',
      icon: Share2,
      link: '/shared',
      color: 'bg-accent-500 hover:bg-accent-600'
    }
  ];

  const statCards = [
    {
      title: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'text-primary-600 bg-primary-100'
    },
    {
      title: 'Shared Documents',
      value: stats.sharedDocuments,
      icon: Share2,
      color: 'text-secondary-600 bg-secondary-100'
    },
    {
      title: 'Categories',
      value: Object.keys(stats.categories).length,
      icon: TrendingUp,
      color: 'text-accent-600 bg-accent-100'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">Manage your digital documents securely and efficiently.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="card p-6 hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${action.color} text-white`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Documents */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Documents</h2>
          {stats.recentDocuments.length > 0 ? (
            <div className="space-y-4">
              {stats.recentDocuments.map((doc, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{doc.category}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <Link
                to="/documents"
                className="block text-center text-primary-600 hover:text-primary-700 font-medium mt-4"
              >
                View all documents →
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No documents yet</p>
              <Link to="/upload" className="text-primary-600 hover:text-primary-700 font-medium">
                Upload your first document
              </Link>
            </div>
          )}
        </div>

        {/* Categories Overview */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories Overview</h2>
          {Object.keys(stats.categories).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.categories).map(([category, count], index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900 capitalize">{category}</span>
                  <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No categories yet</p>
              <p className="text-sm text-gray-400">Upload documents to see category breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-8 bg-gradient-to-r from-secondary-50 to-primary-50 rounded-xl p-6 border border-secondary-200">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-secondary-100 rounded-lg">
            <Shield className="h-5 w-5 text-secondary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Your documents are secure</h3>
            <p className="text-sm text-gray-600">
              All documents are encrypted and linked to your Aadhaar for maximum security. 
              Only you can access your documents unless explicitly shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;