export const UNDERVOTE_SENTINEL = -1;

import type { ElectionJson } from "./types";

const UNDERVOTE_LABEL = "Undervote/Overvote";

export function getCandidateName(
  electionJson: ElectionJson,
  candidateId: number,
) {
  if (candidateId === -1) {
    return UNDERVOTE_LABEL;
  }
  return electionJson?.candidateDetails[candidateId]?.name ?? "error";
}
