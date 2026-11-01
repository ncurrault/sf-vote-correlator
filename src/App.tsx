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
  const [sharedBallotSets, setSharedBallotSets] = React.useState<Set<number>[]>(
    [],
  );

  React.useEffect(() => {
    fetch("/elections/2026-06-02.json")
      .then((res) => res.json())
      .then((newElectionJson: ElectionJson) => {
        setElectionJson(newElectionJson);

        setSharedBallotSets(
          Object.keys(newElectionJson.correlationsResult).map(
            (contestsStr) => new Set(JSON.parse(contestsStr)),
          ),
        );
        // TODO rework as useMemo
      });
  }, []); // TODO depend on election selected, handle tear down and reload

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

  const [selectedContests, setSelectedContests] = React.useState<number[]>([]);
  const toggleContest = React.useCallback(
    (contest: number) =>
      setSelectedContests((existing) =>
        existing.includes(contest)
          ? existing.filter((x) => x !== contest)
          : [...existing, contest],
      ),
    [setSelectedContests],
  );

  const possibleContests = React.useMemo(() => {
    const validOtherContests = new Set<number>();
    for (const sharedBallotSet of sharedBallotSets) {
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

  // TODO we need candidate/contest correspondence for displaying the UI

  return (
    electionJson && (
      <div className="container-fluid p-0">
        <div className="row g-0 vh-100">
          {[...possibleContests].map((contestId) => (
            <li>
              {electionJson.contestNames[contestId]}
              <ul>
                {candidatesByContest[contestId].map((candidateId) => (
                  <CheckboxField>
                    <CheckboxButton>
                      {electionJson.candidateDetails[candidateId].name}
                    </CheckboxButton>
                  </CheckboxField>
                ))}
              </ul>
            </li>
          ))}
        </div>
      </div>
    )
  );
}

export default App;
