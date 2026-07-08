import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function uploadJson(fileName, jsonData) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  const path = `data/${fileName}`;

  let sha;

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    sha = response.data.sha;
  } catch (err) {
    // File doesn't exist yet
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Update ${fileName}`,
    content: Buffer.from(
      JSON.stringify(jsonData, null, 2)
    ).toString("base64"),
    branch,
    sha,
  });
}