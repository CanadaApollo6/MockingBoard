import type { VideoPlatform } from '@mockingboard/shared';

interface VideoEmbedProps {
  platform: VideoPlatform;
  embedId: string;
  title: string;
  timestamp?: number;
}

function getEmbedSrc(
  platform: VideoPlatform,
  embedId: string,
  timestamp?: number,
): string {
  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/embed/${embedId}${timestamp ? `?start=${timestamp}` : ''}`;
    case 'instagram':
      return `https://www.instagram.com/p/${embedId}/embed`;
    case 'twitter':
      return `https://platform.twitter.com/embed/Tweet.html?id=${embedId}`;
    case 'tiktok':
      return `https://www.tiktok.com/embed/v2/${embedId}`;
  }
}

export function VideoEmbed({
  platform,
  embedId,
  title,
  timestamp,
}: VideoEmbedProps) {
  const src = getEmbedSrc(platform, embedId, timestamp);

  // Instagram, Twitter, and TikTok embeds are taller than wide
  const aspectClass =
    platform === 'youtube' ? 'aspect-video' : 'aspect-[9/16] max-h-[500px]';

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg ${aspectClass}`}
    >
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
