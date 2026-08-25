import { useEffect, useState } from 'react';
import { getCachedAugmentIconUrl, loadAugmentIconUrl } from './augmentIcons';

interface AugmentIconProps {
  apiName: string;
  alt?: string;
  className?: string;
}

export function AugmentIcon({ apiName, alt = '', className = '' }: AugmentIconProps) {
  const [url, setUrl] = useState(() => getCachedAugmentIconUrl(apiName));

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      loadAugmentIconUrl(apiName).then((loaded) => {
        if (!cancelled && loaded) setUrl(loaded);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [apiName, url]);

  if (!url) {
    return <div className={`shrink-0 animate-pulse rounded-md bg-void-700 ${className}`} />;
  }
  return <img src={url} alt={alt} className={`shrink-0 rounded-md ${className}`} />;
}
