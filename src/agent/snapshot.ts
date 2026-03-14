
import { runs } from "@trigger.dev/sdk/v3";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

function getApiKey(envIdentifier: string): string | undefined {
    if (envIdentifier === "prod") {
        return process.env.TRIGGER_SECRET_KEY ?? process.env.TRIGGER_SECRET_KEY;
    }
    // Default to standard key for dev, or specific dev key if exists
    return process.env.TRIGGER_SECRET_KEY_STAGING ?? process.env.TRIGGER_SECRET_KEY;
}

async function snapshot() {
    const args = process.argv.slice(2);
    const isProd = args.includes("--prod");
    const isDev = args.includes("--dev");
    const envName = isProd ? "prod" : "dev";

    // Attempt to switch API key based on environment
    // We do this by overwriting TRIGGER_SECRET_KEY before the SDK uses it
    const apiKey = getApiKey(envName);

    if (!apiKey) {
        console.error(`❌ No API key found for environment: ${envName}`);
        console.error(`Please set ${isProd ? "TRIGGER_SECRET_KEY_PROD" : "TRIGGER_SECRET_KEY"} in your .env file.`);
        process.exit(1);
    }

    // Force the SDK to use this key
    process.env.TRIGGER_SECRET_KEY = apiKey;

    console.log(`📸 Snapshotting latest Trigger.dev run (${envName})...`);

    try {
        // 1. Fetch the latest run
        // Note: Trigger.dev v3 SDK 'runs' object allows listing/retrieving runs.
        // We might need to filter by project if multiple exist, but usually env vars handle auth.
        const recentRuns = await runs.list({
            limit: 1,
        });

        if (recentRuns.data.length === 0) {
            console.log("No runs found.");
            return;
        }

        const latestRun = recentRuns.data[0];
        console.log(`Found run: ${latestRun.id} (${latestRun.status})`);

        // 2. Fetch full details including logs if needed (retrieve gives more detail than list sometimes)
        let fullRun = await runs.retrieve(latestRun.id);

        // 3. Format the snapshot
        const snapshotDate = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${envName}_${snapshotDate}_${fullRun.id}.md`;
        const snapshotDir = path.join(process.cwd(), ".agent", "snapshots");

        if (!fs.existsSync(snapshotDir)) {
            fs.mkdirSync(snapshotDir, { recursive: true });
        }

        const filepath = path.join(snapshotDir, filename);
        const latestLinkPath = path.join(snapshotDir, "latest.md");

        const content = `# Trigger.dev Run Snapshot: ${fullRun.id}

**Environment**: ${envName}
**Status**: ${fullRun.status}
**Task**: ${fullRun.taskIdentifier}
**Created At**: ${fullRun.createdAt.toISOString()}
**Finished At**: ${fullRun.finishedAt?.toISOString() ?? "N/A"}

## Input
\`\`\`json
${JSON.stringify(fullRun.payload, null, 2)}
\`\`\`

## Output
\`\`\`json
${JSON.stringify(fullRun.output, null, 2)}
\`\`\`

## Error
${fullRun.error ? `\`\`\`json\n${JSON.stringify(fullRun.error, null, 2)}\n\`\`\`` : "No error"}

## Logs (Snippet)
*(Logs might require separate API call if not in retrieve object, checking...)*
`;
        // Note: Fetching logs might require a separate call if not included in 'retrieve'.
        // For now we'll stick to the run details which typically include the error.

        fs.writeFileSync(filepath, content);
        console.log(`Snapshot saved to: ${filepath}`);

        // Update 'latest.md' symlink or copy
        fs.copyFileSync(filepath, latestLinkPath);
        console.log(`Updated latest snapshot: ${latestLinkPath}`);

    } catch (error) {
        console.error("Failed to snapshot run:", error);
        process.exit(1);
    }
}

snapshot();
