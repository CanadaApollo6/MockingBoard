interface VideoEmbedProps {
  videoId: string;
  title: string;
  timestamp?: number;
}

export function VideoEmbed({ videoId, title, timestamp }: VideoEmbedProps) {
  const src = `https://www.youtube.com/embed/${videoId}${timestamp ? `?start=${timestamp}` : ''}`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
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
