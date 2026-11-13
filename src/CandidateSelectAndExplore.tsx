import "./App.css";
import React from "react";
import { CheckboxButton, CheckboxField } from "react-aria-components";
import "bootstrap-icons/font/bootstrap-icons.css";
import {
  UNDERVOTE_SENTINEL,
  getCandidateName,
  getContestDetails,
} from "./util";
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
    for (const candidate of selectedCandidates) {
      const contest = electionJson.candidateDetails[candidate].contestId;
      if (!result[contest]) {
        result[contest] = [];
      }
      result[contest].push(candidate);
    }

    return result;
  }, [electionJson, selectedCandidates]);
  const { contestFilteredResults, totalBallotsInFilteredResult } =
    React.useMemo(() => {
      const contestsToEval = selectedContests.filter(
        (contest) => !selectedCandidatesGrouped[contest],
      );
      const contestFilteredResults: Record<
        ContestId,
        Record<CandidateId, number>
      > = {};
      let totalBallotsInFilteredResult = 0;

      if (!electionJson) {
        return { contestFilteredResults, totalBallotsInFilteredResult };
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
              (contestFilteredResults[contest][voteForThisContest] ?? 0) +
              tally;
            totalBallotsInFilteredResult += tally;
          }
        }
      }
      return { contestFilteredResults, totalBallotsInFilteredResult };
    }, [electionJson, selectedContests, selectedCandidatesGrouped]);

  const twoContestGrid = React.useMemo(() => {
    const contestsStr = Object.keys(selectedCandidatesGrouped);
    if (contestsStr.length !== 2) {
      return null;
    }
    const contests = contestsStr.map((x) => parseInt(x, 10));
    console.log({ contestsStr, contests });
    const horizContest = contests[0];
    const vertContest = contests[1];
    const gridData: Record<CandidateId, Record<CandidateId, number>> = {}; // horiz vote -> vert vote -> tally (and include UNDERVOTE_SENTINEL for missing)
    for (const [contestsStr, voteTallies] of Object.entries(
      electionJson.correlationsResult,
    )) {
      const entryContests: ContestId[] = JSON.parse(contestsStr).map((x: string) =>
        parseInt(x, 10),
      );
      if (
        !entryContests.includes(horizContest) ||
        !entryContests.includes(vertContest)
      ) {
        continue; // this vote does not have any relevant data
      }

      const horizIdx = entryContests.indexOf(horizContest);
      const vertIdx = entryContests.indexOf(vertContest);

      for (const [voteStr, tally] of Object.entries(voteTallies)) {
        const vote: CandidateId[] = JSON.parse(voteStr).map((x: string | null) =>
          x ? parseInt(x, 10) : UNDERVOTE_SENTINEL,
        );
        const horizVote = vote[horizIdx];
        const vertVote = vote[vertIdx];

        if (
          (horizVote !== UNDERVOTE_SENTINEL &&
            !selectedCandidates.includes(horizVote)) ||
          (vertVote !== UNDERVOTE_SENTINEL &&
            !selectedCandidates.includes(vertVote))
        ) {
          continue;
        }

        if (!gridData[horizVote]) {
          gridData[horizVote] = {};
        }
        gridData[horizVote][vertVote] =
          (gridData[horizVote][vertVote] ?? 0) + tally;
      }
    }
    return { gridData, horizContest, vertContest };
  }, [electionJson, selectedCandidates, selectedContests]);

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
      {twoContestGrid &&
        (() => {
          const horizCandidates = [
            ...selectedCandidatesGrouped[twoContestGrid.horizContest],
            UNDERVOTE_SENTINEL,
          ];
          const vertCandidates = [
            ...selectedCandidatesGrouped[twoContestGrid.vertContest],
            UNDERVOTE_SENTINEL,
          ];
          const getTally = (horiz: CandidateId, vert: CandidateId) =>
            (twoContestGrid.gridData[horiz] ?? {})[vert] ?? 0;
          const maxTally = Math.max(
            1,
            ...horizCandidates.flatMap((h) =>
              vertCandidates.map((v) => getTally(h, v)),
            ),
          );
          return (
            <section className="correlation-grid-section">
              <h2>Correlations between selected candidates</h2>
              <div className="correlation-grid-scroll">
                <table className="correlation-grid">
                  <thead>
                    <tr>
                      <th colSpan={2} rowSpan={2} className="grid-corner" />
                      <th
                        colSpan={horizCandidates.length}
                        className="grid-contest-label grid-contest-label-horiz"
                      >
                        {
                          electionJson.contestDetails[
                            twoContestGrid.horizContest
                          ].name
                        }
                      </th>
                    </tr>
                    <tr>
                      {horizCandidates.map((candidate) => (
                        <th
                          key={candidate}
                          scope="col"
                          className="grid-candidate-label"
                        >
                          {getCandidateName(electionJson, candidate)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vertCandidates.map((vertCandidate, rowIdx) => (
                      <tr key={vertCandidate}>
                        {rowIdx === 0 && (
                          <th
                            rowSpan={vertCandidates.length}
                            className="grid-contest-label grid-contest-label-vert"
                          >
                            <span>
                              {
                                electionJson.contestDetails[
                                  twoContestGrid.vertContest
                                ].name
                              }
                            </span>
                          </th>
                        )}
                        <th scope="row" className="grid-candidate-label">
                          {getCandidateName(electionJson, vertCandidate)}
                        </th>
                        {horizCandidates.map((horizCandidate) => {
                          const tally = getTally(horizCandidate, vertCandidate);
                          return (
                            <td
                              key={horizCandidate}
                              className="grid-cell"
                              style={
                                {
                                  "--intensity": tally / maxTally,
                                } as React.CSSProperties
                              }
                            >
                              {tally.toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })()}
      {!twoContestGrid && selectedCandidates.length > 0 && (
        <section className="results-display">
          <h2>
            Among {totalBallotsInFilteredResult.toLocaleString()} voters who
            voted as follows:
          </h2>
          <ul>
            {Object.entries(selectedCandidatesGrouped).map(
              ([contestId, candidates]) => (
                <li>
                  {getContestDetails(electionJson, contestId).name}
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
                  {getContestDetails(electionJson, contestId).name}
                  <ul>
                    {getContestDetails(
                      electionJson,
                      contestId,
                    ).candidateOrder.map((candidateId: CandidateId) => {
                      const tally = contestResults[candidateId] ?? 0;
                      const percentage =
                        (100 * tally) / totalBallotsInFilteredResult;
                      return (
                        <li>
                          {getCandidateName(electionJson, candidateId)} -{" "}
                          {tally.toLocaleString()} (
                          {percentage.toLocaleString()}%)
                        </li>
                      );
                    })}
                    <li>
                      Undervotes/Overvotes -{" "}
                      {(
                        contestResults[UNDERVOTE_SENTINEL] ?? 0
                      ).toLocaleString()}{" "}
                      (
                      {(
                        (100 * (contestResults[UNDERVOTE_SENTINEL] ?? 0)) /
                        totalBallotsInFilteredResult
                      ).toLocaleString()}
                      %)
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
