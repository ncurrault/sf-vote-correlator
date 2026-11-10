import "./App.css";
import React from "react";
import { Button, CheckboxButton, CheckboxField } from "react-aria-components";
import "bootstrap-icons/font/bootstrap-icons.css";
import type { ContestId, ElectionJson } from "./types";

export function ContestSelect({
  electionJson,
  onAdvance,
  selectedContests,
  toggleContestSelected,
}: {
  electionJson: ElectionJson;
  onAdvance: () => void;
  selectedContests: ContestId[];
  toggleContestSelected: (contest: ContestId) => void;
}) {
  const sharedBallotCounts: {
    contests: Set<ContestId>;
    count: number;
  }[] = React.useMemo(
    () =>
      electionJson
        ? Object.entries(electionJson.contestOverlapCount).map(
            ([contestsStr, count]) => ({
              contests: new Set<ContestId>(JSON.parse(contestsStr)),
              count,
            }),
          )
        : [],
    [electionJson],
  );

  // SF has a few contests that nobody can vote in due to misalignments in
  // county and district lines. Hide these races for simplicity.
  const displayedContests = React.useMemo(
    () =>
      electionJson
        ? electionJson.contestOrder.filter((contest) =>
            sharedBallotCounts.some(({ contests }) => contests.has(contest)),
          )
        : [],
    [electionJson],
  );

  const { possibleContests, currentBallotCount } = React.useMemo(() => {
    const possibleContests = new Set<ContestId>();
    let currentBallotCount = 0;
    for (const { contests, count } of sharedBallotCounts ?? []) {
      if (selectedContests.every((contest) => contests.has(contest))) {
        currentBallotCount += count;
      } else {
        continue; // some selected contest isn't on this ballot card; we get no added correlations
      }
      for (const otherContest of contests) {
        if (!selectedContests.includes(otherContest)) {
          possibleContests.add(otherContest);
        }
      }
    }
    return { possibleContests, currentBallotCount, selectedContests };
  }, [sharedBallotCounts, selectedContests]);

  return (
    <main className="contest-select">
      <section className="contest-select-explanation">
        <h2>Select election and contests</h2>
        <p>
          Select the contests among which you are interested in analyzing
          correlations. Note that you can only select contests which appear
          together on at least one ballot card. Your exploration will be limited
          to voters who had all selected contests together on a single ballot
          card.
        </p>
      </section>
      <section>
        {displayedContests.map((contestId) => (
          <CheckboxField
            key={contestId}
            className="candidate"
            onChange={() => toggleContestSelected(contestId)}
            isSelected={selectedContests.includes(contestId)}
            isDisabled={
              !selectedContests.includes(contestId) &&
              !possibleContests.has(contestId)
            }
          >
            <CheckboxButton className="candidate-button">
              {electionJson.contestDetails[contestId].name}
            </CheckboxButton>
          </CheckboxField>
        ))}
      </section>

      {selectedContests.length >= 2 && (
        <section className="contest-select-advance-box">
          {currentBallotCount < 5000 ? (
            <>
              <i className="bi bi-exclamation-triangle-fill" />
              <p>
                The contests you have selected only have an overlap of{" "}
                {currentBallotCount.toLocaleString()} ballot cards (likely from
                voters using alternative, accessible voting methods). Data may
                be unreliable.
              </p>
            </>
          ) : (
            <>
              <i className="bi bi-check-circle-fill" />
              <p>
                {currentBallotCount.toLocaleString()} overlapping ballot cards
                found
              </p>
            </>
          )}
          <Button className="advance-button" onPress={onAdvance}>
            Explore Correlations
            <i className="bi bi-arrow-right" />
          </Button>
        </section>
      )}
    </main>
  );
}
