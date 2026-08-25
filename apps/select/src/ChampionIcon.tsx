import { useEffect, useState } from 'react';
import { getCachedChampionIconUrl, loadChampionIconUrl } from './championIcons';

interface ChampionIconProps {
  /** iconPath from champions.json, e.g. "assets/champions/Chogath.png". */
  iconPath: string;
  alt?: string;
  className?: string;
}

export function ChampionIcon({ iconPath, alt = '', className = '' }: ChampionIconProps) {
  const fileName = iconPath.split('/').pop()!;
  const [url, setUrl] = useState(() => getCachedChampionIconUrl(fileName));

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      loadChampionIconUrl(fileName).then((loaded) => {
        if (!cancelled && loaded) setUrl(loaded);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [fileName, url]);

  if (!url) {
    return <div className={`shrink-0 animate-pulse rounded-lg bg-void-700 ${className}`} />;
  }
  return <img src={url} alt={alt} className={`shrink-0 rounded-lg ${className}`} />;
}
