import json
from collections import defaultdict
import sys
import os
import datetime

# If tqdm (non-standard library for progress bars) isn't installed, just
# don't show a progress bar
try:
    from tqdm import trange as range_func
except ImportError:
    range_func = range

RESULT_FORMAT_VERSION = "1.0.3"

if len(sys.argv) < 3:
    print("Usage: parse.py cvr_directory output_json", file=sys.stderr)
    sys.exit(1)

cvr_directory = sys.argv[1]
output_filename = sys.argv[2]

with open(os.path.join(sys.argv[1], "CandidateManifest.json"), "r") as f:
    candidates_json = json.load(f)

with open(os.path.join(sys.argv[1], "ContestManifest.json"), "r") as f:
    contests = json.load(f)

with open(os.path.join(sys.argv[1], "ElectionEventManifest.json"), "r") as f:
    election_event_manifest = json.load(f)

# Gather election metadata for eventual output
assert len(election_event_manifest["List"]) == 1
election_details = election_event_manifest["List"][0]

election_name = election_details["Description"]
election_date = datetime.date.fromisoformat(election_details["ElectionDate"])


# TODO just single-choice for now (props, single-candidate offices), skipping multi-candidate (e.g. CCSF board) and ranked-choice
skipped_contests = set(
    x["Id"] for x in contests["List"] if x["VoteFor"] != 1 or x["NumOfRanks"] != 0
)

contest_details = {
    x["Id"]: {"name": x["Description"]}
    for x in contests["List"]
    if x["Id"] not in skipped_contests
}

candidate_details = {
    x["Id"]: {
        "name": x["Description"],
        "contestId": x["ContestId"],
        "isWriteIn": x["Type"] == "WriteIn",
    }
    for x in candidates_json["List"]
    if x["ContestId"] not in skipped_contests
}

# DATA STRUCTURE FOR CORRELATION LOOKUPS:
# sorted tuple of contest IDs
# -> parallel tuple of voted candidate on each contest -> ballot count
#
# Then, to get a correlation, look at all keys that are supersets of
# some set of contests plus the contest in question, filter based on
# vote tuples and sum ballot counts


def cvr_file_path(idx):
    return os.path.join(sys.argv[1], f"CvrExport_{idx}.json")


cvr_export_max = 0
while os.path.isfile(cvr_file_path(cvr_export_max)):
    cvr_export_max += 1

correlations_result = defaultdict(lambda: defaultdict(int))
vote_tallies = defaultdict(lambda: defaultdict(int))

for idx in range_func(cvr_export_max):
    with open(cvr_file_path(idx), "r") as f:
        votes_json = json.load(f)

    for session in votes_json["Sessions"]:
        # TODO use session["CountingGroupId"] to correlate in-person vs VBM info?

        # Some overvotes or scanning issues are later adjudicated to ensure a
        # correct result. For example, if a voter crosses out their vote and
        # changes it, making their intent clear on the ballot.
        session_portion_used = (
            session["Modified"] if "Modified" in session else session["Original"]
        )

        votes = {
            contest["Id"]: (
                [mark["CandidateId"] for mark in contest["Marks"] if mark["IsVote"]]
                if contest["Overvotes"] == 0 and contest["Undervotes"] == 0
                else None
            )
            for card in session_portion_used["Cards"]
            for contest in card["Contests"]
            if contest["Id"] not in skipped_contests
        }

        for contest, v in votes.items():
            if v is None:
                continue

            assert (
                len(v) == 1
            )  # overvotes and undervotes should already be captured as None
            vote_tallies[contest][v[0]] += 1

        # any cards with exactly one contest (e.g. EDU voters) can be skipped
        # for correlation-data purposes
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

        correlations_result[contests][vote_tuple] += 1


# TODO ensure consistency with candidate/contest names
# TODO run a few elections through and double check actual tallies against official results

candidates_by_contest = defaultdict(list)
for candidate in candidate_details:
    candidates_by_contest[candidate_details[candidate]["contestId"]].append(candidate)

for contest in contest_details.keys():
    print(contest_details[contest]["name"])
    candidate_order = sorted(
        candidates_by_contest[contest],
        key=lambda candidate: (
            1
            if candidate_details[candidate]["isWriteIn"]
            else -vote_tallies[contest][candidate]
        ),
    )
    contest_details[contest]["candidateOrder"] = candidate_order
    for candidate in candidate_order:
        print(
            f"\t{candidate_details[candidate]["name"]}\t{vote_tallies[contest][candidate]:,}",
        )
    print()


# Transform result to JSON-compatible types: tuples aren't supported, so
# simply stringify the array for each key

correlations_for_json = {
    json.dumps(list(contests)): {
        json.dumps(list(vote)): tally for vote, tally in vote_totals.items()
    }
    for contests, vote_totals in correlations_result.items()
}

json_result = {
    "version": RESULT_FORMAT_VERSION,
    "correlationsResult": correlations_for_json,
    "contestNames": contest_details,
    "candidateDetails": candidate_details,
    "electionName": election_name,
    "electionDate": election_date.isoformat(),
    "contestOrder": list(contest_details.keys()),
}

with open(output_filename, "w") as f:
    json.dump(json_result, f)
