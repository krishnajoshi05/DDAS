import { useState } from 'react';

import {

  Link,
  useNavigate

} from 'react-router-dom';

import toast from 'react-hot-toast';

import {

  Eye,
  EyeOff,
  ShieldCheck,
  Database,
  BellRing,
  Zap

} from 'lucide-react';

import {
  useAuth
} from '../context/AuthContext';

export default function Login() {

  const navigate =
    useNavigate();

  const { login } =
    useAuth();

  const [email,setEmail] =
    useState('');

  const [password,setPassword] =
    useState('');

  const [loading,setLoading] =
    useState(false);

  const [show,setShow] =
    useState(false);

  const handleSubmit =
    async(e)=>{

      e.preventDefault();

      setLoading(true);

      try{

        await login({

          email,
          password

        });

        toast.success(
          'Login successful'
        );

        navigate('/dashboard');

      }catch(err){

        toast.error(

          err.response?.data?.message ||

          'Invalid credentials'

        );

      }finally{

        setLoading(false);

      }

    };

  return(

    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex overflow-hidden">

      {/* LEFT PANEL */}

      <div className="hidden lg:flex w-1/2 relative border-r border-[var(--border)]">

        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-cyan-500/10" />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full">

          <div>

            <div className="flex items-center gap-4 mb-16">

              <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-2xl shadow-2xl">

                D

              </div>

              <div>

                <h1 className="text-4xl font-black">
                  DDAS 
                </h1>

                <p className="soft-text">
                  Enterprise Duplicate Detection
                </p>

              </div>

            </div>

            <div className="max-w-xl">

              <div className="ai-chip mb-6 inline-flex">
                ENTERPRISE STORAGE INTELLIGENCE
              </div>

              <h2 className="text-6xl font-black leading-tight mb-8">

                Stop wasting storage on duplicate files.

              </h2>

              <p className="soft-text text-xl leading-relaxed">

                 duplicate detection,
                similarity analysis,
                organization-wide monitoring,
                and intelligent storage optimization.

              </p>

            </div>

          </div>

          {/* FEATURES */}

          <div className="grid grid-cols-2 gap-5">

            <div className="glass-card p-5">

              <Database className="mb-4 text-violet-400" />

              <h3 className="font-bold mb-2">
                SHA-256 Detection
              </h3>

              <p className="soft-text text-sm">
                Exact duplicate fingerprinting
              </p>

            </div>

            <div className="glass-card p-5">

              <Zap className="mb-4 text-cyan-400" />

              <h3 className="font-bold mb-2">
                 Similarity
              </h3>

              <p className="soft-text text-sm">
                Intelligent duplicate prediction
              </p>

            </div>

            <div className="glass-card p-5">

              <BellRing className="mb-4 text-pink-400" />

              <h3 className="font-bold mb-2">
                Real-time Alerts
              </h3>

              <p className="soft-text text-sm">
                Instant organization notifications
              </p>

            </div>

            <div className="glass-card p-5">

              <ShieldCheck className="mb-4 text-emerald-400" />

              <h3 className="font-bold mb-2">
                Enterprise Security
              </h3>

              <p className="soft-text text-sm">
                Secure organizational storage
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* RIGHT PANEL */}

      <div className="flex-1 flex items-center justify-center p-10 relative">

        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />

        <div className="relative z-10 w-full max-w-md">

          <div className="glass-card p-10 rounded-[32px]">

            <div className="mb-10">

              <div className="ai-chip mb-4 inline-flex">
                AUTHENTICATION
              </div>

              <h1 className="text-5xl font-black mb-3">
                Welcome Back
              </h1>

              <p className="soft-text text-lg">
                Login to your enterprise workspace
              </p>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              <div>

                <label className="block mb-2 font-semibold">
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  className="w-full glass-card px-5 py-4 rounded-2xl bg-transparent outline-none"
                  placeholder="Enter your email"
                  required
                />

              </div>

              <div>

                <label className="block mb-2 font-semibold">
                  Password
                </label>

                <div className="relative">

                  <input
                    type={
                      show
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    className="w-full glass-card px-5 py-4 rounded-2xl bg-transparent outline-none pr-14"
                    placeholder="Enter password"
                    required
                  />

                  <button
                    type="button"
                    onClick={()=>setShow(!show)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 soft-text"
                  >

                    {
                      show
                        ? <EyeOff size={20}/>
                        : <Eye size={20}/>
                    }

                  </button>

                </div>

              </div>

              <button
                type="submit"
                disabled={loading}
                className="primary-btn w-full py-4 rounded-2xl text-lg font-bold"
              >

                {
                  loading
                    ? 'Signing in...'
                    : 'Sign In'
                }

              </button>

            </form>

            {/* DEMO */}

            <div className="glass-card p-5 mt-8">

              <h3 className="font-bold mb-3">
                Demo Credentials
              </h3>

              <div className="space-y-2 text-sm soft-text">

                <p>
                  Admin:
                  admin@sviit.ac.in / admin123
                </p>

                <p>
                  User:
                  student@sviit.ac.in / student123
                </p>

              </div>

            </div>

            {/* REGISTER */}

            <p className="soft-text text-center mt-8">

              Don&apos;t have an account?{' '}

              <Link
                to="/register"
                className="text-violet-400 font-bold"
              >

                Register

              </Link>

            </p>

          </div>

        </div>

      </div>

    </div>

  );

}