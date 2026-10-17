import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import StatCard from '../../components/ui/StatCard';
import { Users, FileText, AlertTriangle, Bell, HardDrive } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

export default function AdminOverview() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.stats()
      .then(res => setStats(res.data.stats))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  const savedMB = formatBytes(stats?.storageSavedBytes || 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500 text-sm mt-1">System-wide statistics and health.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Users"      value={stats?.totalUsers}      icon={Users}         color="blue"  />
        <StatCard label="Unique Files"     value={stats?.totalFiles}      icon={FileText}      color="green" />
        <StatCard label="Duplicate Files"  value={stats?.totalDuplicates} icon={AlertTriangle} color="red"   />
        <StatCard label="Total Alerts"     value={stats?.totalAlerts}     icon={Bell}          color="amber" />
        <StatCard label="Storage Saved"    value={savedMB}                icon={HardDrive}     color="navy"
          sub="bandwidth saved by dedup" />
        <StatCard label="Dedup Rate"
          value={stats?.totalFiles + stats?.totalDuplicates > 0
            ? `${Math.round((stats.totalDuplicates / (stats.totalFiles + stats.totalDuplicates)) * 100)}%`
            : '0%'}
          icon={AlertTriangle} color="red"
          sub="of all uploads were duplicates" />
      </div>

      {/* Quick links */}
      <div className="grid lg:grid-cols-3 gap-4">
        {[
          { href: '/admin/users',  label: 'Manage Users',  desc: `${stats?.totalUsers} registered`, color: 'bg-blue-500' },
          { href: '/admin/files',  label: 'Browse Files',  desc: `${stats?.totalFiles} unique files`, color: 'bg-green-500' },
          { href: '/admin/alerts', label: 'View Alerts',   desc: `${stats?.totalAlerts} total alerts`, color: 'bg-red-500' },
        ].map(({ href, label, desc, color }) => (
          <a key={href} href={href} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${color} rounded-xl`} />
            <div>
              <p className="font-semibold text-gray-900">{label}</p>
              <p className="text-gray-400 text-sm">{desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
