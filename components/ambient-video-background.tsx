export function AmbientVideoBackground() {
  return (
    <video
      className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
    >
      <source src="/bg-ambient.webm" type="video/webm" />
      <source src="/bg-ambient.mp4" type="video/mp4" />
    </video>
  );
}
