'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8081/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user_type_id', data.user_type_id);

      if (data.user_type_id === 1) {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/bg-01.jpg')` }}
    >
      <div className="absolute inset-0 z-0 bg-slate-900/60"></div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
        
        {/* UPDATED LOGO SECTION */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex justify-center mb-4">
             {/* 
                We removed the circle div. 
                Make sure you have your logo saved as 'logo.png' in the 'public' folder.
             */}
             <Image 
               src="/distinctive-logo.jpg" 
               alt="Distinctive Logo" 
               width={200} 
               height={80} 
               className="object-contain" 
               priority
             />
          </div>
          <h2 className="text-xl font-bold tracking-widest text-slate-900 uppercase">
            Secure Login
          </h2>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600" />
            </div>
            <input
              type="text"
              required
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="group w-full rounded-xl border border-slate-200 bg-[#f0f4ff] py-3.5 pl-11 pr-4 text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600" />
            </div>
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="group w-full rounded-xl border border-slate-200 bg-[#f0f4ff] py-3.5 pl-11 pr-4 text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-slate-500">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              Remember me
            </label>
            <a href="#" className="font-semibold text-blue-600 transition-colors hover:text-blue-800">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[#0f172a] py-3.5 font-bold tracking-wider text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:opacity-70"
          >
            {loading ? 'AUTHENTICATING...' : 'LOG IN'}
          </button>
        </form>
      </div>
    </div>
  );
}