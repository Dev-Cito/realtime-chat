'use client';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { disconnectSocket } from '@/lib/socket';

export default function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      disconnectSocket();
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <nav className="bg-[#111a15] border-b border-[#1e3327] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/chat" className="text-xl font-bold text-[#f0fdf4]">
          💬 ChatApp
        </Link>
        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-[#f0fdf4]">{user?.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-[#86efac] hover:text-[#f0fdf4] transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#86efac] hover:text-[#f0fdf4] transition">
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm bg-[#16a34a] text-[#f0fdf4] px-4 py-2 rounded-lg hover:bg-[#14532d] transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}