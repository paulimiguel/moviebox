import { useState } from 'react';
import { resolveMovieImageUrl } from '@/services/api';
import type { MoviePlatform } from '@/types/movie';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w92';

const localLogoFor = (name: string) => {
  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLocaleLowerCase('es');

  if (normalizedName.includes('apple tv')) return '/platforms/apple-tv.png';
  if (normalizedName.includes('disney')) return '/platforms/disney-plus.png';
  if (normalizedName === 'flow') return '/platforms/flow.png';
  if (normalizedName === 'max' || normalizedName.includes('hbo max')) return '/platforms/hbo-max.png';
  if (normalizedName.includes('hulu')) return '/platforms/hulu.png';
  if (normalizedName.includes('mubi')) return '/platforms/mubi.png';
  if (normalizedName.includes('netflix')) return '/platforms/netflix-n-v2.png';
  if (normalizedName.includes('paramount')) return '/platforms/paramount-plus.png';
  if (normalizedName.includes('prime video')) return '/platforms/prime-video.png';
  return null;
};

export const resolvePlatformLogoUrl = (platform: Pick<MoviePlatform, 'name' | 'logoPath'>) => {
  if (platform.logoPath?.startsWith('/uploads/') || platform.logoPath?.startsWith('uploads/')) return resolveMovieImageUrl(platform.logoPath);
  if (platform.logoPath?.startsWith('/platforms/')) return platform.logoPath;
  const localLogo = localLogoFor(platform.name);
  if (localLogo) return localLogo;
  if (!platform.logoPath) return null;
  return /^(https?:|data:|blob:)/i.test(platform.logoPath)
    ? platform.logoPath
    : `${TMDB_IMAGE_BASE_URL}${platform.logoPath.startsWith('/') ? '' : '/'}${platform.logoPath}`;
};

const PlatformMark = ({ platform, large }: { platform: MoviePlatform; large: boolean }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = resolvePlatformLogoUrl(platform);

  if (!imageUrl || imageFailed) {
    return <span className="text-xs font-medium text-slate-500">{platform.name}</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={platform.name}
      title={platform.name}
      className={`${large ? 'h-9 w-auto max-w-24' : 'h-7 w-auto max-w-[74px]'} flex-none object-contain`}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
};

export const PlatformLogos = ({ platforms, limit, large = false }: {
  platforms: MoviePlatform[];
  limit?: number;
  large?: boolean;
}) => {
  if (!platforms.length) return null;

  const visiblePlatforms = limit ? platforms.slice(0, limit) : platforms;
  const remaining = platforms.length - visiblePlatforms.length;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {visiblePlatforms.map((platform) => <PlatformMark key={platform.id} platform={platform} large={large} />)}
      {remaining > 0 && <span className="text-xs font-semibold text-slate-500">+{remaining}</span>}
    </span>
  );
};
