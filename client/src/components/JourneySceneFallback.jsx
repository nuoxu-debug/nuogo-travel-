const DEFAULT_STOPS = ["Departure", "Stop 01", "Stop 02", "Stop 03"];

export default function JourneySceneFallback({ stops = DEFAULT_STOPS, complete = false }) {
  return (
    <div
      className={`living-atlas-fallback${complete ? " is-complete" : ""}`}
      data-testid="journey-scene-fallback"
    >
      <img src="/images/china-journey-map-daylight.png" alt="" aria-hidden="true" />
      <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path
          className="living-atlas-fallback-shadow"
          d="M 265 440 C 390 395 440 350 520 330 S 680 260 650 215 S 780 155 850 130"
        />
        <path
          className="living-atlas-fallback-route"
          d="M 265 440 C 390 395 440 350 520 330 S 680 260 650 215 S 780 155 850 130"
        />
      </svg>
      <ol className="living-atlas-stop-list">
        {stops.map((stop, index) => (
          <li key={stop} style={{ "--stop-index": index }}>
            <i aria-hidden="true" />
            <span>{stop}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
