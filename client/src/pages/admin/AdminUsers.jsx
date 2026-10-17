import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { Trash2, User, Shield, Search } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(true);
  const { user: me } = useAuth();

  useEffect(() => {
    adminAPI.users()
      .then(res => setUsers(res.data.users))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteUser(id);
      setUsers(prev => prev.filter(u => u._id !== id));
      toast.success(`User "${name}" deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} registered accounts</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-56 text-sm" placeholder="Search users..."
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(u => (
              <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-gray-400 text-xs">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={u.role === 'admin' ? 'badge-blue flex items-center gap-1 w-fit' : 'badge-gray w-fit flex items-center gap-1'}>
                    {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? 'badge-green' : 'badge-gray'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u._id !== me?._id && (
                    <button onClick={() => handleDelete(u._id, u.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-gray-400 text-sm">No users found.</div>
        )}
      </div>
    </div>
  );
}
