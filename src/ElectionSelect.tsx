import "./App.css";
import { Button } from "react-aria-components";

function formatElectionDate(election: string): string {
  // Elections are YYYY-MM-DD, optionally followed by a suffix like
  // "_prelim10" for preliminary results; only the date part is formatted.
  const [date, suffix] = election.split("_");
  // Format in UTC so the day doesn't shift by timezone.
  const formatted = new Date(`${date}T00:00:00Z`).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    },
  );
  return suffix?.startsWith("prelim")
    ? `${formatted} (preliminary)`
    : formatted;
}

export function ElectionSelect({
  elections,
  onSelect,
}: {
  elections: string[];
  onSelect: (election: string) => void;
}) {
  return (
    <div className="election-select">
      <h2>Choose an election:</h2>
      <ul className="election-list">
        {elections.map((election) => (
          <li key={election}>
            <Button
              className="election-button"
              onPress={() => onSelect(election)}
            >
              <i className="bi bi-calendar-event" />
              {formatElectionDate(election)}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
