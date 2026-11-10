import "./App.css";
import React from "react";
import { Button, CheckboxButton, CheckboxField } from "react-aria-components";
import "bootstrap-icons/font/bootstrap-icons.css";
import { UNDERVOTE_SENTINEL, getCandidateName } from "./util";
import type { ElectionJson } from "./types";

enum DisplayMode {
  SELECT_CONTESTS = "SELECT_CONTESTS",
  SELECT_CANDIDATES = "SELECT_CANDIDATES",
}

function App() {
  const [electionJson, setElectionJson] = React.useState<ElectionJson>();
  const [mode, setMode] = React.useState<DisplayMode>(
    DisplayMode.SELECT_CONTESTS,
  );

  React.useEffect(() => {
    fetch("/elections/2026-06-02.json")
      .then((res) => res.json())
      .then((newElectionJson: ElectionJson) => {
        setElectionJson(newElectionJson);
      });
  }, []); // TODO depend on election selected, handle tear down and reload

  // CONTEST SELECTION LOGIC
  const [selectedContests, setSelectedContests] = React.useState<number[]>([]);
  const toggleContestSelected = React.useCallback(
    (contestId: number) =>
      setSelectedContests((currSelected) =>
        currSelected.includes(contestId)
          ? currSelected.filter((x) => x !== contestId)
          : [...currSelected, contestId],
      ),
    [setSelectedContests],
  );

  const sharedBallotCounts: {
    contests: Set<number>;
    count: number;
  }[] = React.useMemo(
    () =>
      electionJson
        ? Object.entries(electionJson.contestOverlapCount).map(
            ([contestsStr, count]) => ({
              contests: new Set<number>(JSON.parse(contestsStr)),
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
    const possibleContests = new Set<number>();
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

  // CANDIDATE FILTERING LOGIC
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
  const [expandedContests, setExpandedContests] = React.useState<number[]>([]);
  const toggleContestExpanded = React.useCallback(
    (contestId: number) =>
      setExpandedContests((currExpanded) =>
        currExpanded.includes(contestId)
          ? currExpanded.filter((x) => x !== contestId)
          : [...currExpanded, contestId],
      ),
    [setExpandedContests],
  );

  const selectedCandidatesGrouped = React.useMemo(() => {
    const result: Record<number, number[]> = {};
    if (!electionJson) {
      return result;
    }
    for (const candidate of selectedCandidates) {
      const contest = electionJson.candidateDetails[candidate].contestId;
      if (!result[contest]) {
        result[contest] = [];
      }
      result[contest].push(candidate);
    }

    return result;
  }, [electionJson, selectedCandidates]);
  const contestFilteredResults = React.useMemo(() => {
    const contestsToEval = selectedContests.filter(
      (contest) => !selectedCandidatesGrouped[contest],
    );
    const contestFilteredResults: Record<number, Record<number, number>> = {};
    // contest -> candidate -> votes
    if (!electionJson) {
      return contestFilteredResults;
    }

    for (const contest of contestsToEval) {
      contestFilteredResults[contest] = {};
    }

    for (const [contestsStr, voteTallies] of Object.entries(
      electionJson?.correlationsResult,
    )) {
      const ballotCardContests: number[] = JSON.parse(contestsStr);
      // if this ballot card type does not contain everything we're interested in, skip it
      if (
        selectedContests.some(
          (requiredContest) => !ballotCardContests.includes(requiredContest),
        )
      ) {
        continue;
      }

      for (const [voteStr, tally] of Object.entries(voteTallies)) {
        const vote: (number | null)[] = JSON.parse(voteStr);

        let excludeVotes = false;
        for (const [contestStr, selectedCandidates] of Object.entries(
          selectedCandidatesGrouped,
        )) {
          const contest = parseInt(contestStr, 10);
          const contestIndex = ballotCardContests.indexOf(contest);
          if (contestIndex === -1) {
            console.log("TODO");
          }

          const voteForThisContest = vote[contestIndex] ?? UNDERVOTE_SENTINEL; // ts doesn't support null as index

          if (!selectedCandidates.includes(voteForThisContest)) {
            excludeVotes = true;
            break;
          }
        }
        if (excludeVotes) {
          continue; // This group of votes was excluded by filters
        }
        for (const contest of contestsToEval) {
          const contestIndex = ballotCardContests.indexOf(contest);
          const voteForThisContest = vote[contestIndex] ?? UNDERVOTE_SENTINEL; // ts doesn't support null as index

          contestFilteredResults[contest][voteForThisContest] =
            (contestFilteredResults[contest][voteForThisContest] ?? 0) + tally;
        }
      }
    }
    return contestFilteredResults;
  }, [electionJson, selectedContests, selectedCandidatesGrouped]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <i className="bi bi-intersect" style={{ marginRight: "10px" }} />
          SF Elections Correlator
        </h1>
      </header>

      {electionJson && mode === DisplayMode.SELECT_CONTESTS && (
        <main className="contest-select">
          <section className="contest-select-explanation">
            <h2>Select election and contests</h2>
            <p>
              Select the contests among which you are interested in analyzing
              correlations. Note that you can only select contests which appear
              together on at least one ballot card. Your exploration will be
              limited to voters who had all selected contests together on a
              single ballot card.
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
                    {currentBallotCount.toLocaleString()} ballot cards (likely
                    from voters using alternative, accessible voting methods).
                    Data may be unreliable.
                  </p>
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill" />
                  <p>
                    {currentBallotCount.toLocaleString()} overlapping ballot
                    cards found
                  </p>
                </>
              )}
              <Button
                className="advance-button"
                onPress={() => setMode(DisplayMode.SELECT_CANDIDATES)}
              >
                Explore Correlations
                <i className="bi bi-arrow-right" />
              </Button>
            </section>
          )}
        </main>
      )}

      {electionJson && mode === DisplayMode.SELECT_CANDIDATES && (
        <main>
          <section className="contest-list">
            {[...selectedContests].map((contestId) => {
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
                          {getCandidateName(electionJson, candidateId)}
                        </CheckboxButton>
                      </CheckboxField>
                    ))}
                  </div>
                  {allCandidates.length > 4 && (
                    <button
                      className="expand-candidates-btn"
                      onClick={() => toggleContestExpanded(contestId)}
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
          </section>
          {selectedCandidates.length > 0 && (
            <section className="results-display">
              <h2>Among voters who voted as follows:</h2>
              <ul>
                {Object.entries(selectedCandidatesGrouped).map(
                  ([contestId, candidates]) => (
                    <li>
                      {electionJson.contestDetails[contestId].name}
                      <ul>
                        {candidates.map((candidateId, i) => (
                          <li>
                            {electionJson.candidateDetails[candidateId].name}
                            {i < candidates.length - 2
                              ? ","
                              : i === candidates.length - 2
                                ? ", or"
                                : ""}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ),
                )}
              </ul>
              <h2>The remaining contest results were:</h2>
              <ul>
                {Object.entries(contestFilteredResults).map(
                  ([contestId, contestResults]) => (
                    <li>
                      {electionJson.contestDetails[contestId].name}
                      <ul>
                        {electionJson.contestDetails[
                          contestId
                        ].candidateOrder.map((candidateId) => (
                          <li>
                            {getCandidateName(electionJson, candidateId)} -{" "}
                            {(
                              contestResults[candidateId] ?? 0
                            ).toLocaleString()}
                          </li>
                        ))}
                        <li>
                          Undervotes/Overvotes -{" "}
                          {(
                            contestResults[UNDERVOTE_SENTINEL] ?? 0
                          ).toLocaleString()}
                        </li>
                      </ul>
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
