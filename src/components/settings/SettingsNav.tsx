import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  User, 
  Palette, 
  Brain, 
  Key, 
  Bell, 
  Shield, 
  CreditCard,
  Code2,
  ChevronRight
} from 'lucide-react';

const navItems = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: User,
    description: 'Manage your account details'
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Customize your interface'
  },
  {
    title: 'AI Preferences',
    href: '/settings/ai-preferences',
    icon: Brain,
    description: 'Configure AI behavior'
  },
  {
    title: 'API Keys',
    href: '/settings/api-keys',
    icon: Key,
    description: 'Manage integrations'
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Control your notifications'
  },
  {
    title: 'Data & Privacy',
    href: '/settings/data-privacy',
    icon: Shield,
    description: 'Your data and privacy'
  },
  {
    title: 'Billing',
    href: '/settings/billing',
    icon: CreditCard,
    description: 'Subscription and payments'
  },
  {
    title: 'Advanced',
    href: '/settings/advanced',
    icon: Code2,
    description: 'Developer settings'
  }
];

export function SettingsNav() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigation = (href: string) => {
    navigate(href);
  };
  
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;
        
        return (
          <button
            key={item.href}
            onClick={() => handleNavigation(item.href)}
            className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 w-full text-left ${
              isActive 
                ? 'bg-white/70 dark:bg-gray-800/70 shadow-md' 
                : 'hover:bg-white/60 dark:hover:bg-gray-800/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <div className={`p-2 rounded-lg transition-colors duration-200 ${
              isActive 
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:text-purple-600'
            }`}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1">
              <p className={`font-medium text-sm transition-colors ${
                isActive ? 'text-foreground' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
              }`}>
                {item.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">
                {item.description}
              </p>
            </div>
            
            <ChevronRight className={`h-4 w-4 transition-all duration-200 ${
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } group-hover:translate-x-1`} />
          </button>
        );
      })}
    </nav>
  );
}