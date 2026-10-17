import { useState, useEffect } from 'react';

import { filesAPI } from '../api';

import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Mail,
  Layers,
  Shuffle,
  Fingerprint,
  ShieldAlert
} from 'lucide-react';

import {
  formatDate,
  formatBytes
} from '../utils/formatters';

import toast from 'react-hot-toast';

/* ALERT TYPE */

function describeMatch(alert) {

  const k = alert.matchKind || 'exact';

  if (k === 'partial') {

    const pct =
      alert.overlapPercent != null
        ? Math.round(alert.overlapPercent * 100) + '%'
        : '?';

    return {

      Icon: Layers,

      label:
        `Partial duplicate · ${pct} overlap`,

      tone: 'blue',

    };

  }

  if (k === 'near' && alert.crossModal) {

    const a =
      (
        alert.originalFormat ||
        alert.originalFile?.sourceFormat ||
        '?'
      ).toUpperCase();

    const b =
      (
        alert.candidateFormat ||
        alert.duplicateFile?.sourceFormat ||
        '?'
      ).toUpperCase();

    return {

      Icon: Shuffle,

      label:
        `Cross-format duplicate · ${a} ↔ ${b}`,

      tone: 'purple',

    };

  }

  if (k === 'near') {

    return {

      Icon: Fingerprint,

      label:
        'Near duplicate · AI fingerprint',

      tone: 'amber'

    };

  }

  return {

    Icon: AlertTriangle,

    label:
      'Exact duplicate · SHA-256',

    tone: 'red'

  };

}

/* TONES */

const toneStyles = {

  red: {

    iconBg:
      'bg-red-500/10',

    iconClr:
      'text-red-400',

    border:
      'border-red-500/20',

    glow:
      'shadow-red-500/10'

  },

  amber: {

    iconBg:
      'bg-amber-500/10',

    iconClr:
      'text-amber-400',

    border:
      'border-amber-500/20',

    glow:
      'shadow-amber-500/10'

  },

  blue: {

    iconBg:
      'bg-blue-500/10',

    iconClr:
      'text-blue-400',

    border:
      'border-blue-500/20',

    glow:
      'shadow-blue-500/10'

  },

  purple: {

    iconBg:
      'bg-violet-500/10',

    iconClr:
      'text-violet-400',

    border:
      'border-violet-500/20',

    glow:
      'shadow-violet-500/10'

  }

};

export default function Alerts() {

  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    filesAPI
      .getAlerts()
      .then(res => {

        setAlerts(
          res.data.alerts
        );

      })
      .finally(() => {

        setLoading(false);

      });

  }, []);

  /* MARK READ */

  const markRead = async(id) => {

    try {

      await filesAPI.markRead(id);

      setAlerts(prev =>
        prev.map(a =>
          a._id === id
            ? {
                ...a,
                isRead: true
              }
            : a
        )
      );

    } catch {

      toast.error(
        'Could not mark as read'
      );

    }

  };

  /* MARK ALL */

  const markAllRead = async() => {

    const unread =
      alerts.filter(a => !a.isRead);

    await Promise.all(
      unread.map(a =>
        filesAPI.markRead(a._id)
      )
    );

    setAlerts(prev =>
      prev.map(a => ({
        ...a,
        isRead: true
      }))
    );

    toast.success(
      'All alerts marked as read'
    );

  };

  const unreadCount =
    alerts.filter(a => !a.isRead).length;

  /* LOADING */

  if (loading) {

    return (

      <div className="flex items-center justify-center h-[60vh]">

        <div className="glass-card px-8 py-6 flex items-center gap-3">

          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />

          <span className="soft-text">
            Loading duplicate alerts...
          </span>

        </div>

      </div>

    );

  }

  return (

    <div className="p-8">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">

        <div>

          <div className="ai-chip mb-4 inline-flex">
            THREAT MONITORING
          </div>

          <h1 className="text-5xl font-black">
            Duplicate Alerts
          </h1>

          <p className="soft-text mt-3 text-lg">
            Real-time duplicate and similarity intelligence
          </p>

        </div>

        {unreadCount > 0 && (

          <button
            onClick={markAllRead}
            className="primary-btn px-6 py-4 rounded-2xl flex items-center gap-3"
          >

            <CheckCheck size={18} />

            Mark all read

          </button>

        )}

      </div>

      {/* STATS */}

      <div className="grid md:grid-cols-3 gap-6 mb-10">

        <div className="stat-card">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">

              <Bell size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Total Alerts
              </p>

              <h2 className="text-3xl font-black">
                {alerts.length}
              </h2>

            </div>

          </div>

        </div>

        <div className="stat-card">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">

              <ShieldAlert size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Unread Alerts
              </p>

              <h2 className="text-3xl font-black">
                {unreadCount}
              </h2>

            </div>

          </div>

        </div>

        <div className="stat-card">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">

              <Fingerprint size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Near Duplicates
              </p>

              <h2 className="text-3xl font-black">

                {
                  alerts.filter(
                    a => a.matchKind === 'near'
                  ).length
                }

              </h2>

            </div>

          </div>

        </div>

      </div>

      {/* EMPTY */}

      {alerts.length === 0 ? (

        <div className="glass-card p-20 text-center">

          <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 text-emerald-400">

            <Bell size={42} />

          </div>

          <h2 className="text-4xl font-black mb-4">
            No Duplicate Alerts
          </h2>

          <p className="soft-text text-lg">
            Your uploaded files are currently unique.
          </p>

        </div>

      ) : (

        <div className="space-y-6">

          {alerts.map(alert => {

            const {
              Icon,
              label,
              tone
            } = describeMatch(alert);

            const t =
              toneStyles[tone];

            return (

              <div
                key={alert._id}
                className={`glass-card p-8 border ${t.border} shadow-lg ${t.glow}`}
              >

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">

                  {/* LEFT */}

                  <div className="flex gap-5 flex-1">

                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${t.iconBg}`}>

                      <Icon
                        size={28}
                        className={t.iconClr}
                      />

                    </div>

                    <div className="flex-1">

                      <div className="flex flex-wrap items-center gap-3 mb-4">

                        <h2 className="text-2xl font-black">
                          {label}
                        </h2>

                        {!alert.isRead && (

                          <div className="ai-chip">
                            NEW
                          </div>

                        )}

                        {alert.emailSent && (

                          <div className="ai-chip flex items-center gap-2">

                            <Mail size={14} />

                            Email sent

                          </div>

                        )}

                      </div>

                      <p className="soft-text text-lg mb-6">
                         engine detected a duplicate similarity match in organization storage.
                      </p>

                      {/* FILES */}

                      <div className="grid md:grid-cols-2 gap-4">

                        <div className="glass-card p-5">

                          <p className="soft-text text-sm mb-2">
                            Uploaded File
                          </p>

                          <h3 className="font-bold text-lg truncate">
                            {alert.duplicateFile?.originalName || '—'}
                          </h3>

                          <p className="soft-text text-sm mt-2">
                            {
                              alert.createdAt
                                ? formatDate(alert.createdAt)
                                : '—'
                            }
                          </p>

                        </div>

                        <div className="glass-card p-5">

                          <p className="soft-text text-sm mb-2">
                            Existing File
                          </p>

                          <h3 className="font-bold text-lg truncate">
                            {alert.originalFile?.originalName || '—'}
                          </h3>

                          <p className="soft-text text-sm mt-2">

                            {
                              alert.originalFile?.createdAt
                                ? formatDate(alert.originalFile.createdAt)
                                : '—'
                            }

                            {
                              alert.originalFile?.fileSize
                                ? ` · ${formatBytes(alert.originalFile.fileSize)}`
                                : ''
                            }

                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                  {/* ACTION */}

                  {!alert.isRead && (

                    <button
                      onClick={() => markRead(alert._id)}
                      className="primary-btn px-6 py-4 rounded-2xl whitespace-nowrap"
                    >

                      Mark Read

                    </button>

                  )}

                </div>

              </div>

            );

          })}

        </div>

      )}

    </div>

  );

}