import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// GitHub connection helper (from Replit GitHub integration)
let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=github",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  ).then((res) => res.json()).then((data) => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("GitHub not connected");
  }
  return accessToken;
}

const OWNER = "filippostmech";
const REPO = "superbrain";

const EXCLUDED_FILES = new Set([
  "replit.md",
  ".replit",
  ".gitignore",
]);

const EXCLUDED_PREFIXES = [
  "attached_assets/",
];

function isExcluded(filePath: string): boolean {
  if (EXCLUDED_FILES.has(filePath)) return true;
  for (const prefix of EXCLUDED_PREFIXES) {
    if (filePath.startsWith(prefix)) return true;
  }
  return false;
}

async function main() {
  console.log("Connecting to GitHub...");
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });

  const rootDir = "/home/runner/workspace";

  const trackedFiles = execSync("git ls-files --cached", { cwd: rootDir, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter((f) => f && !isExcluded(f));

  console.log(`Found ${trackedFiles.length} files to push (${EXCLUDED_FILES.size} excluded)`);

  let ref: string;
  try {
    const { data: refData } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: "heads/main" });
    ref = refData.object.sha;
  } catch {
    const { data: refData } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: "heads/master" });
    ref = refData.object.sha;
  }
  console.log(`Current HEAD: ${ref}`);

  console.log("Creating tree blobs...");
  const tree: { path: string; mode: "100644" | "100755"; type: "blob"; sha: string }[] = [];

  const BATCH_SIZE = 20;
  for (let i = 0; i < trackedFiles.length; i += BATCH_SIZE) {
    const batch = trackedFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (filePath) => {
        const fullPath = path.join(rootDir, filePath);
        const content = fs.readFileSync(fullPath);
        const isBinary = content.includes(0x00);

        const { data: blob } = await octokit.git.createBlob({
          owner: OWNER,
          repo: REPO,
          content: isBinary ? content.toString("base64") : content.toString("utf-8"),
          encoding: isBinary ? "base64" : "utf-8",
        });

        return {
          path: filePath,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        };
      })
    );
    tree.push(...results);
    console.log(`  Uploaded ${Math.min(i + BATCH_SIZE, trackedFiles.length)}/${trackedFiles.length} files`);
  }

  console.log("Creating tree...");
  const { data: newTree } = await octokit.git.createTree({
    owner: OWNER,
    repo: REPO,
    tree,
  });

  console.log("Creating commit...");
  const commitMessage = "Sync from Replit: API docs nav links, dynamic base URL, Tier 1/2 roadmap";
  const { data: newCommit } = await octokit.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message: commitMessage,
    tree: newTree.sha,
    parents: [ref],
  });

  console.log("Updating ref...");
  try {
    await octokit.git.updateRef({
      owner: OWNER,
      repo: REPO,
      ref: "heads/main",
      sha: newCommit.sha,
    });
  } catch {
    await octokit.git.updateRef({
      owner: OWNER,
      repo: REPO,
      ref: "heads/master",
      sha: newCommit.sha,
    });
  }

  console.log(`Pushed successfully! Commit: ${newCommit.sha}`);
  console.log(`Message: ${commitMessage}`);

  // Verify excluded files are not in the repo
  for (const excluded of EXCLUDED_FILES) {
    try {
      await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: excluded });
      console.log(`WARNING: ${excluded} found in repo, deleting...`);
      const { data: fileData } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: excluded }) as any;
      await octokit.repos.deleteFile({
        owner: OWNER,
        repo: REPO,
        path: excluded,
        message: `Remove ${excluded} (should be local-only)`,
        sha: fileData.sha,
      });
      console.log(`  Deleted ${excluded} from repo`);
    } catch {
      // File not in repo, good
    }
  }

  console.log("Done! All changes synced to GitHub.");
}

main().catch((err) => {
  console.error("Push failed:", err);
  process.exit(1);
});
