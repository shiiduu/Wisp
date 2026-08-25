import { useEffect, useState } from 'react';
import { getCachedItemIconUrl, loadItemIconUrl } from './itemIcons';

interface ItemIconProps {
  id: number;
  alt?: string;
  className?: string;
}

export function ItemIcon({ id, alt = '', className = '' }: ItemIconProps) {
  const [url, setUrl] = useState(() => getCachedItemIconUrl(id));

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      loadItemIconUrl(id).then((loaded) => {
        if (!cancelled && loaded) setUrl(loaded);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [id, url]);

  if (!url) {
    return <div className={`shrink-0 animate-pulse rounded-md bg-void-700 ${className}`} />;
  }
  return <img src={url} alt={alt} className={`shrink-0 rounded-md ${className}`} />;
}
