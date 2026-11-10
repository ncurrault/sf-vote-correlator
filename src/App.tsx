import "./App.css";
import React from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import type { ContestId, ElectionJson } from "./types";
import { ContestSelect } from "./ContestSelect";
import { CandidateSelectAndExplore } from "./CandidateSelectAndExplore";
import { ElectionSelect } from "./ElectionSelect";

const ELECTIONS_AVAILABLE = [
  "2026-11-03_prelim10",
  "2026-06-02",
  "2024-11-05",
  "2024-03-05",
];

enum DisplayMode {
  SELECT_CONTESTS = "SELECT_CONTESTS",
  SELECT_CANDIDATES = "SELECT_CANDIDATES",
}

function App() {
  const [electionSelected, setElection] = React.useState<string | null>(null);

  const [electionJson, setElectionJson] = React.useState<ElectionJson>();
  const [mode, setMode] = React.useState<DisplayMode>(
    DisplayMode.SELECT_CONTESTS,
  );
  const [selectedContests, setSelectedContests] = React.useState<ContestId[]>(
    [],
  );
  const toggleContestSelected = React.useCallback(
    (contestId: ContestId) =>
      setSelectedContests((currSelected: ContestId[]) =>
        currSelected.includes(contestId)
          ? currSelected.filter((x) => x !== contestId)
          : [...currSelected, contestId],
      ),
    [setSelectedContests],
  );

  React.useEffect(() => {
    if (!electionSelected) {
      return;
    }
    fetch(`/elections/${electionSelected}.json`)
      .then((res) => res.json())
      .then((newElectionJson: ElectionJson) => {
        setElectionJson(newElectionJson);
      });
  }, [electionSelected]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <i className="bi bi-intersect" style={{ marginRight: "10px" }} />
          SF Elections Correlator
        </h1>
      </header>

      {!electionSelected && (
        <ElectionSelect
          elections={ELECTIONS_AVAILABLE}
          onSelect={setElection}
        />
      )}

      {electionJson && mode === DisplayMode.SELECT_CONTESTS && (
        <ContestSelect
          electionJson={electionJson}
          onAdvance={() => setMode(DisplayMode.SELECT_CANDIDATES)}
          selectedContests={selectedContests}
          toggleContestSelected={toggleContestSelected}
        />
      )}

      {electionJson && mode === DisplayMode.SELECT_CANDIDATES && (
        <CandidateSelectAndExplore
          electionJson={electionJson}
          selectedContests={selectedContests}
        />
      )}
    </div>
  );
}

export default App;
