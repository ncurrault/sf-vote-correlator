export interface ElectionJson {
  version: "1.0.5";
  correlationsResult: Record<string, Record<string, number>>;
  contestDetails: Record<number, { name: string; candidateOrder: number[] }>;
  contestOverlapCount: Record<string, number>;
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
  redactedScans: {
    precinct: string;
    imageMask: string;
  }[];
}
