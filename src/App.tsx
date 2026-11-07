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
  version: "1.0.3";
  correlationsResult: Record<string, Record<string, number>>;
  contestDetails: Record<number, { name: string; candidateOrder: number[] }>;
  candidateDetails: Record<
    number,
    {
      name: string;
      contestId: number;
    }
  >;
  electionName: string;
  electionDate: string;
  contestOrder: number[];
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

  const [expandedContests, setExpandedContests] = React.useState<number[]>([]);
  const toggleContest = React.useCallback(
    (contestId: number) =>
      setExpandedContests((currExpanded) =>
        currExpanded.includes(contestId)
          ? currExpanded.filter((x) => x !== contestId)
          : [...currExpanded, contestId],
      ),
    [setExpandedContests],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <i className="bi bi-intersect" style={{ marginRight: "10px" }} />
          SF Elections Correlator
        </h1>
      </header>

      <main className="contest-list">
        <h2>Step one: select contests</h2>
        <p>
          Select the contests within which you are interested in analyzing
          correlations. Note that you can only select contests which appear
          together on at least one ballot cared. Your exploration will be
          limited to voters who had all selected contests together on a single
          ballot card.
        </p>
        {electionJson &&
          [...possibleContests].map((contestId) => {
            const isExpanded = expandedContests.includes(contestId);
            const allCandidates =
              electionJson.contestDetails[contestId].candidateOrder;
            const displayedCandidates = isExpanded
              ? allCandidates
              : [
                  ...allCandidates.slice(0, 4),
                  ...allCandidates
                    .slice(4)
                    .filter((cand) => selectedCandidates.includes(cand)),
                ];

            return (
              <section key={contestId} className="contest">
                <h2 className="contest-name">
                  {electionJson.contestDetails[contestId].name}
                </h2>
                <div className="candidates">
                  {displayedCandidates.map((candidateId) => (
                    <CheckboxField
                      key={candidateId}
                      className="candidate"
                      onChange={() => toggleCandidate(candidateId)}
                      isSelected={selectedCandidates.includes(candidateId)}
                    >
                      <CheckboxButton className="candidate-button">
                        {electionJson.candidateDetails[candidateId].name}
                      </CheckboxButton>
                    </CheckboxField>
                  ))}
                </div>
                {allCandidates.length > 4 && (
                  <button
                    className="expand-candidates-btn"
                    onClick={() => toggleContest(contestId)}
                  >
                    <i
                      className={`bi ${isExpanded ? "bi-chevron-up" : "bi-chevron-down"}`}
                      style={{ marginRight: "5px" }}
                    />
                    {isExpanded
                      ? "Hide low-ranking candidates"
                      : "Show all candidates"}
                  </button>
                )}
              </section>
            );
          })}
      </main>
    </div>
  );
}

export default App;
