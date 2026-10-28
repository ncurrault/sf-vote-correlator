# Ballot Scan Data Processing

This directory is used to parse ballot-scan data that the San Francisco Department of Elections publishes into a JSON file that can be read by the frontend. To replicate this process:

1. Find the election you're interested in on the department's [past election results](https://www.sf.gov/past-election-results) page.
2. Under detailed reports, select "final report" (or the latest preliminary report if you want to view preliminary correlations as votes are still being counted)
3. Download and extract the "Cast Vote Record (Raw data) - JSON" ZIP file.
4. Run `parse.py`, passing the directory of the cast vote record and the destination JSON file as arguments. For example:

```
python3 parse.py ./CVR_Export_20240322103409/ march2024.json
```