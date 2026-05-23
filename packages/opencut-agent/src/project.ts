export const TICKS_PER_SECOND = 120_000;
export const CURRENT_PROJECT_VERSION = 31;

export type MediaTime = number;

type TrackType = "video" | "text" | "audio" | "graphic" | "effect";

type BaseElement = {
	id: string;
	name: string;
	type: string;
	startTime: MediaTime;
	duration: MediaTime;
	trimStart: MediaTime;
	trimEnd: MediaTime;
	params: Record<string, unknown>;
	[key: string]: unknown;
};

type TimelineTrack = {
	id: string;
	name: string;
	type: TrackType;
	elements: BaseElement[];
	muted?: boolean;
	hidden?: boolean;
};

type SceneTracks = {
	overlay: TimelineTrack[];
	main: TimelineTrack;
	audio: TimelineTrack[];
};

type Scene = {
	id: string;
	name: string;
	isMain: boolean;
	tracks: SceneTracks;
	bookmarks: unknown[];
	createdAt: string;
	updatedAt: string;
};

export type OpenCutProject = {
	metadata: {
		id: string;
		name: string;
		thumbnail?: string;
		duration: MediaTime;
		createdAt: string;
		updatedAt: string;
	};
	scenes: Scene[];
	currentSceneId: string;
	settings: {
		fps: { numerator: number; denominator: number };
		canvasSize: { width: number; height: number };
		canvasSizeMode?: "preset" | "custom";
		lastCustomCanvasSize?: { width: number; height: number } | null;
		originalCanvasSize?: { width: number; height: number } | null;
		background: { type: "color"; color: string };
	};
	version: number;
	timelineViewState?: {
		zoomLevel: number;
		scrollLeft: number;
		playheadTime: MediaTime;
	};
};

export type ProjectSummary = {
	id: string;
	name: string;
	version: number;
	durationSeconds: number;
	sceneCount: number;
	tracks: Array<{
		id: string;
		type: TrackType;
		name: string;
		elementCount: number;
	}>;
	elements: Array<{
		id: string;
		type: string;
		name: string;
		trackId: string;
		startSeconds: number;
		durationSeconds: number;
	}>;
};

export function secondsToTicks(seconds: number): MediaTime {
	if (!Number.isFinite(seconds) || seconds < 0) {
		throw new Error(`Expected non-negative seconds, got ${seconds}`);
	}
	return Math.round(seconds * TICKS_PER_SECOND);
}

export function ticksToSeconds(ticks: MediaTime): number {
	return ticks / TICKS_PER_SECOND;
}

export function createProject({
	name,
	width = 1920,
	height = 1080,
	fps = 30,
	background = "#000000",
	now = new Date(),
}: {
	name: string;
	width?: number;
	height?: number;
	fps?: number;
	background?: string;
	now?: Date;
}): OpenCutProject {
	if (!name.trim()) {
		throw new Error("Project name is required");
	}

	const mainScene = buildDefaultScene({ name: "Main scene", now });
	const timestamp = now.toISOString();
	return {
		metadata: {
			id: generateId("project"),
			name,
			duration: 0,
			createdAt: timestamp,
			updatedAt: timestamp,
		},
		scenes: [mainScene],
		currentSceneId: mainScene.id,
		settings: {
			fps: { numerator: fps, denominator: 1 },
			canvasSize: { width, height },
			canvasSizeMode: "preset",
			lastCustomCanvasSize: null,
			originalCanvasSize: null,
			background: {
				type: "color",
				color: background,
			},
		},
		version: CURRENT_PROJECT_VERSION,
		timelineViewState: {
			zoomLevel: 1,
			scrollLeft: 0,
			playheadTime: 0,
		},
	};
}

export function addTextElement({
	project,
	text,
	startSeconds,
	durationSeconds,
	name,
	trackId,
	fontSize = 72,
	color = "#ffffff",
}: {
	project: OpenCutProject;
	text: string;
	startSeconds: number;
	durationSeconds: number;
	name?: string;
	trackId?: string;
	fontSize?: number;
	color?: string;
}): { project: OpenCutProject; elementId: string; trackId: string } {
	if (!text) {
		throw new Error("Text content is required");
	}
	const startTime = secondsToTicks(startSeconds);
	const duration = secondsToTicks(durationSeconds);
	if (duration <= 0) {
		throw new Error("Text duration must be greater than zero");
	}

	const nextProject = cloneProject(project);
	const scene = getCurrentScene(nextProject);
	const track = ensureOverlayTrack({ scene, type: "text", trackId });
	const elementId = generateId("text");
	const element: BaseElement = {
		id: elementId,
		type: "text",
		name: (name ?? text.slice(0, 32)) || "Text",
		duration,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		params: buildDefaultTextParams({ text, fontSize, color }),
	};

	track.elements.push(element);
	track.elements.sort(compareElementsByStartTime);
	touchProject(nextProject);
	return { project: nextProject, elementId, trackId: track.id };
}

export function splitElement({
	project,
	elementId,
	timeSeconds,
}: {
	project: OpenCutProject;
	elementId: string;
	timeSeconds: number;
}): { project: OpenCutProject; rightElementId: string } {
	const splitTime = secondsToTicks(timeSeconds);
	const nextProject = cloneProject(project);
	const target = findElement(nextProject, elementId);
	if (!target) {
		throw new Error(`Element not found: ${elementId}`);
	}

	const { element, track } = target;
	const elementEnd = element.startTime + element.duration;
	if (splitTime <= element.startTime || splitTime >= elementEnd) {
		throw new Error("Split time must be inside the element range");
	}

	const leftDuration = splitTime - element.startTime;
	const rightDuration = elementEnd - splitTime;
	const rightElementId = generateId(`${element.type}-split`);
	const rightElement: BaseElement = {
		...structuredClone(element),
		id: rightElementId,
		name: `${element.name} (split)`,
		startTime: splitTime,
		duration: rightDuration,
		trimStart: element.trimStart + leftDuration,
	};
	element.duration = leftDuration;

	const index = track.elements.findIndex((candidate) => candidate.id === elementId);
	track.elements.splice(index + 1, 0, rightElement);
	touchProject(nextProject);
	return { project: nextProject, rightElementId };
}

export function moveElement({
	project,
	elementId,
	startSeconds,
}: {
	project: OpenCutProject;
	elementId: string;
	startSeconds: number;
}): { project: OpenCutProject } {
	const nextProject = cloneProject(project);
	const target = findElement(nextProject, elementId);
	if (!target) {
		throw new Error(`Element not found: ${elementId}`);
	}
	target.element.startTime = secondsToTicks(startSeconds);
	target.track.elements.sort(compareElementsByStartTime);
	touchProject(nextProject);
	return { project: nextProject };
}

export function deleteElement({
	project,
	elementId,
}: {
	project: OpenCutProject;
	elementId: string;
}): { project: OpenCutProject } {
	const nextProject = cloneProject(project);
	const target = findElement(nextProject, elementId);
	if (!target) {
		throw new Error(`Element not found: ${elementId}`);
	}
	target.track.elements = target.track.elements.filter(
		(element) => element.id !== elementId,
	);
	touchProject(nextProject);
	return { project: nextProject };
}

export function summarizeProject(project: OpenCutProject): ProjectSummary {
	const scene = getMainScene(project) ?? project.scenes[0];
	const tracks = scene ? getOrderedTracks(scene.tracks) : [];
	const elements = tracks.flatMap((track) =>
		track.elements.map((element) => ({
			id: element.id,
			type: element.type,
			name: element.name,
			trackId: track.id,
			startSeconds: ticksToSeconds(element.startTime),
			durationSeconds: ticksToSeconds(element.duration),
		})),
	);

	return {
		id: project.metadata.id,
		name: project.metadata.name,
		version: project.version,
		durationSeconds: ticksToSeconds(project.metadata.duration),
		sceneCount: project.scenes.length,
		tracks: tracks.map((track) => ({
			id: track.id,
			type: track.type,
			name: track.name,
			elementCount: track.elements.length,
		})),
		elements,
	};
}

export function validateProject(project: OpenCutProject): string[] {
	const errors: string[] = [];
	if (!project || typeof project !== "object") errors.push("Project is missing");
	if (!project.metadata?.id) errors.push("metadata.id is required");
	if (!project.metadata?.name) errors.push("metadata.name is required");
	if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
		errors.push("Project must contain at least one scene");
		return errors;
	}

	const currentScene = project.scenes.find(
		(scene) => scene.id === project.currentSceneId,
	);
	if (!currentScene) errors.push("currentSceneId does not match a scene");
	if (!project.scenes.some((scene) => scene.isMain)) {
		errors.push("Project must contain a main scene");
	}

	for (const scene of project.scenes) {
		if (!scene.id) errors.push("scene.id is required");
		if (!scene.tracks?.main) errors.push(`scene ${scene.id} is missing main track`);
		for (const track of getOrderedTracks(scene.tracks)) {
			if (!track.id) errors.push(`track in scene ${scene.id} is missing id`);
			if (!Array.isArray(track.elements)) {
				errors.push(`track ${track.id} elements must be an array`);
				continue;
			}
			for (const element of track.elements) {
				if (!element.id) errors.push(`element in track ${track.id} is missing id`);
				if (!Number.isInteger(element.startTime) || element.startTime < 0) {
					errors.push(`element ${element.id} has invalid startTime`);
				}
				if (!Number.isInteger(element.duration) || element.duration <= 0) {
					errors.push(`element ${element.id} has invalid duration`);
				}
				if (!Number.isInteger(element.trimStart) || element.trimStart < 0) {
					errors.push(`element ${element.id} has invalid trimStart`);
				}
				if (!Number.isInteger(element.trimEnd) || element.trimEnd < 0) {
					errors.push(`element ${element.id} has invalid trimEnd`);
				}
				if (element.type === "text" && typeof element.params.content !== "string") {
					errors.push(`text element ${element.id} is missing params.content`);
				}
			}
		}
	}

	const computedDuration = calculateProjectDuration(project);
	if (project.metadata.duration !== computedDuration) {
		errors.push(
			`metadata.duration ${project.metadata.duration} does not match computed duration ${computedDuration}`,
		);
	}

	return errors;
}

function buildDefaultScene({ name, now }: { name: string; now: Date }): Scene {
	const timestamp = now.toISOString();
	return {
		id: generateId("scene"),
		name,
		isMain: true,
		tracks: {
			overlay: [],
			main: {
				id: generateId("main-track"),
				name: "Main Track",
				type: "video",
				elements: [],
				muted: false,
				hidden: false,
			},
			audio: [],
		},
		bookmarks: [],
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function buildDefaultTextParams({
	text,
	fontSize,
	color,
}: {
	text: string;
	fontSize: number;
	color: string;
}): Record<string, unknown> {
	return {
		content: text,
		fontSize,
		fontFamily: "Arial",
		color,
		textAlign: "center",
		fontWeight: "normal",
		fontStyle: "normal",
		textDecoration: "none",
		letterSpacing: 0,
		lineHeight: 1.2,
		"background.enabled": false,
		"background.color": "#000000",
		"background.cornerRadius": 0,
		"background.paddingX": 30,
		"background.paddingY": 42,
		"background.offsetX": 0,
		"background.offsetY": 0,
		"transform.positionX": 0,
		"transform.positionY": 0,
		"transform.scaleX": 1,
		"transform.scaleY": 1,
		"transform.rotate": 0,
		opacity: 1,
		blendMode: "normal",
	};
}

function ensureOverlayTrack({
	scene,
	type,
	trackId,
}: {
	scene: Scene;
	type: TrackType;
	trackId?: string;
}): TimelineTrack {
	if (trackId) {
		const existing = getOrderedTracks(scene.tracks).find(
			(track) => track.id === trackId,
		);
		if (!existing) {
			throw new Error(`Track not found: ${trackId}`);
		}
		if (existing.type !== type) {
			throw new Error(`Track ${trackId} is ${existing.type}, expected ${type}`);
		}
		return existing;
	}

	const existing = scene.tracks.overlay.find((track) => track.type === type);
	if (existing) return existing;

	const track: TimelineTrack = {
		id: generateId(`${type}-track`),
		name: `${capitalize(type)} Track`,
		type,
		elements: [],
		hidden: type !== "audio" ? false : undefined,
		muted: type === "audio" || type === "video" ? false : undefined,
	};
	scene.tracks.overlay.push(track);
	return track;
}

function getCurrentScene(project: OpenCutProject): Scene {
	const scene =
		project.scenes.find((candidate) => candidate.id === project.currentSceneId) ??
		getMainScene(project);
	if (!scene) {
		throw new Error("Project has no active scene");
	}
	return scene;
}

function getMainScene(project: OpenCutProject): Scene | null {
	return project.scenes.find((scene) => scene.isMain) ?? null;
}

function getOrderedTracks(tracks: SceneTracks): TimelineTrack[] {
	return [
		...(Array.isArray(tracks?.overlay) ? tracks.overlay : []),
		...(tracks?.main ? [tracks.main] : []),
		...(Array.isArray(tracks?.audio) ? tracks.audio : []),
	];
}

function findElement(
	project: OpenCutProject,
	elementId: string,
): { scene: Scene; track: TimelineTrack; element: BaseElement } | null {
	for (const scene of project.scenes) {
		for (const track of getOrderedTracks(scene.tracks)) {
			const element = track.elements.find((candidate) => candidate.id === elementId);
			if (element) return { scene, track, element };
		}
	}
	return null;
}

function touchProject(project: OpenCutProject): void {
	const now = new Date().toISOString();
	project.metadata.updatedAt = now;
	project.metadata.duration = calculateProjectDuration(project);
	for (const scene of project.scenes) {
		scene.updatedAt = now;
	}
}

function calculateProjectDuration(project: OpenCutProject): MediaTime {
	const mainScene = getMainScene(project) ?? project.scenes[0];
	if (!mainScene) return 0;
	let maxEnd = 0;
	for (const track of getOrderedTracks(mainScene.tracks)) {
		for (const element of track.elements) {
			maxEnd = Math.max(maxEnd, element.startTime + element.duration);
		}
	}
	return maxEnd;
}

function cloneProject(project: OpenCutProject): OpenCutProject {
	return structuredClone(project);
}

function compareElementsByStartTime(a: BaseElement, b: BaseElement): number {
	return a.startTime - b.startTime || a.id.localeCompare(b.id);
}

function generateId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

function capitalize(value: string): string {
	return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
