export default function JourneyProgressRail({ progress = 0 }) {
  const percentage = Math.round(Math.min(1, Math.max(0, Number(progress) || 0)) * 100);
  return (
    <div className="living-atlas-progress">
      <progress aria-label="Journey progress" max="100" value={percentage} />
      <span>{percentage}%</span>
    </div>
  );
}
