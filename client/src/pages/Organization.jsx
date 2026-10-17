import { useEffect, useState } from 'react';

import toast from 'react-hot-toast';

import {
  Building2,
  Users,
  FileText,
  Copy,
  LogOut,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

import {
  orgAPI,
  filesAPI
} from '../api';

import { useAuth }
from '../context/AuthContext';

import {
  formatBytes,
  formatDate
} from '../utils/formatters';

export default function Organization() {

  const { refreshUser } =
    useAuth();

  const [org,setOrg] =
    useState(null);

  const [members,setMembers] =
    useState([]);

  const [orgFiles,setOrgFiles] =
    useState([]);

  const [loading,setLoading] =
    useState(true);

  const [mode,setMode] =
    useState(null);

  const [name,setName] =
    useState('');

  const [desc,setDesc] =
    useState('');

  const [code,setCode] =
    useState('');

  const [busy,setBusy] =
    useState(false);

  /* =====================================================
     LOAD
  ===================================================== */

  const load = async()=>{

    setLoading(true);

    try{

      const [
        meRes,
        memRes,
        fileRes
      ] = await Promise.all([

        orgAPI.me(),

        orgAPI.members(),

        filesAPI.getOrgFiles()

      ]);

      setOrg(
        meRes.data.organization
      );

      setMembers(
        memRes.data.members || []
      );

      setOrgFiles(
        fileRes.data.files || []
      );

    }catch(err){

      console.error(err);

    }finally{

      setLoading(false);

    }

  };

  useEffect(()=>{

    load();

  },[]);

  /* =====================================================
     CREATE
  ===================================================== */

  const handleCreate =
    async(e)=>{

      e.preventDefault();

      setBusy(true);

      try{

        await orgAPI.create({

          name,
          description:desc

        });

        await refreshUser();

        toast.success(
          'Organisation created'
        );

        setMode(null);

        setName('');
        setDesc('');

        await load();

      }catch(err){

        toast.error(

          err.response?.data?.message ||

          'Failed to create'

        );

      }finally{

        setBusy(false);

      }

    };

  /* =====================================================
     JOIN
  ===================================================== */

  const handleJoin =
    async(e)=>{

      e.preventDefault();

      setBusy(true);

      try{

        await orgAPI.join(code);

        await refreshUser();

        toast.success(
          'Joined organisation'
        );

        setCode('');

        setMode(null);

        await load();

      }catch(err){

        toast.error(

          err.response?.data?.message ||

          'Failed to join'

        );

      }finally{

        setBusy(false);

      }

    };

  /* =====================================================
     LEAVE
  ===================================================== */

  const handleLeave =
    async()=>{

      if(
        !window.confirm(
          'Leave organisation?'
        )
      ) return;

      try{

        await orgAPI.leave();

        await refreshUser();

        toast.success(
          'Left organisation'
        );

        window.location.reload();

      }catch(err){

        toast.error(
          'Failed to leave'
        );

      }

    };

  /* =====================================================
     COPY CODE
  ===================================================== */

  const copyCode = ()=>{

    navigator.clipboard.writeText(
      org.inviteCode
    );

    toast.success(
      'Invite code copied'
    );

  };

  /* =====================================================
     STATS
  ===================================================== */

  const duplicateCount =
    orgFiles.filter(
      f=>f.isDuplicate
    ).length;

  const totalStorage =
    orgFiles.reduce(
      (a,b)=>
        a + (b.fileSize || 0),
      0
    );

  /* =====================================================
     LOADING
  ===================================================== */

  if(loading){

    return(

      <div className="flex items-center justify-center h-[70vh]">

        <div className="glass-card px-8 py-6 flex items-center gap-3">

          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/>

          <span>
            Loading organisation...
          </span>

        </div>

      </div>

    );

  }

  /* =====================================================
     NO ORGANIZATION
  ===================================================== */

  if(!org){

    return(

      <div className="p-10 max-w-3xl">

        <div className="mb-8">

          <div className="ai-chip mb-4 inline-flex">
            ORGANIZATION SYSTEM
          </div>

          <h1 className="text-5xl font-black">
            Organisation
          </h1>

        </div>

        {mode === null && (

          <div className="glass-card p-10 text-center">

            <Building2
              size={60}
              className="mx-auto mb-6 text-violet-400"
            />

            <h2 className="text-3xl font-black mb-4">
              No Organisation Yet
            </h2>

            <div className="flex justify-center gap-4 mt-8">

              <button
                onClick={()=>setMode('create')}
                className="primary-btn px-8 py-4 rounded-2xl"
              >
                Create Organisation
              </button>

              <button
                onClick={()=>setMode('join')}
                className="glass-card px-8 py-4 rounded-2xl"
              >
                Join Organisation
              </button>

            </div>

          </div>

        )}

        {mode === 'create' && (

          <form
            onSubmit={handleCreate}
            className="glass-card p-8 space-y-5"
          >

            <input
              className="glass-card w-full px-5 py-4 rounded-2xl bg-transparent"
              placeholder="Organisation Name"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              required
            />

            <input
              className="glass-card w-full px-5 py-4 rounded-2xl bg-transparent"
              placeholder="Description"
              value={desc}
              onChange={(e)=>setDesc(e.target.value)}
            />

            <button
              className="primary-btn w-full py-4 rounded-2xl"
            >
              {
                busy
                  ? 'Creating...'
                  : 'Create'
              }
            </button>

          </form>

        )}

        {mode === 'join' && (

          <form
            onSubmit={handleJoin}
            className="glass-card p-8 space-y-5"
          >

            <input
              className="glass-card w-full px-5 py-4 rounded-2xl bg-transparent uppercase"
              placeholder="Invite Code"
              value={code}
              onChange={(e)=>setCode(e.target.value)}
              required
            />

            <button
              className="primary-btn w-full py-4 rounded-2xl"
            >
              {
                busy
                  ? 'Joining...'
                  : 'Join'
              }
            </button>

          </form>

        )}

      </div>

    );

  }

  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return(

    <div className="p-8 space-y-8">

      {/* HEADER */}

      <div>

        <div className="ai-chip mb-4 inline-flex">
          ORGANIZATION WORKSPACE
        </div>

        <h1 className="text-5xl font-black">
          {org.name}
        </h1>

        <p className="soft-text mt-4">
          {org.description}
        </p>

      </div>

      {/* STATS */}

      <div className="grid md:grid-cols-4 gap-6">

        <div className="stat-card">

          <Users className="text-violet-400 mb-3"/>

          <p className="soft-text">
            Members
          </p>

          <h2 className="text-3xl font-black">
            {members.length}
          </h2>

        </div>

        <div className="stat-card">

          <FileText className="text-cyan-400 mb-3"/>

          <p className="soft-text">
            Files
          </p>

          <h2 className="text-3xl font-black">
            {orgFiles.length}
          </h2>

        </div>

        <div className="stat-card">

          <ShieldCheck className="text-red-400 mb-3"/>

          <p className="soft-text">
            Duplicates
          </p>

          <h2 className="text-3xl font-black">
            {duplicateCount}
          </h2>

        </div>

        <div className="stat-card">

          <HardDrive className="text-emerald-400 mb-3"/>

          <p className="soft-text">
            Storage
          </p>

          <h2 className="text-2xl font-black">
            {formatBytes(totalStorage)}
          </h2>

        </div>

      </div>

      {/* INVITE */}

      <div className="glass-card p-6 flex justify-between items-center">

        <div>

          <p className="soft-text text-sm">
            Invite Code
          </p>

          <h2 className="text-3xl font-black tracking-widest">
            {org.inviteCode}
          </h2>

        </div>

        <button
          onClick={copyCode}
          className="primary-btn px-6 py-4 rounded-2xl flex items-center gap-2"
        >

          <Copy size={18}/>

          Copy

        </button>

      </div>

      {/* MEMBERS */}

      <div className="glass-card p-6">

        <h2 className="text-2xl font-black mb-6">
          Members
        </h2>

        <div className="space-y-4">

          {members.map((m)=>(

            <div
              key={m._id}
              className="glass-card p-4 flex justify-between items-center"
            >

              <div>

                <p className="font-semibold">
                  {m.name}
                </p>

                <p className="soft-text text-sm">
                  {m.email}
                </p>

              </div>

              <div className="text-right">

                <p className="ai-chip">
                  {m.role}
                </p>

                <p className="soft-text text-xs mt-2">
                  {formatDate(m.createdAt)}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

      {/* FILES */}

      <div className="glass-card p-6">

        <h2 className="text-3xl font-black mb-6">
          Organisation Files
        </h2>

        {orgFiles.length === 0 ? (

          <p className="soft-text">
            No organization files uploaded yet.
          </p>

        ) : (

          <div className="grid md:grid-cols-2 gap-5">

            {orgFiles.map((f)=>(

              <div
                key={f._id}
                className="glass-card p-5"
              >

                {/* PREVIEW */}

                {(f.mimeType?.startsWith('image/') ||
                  f.mimeType === 'application/pdf') && (

                  <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">

                    {f.mimeType?.startsWith('image/') ? (

                      <img
                        src={`http://localhost:5000/uploads/${f.fileName}`}
                        alt={f.originalName}
                        className="
                          w-full
                          h-52
                          object-cover
                          hover:scale-105
                          transition
                          duration-300
                        "
                      />

                    ) : (

                      <iframe
                        src={`http://localhost:5000/uploads/${f.fileName}`}
                        title={f.originalName}
                        className="
                          w-full
                          h-52
                          bg-black
                        "
                      />

                    )}

                  </div>

                )}

                {/* CONTENT */}

                <div className="flex justify-between items-start mb-5">

                  <div className="flex-1">

                    <h3 className="font-bold text-lg break-all">
                      {f.originalName}
                    </h3>

                    <p className="soft-text text-sm mt-1">
                      {f.mimeType}
                    </p>

                  </div>

                  {f.isDuplicate && (

                    <div className="ai-chip ml-3">
                      {f.duplicateKind}
                    </div>

                  )}

                </div>

                {/* FOOTER */}

                <div className="flex items-center justify-between">

                  <div>

                    <p className="soft-text text-sm">
                      {formatBytes(f.fileSize)}
                    </p>

                    <p className="soft-text text-xs mt-1">

                      Uploaded by:
                      {' '}
                      {f.uploadedBy?.name || 'Unknown'}

                    </p>

                  </div>

                  <div className="flex gap-3">

                    <a
                      href={`http://localhost:5000/uploads/${f.fileName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        primary-btn
                        px-4
                        py-2
                        rounded-xl
                        text-sm
                      "
                    >
                      Preview
                    </a>

                    <a
                      href={`http://localhost:5000/uploads/${f.fileName}`}
                      download
                      className="
                        glass-card
                        px-4
                        py-2
                        rounded-xl
                        text-sm
                      "
                    >
                      Download
                    </a>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* LEAVE */}

      <button
        onClick={handleLeave}
        className="
          glass-card
          px-6
          py-4
          rounded-2xl
          flex
          items-center
          gap-2
          text-red-400
          font-bold
        "
      >

        <LogOut size={18}/>

        Leave Organisation

      </button>

    </div>

  );

}