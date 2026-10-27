import json
from collections import defaultdict
import sys
from pprint import pprint
import os
import tqdm

# TODO args to adapt for every election, customize JSON file name

with open("CandidateManifest.json", "r") as f:
    candidates_json = json.load(f)

with open("BallotTypeManifest.json", "r") as f:
    ballot_types_json = json.load(f)

with open("BallotTypeContestManifest.json", "r") as f:
    contest_ballot_type_json = json.load(f)

with open("ContestManifest.json", "r") as f:
    contests = json.load(f)

contest_names = {x["Id"]: x["Description"] for x in contests["List"]}

# TODO just single-choice for now (props, single-candidate offices), skipping multi-candidate (e.g. CCSF board) and ranked-choice
skipped_contests = set(
    x["Id"] for x in contests["List"] if x["VoteFor"] != 1 or x["NumOfRanks"] != 0
)

candidate_names = {x["Id"]: x["Description"] for x in candidates_json["List"]}

# DATA STRUCTURE FOR CORRELATION LOOKUPS:
# sorted tuple of contests -> parallel tuple describing vote -> number of ballots recorded

cvr_export_max = 0
while os.path.isfile(f"CvrExport_{cvr_export_max}.json"):
    cvr_export_max += 1

result = defaultdict(lambda: defaultdict(int))

for idx in tqdm.trange(cvr_export_max):
    with open(f"CvrExport_{idx}.json", "r") as f:
        votes_json = json.load(f)

    for session in votes_json["Sessions"]:
        # TODO use session["CountingGroupId"] to correlate in-person vs VBM info?

        votes = {
            contest["Id"]: (
                [mark["CandidateId"] for mark in contest["Marks"] if mark["IsVote"]]
                if contest["Overvotes"] == 0 and contest["Undervotes"] == 0
                else None
            )
            for card in session["Original"]["Cards"]
            for contest in card["Contests"]
            if contest["Id"] not in skipped_contests
        }

        # any cards with exactly one contest (e.g. EDU voters) can be skipped
        if (len(votes)) < 2:
            continue

        contests = tuple(sorted(votes.keys()))
        vote_list = []
        for c in contests:
            v = votes[c]
            if v is None:
                vote_list.append(None)
                continue

            assert (
                len(v) == 1
            )  # overvotes and undervotes should already be captured as None
            vote_list.append(v[0])

        vote_tuple = tuple(vote_list)
        # vote_tuple = tuple(votes[c] for c in contests)

        result[contests][vote_tuple] += 1


# TODO ensure consistency with candidate/contest names

print({k: dict(v) for k, v in result.items()})
