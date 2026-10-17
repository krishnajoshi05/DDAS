import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { FileText, Search } from 'lucide-react';
import { formatBytes, formatDate, shortHash } from '../../utils/formatters';

export default function AdminFiles() {
  const [files,   setFiles]   = useState([]);
  const [query,   setQuery]   = useState('');
  const [filter,  setFilter]  = useState('all'); // all | unique | duplicate
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.files()
      .then(res => setFiles(res.data.files))
      .finally(() => setLoading(false));
  }, []);

  const filtered = files
    .filter(f => filter === 'all' || (filter === 'unique' ? !f.isDuplicate : f.isDuplicate))
    .filter(f => f.originalName?.toLowerCase().includes(query.toLowerCase()) ||
                 f.uploadedBy?.name?.toLowerCase().includes(query.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Files</h1>
          <p className="text-gray-500 text-sm mt-1">{files.length} total files across all users</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
            {['all','unique','duplicate'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md capitalize transition-colors font-medium
                  ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 w-48 text-sm" placeholder="Search..."
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">File name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Uploaded by</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Hash</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Size</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(f => (
                <tr key={f._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800 truncate max-w-[200px]">
                        {f.originalName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {f.uploadedBy?.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-800 truncate">{f.uploadedBy?.name || 'Unknown'}</p>
                        <p className="text-gray-400 text-xs truncate">{f.uploadedBy?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {shortHash(f.hash)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatBytes(f.fileSize)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(f.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={f.isDuplicate ? 'badge-red' : 'badge-green'}>
                      {f.isDuplicate ? 'Duplicate' : 'Unique'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-gray-400 text-sm">No files found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
