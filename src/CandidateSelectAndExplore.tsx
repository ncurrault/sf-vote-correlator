import "./App.css";
import React from "react";
import { Button, CheckboxButton, CheckboxField } from "react-aria-components";
import "bootstrap-icons/font/bootstrap-icons.css";
import { UNDERVOTE_SENTINEL, getCandidateName } from "./util";
import type { ElectionJson, ContestId, CandidateId } from "./types";

export function CandidateSelectAndExplore({
  electionJson,
  selectedContests,
}: {
  electionJson: ElectionJson;
  selectedContests: ContestId[];
}) {
  const [selectedCandidates, setSelectedCandidates] = React.useState<
    CandidateId[]
  >([]);
  const toggleCandidate = React.useCallback(
    (candidate: CandidateId) =>
      setSelectedCandidates((existing) =>
        existing.includes(candidate)
          ? existing.filter((x) => x !== candidate)
          : [...existing, candidate],
      ),
    [setSelectedCandidates],
  );
  const [expandedContests, setExpandedContests] = React.useState<ContestId[]>(
    [],
  );
  const toggleContestExpanded = React.useCallback(
    (contestId: ContestId) =>
      setExpandedContests((currExpanded) =>
        currExpanded.includes(contestId)
          ? currExpanded.filter((x) => x !== contestId)
          : [...currExpanded, contestId],
      ),
    [setExpandedContests],
  );

  const selectedCandidatesGrouped = React.useMemo(() => {
    const result: Record<ContestId, CandidateId[]> = {};
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
    const contestFilteredResults: Record<
      ContestId,
      Record<CandidateId, number>
    > = {};
    if (!electionJson) {
      return contestFilteredResults;
    }

    for (const contest of contestsToEval) {
      contestFilteredResults[contest] = {};
    }

    for (const [contestsStr, voteTallies] of Object.entries(
      electionJson?.correlationsResult,
    )) {
      const ballotCardContests: ContestId[] = JSON.parse(contestsStr);
      // if this ballot card type does not contain everything we're interested in, skip it
      if (
        selectedContests.some(
          (requiredContest) => !ballotCardContests.includes(requiredContest),
        )
      ) {
        continue;
      }

      for (const [voteStr, tally] of Object.entries(voteTallies)) {
        const vote: (CandidateId | null)[] = JSON.parse(voteStr);

        let excludeVotes = false;
        for (const [contestStr, selectedCandidates] of Object.entries(
          selectedCandidatesGrouped,
        )) {
          const contest: ContestId = parseInt(contestStr, 10); // ts object keys are automatically converted to strings; parse back to integers
          const contestIndex = ballotCardContests.indexOf(contest);
          if (contestIndex === -1) {
            console.error(
              `Contest not found: ${contest} in ${ballotCardContests}`,
            );
          }

          const voteForThisContest: CandidateId =
            vote[contestIndex] ?? UNDERVOTE_SENTINEL; // ts doesn't support null as index

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
          if (contestIndex === -1) {
            console.error(
              `Contest not found: ${contest} in ${ballotCardContests}`,
            );
          }

          const voteForThisContest = vote[contestIndex] ?? UNDERVOTE_SENTINEL; // ts doesn't support null as index

          contestFilteredResults[contest][voteForThisContest] =
            (contestFilteredResults[contest][voteForThisContest] ?? 0) + tally;
        }
      }
    }
    return contestFilteredResults;
  }, [electionJson, selectedContests, selectedCandidatesGrouped]);

  return (
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
                    {electionJson.contestDetails[contestId].candidateOrder.map(
                      (candidateId) => (
                        <li>
                          {getCandidateName(electionJson, candidateId)} -{" "}
                          {(contestResults[candidateId] ?? 0).toLocaleString()}
                        </li>
                      ),
                    )}
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
  );
}
