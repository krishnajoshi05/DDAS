import { AlertTriangle, X, User, Clock, Fingerprint, Layers, Shuffle } from 'lucide-react';
import { formatDate, formatBytes } from '../../utils/formatters';

/**
 * Duplicate banner — handles four cases:
 *   matchKind = 'exact'                       (red)
 *   matchKind = 'near'                        (amber)
 *   matchKind = 'near' + crossModal=true      (purple)
 *   matchKind = 'partial'                     (blue)  ← CDC chunk overlap
 */
export default function DuplicateBanner({
  duplicate,
  matchKind = 'exact',
  overlapPercent = null,
  crossModal = false,
  candidateFormat = null,
  onDismiss,
}) {
  if (!duplicate) return null;
  const { originalFile } = duplicate;

  const isExact      = matchKind === 'exact';
  const isPartial    = matchKind === 'partial';
  const isCrossModal = matchKind === 'near' && crossModal;
  const isNear       = matchKind === 'near' && !crossModal;

  const tone =
    isExact      ? 'red'
  : isPartial    ? 'blue'
  : isCrossModal ? 'purple'
  :                'amber';

  const palette = {
    red: {
      ring:    'ring-red-100',
      tile:    'bg-red-50',
      iconClr: 'text-red-600',
      accent:  'from-red-500 to-rose-500',
      label:   'text-red-700',
      pill:    'bg-red-50 text-red-700 ring-red-100',
    },
    blue: {
      ring:    'ring-blue-100',
      tile:    'bg-blue-50',
      iconClr: 'text-blue-600',
      accent:  'from-blue-500 to-sky-500',
      label:   'text-blue-700',
      pill:    'bg-blue-50 text-blue-700 ring-blue-100',
    },
    purple: {
      ring:    'ring-accent-100',
      tile:    'bg-accent-50',
      iconClr: 'text-accent-600',
      accent:  'from-accent-500 to-fuchsia-500',
      label:   'text-accent-700',
      pill:    'bg-accent-50 text-accent-700 ring-accent-100',
    },
    amber: {
      ring:    'ring-amber-100',
      tile:    'bg-amber-50',
      iconClr: 'text-amber-600',
      accent:  'from-amber-500 to-orange-500',
      label:   'text-amber-700',
      pill:    'bg-amber-50 text-amber-700 ring-amber-100',
    },
  }[tone];

  const Icon = isPartial ? Layers : isCrossModal ? Shuffle : isNear ? Fingerprint : AlertTriangle;

  const title =
    isExact      ? 'Duplicate file detected'
  : isPartial    ? 'Partial duplicate detected'
  : isCrossModal ? 'Cross-format duplicate detected'
  :                'Near-duplicate detected';

  const overlapPct = overlapPercent != null
    ? Math.round(overlapPercent * 100)
    : null;

  const blurb =
    isExact
      ? 'This file already exists in the registry. An email alert has been sent to you.'
  : isPartial
      ? `This file shares ${overlapPct}% of its content (by bytes) with an existing file in your organisation. Detected via content-defined chunking.`
  : isCrossModal
      ? `Your ${(candidateFormat || '?').toUpperCase()} file has the same text content as an existing ${(originalFile?.sourceFormat || '?').toUpperCase()} file in your org.`
  :     'This file is not byte-identical but its content fingerprint matches an existing file.';

  const matchLine =
    isExact      ? 'Exact match · SHA-256'
  : isPartial    ? `CDC chunk overlap · ${overlapPct}%`
  : isCrossModal ? `Cross-format · ${(originalFile?.sourceFormat || '?').toUpperCase()} ↔ ${(candidateFormat || '?').toUpperCase()}`
  :                'Content fingerprint';

  return (
    <div className="relative card overflow-hidden animate-fade-in">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${palette.accent}`} />
      <div className="p-5 flex gap-4">
        <div className={`w-11 h-11 rounded-xl ${palette.tile} ring-1 ring-inset ${palette.ring} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={palette.iconClr} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-sm">{title}</p>
            <span className={`badge ${palette.pill} ring-1 ring-inset`}>{matchLine}</span>
          </div>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{blurb}</p>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Original file
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="flex items-center gap-1.5">
                <User size={12} className="text-slate-400" />
                <span>By <strong className="text-slate-800">{originalFile?.uploadedBy?.name || 'another user'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                <span><strong className="text-slate-800">{originalFile?.uploadedAt ? formatDate(originalFile.uploadedAt) : '—'}</strong></span>
              </div>
              {originalFile?.fileSize && (
                <div className="col-span-2 text-slate-500">
                  Size: <span className="font-medium text-slate-700">{formatBytes(originalFile.fileSize)}</span>
                </div>
              )}
              {originalFile?.fileName && (
                <div className="col-span-2 text-slate-500 truncate">
                  Existing: <span className="font-mono text-slate-700">{originalFile.fileName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button onClick={onDismiss}
          className="flex-shrink-0 text-slate-300 hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
