const MatchDetails = ({ match }) => {
  if (!match) {
    return (
      <div className="mt-2 p-6 text-subheading">Match details are loading…</div>
    );
  }

  const umpires = match.umpires || {};
  const onField = Array.isArray(umpires.onField)
    ? umpires.onField.filter(Boolean).join(", ")
    : umpires.onField;
  const playingXI = Array.isArray(match.playingXI) ? match.playingXI : [];

  return (
    <div className="mt-2 surface-card p-6 text-heading font-semibold">
      <div className="space-y-1">
        {match.venue && <p>Venue: {match.venue}</p>}
        {match.match_date && (
          <p>Date: {new Date(match.match_date).toDateString()}</p>
        )}
        {match.match_time && <p>Time: {match.match_time}</p>}
        {onField && <p>Umpires: {onField}</p>}
        {umpires.third && <p>Third Umpire: {umpires.third}</p>}
        {umpires.tv && <p>TV Umpire: {umpires.tv}</p>}
        {match.matchRefree && <p>Match Referee: {match.matchRefree}</p>}
        {match.toss?.wonBy && (
          <p>
            Toss:{" "}
            {match.toss.wonBy === match.teamA_id ? match.teamA : match.teamB}{" "}
            chose to{" "}
            {match.toss.decision === "ball" ? "field" : match.toss.decision}
          </p>
        )}
      </div>

      {playingXI.length > 0 && (
        <>
          <p className="mt-6 text-lg">Playing XI</p>
          <div className="flex flex-col md:flex-row gap-6">
            {playingXI.map((p, i) => (
              <div key={i} className="flex flex-col gap-3 px-2 md:px-10 mt-2">
                <p>{p.teamName}</p>
                <ol className="list-decimal font-normal space-y-1">
                  {(p.players || []).map((pl, j) => (
                    <li key={j}>
                      {pl.name}
                      {pl.isCaptain ? " (c)" : ""}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MatchDetails;
