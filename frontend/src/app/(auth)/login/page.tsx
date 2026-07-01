'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { setSessionCookie } from '@/lib/session';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data);
      const token = res.data.data.token;
      const meRes = await api.get('/auth/me');
      setAuth(meRes.data.data, token);
      setSessionCookie();
      router.push('/chat');
    } catch {
      setError('root', { message: 'Invalid email or password' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d]">
      <div className="w-full max-w-md bg-[#111a15] rounded-2xl border border-[#1e3327] p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#f0fdf4] mb-1">Welcome back 👋</h1>
          <p className="text-[#86efac] text-sm">Sign in to continue chatting</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#f0fdf4] mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="w-full bg-[#162019] border border-[#1e3327] text-[#f0fdf4] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f0fdf4] mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              className="w-full bg-[#162019] border border-[#1e3327] text-[#f0fdf4] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {errors.root && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{errors.root.message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#16a34a] text-[#f0fdf4] rounded-lg py-2.5 text-sm font-medium hover:bg-[#14532d] transition disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-[#4ade80] mt-6">
          No account?{' '}
          <Link href="/register" className="text-green-400 hover:text-green-300">Sign up</Link>
        </p>
      </div>
    </div>
  );
}