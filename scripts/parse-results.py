#!/usr/bin/env python3
"""
Parses test-results/results.json (Playwright JSON reporter output) and
prints key=value lines that the Jenkinsfile reads via shell capture.

Output format:
  TOTAL=<n>
  PASSED=<n>
  FAILED=<n>
  SKIPPED=<n>
  DURATION=<human-readable>
  FAIL:<test title>   (one line per failed test)
"""
import json, os, sys

path = "test-results/results.json"

if not os.path.exists(path):
    print("TOTAL=0")
    print("PASSED=0")
    print("FAILED=0")
    print("SKIPPED=0")
    print("DURATION=0s")
    sys.exit(0)

with open(path) as f:
    data = json.load(f)

stats     = data.get("stats", {})
total     = stats.get("expected", 0) + stats.get("unexpected", 0) + stats.get("skipped", 0)
passed    = stats.get("expected", 0)
failed    = stats.get("unexpected", 0)
skipped   = stats.get("skipped", 0)
dur_ms    = stats.get("duration", 0)

mins = int(dur_ms // 60000)
secs = int((dur_ms % 60000) // 1000)
duration = f"{mins}m {secs}s" if mins else f"{secs}s"

print(f"TOTAL={total}")
print(f"PASSED={passed}")
print(f"FAILED={failed}")
print(f"SKIPPED={skipped}")
print(f"DURATION={duration}")

failed_specs = []

def collect(suites):
    for suite in suites:
        for spec in suite.get("specs", []):
            if not spec.get("ok", True):
                file_hint = suite.get("title", "")
                title     = spec.get("title", "Unknown")
                failed_specs.append((file_hint, title))
        collect(suite.get("suites", []))

collect(data.get("suites", []))

for file_hint, title in failed_specs:
    # Tab-separate file hint and title so Jenkinsfile can split them
    safe_title = title.replace("\n", " ").replace("|", "\\|")
    safe_file  = file_hint.replace("\n", " ").replace("|", "\\|")
    print(f"FAIL:{safe_file}\t{safe_title}")
