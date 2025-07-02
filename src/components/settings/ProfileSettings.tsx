import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService, UserProfile } from '../../services/settingsService';
import { AvatarUpload } from './AvatarUpload';
import { 
  Loader2, 
  Mail, 
  User, 
  Building, 
  MapPin, 
  Link as LinkIcon,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(160, 'Bio must be less than 160 characters').optional(),
  company: z.string().max(100, 'Company name must be less than 100 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: user?.email || '',
      bio: '',
      company: '',
      location: '',
      website: '',
    }
  });

  // Load user profile on component mount
  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
    }
  }, [user?.id]);

  const loadUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      const profile = await settingsService.getUserProfile(user.id);
      if (profile) {
        setCurrentProfile(profile);
        form.reset({
          name: profile.name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          bio: profile.bio || '',
          company: profile.company || '',
          location: profile.location || '',
          website: profile.website || '',
        });
      } else {
        // No profile exists yet, use default values
        form.reset({
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          bio: '',
          company: '',
          location: '',
          website: '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setErrorMessage('Failed to load profile data');
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const updatedProfile = await settingsService.updateUserProfile(user.id, {
        name: data.name,
        bio: data.bio || null,
        company: data.company || null,
        location: data.location || null,
        website: data.website || null,
      });
      
      setCurrentProfile(updatedProfile);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (file: File | null) => {
    if (!user?.id || !file) return;
    
    setAvatarLoading(true);
    setAvatarError('');
    
    try {
      const avatarUrl = await settingsService.uploadAvatar(user.id, file);
      
      // Update the profile with new avatar URL
      const updatedProfile = await settingsService.updateUserProfile(user.id, {
        avatar_url: avatarUrl
      });
      
      setCurrentProfile(updatedProfile);
      setSuccessMessage('Profile picture updated successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setAvatarError('Failed to upload profile picture. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.id) return;
    
    setAvatarLoading(true);
    setAvatarError('');
    
    try {
      // Remove avatar URL from profile
      const updatedProfile = await settingsService.updateUserProfile(user.id, {
        avatar_url: null
      });
      
      setCurrentProfile(updatedProfile);
      setSuccessMessage('Profile picture removed successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error removing avatar:', error);
      setAvatarError('Failed to remove profile picture. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    try {
      await settingsService.deleteUserAccount(user.id);
      // User will be automatically signed out by the auth system
    } catch (error) {
      console.error('Error deleting account:', error);
      setErrorMessage('Failed to delete account. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Profile</h2>
        <p className="text-slate-300">
          Manage your personal information and public profile
        </p>
      </div>
      
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}
      
      {/* Avatar Upload Section */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
        <AvatarUpload
          currentAvatarUrl={currentProfile?.avatar_url || undefined}
          onAvatarChange={handleAvatarChange}
          onAvatarRemove={handleAvatarRemove}
          loading={avatarLoading}
          error={avatarError}
        />
      </div>
      
      {/* Profile Form */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-6">Personal Information</h3>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <User className="h-4 w-4" />
              Display Name *
            </label>
            <input
              id="name"
              {...form.register('name')}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Enter your display name"
              aria-describedby="name-error"
            />
            {form.formState.errors.name && (
              <p id="name-error" className="text-sm text-red-400">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          
          {/* Email Field (Read-only) */}
          <div className="space-y-2">
            <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Mail className="h-4 w-4" />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              {...form.register('email')}
              disabled
              className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-400 cursor-not-allowed"
              aria-describedby="email-help"
            />
            <p id="email-help" className="text-xs text-slate-500">
              Your email address cannot be changed from this page. Contact support if you need to update it.
            </p>
          </div>
          
          {/* Bio Field */}
          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium text-slate-300">
              Bio
            </label>
            <textarea
              id="bio"
              {...form.register('bio')}
              placeholder="Tell us a little about yourself"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
              rows={3}
              aria-describedby="bio-count bio-error"
            />
            <div className="flex justify-between">
              {form.formState.errors.bio && (
                <p id="bio-error" className="text-sm text-red-400">
                  {form.formState.errors.bio.message}
                </p>
              )}
              <p id="bio-count" className="text-xs text-slate-400 ml-auto">
                {form.watch('bio')?.length || 0}/160 characters
              </p>
            </div>
          </div>
          
          {/* Company Field */}
          <div className="space-y-2">
            <label htmlFor="company" className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Building className="h-4 w-4" />
              Company
            </label>
            <input
              id="company"
              {...form.register('company')}
              placeholder="Where do you work?"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            {form.formState.errors.company && (
              <p className="text-sm text-red-400">
                {form.formState.errors.company.message}
              </p>
            )}
          </div>
          
          {/* Location Field */}
          <div className="space-y-2">
            <label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <MapPin className="h-4 w-4" />
              Location
            </label>
            <input
              id="location"
              {...form.register('location')}
              placeholder="City, Country"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            {form.formState.errors.location && (
              <p className="text-sm text-red-400">
                {form.formState.errors.location.message}
              </p>
            )}
          </div>
          
          {/* Website Field */}
          <div className="space-y-2">
            <label htmlFor="website" className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <LinkIcon className="h-4 w-4" />
              Website
            </label>
            <input
              id="website"
              type="url"
              {...form.register('website')}
              placeholder="https://your-website.com"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            {form.formState.errors.website && (
              <p className="text-sm text-red-400">
                {form.formState.errors.website.message}
              </p>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isLoading || !form.formState.isDirty}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Danger Zone */}
      <div className="p-6 rounded-xl bg-red-900/20 border border-red-500/30 backdrop-blur">
        <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-medium text-white">Delete Account</p>
            <p className="text-sm text-slate-300">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-red-500/30 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Confirm Account Deletion</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Are you absolutely sure you want to delete your account? This will permanently remove:
            </p>
            <ul className="text-sm text-slate-400 mb-6 space-y-1">
              <li>• Your profile and personal information</li>
              <li>• All your database designs and projects</li>
              <li>• Your API keys and integrations</li>
              <li>• All usage history and data</li>
            </ul>
            <p className="text-sm text-red-300 mb-6 font-medium">
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}