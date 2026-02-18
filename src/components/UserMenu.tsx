import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[#A39A91] hover:bg-[#8A7F75] text-white rounded-lg transition-colors"
      >
        <User className="w-4 h-4" />
        <span className="max-w-[150px] truncate">{user.name || user.username}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#E5DDD2] py-1 z-50">
          <div className="px-4 py-3 border-b border-[#E5DDD2]">
            <p className="text-sm font-medium text-[#6B605A]">{user.name || user.username}</p>
            {user.email && <p className="text-xs text-[#A39A91] mt-1">{user.email}</p>}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#A35555] hover:bg-[#FAEBEB] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
