export type CandidateId = number;
export type ContestId = number;

export type ContestIDsJSONString = string;
export type CandidateIDsJSONString = string;

export interface ElectionJson {
  version: "1.0.5";
  correlationsResult: Record<
    ContestIDsJSONString,
    Record<CandidateIDsJSONString, number>
  >;
  contestDetails: Record<
    ContestId,
    { name: string; candidateOrder: CandidateId[] }
  >;
  contestOverlapCount: Record<ContestIDsJSONString, number>;
  candidateDetails: Record<
    CandidateId,
    {
      name: string;
      contestId: ContestId;
    }
  >;
  electionName: string;
  electionDate: string;
  contestOrder: ContestId[];
  redactedScans: {
    precinct: string;
    imageMask: string;
  }[];
}
