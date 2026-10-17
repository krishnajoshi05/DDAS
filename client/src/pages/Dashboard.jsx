import React, {
  useEffect,
  useState
} from "react";

import axios from "axios";

import {
  useTheme
} from "../context/ThemeContext";

export default function Dashboard(){

  const {
    theme,
    toggleTheme
  } = useTheme();

  const [stats,setStats] =
    useState(null);

  useEffect(()=>{

    axios
      .get("/api/dashboard/stats")
      .then(res=>{

        setStats(res.data);

      })
      .catch(()=>{

        setStats({

          totalFiles:124,
          exactDuplicates:18,
          nearDuplicates:9,
          storageSaved:"12GB"

        });

      });

  },[]);

  if(!stats){

    return(
      <div className="p-10">
        Loading...
      </div>
    );

  }

  return(

    <div className="min-h-screen p-8">

      {/* HERO */}

      <div className="glass-card p-10 mb-10">

        <div className="flex justify-between items-center">

          <div>

            <h1 className="text-6xl font-black">

              DDAS 

            </h1>

            <p className="soft-text mt-4 text-xl">

              Intelligent Duplicate Detection &
              Storage Intelligence Platform

            </p>

          </div>

          <button
            onClick={toggleTheme}
            className="primary-btn px-6 py-3 rounded-2xl"
          >

            {
              theme === "dark"
                ? "Light Mode"
                : "Dark Mode"
            }

          </button>

        </div>

      </div>

      {/* STATS */}

      <div className="grid md:grid-cols-4 gap-6 mb-10">

        <div className="stat-card">

          <p className="soft-text">
            Files Analysed
          </p>

          <h2 className="text-5xl font-black mt-4">
            {stats.totalFiles}
          </h2>

        </div>

        <div className="stat-card">

          <p className="soft-text">
            Exact Duplicates
          </p>

          <h2 className="text-5xl font-black mt-4">
            {stats.exactDuplicates}
          </h2>

        </div>

        <div className="stat-card">

          <p className="soft-text">
            Near Duplicates
          </p>

          <h2 className="text-5xl font-black mt-4">
            {stats.nearDuplicates}
          </h2>

        </div>

        <div className="stat-card">

          <p className="soft-text">
            Storage Saved
          </p>

          <h2 className="text-5xl font-black mt-4">
            {stats.storageSaved}
          </h2>

        </div>

      </div>

      {/* ANALYTICS */}

      <div className="grid md:grid-cols-2 gap-8">

        <div className="glass-card p-8 h-[320px]">

          <div className="flex justify-between items-center mb-6">

            <div>

              <h2 className="text-3xl font-bold">
                Duplicate Scan
              </h2>

              <p className="soft-text mt-2">
                Similarity prediction engine
              </p>

            </div>

            <div className="ai-chip">
              ACTIVE
            </div>

          </div>

          <div className="flex items-center justify-center h-[180px] soft-text">

            Live Duplicate Analytics

          </div>

        </div>

        <div className="glass-card p-8 h-[320px]">

          <div className="flex justify-between items-center mb-6">

            <div>

              <h2 className="text-3xl font-bold">
                File Intelligence
              </h2>

              <p className="soft-text mt-2">
                powered storage analysis
              </p>

            </div>

            <div className="ai-chip">
              LIVE
            </div>

          </div>

          <div className="flex items-center justify-center h-[180px] soft-text">

            Smart File Monitoring

          </div>

        </div>

      </div>

    </div>

  );

}