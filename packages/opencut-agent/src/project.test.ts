import { describe, expect, test } from "bun:test";
import {
	addTextElement,
	createProject,
	moveElement,
	splitElement,
	summarizeProject,
	validateProject,
} from "./project";

describe("opencut codex agent project operations", () => {
	test("creates a valid OpenCut project", () => {
		const project = createProject({
			name: "Codex demo",
			now: new Date("2026-05-23T00:00:00.000Z"),
		});

		expect(validateProject(project)).toEqual([]);
		expect(project.version).toBe(31);
		expect(project.scenes[0]?.tracks.main.type).toBe("video");
	});

	test("adds text and updates project duration", () => {
		const project = createProject({ name: "Codex demo" });
		const added = addTextElement({
			project,
			text: "Hello Codex",
			startSeconds: 1,
			durationSeconds: 2.5,
		});

		const summary = summarizeProject(added.project);
		expect(validateProject(added.project)).toEqual([]);
		expect(summary.durationSeconds).toBe(3.5);
		expect(summary.elements).toHaveLength(1);
		expect(summary.elements[0]?.trackId).toBe(added.trackId);
	});

	test("splits and moves a text element", () => {
		const added = addTextElement({
			project: createProject({ name: "Codex demo" }),
			text: "Split me",
			startSeconds: 0,
			durationSeconds: 4,
		});
		const split = splitElement({
			project: added.project,
			elementId: added.elementId,
			timeSeconds: 1.5,
		});
		const moved = moveElement({
			project: split.project,
			elementId: split.rightElementId,
			startSeconds: 3,
		});

		const summary = summarizeProject(moved.project);
		expect(validateProject(moved.project)).toEqual([]);
		expect(summary.elements).toHaveLength(2);
		expect(summary.durationSeconds).toBe(5.5);
	});
});
