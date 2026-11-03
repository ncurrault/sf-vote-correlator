import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import "./App.css";
import React from "react";
import {
  Button,
  Checkbox,
  CheckboxButton,
  CheckboxField,
  Form,
  Input,
} from "react-aria-components";
import "bootstrap-icons/font/bootstrap-icons.css";

interface ElectionJson {
  version: 1;
  correlationsResult: Record<string, Record<string, number>>;
  contestNames: Record<number, string>;
  candidateDetails: Record<
    number,
    {
      name: string;
      contestId: number;
    }
  >;
  electionName: string;
  electionDate: string;
}

function ContestDisplay() {
  return null;
}

function App() {
  const [electionJson, setElectionJson] = React.useState<ElectionJson>();

  React.useEffect(() => {
    fetch("/elections/2026-06-02.json")
      .then((res) => res.json())
      .then((newElectionJson: ElectionJson) => {
        setElectionJson(newElectionJson);
      });
  }, []); // TODO depend on election selected, handle tear down and reload

  const sharedBallotSets = React.useMemo(
    () =>
      electionJson &&
      Object.keys(electionJson.correlationsResult).map(
        (contestsStr) => new Set<number>(JSON.parse(contestsStr)),
      ),
    [electionJson],
  );

  const candidatesByContest = React.useMemo(() => {
    const result: Record<number, number[]> = {};
    if (!electionJson) {
      return result;
    }
    for (const [candidateId, { contestId }] of Object.entries(
      electionJson.candidateDetails,
    )) {
      if (!result[contestId]) {
        result[contestId] = [];
      }
      result[contestId].push(parseInt(candidateId));
    }
    return result;
  }, [electionJson]);

  const [selectedCandidates, setSelectedCandidates] = React.useState<number[]>(
    [],
  );

  const toggleCandidate = React.useCallback(
    (candidate: number) =>
      setSelectedCandidates((existing) =>
        existing.includes(candidate)
          ? existing.filter((x) => x !== candidate)
          : [...existing, candidate],
      ),
    [setSelectedCandidates],
  );

  const selectedContests = React.useMemo(
    () => [
      ...new Set<number>(
        selectedCandidates
          .map(
            (candidate) => electionJson?.candidateDetails[candidate].contestId,
          )
          .filter((x): x is number => x != null),
        // TODO print warning if unknown candidate
      ),
    ],
    [electionJson, selectedCandidates],
  );

  const possibleContests = React.useMemo(() => {
    const validOtherContests = new Set<number>();
    for (const sharedBallotSet of sharedBallotSets ?? []) {
      if (!selectedContests.every((contest) => sharedBallotSet.has(contest))) {
        continue; // some selected contest isn't on this ballot card; we get no added correlations
      }
      for (const otherContest of sharedBallotSet) {
        if (!selectedContests.includes(otherContest)) {
          validOtherContests.add(otherContest);
        }
      }
    }
    return validOtherContests;
  }, [selectedContests, sharedBallotSets]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <i className="bi bi-intersect" style={{ marginRight: "10px" }} />
          SF Elections Correlator
        </h1>
      </header>

      <main className="contest-list">
        {electionJson &&
          [...possibleContests].map((contestId) => (
            <section key={contestId} className="contest">
              <h2 className="contest-name">
                {electionJson.contestNames[contestId]}
              </h2>
              <div className="candidates">
                {candidatesByContest[contestId].map((candidateId) => (
                  <CheckboxField key={candidateId} className="candidate">
                    <CheckboxButton className="candidate-button">
                      {electionJson.candidateDetails[candidateId].name}
                    </CheckboxButton>
                  </CheckboxField>
                ))}
              </div>
            </section>
          ))}
      </main>
    </div>
  );
}

export default App;
