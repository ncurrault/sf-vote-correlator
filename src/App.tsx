import "./App.css";
import React from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import type { ElectionJson } from "./types";
import { ContestSelect } from "./ContestSelect";
import { CandidateSelectAndExplore } from "./CandidateSelectAndExplore";

enum DisplayMode {
  // TODO select election, constant with JSON paths that are loadable
  SELECT_CONTESTS = "SELECT_CONTESTS",
  SELECT_CANDIDATES = "SELECT_CANDIDATES",
}

function App() {
  const [electionJson, setElectionJson] = React.useState<ElectionJson>();
  const [mode, setMode] = React.useState<DisplayMode>(
    DisplayMode.SELECT_CONTESTS,
  );
  const [selectedContests, setSelectedContests] = React.useState<number[]>([]);

  React.useEffect(() => {
    fetch("/elections/2026-06-02.json")
      .then((res) => res.json())
      .then((newElectionJson: ElectionJson) => {
        setElectionJson(newElectionJson);
      });
  }, []); // TODO depend on election selected, handle tear down and reload

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <i className="bi bi-intersect" style={{ marginRight: "10px" }} />
          SF Elections Correlator
        </h1>
      </header>

      {electionJson && mode === DisplayMode.SELECT_CONTESTS && (
        <ContestSelect
          electionJson={electionJson}
          onAdvance={() => setMode(DisplayMode.SELECT_CANDIDATES)}
          selectedContests={selectedContests}
          setSelectedContests={setSelectedContests}
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
