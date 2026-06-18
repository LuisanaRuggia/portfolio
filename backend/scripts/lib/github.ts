import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ManifestEntry = {
  owner: string;
  repo: string;
  branch: string;
  displayName: string;
};

export type Manifest = Record<string, ManifestEntry>;

export function loadManifest(): Manifest {
  const manifestPath = join(import.meta.dirname, '..', '..', 'data', 'manifest.json');
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
}

export type Commit = {
  sha: string;
  date: string;
  subject: string;
};

export function gitLog(repoPath: string, count: number = 10): Commit[] {
  const raw = execFileSync(
    'git',
    ['-C', repoPath, 'log', `--pretty=format:%h|%ai|%s`, `-n`, String(count)],
    { encoding: 'utf8' },
  );
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [sha, date, ...subjectParts] = line.split('|');
      return { sha, date, subject: subjectParts.join('|') };
    });
}

export function gitLogSince(repoPath: string, since: string): Commit[] {
  const raw = execFileSync(
    'git',
    ['-C', repoPath, 'log', `--pretty=format:%h|%ai|%s`, `--since=${since}`],
    { encoding: 'utf8' },
  );
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [sha, date, ...subjectParts] = line.split('|');
      return { sha, date, subject: subjectParts.join('|') };
    });
}

export const PORTFOLIO_REPO_PATH = join(import.meta.dirname, '..', '..', '..', '..');
