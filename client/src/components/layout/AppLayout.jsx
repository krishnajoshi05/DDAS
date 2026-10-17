import React from "react";

import {

  NavLink,
  Outlet,
  useNavigate

} from "react-router-dom";

import {

  LayoutDashboard,
  Upload,
  Bell,
  History,
  Building2,
  LogOut,
  Moon,
  Sun

} from "lucide-react";

import {

  useTheme

} from "../../context/ThemeContext";

import {

  useAuth

} from "../../context/AuthContext";

export default function AppLayout(){

  const navigate =
    useNavigate();

  const {
    darkMode,
    toggleTheme
  } = useTheme();

  const {
    user,
    logout
  } = useAuth();

  const navItems = [

    {

      name:"Dashboard",

      path:"/dashboard",

      icon:<LayoutDashboard size={20}/>

    },

    {

      name:"Upload File",

      path:"/upload",

      icon:<Upload size={20}/>

    },

    {

      name:"Alerts",

      path:"/alerts",

      icon:<Bell size={20}/>

    },

    {

      name:"File History",

      path:"/history",

      icon:<History size={20}/>

    },

    {

      name:"Organisation",

      path:"/organization",

      icon:<Building2 size={20}/>

    }

  ];

  const handleLogout =
    async()=>{

      try{

        await logout();

        navigate('/login');

      }catch(err){

        console.error(err);

      }

    };

  return(

    <div className="flex min-h-screen">

      {/* SIDEBAR */}

      <aside className="w-[280px] border-r border-[var(--border)] bg-[var(--card)] backdrop-blur-xl p-6 flex flex-col justify-between">

        <div>

          {/* LOGO */}

          <div className="mb-12">

            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-2xl font-black shadow-2xl mb-5">

              D

            </div>

            <h1 className="text-4xl font-black">
              DDAS
            </h1>

            <p className="soft-text mt-2">
              Duplicate Detection AI System
            </p>

          </div>

          {/* NAVIGATION */}

          <div className="space-y-3">

            {navItems.map((item,index)=>(

              <NavLink

                key={index}

                to={item.path}

                className={({isActive}) =>

                  `sidebar-link ${
                    isActive
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : ''
                  }`

                }
              >

                {item.icon}

                <span className="font-semibold">
                  {item.name}
                </span>

              </NavLink>

            ))}

          </div>

        </div>

        {/* USER */}

        <div className="glass-card p-5">

          <div className="flex items-center gap-4 mb-5">

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xl font-black">

              {
                user?.name
                  ?.charAt(0)
                  ?.toUpperCase() || 'U'
              }

            </div>

            <div className="min-w-0">

              <h3 className="font-bold truncate">
                {user?.name || 'User'}
              </h3>

              <p className="soft-text text-sm truncate">
                {user?.email}
              </p>

            </div>

          </div>

          {/* THEME */}

          <button
            onClick={toggleTheme}
            className="w-full glass-card py-3 rounded-2xl flex items-center justify-center gap-2 mb-3 font-semibold"
          >

            {
              darkMode
                ? <Sun size={18}/>
                : <Moon size={18}/>
            }

            {
              darkMode
                ? 'Light Mode'
                : 'Dark Mode'
            }

          </button>

          {/* LOGOUT */}

          <button
            onClick={handleLogout}
            className="w-full primary-btn py-3 rounded-2xl flex items-center justify-center gap-2"
          >

            <LogOut size={18}/>

            Sign out

          </button>

        </div>

      </aside>

      {/* MAIN */}

      <main className="flex-1 overflow-y-auto">

        <Outlet/>

      </main>

    </div>

  );

}