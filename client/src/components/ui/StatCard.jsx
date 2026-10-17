export default function StatCard({ label, value, icon: Icon, color = 'brand', sub }) {
  const tones = {
    brand:  { iconBg: 'bg-brand-50',   icon: 'text-brand-600',   ring: 'ring-brand-100',   accent: 'from-brand-500 to-accent-500' },
    blue:   { iconBg: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'ring-blue-100',    accent: 'from-blue-500 to-sky-500' },
    red:    { iconBg: 'bg-red-50',     icon: 'text-red-600',     ring: 'ring-red-100',     accent: 'from-red-500 to-rose-500' },
    green:  { iconBg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100', accent: 'from-emerald-500 to-teal-500' },
    amber:  { iconBg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'ring-amber-100',   accent: 'from-amber-500 to-orange-500' },
    purple: { iconBg: 'bg-accent-50',  icon: 'text-accent-600',  ring: 'ring-accent-100',  accent: 'from-accent-500 to-fuchsia-500' },
    navy:   { iconBg: 'bg-slate-100',  icon: 'text-slate-700',   ring: 'ring-slate-200',   accent: 'from-slate-500 to-slate-700' },
  };
  const t = tones[color] || tones.brand;

  return (
    <div className="relative card p-5 overflow-hidden group hover:shadow-hover hover:border-brand-200 transition-all duration-200">
      {/* Thin gradient accent strip on top */}
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${t.accent} opacity-70`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1.5 leading-none tabular-nums">
            {value ?? '—'}
          </p>
          {sub && <p className="text-[11px] text-slate-500 mt-2">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${t.iconBg} ring-1 ring-inset ${t.ring} flex items-center justify-center flex-shrink-0`}>
            <Icon size={18} className={t.icon} />
          </div>
        )}
      </div>
    </div>
  );
}
