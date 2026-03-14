---
description: Debug the last failed Trigger.dev run by taking a snapshot and analyzing it.
---

1. Run the snapshot script to fetch the latest run details.
   `npm run snapshot`

2. Read the generated snapshot file to understand the error.
   `view_file .agent/snapshots/latest.md`

3. (Optional) If the error is not clear or if logs are missing, you might need to check the Trigger.dev dashboard or use `run_command` to inspect the codebase based on the error stack trace.

4. Once the error is identified, propose a fix.