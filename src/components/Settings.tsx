import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsLayout } from './settings/SettingsLayout';
import { ProfileSettings } from './settings/ProfileSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { ApiKeysSettings } from './settings/ApiKeysSettings';

// Placeholder components for other settings pages
const AIPreferencesSettings = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">AI Preferences</h2>
      <p className="text-slate-300">Configure AI behavior and generation settings</p>
    </div>
    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
      <p className="text-slate-300">AI Preferences settings coming soon...</p>
    </div>
  </div>
);

const NotificationsSettings = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">Notifications</h2>
      <p className="text-slate-300">Control your notification preferences</p>
    </div>
    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
      <p className="text-slate-300">Notifications settings coming soon...</p>
    </div>
  </div>
);

const DataPrivacySettings = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">Data & Privacy</h2>
      <p className="text-slate-300">Manage your data and privacy settings</p>
    </div>
    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
      <p className="text-slate-300">Data & Privacy settings coming soon...</p>
    </div>
  </div>
);

const BillingSettings = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">Billing</h2>
      <p className="text-slate-300">Manage your subscription and payments</p>
    </div>
    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
      <p className="text-slate-300">Billing settings coming soon...</p>
    </div>
  </div>
);

const AdvancedSettings = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">Advanced</h2>
      <p className="text-slate-300">Developer and advanced settings</p>
    </div>
    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
      <p className="text-slate-300">Advanced settings coming soon...</p>
    </div>
  </div>
);

export function Settings() {
  return (
    <SettingsLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/appearance" element={<AppearanceSettings />} />
        <Route path="/ai-preferences" element={<AIPreferencesSettings />} />
        <Route path="/api-keys" element={<ApiKeysSettings />} />
        <Route path="/notifications" element={<NotificationsSettings />} />
        <Route path="/data-privacy" element={<DataPrivacySettings />} />
        <Route path="/billing" element={<BillingSettings />} />
        <Route path="/advanced" element={<AdvancedSettings />} />
      </Routes>
    </SettingsLayout>
  );
}