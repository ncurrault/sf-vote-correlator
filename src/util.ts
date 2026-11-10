export const UNDERVOTE_SENTINEL = -1;

import type { CandidateId, ContestId, ElectionJson } from "./types";

const UNDERVOTE_LABEL = "Undervote/Overvote";

export function getCandidateName(
  electionJson: ElectionJson,
  candidateId: CandidateId,
) {
  if (candidateId === -1) {
    return UNDERVOTE_LABEL;
  }
  return electionJson.candidateDetails[candidateId]?.name ?? "error";
}

export function getContestDetails(
  electionJson: ElectionJson,
  contestId: ContestId | string,
) {
  return electionJson.contestDetails[contestId as unknown as number];
  // Object.keys() and Object.entries() returns number-keyed records as strings.
  // This also works but throws a type error. This is a hacky solution around this problem.
}
