import { useState } from 'react';

import {
  Link,
  useNavigate
} from 'react-router-dom';

import toast from 'react-hot-toast';

import {
  Eye,
  EyeOff,
  UserPlus
} from 'lucide-react';

import {
  useAuth
} from '../context/AuthContext';

export default function Register() {

  const navigate =
    useNavigate();

  const { register } =
    useAuth();

  const [show,setShow] =
    useState(false);

  const [loading,setLoading] =
    useState(false);

  const [form,setForm] =
    useState({

      name:'',
      email:'',
      password:'',
      organizationName:''

    });

  const handleChange =
    (e)=>{

      setForm({

        ...form,

        [e.target.name]:
          e.target.value

      });

    };

  const handleSubmit =
    async(e)=>{

      e.preventDefault();

      setLoading(true);

      try{

        await register(form);

        toast.success(
          'Registration successful'
        );

        navigate('/dashboard');

      }catch(err){

        console.error(err);

        toast.error(

          err.response?.data?.message ||

          'Registration failed'

        );

      }finally{

        setLoading(false);

      }

    };

  return(

    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-8 relative overflow-hidden">

      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />

      <div className="w-full max-w-lg relative z-10">

        <div className="glass-card p-10 rounded-[32px]">

          <div className="mb-10">

            <div className="ai-chip mb-4 inline-flex">
              CREATE ACCOUNT
            </div>

            <h1 className="text-5xl font-black mb-3">
              Register
            </h1>

            <p className="soft-text text-lg">
              Create your enterprise workspace
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* NAME */}

            <div>

              <label className="block mb-2 font-semibold">
                Full Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full glass-card px-5 py-4 rounded-2xl bg-transparent outline-none"
                required
              />

            </div>

            {/* EMAIL */}

            <div>

              <label className="block mb-2 font-semibold">
                Email Address
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full glass-card px-5 py-4 rounded-2xl bg-transparent outline-none"
                required
              />

            </div>

            {/* PASSWORD */}

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
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full glass-card px-5 py-4 rounded-2xl bg-transparent outline-none pr-14"
                  required
                />

                <button
                  type="button"
                  onClick={()=>setShow(!show)}
                  className="absolute right-5 top-1/2 -translate-y-1/2"
                >

                  {
                    show
                      ? <EyeOff size={20}/>
                      : <Eye size={20}/>
                  }

                </button>

              </div>

            </div>

            {/* ORGANIZATION */}

            <div>

              <label className="block mb-2 font-semibold">
                Organization Name
              </label>

              <input
                type="text"
                name="organizationName"
                value={form.organizationName}
                onChange={handleChange}
                className="w-full glass-card px-5 py-4 rounded-2xl bg-transparent outline-none"
                placeholder="Optional"
              />

            </div>

            {/* BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="primary-btn w-full py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2"
            >

              <UserPlus size={20}/>

              {
                loading
                  ? 'Creating account...'
                  : 'Create Account'
              }

            </button>

          </form>

          <p className="soft-text text-center mt-8">

            Already have an account?{' '}

            <Link
              to="/login"
              className="text-violet-400 font-bold"
            >

              Login

            </Link>

          </p>

        </div>

      </div>

    </div>

  );

}