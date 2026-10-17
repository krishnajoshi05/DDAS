import { formatDistanceToNow, format } from 'date-fns';

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const timeAgo   = (date) => formatDistanceToNow(new Date(date), { addSuffix: true });
export const formatDate = (date) => format(new Date(date), 'dd MMM yyyy, hh:mm a');
export const shortHash  = (hash) => hash ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : '—';
