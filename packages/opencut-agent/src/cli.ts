#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	addTextElement,
	createProject,
	deleteElement,
	moveElement,
	type OpenCutProject,
	splitElement,
	summarizeProject,
	validateProject,
} from "./project";

type CliResult = Record<string, unknown> & { ok: boolean };

async function main() {
	const { command, flags } = parseArgs(process.argv.slice(2));
	let result: CliResult;

	switch (command) {
		case "new": {
			const out = requireFlag(flags, "out");
			const project = createProject({
				name: getFlag(flags, "name") ?? "Codex OpenCut Project",
				width: getNumberFlag(flags, "width") ?? 1920,
				height: getNumberFlag(flags, "height") ?? 1080,
				fps: getNumberFlag(flags, "fps") ?? 30,
				background: getFlag(flags, "background") ?? "#000000",
			});
			await writeProject({ path: out, project });
			result = ok(command, out, project);
			break;
		}
		case "add-text": {
			const path = requireFlag(flags, "project");
			const project = await readProject(path);
			const added = addTextElement({
				project,
				text: requireFlag(flags, "text"),
				startSeconds: getNumberFlag(flags, "start") ?? 0,
				durationSeconds: getNumberFlag(flags, "duration") ?? 5,
				name: getFlag(flags, "name"),
				trackId: getFlag(flags, "track-id"),
				fontSize: getNumberFlag(flags, "font-size") ?? 72,
				color: getFlag(flags, "color") ?? "#ffffff",
			});
			const out = getFlag(flags, "out") ?? path;
			await writeProject({ path: out, project: added.project });
			result = {
				...ok(command, out, added.project),
				elementId: added.elementId,
				trackId: added.trackId,
			};
			break;
		}
		case "split": {
			const path = requireFlag(flags, "project");
			const project = await readProject(path);
			const split = splitElement({
				project,
				elementId: requireFlag(flags, "element-id"),
				timeSeconds: getRequiredNumberFlag(flags, "time"),
			});
			const out = getFlag(flags, "out") ?? path;
			await writeProject({ path: out, project: split.project });
			result = {
				...ok(command, out, split.project),
				rightElementId: split.rightElementId,
			};
			break;
		}
		case "move": {
			const path = requireFlag(flags, "project");
			const project = await readProject(path);
			const moved = moveElement({
				project,
				elementId: requireFlag(flags, "element-id"),
				startSeconds: getRequiredNumberFlag(flags, "start"),
			});
			const out = getFlag(flags, "out") ?? path;
			await writeProject({ path: out, project: moved.project });
			result = ok(command, out, moved.project);
			break;
		}
		case "delete": {
			const path = requireFlag(flags, "project");
			const project = await readProject(path);
			const deleted = deleteElement({
				project,
				elementId: requireFlag(flags, "element-id"),
			});
			const out = getFlag(flags, "out") ?? path;
			await writeProject({ path: out, project: deleted.project });
			result = ok(command, out, deleted.project);
			break;
		}
		case "inspect": {
			const path = requireFlag(flags, "project");
			const project = await readProject(path);
			result = { ok: true, command, project: path, summary: summarizeProject(project) };
			break;
		}
		case "validate": {
			const path = requireFlag(flags, "project");
			const project = await readProject(path);
			const errors = validateProject(project);
			result = {
				ok: errors.length === 0,
				command,
				project: path,
				errors,
				summary: summarizeProject(project),
			};
			if (errors.length > 0) {
				process.exitCode = 1;
			}
			break;
		}
		default:
			throw new Error(helpText());
	}

	writeJson(result);
}

function ok(command: string, path: string, project: OpenCutProject): CliResult {
	const errors = validateProject(project);
	return {
		ok: errors.length === 0,
		command,
		project: path,
		errors,
		summary: summarizeProject(project),
	};
}

async function readProject(path: string): Promise<OpenCutProject> {
	return JSON.parse(await readFile(resolve(path), "utf8")) as OpenCutProject;
}

async function writeProject({
	path,
	project,
}: {
	path: string;
	project: OpenCutProject;
}): Promise<void> {
	const fullPath = resolve(path);
	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, `${JSON.stringify(project, null, "\t")}\n`);
}

function parseArgs(args: string[]): {
	command: string;
	flags: Map<string, string | boolean>;
} {
	const [command = "help", ...rest] = args;
	const flags = new Map<string, string | boolean>();
	for (let index = 0; index < rest.length; index += 1) {
		const arg = rest[index];
		if (!arg.startsWith("--")) {
			throw new Error(`Unexpected argument: ${arg}`);
		}
		const key = arg.slice(2);
		const next = rest[index + 1];
		if (!next || next.startsWith("--")) {
			flags.set(key, true);
			continue;
		}
		flags.set(key, next);
		index += 1;
	}
	return { command, flags };
}

function requireFlag(flags: Map<string, string | boolean>, key: string): string {
	const value = getFlag(flags, key);
	if (!value) throw new Error(`Missing required flag --${key}`);
	return value;
}

function getFlag(flags: Map<string, string | boolean>, key: string): string | undefined {
	const value = flags.get(key);
	return typeof value === "string" ? value : undefined;
}

function getNumberFlag(
	flags: Map<string, string | boolean>,
	key: string,
): number | undefined {
	const value = getFlag(flags, key);
	if (value === undefined) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		throw new Error(`Expected --${key} to be a number, got ${value}`);
	}
	return parsed;
}

function getRequiredNumberFlag(
	flags: Map<string, string | boolean>,
	key: string,
): number {
	const value = getNumberFlag(flags, key);
	if (value === undefined) throw new Error(`Missing required flag --${key}`);
	return value;
}

function writeJson(result: CliResult): void {
	process.stdout.write(`${JSON.stringify(result, null, "\t")}\n`);
}

function helpText(): string {
	return `Usage:
  bun run codex:opencut new --name Demo --out workspace/demo.opencut.json
  bun run codex:opencut add-text --project workspace/demo.opencut.json --text "Hello" --start 0 --duration 3
  bun run codex:opencut split --project workspace/demo.opencut.json --element-id <id> --time 1.5
  bun run codex:opencut move --project workspace/demo.opencut.json --element-id <id> --start 2
  bun run codex:opencut delete --project workspace/demo.opencut.json --element-id <id>
  bun run codex:opencut inspect --project workspace/demo.opencut.json
  bun run codex:opencut validate --project workspace/demo.opencut.json`;
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${JSON.stringify({ ok: false, error: message }, null, "\t")}\n`);
	process.exit(1);
});
