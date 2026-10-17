import { useState, useEffect } from 'react';

import { filesAPI } from '../api';

import {
  FileText,
  Search,
  Clock3,
  ShieldCheck
} from 'lucide-react';

import {
  formatBytes,
  formatDate,
  shortHash
} from '../utils/formatters';

export default function History() {

  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    filesAPI
      .getAll()
      .then(res => setFiles(res.data.files))
      .finally(() => setLoading(false));

  }, []);

  const filtered = files.filter(f =>
    f.originalName
      ?.toLowerCase()
      .includes(query.toLowerCase())
  );

  if (loading) {

    return (

      <div className="flex items-center justify-center h-[60vh]">

        <div className="glass-card px-8 py-6 flex items-center gap-3">

          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />

          <span className="soft-text">
            Loading file intelligence...
          </span>

        </div>

      </div>

    );

  }

  return (

    <div className="p-8">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">

        <div>

          <div className="ai-chip mb-4 inline-flex">
            STORAGE INTELLIGENCE
          </div>

          <h1 className="text-5xl font-black">
            File History
          </h1>

          <p className="soft-text mt-3 text-lg">
            Monitor uploaded files, hashes and duplicate activity
          </p>

        </div>

        {/* SEARCH */}

        <div className="relative w-full md:w-[320px]">

          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 soft-text"
          />

          <input
            className="glass-card w-full pl-12 pr-4 py-4 rounded-2xl outline-none bg-transparent"
            placeholder="Search uploaded files..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />

        </div>

      </div>

      {/* STATS */}

      <div className="grid md:grid-cols-3 gap-6 mb-8">

        <div className="stat-card">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">

              <FileText size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Total Files
              </p>

              <h2 className="text-3xl font-black">
                {files.length}
              </h2>

            </div>

          </div>

        </div>

        <div className="stat-card">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">

              <ShieldCheck size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Duplicates
              </p>

              <h2 className="text-3xl font-black">
                {files.filter(f => f.isDuplicate).length}
              </h2>

            </div>

          </div>

        </div>

        <div className="stat-card">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">

              <Clock3 size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Latest Upload
              </p>

              <h2 className="text-xl font-black truncate max-w-[180px]">
                {files[0]?.originalName || '—'}
              </h2>

            </div>

          </div>

        </div>

      </div>

      {/* TABLE */}

      <div className="glass-card overflow-hidden">

        {filtered.length === 0 ? (

          <div className="p-20 text-center">

            <div className="w-24 h-24 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6 text-violet-400">

              <FileText size={42} />

            </div>

            <h2 className="text-3xl font-black mb-3">
              No Files Found
            </h2>

            <p className="soft-text text-lg">
              Uploaded files and duplicate analytics will appear here.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-[var(--border)] bg-black/5">

                  <th className="text-left px-6 py-5 text-sm font-bold soft-text">
                    File Name
                  </th>

                  <th className="text-left px-5 py-5 text-sm font-bold soft-text">
                    Hash
                  </th>

                  <th className="text-left px-5 py-5 text-sm font-bold soft-text">
                    Size
                  </th>

                  <th className="text-left px-5 py-5 text-sm font-bold soft-text">
                    Uploaded
                  </th>

                  <th className="text-left px-5 py-5 text-sm font-bold soft-text">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {filtered.map(file => (

                  <tr
                    key={file._id}
                    className="border-b border-[var(--border)] hover:bg-white/5 transition"
                  >

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-11 h-11 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 flex-shrink-0">

                          <FileText size={18} />

                        </div>

                        <div>

                          <p className="font-semibold max-w-[260px] truncate">
                            {file.originalName}
                          </p>

                          <p className="soft-text text-sm mt-1">
                           storage indexed
                          </p>

                        </div>

                      </div>

                    </td>

                    <td className="px-5 py-5">

                      <span className="px-3 py-2 rounded-xl bg-black/10 font-mono text-xs">

                        {shortHash(file.hash)}

                      </span>

                    </td>

                    <td className="px-5 py-5 soft-text">

                      {formatBytes(file.fileSize)}

                    </td>

                    <td className="px-5 py-5 soft-text text-sm">

                      {formatDate(file.createdAt)}

                    </td>

                    <td className="px-5 py-5">

                      <span
                        className={`px-4 py-2 rounded-full text-sm font-bold ${
                          file.isDuplicate
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >

                        {file.isDuplicate
                          ? 'Duplicate'
                          : 'Unique'}

                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>

  );

}