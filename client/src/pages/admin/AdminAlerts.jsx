import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { AlertTriangle, Mail, Monitor } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function AdminAlerts() {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.alerts()
      .then(res => setAlerts(res.data.alerts))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Alerts</h1>
        <p className="text-gray-500 text-sm mt-1">{alerts.length} duplicate alerts system-wide</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Triggered by</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Duplicate file</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Original file</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Channels</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alerts.map(a => (
                <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {a.triggeredBy?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{a.triggeredBy?.name || '—'}</p>
                        <p className="text-gray-400 text-xs">{a.triggeredBy?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800 truncate max-w-[160px]">
                      {a.duplicateFile?.originalName || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600 truncate max-w-[160px]">
                      {a.originalFile?.originalName || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.channels?.includes('web')   && <span className="badge-blue">Web</span>}
                      {a.emailSent                   && <span className="badge-green flex items-center gap-1"><Mail size={9} />Email</span>}
                      {a.channels?.includes('os')    && <span className="badge-amber flex items-center gap-1"><Monitor size={9} />OS</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {alerts.length === 0 && (
            <div className="p-10 text-center">
              <AlertTriangle size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-400 text-sm">No duplicate alerts recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
