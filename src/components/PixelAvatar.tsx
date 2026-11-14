export function PixelAvatar({
  name,
  index,
  className = '',
}: {
  name: string;
  index?: number;
  className?: string;
}) {
  const variant =
    index ?? [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4;
  return (
    <span className={`pixel-avatar ${className}`} aria-hidden="true">
      <span style={{ backgroundImage: `url(/art/villager-${variant % 4}.png)` }} />
    </span>
  );
}
