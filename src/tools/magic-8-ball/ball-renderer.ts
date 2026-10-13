import {
	ACESFilmicToneMapping,
	AmbientLight,
	CanvasTexture,
	CircleGeometry,
	Color,
	DirectionalLight,
	Euler,
	Group,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	Object3D,
	PerspectiveCamera,
	PMREMGenerator,
	PointLight,
	Scene,
	SRGBColorSpace,
	WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Answer } from "./lib/answers";
import { fitTextInTriangle } from "./lib/triangle-text";

export interface BallRenderer {
	shake(intensity: number): void;
	drag(dx: number, dy: number): void;
	release(): void;
	reveal(answer: Answer): Promise<void>;
	dispose(): void;
}

interface BallRendererOptions {
	modelUrl: string;
	reducedMotion: boolean;
}

const BALL_FRACTION_OF_CANVAS = 0.71;
const CAMERA_DISTANCE = 5.5;
const MAX_PIXEL_RATIO = 2;
const MAX_FRAME_SECONDS = 0.05;
const MAX_AGITATION = 1.6;
const AGITATION_DECAY_PER_SECOND = 1.1;
const DIE_FACE_DISTANCE = 0.286;
const DIE_FACE_RISEN_Z = 0.79;
const DIE_FACE_SUNK_Z = 0.4;
const DIE_RISEN_SCALE = 1.6;
const DIE_SUNK_SCALE = 1;
const GLASS_Z = 0.826;
const ANSWER_FONT_FAMILY = '"Josefin Sans", sans-serif';
const ANSWER_FONT_WEIGHT = 600;
const ANSWER_TEXTURE_WIDTH = 640;
const ANSWER_TEXTURE_HEIGHT = Math.round(ANSWER_TEXTURE_WIDTH * (Math.sqrt(3) / 2));
const HAZY_TEXT_ALPHA = 0.7;
const MURK_COLOR = new Color(0.004, 0.004, 0.022);

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const secondsNow = () => performance.now() / 1000;

class Track {
	private from: number;
	private to: number;
	private startedAt = 0;
	private duration = 0;
	private ease: (t: number) => number = easeInOut;

	constructor(private current: number) {
		this.from = current;
		this.to = current;
	}

	get value() {
		return this.current;
	}

	get isRunning() {
		return this.current !== this.to;
	}

	jumpTo(value: number) {
		this.from = this.to = this.current = value;
	}

	animateTo(target: number, duration: number, delay = 0, ease = easeInOut) {
		this.from = this.current;
		this.to = target;
		this.startedAt = secondsNow() + delay;
		this.duration = duration;
		this.ease = ease;
	}

	update(now: number) {
		if (!this.isRunning) return;
		const progress = MathUtils.clamp((now - this.startedAt) / this.duration, 0, 1);
		this.current = progress >= 1 ? this.to : this.from + (this.to - this.from) * this.ease(progress);
	}
}

class Spring {
	value = 0;
	target = 0;
	private velocity = 0;

	constructor(
		private readonly stiffness: number,
		private readonly damping: number,
	) {}

	get isAtRest() {
		return Math.abs(this.velocity) < 0.0005 && Math.abs(this.target - this.value) < 0.0005;
	}

	step(seconds: number) {
		const substeps = Math.ceil(seconds / (1 / 120));
		const dt = seconds / substeps;
		for (let i = 0; i < substeps; i++) {
			const acceleration = this.stiffness * (this.target - this.value) - this.damping * this.velocity;
			this.velocity += acceleration * dt;
			this.value += this.velocity * dt;
		}
		if (this.isAtRest) {
			this.value = this.target;
			this.velocity = 0;
		}
	}
}

interface BallParts {
	root: Object3D;
	die: Object3D;
	dieMaterial: MeshStandardMaterial;
	answerFace: Mesh;
	window: Mesh;
}

function loadModel(modelUrl: string): Promise<Object3D> {
	return new GLTFLoader().loadAsync(modelUrl).then((gltf) => gltf.scene);
}

function requireNode<T extends Object3D>(root: Object3D, name: string): T {
	const node = root.getObjectByName(name);
	if (!node) throw new Error(`Ball model is missing the ${name} node`);
	return node as T;
}

function firstMaterial(node: Object3D): MeshStandardMaterial {
	let found: MeshStandardMaterial | null = null;
	node.traverse((child) => {
		const material = (child as Mesh).material;
		if (!found && material) found = material as MeshStandardMaterial;
	});
	if (!found) throw new Error(`${node.name} has no material`);
	return found;
}

function tuneMaterials(root: Object3D): BallParts {
	root.traverse((child) => {
		const mesh = child as Mesh;
		if (!mesh.isMesh) return;
		const source = mesh.material as MeshStandardMaterial;
		if (source.name === "ShellBlack") mesh.material = glossyShellMaterial(source);
		if (source.name === "ShellRim") mesh.material = rimMaterial(source);
		if (source.name === "DiscWhite") mesh.material = whiteDiscMaterial(source);
	});

	const window = requireNode<Mesh>(root, "Window");
	window.material = glassMaterial();
	window.renderOrder = 3;

	const liquid = requireNode<Mesh>(root, "Liquid");
	liquid.material = liquidMaterial();

	const die = requireNode<Object3D>(root, "Die");
	const dieMaterial = firstMaterial(die);
	dieMaterial.color.setRGB(0.001, 0.002, 0.012);
	dieMaterial.roughness = 0.9;
	dieMaterial.envMapIntensity = 0.05;
	dieMaterial.flatShading = true;

	const answerFace = requireNode<Mesh>(root, "AnswerFace");
	answerFace.renderOrder = 1;

	return { root, die, dieMaterial, answerFace, window };
}

function glossyShellMaterial(source: MeshStandardMaterial) {
	const shell = new MeshPhysicalMaterial({
		color: new Color(0.012, 0.012, 0.016),
		roughness: 0.14,
		metalness: 0,
		clearcoat: 1,
		clearcoatRoughness: 0.04,
		envMapIntensity: 0.28,
	});
	source.dispose();
	return shell;
}

function rimMaterial(source: MeshStandardMaterial) {
	const rim = new MeshPhysicalMaterial({
		color: new Color(0.008, 0.008, 0.011),
		roughness: 0.6,
		envMapIntensity: 0.1,
	});
	source.dispose();
	return rim;
}

function whiteDiscMaterial(source: MeshStandardMaterial) {
	const disc = new MeshPhysicalMaterial({
		color: new Color(0.82, 0.82, 0.8),
		roughness: 0.38,
		clearcoat: 0.6,
		clearcoatRoughness: 0.2,
	});
	source.dispose();
	return disc;
}

function glassMaterial() {
	return new MeshPhysicalMaterial({
		color: new Color(0.01, 0.012, 0.03),
		roughness: 0.03,
		metalness: 0,
		clearcoat: 1,
		clearcoatRoughness: 0.02,
		transparent: true,
		opacity: 0.12,
		depthWrite: false,
		envMapIntensity: 1.6,
	});
}

function liquidMaterial() {
	return new MeshStandardMaterial({
		color: new Color(0.005, 0.005, 0.035),
		emissive: new Color(0.001, 0.001, 0.01),
		roughness: 1,
	});
}

function seededRandom(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

function drawCloudTexture() {
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const context = canvas.getContext("2d") as CanvasRenderingContext2D;
	const random = seededRandom(8);
	for (let i = 0; i < 18; i++) {
		const x = random() * size;
		const y = random() * size;
		const radius = 40 + random() * 70;
		const blob = context.createRadialGradient(x, y, 0, x, y, radius);
		blob.addColorStop(0, "rgba(150, 160, 215, 0.55)");
		blob.addColorStop(1, "rgba(150, 160, 215, 0)");
		context.fillStyle = blob;
		context.fillRect(0, 0, size, size);
	}
	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	return texture;
}

function createFogPlane(windowRadius: number) {
	const fog = new Mesh(
		new CircleGeometry(windowRadius, 48),
		new MeshBasicMaterial({
			map: drawCloudTexture(),
			color: new Color(0.45, 0.5, 0.8),
			transparent: true,
			opacity: 0,
			depthWrite: false,
			toneMapped: false,
		}),
	);
	fog.position.z = GLASS_Z;
	fog.renderOrder = 2;
	return fog;
}

function createAnswerCanvas() {
	const canvas = document.createElement("canvas");
	canvas.width = ANSWER_TEXTURE_WIDTH;
	canvas.height = ANSWER_TEXTURE_HEIGHT;
	return canvas;
}

function answerFont(fontSize: number) {
	return `${ANSWER_FONT_WEIGHT} ${fontSize}px ${ANSWER_FONT_FAMILY}`;
}

function paintTriangle(context: CanvasRenderingContext2D, width: number, height: number) {
	const fill = context.createRadialGradient(width / 2, height * 0.7, 0, width / 2, height * 0.7, height);
	fill.addColorStop(0, "#3347f0");
	fill.addColorStop(1, "#2038d8");
	context.fillStyle = fill;
	context.beginPath();
	context.moveTo(width / 2, 0);
	context.lineTo(width, height);
	context.lineTo(0, height);
	context.closePath();
	context.fill();
}

function paintAnswerText(context: CanvasRenderingContext2D, text: string, width: number, height: number) {
	const measure = (line: string, fontSize: number) => {
		context.font = answerFont(fontSize);
		return context.measureText(line).width;
	};
	const fit = fitTextInTriangle(
		text.toUpperCase(),
		{ width, height },
		{
			maxFontSize: 76,
			minFontSize: 28,
			lineHeight: 1.18,
			padding: 22,
			measure,
		},
	);
	context.font = answerFont(fit.fontSize);
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.shadowColor = "rgba(190, 215, 255, 0.9)";
	context.shadowBlur = fit.fontSize * 0.28;
	context.fillStyle = "#eef3ff";
	for (const line of fit.lines) context.fillText(line.text, width / 2, line.y);
	context.shadowBlur = 0;
}

function paintAnswer(canvas: HTMLCanvasElement, text: string) {
	const context = canvas.getContext("2d") as CanvasRenderingContext2D;
	context.clearRect(0, 0, canvas.width, canvas.height);
	paintTriangle(context, canvas.width, canvas.height);
	paintAnswerText(context, text, canvas.width, canvas.height);
}

function loadAnswerFont() {
	return document.fonts.load(answerFont(64)).catch(() => []);
}

function cameraFieldOfView(aspect: number) {
	const silhouetteTangent = 1 / Math.sqrt(CAMERA_DISTANCE ** 2 - 1);
	const halfHeightTangent = silhouetteTangent / BALL_FRACTION_OF_CANVAS / Math.min(1, aspect);
	return MathUtils.radToDeg(2 * Math.atan(halfHeightTangent));
}

function createLighting(scene: Scene, renderer: WebGLRenderer) {
	const pmrem = new PMREMGenerator(renderer);
	const room = new RoomEnvironment();
	const environment = pmrem.fromScene(room, 0.04);
	room.dispose();
	pmrem.dispose();
	scene.environment = environment.texture;
	scene.environmentIntensity = 0.7;

	const key = new DirectionalLight(0xffffff, 2.4);
	key.position.set(2.5, 3.5, 5);
	const rim = new DirectionalLight(0x8aa4ff, 3);
	rim.position.set(-4, 2, -3);
	const fill = new AmbientLight(0x202030, 0.6);
	scene.add(key, rim, fill);
	return environment.texture;
}

function disposeMaterialTextures(material: MeshStandardMaterial | MeshBasicMaterial) {
	material.map?.dispose();
	material.dispose();
}

function disposeObject(root: Object3D) {
	root.traverse((child) => {
		const mesh = child as Mesh;
		if (!mesh.isMesh) return;
		mesh.geometry.dispose();
		const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
		for (const material of materials) disposeMaterialTextures(material as MeshStandardMaterial);
	});
}

function createWebGLRenderer(canvas: HTMLCanvasElement) {
	const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
	if (renderer.getContext().isContextLost()) {
		renderer.dispose();
		throw new Error("WebGL context is unavailable");
	}
	renderer.outputColorSpace = SRGBColorSpace;
	renderer.toneMapping = ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.setClearAlpha(0);
	return renderer;
}

export async function createBallRenderer(
	canvas: HTMLCanvasElement,
	options: BallRendererOptions,
): Promise<BallRenderer> {
	const renderer = createWebGLRenderer(canvas);
	let model: Object3D;
	try {
		model = await loadModel(options.modelUrl);
	} catch (error) {
		renderer.dispose();
		throw error;
	}
	return assembleBallRenderer(renderer, canvas, model, options);
}

function assembleBallRenderer(
	renderer: WebGLRenderer,
	canvas: HTMLCanvasElement,
	model: Object3D,
	{ reducedMotion }: BallRendererOptions,
): BallRenderer {
	const scene = new Scene();
	const camera = new PerspectiveCamera(30, 1, 0.1, 50);
	camera.position.set(0, 0, CAMERA_DISTANCE);
	const environmentTexture = createLighting(scene, renderer);

	const pivot = new Group();
	pivot.add(model);
	scene.add(pivot);

	const parts = tuneMaterials(model);
	const dieRest = parts.die.position.clone();
	const fog = createFogPlane(0.41);
	pivot.add(fog);

	const answerCanvas = createAnswerCanvas();
	const answerTexture = new CanvasTexture(answerCanvas);
	answerTexture.colorSpace = SRGBColorSpace;
	answerTexture.flipY = false;
	const answerMaterial = new MeshBasicMaterial({
		map: answerTexture,
		transparent: true,
		opacity: 0,
		depthWrite: false,
		toneMapped: false,
	});
	parts.answerFace.material = answerMaterial;

	const answerGlow = new PointLight(0x4f68ff, 0, 0.9, 1.2);
	answerGlow.position.set(0, 0, 0.8);
	pivot.add(answerGlow);

	const dieColor = parts.dieMaterial.color.clone();
	const glass = parts.window.material as MeshPhysicalMaterial;
	const glassColor = glass.color.clone();
	const hazyGlassColor = new Color(0.1, 0.12, 0.22);

	const positionX = new Spring(90, 11);
	const positionY = new Spring(90, 11);
	const tiltX = new Spring(70, 9);
	const tiltY = new Spring(70, 9);
	const springs = [positionX, positionY, tiltX, tiltY];
	const depth = new Track(0);
	const textAlpha = new Track(0);
	const dieTurn = new Track(1);
	const haze = new Track(0);
	const tracks = [depth, textAlpha, dieTurn, haze];
	let agitation = 0;
	let unitsPerPixel = 0.005;
	let pendingReveal: (() => void) | null = null;
	let frameHandle: number | null = null;
	let lastFrameTime: number | null = null;
	let disposed = false;

	function resize(entries: ResizeObserverEntry[]) {
		const { width, height } = entries[0].contentRect;
		if (width < 1 || height < 1) return;
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.fov = cameraFieldOfView(camera.aspect);
		camera.updateProjectionMatrix();
		unitsPerPixel = (2 * CAMERA_DISTANCE * Math.tan(MathUtils.degToRad(camera.fov / 2))) / height;
		requestFrame();
	}

	function applyBallPose(now: number) {
		const wobble = reducedMotion ? 0 : agitation;
		pivot.position.set(
			positionX.value + Math.sin(now * 41) * 0.045 * wobble,
			positionY.value + Math.sin(now * 37 + 1) * 0.045 * wobble,
			0,
		);
		pivot.rotation.set(
			tiltX.value + Math.sin(now * 29 + 2) * 0.16 * wobble,
			tiltY.value + Math.sin(now * 23 + 4) * 0.16 * wobble,
			Math.sin(now * 33 + 3) * 0.13 * wobble,
		);
	}

	function applyDiePose(now: number) {
		const rise = easeOutCubic(depth.value);
		const turn = dieTurn.value;
		const sway = reducedMotion ? 0 : agitation * 0.35;
		const scale = MathUtils.lerp(DIE_SUNK_SCALE, DIE_RISEN_SCALE, rise);
		const faceZ = MathUtils.lerp(DIE_FACE_SUNK_Z, DIE_FACE_RISEN_Z, rise);
		parts.die.position.set(dieRest.x, dieRest.y, faceZ - DIE_FACE_DISTANCE * scale);
		parts.die.scale.setScalar(scale);
		parts.die.rotation.copy(
			new Euler(
				turn * 0.7 + Math.sin(now * 19) * sway,
				turn * -1.1 + Math.sin(now * 17 + 1) * sway,
				turn * 0.5 + Math.sin(now * 13 + 2) * sway,
			),
		);
		parts.dieMaterial.color.copy(MURK_COLOR).lerp(dieColor, rise ** 1.6);
	}

	function applyAnswerAndHaze() {
		answerMaterial.opacity = textAlpha.value;
		answerGlow.intensity = textAlpha.value * 0.35;
		fog.material.opacity = haze.value * 0.6;
		glass.opacity = MathUtils.lerp(0.12, 0.35, haze.value);
		glass.color.copy(glassColor).lerp(hazyGlassColor, haze.value);
	}

	function updateScene(seconds: number, now: number) {
		for (const spring of springs) spring.step(seconds);
		for (const track of tracks) track.update(now);
		agitation = Math.max(0, agitation - AGITATION_DECAY_PER_SECOND * seconds);
		applyBallPose(now);
		applyDiePose(now);
		applyAnswerAndHaze();
	}

	function isMoving() {
		return agitation > 0 || tracks.some((track) => track.isRunning) || springs.some((spring) => !spring.isAtRest);
	}

	function settlePendingReveal() {
		pendingReveal?.();
		pendingReveal = null;
	}

	function renderFrame(time: number) {
		frameHandle = null;
		const now = time / 1000;
		const seconds = lastFrameTime === null ? 1 / 60 : Math.min(now - lastFrameTime, MAX_FRAME_SECONDS);
		lastFrameTime = now;
		updateScene(seconds, now);
		renderer.render(scene, camera);
		if (isMoving()) {
			requestFrame();
			return;
		}
		lastFrameTime = null;
		settlePendingReveal();
	}

	function requestFrame() {
		if (disposed || frameHandle !== null || document.hidden) return;
		frameHandle = requestAnimationFrame(renderFrame);
	}

	function stopFrames() {
		if (frameHandle !== null) cancelAnimationFrame(frameHandle);
		frameHandle = null;
		lastFrameTime = null;
	}

	function onVisibilityChange() {
		if (document.hidden) stopFrames();
		else requestFrame();
	}

	function sinkDie() {
		const seconds = reducedMotion ? 0.2 : 0.45;
		depth.animateTo(0, seconds);
		textAlpha.animateTo(0, 0.25);
		dieTurn.jumpTo(1);
	}

	async function reveal(answer: Answer) {
		settlePendingReveal();
		await loadAnswerFont();
		if (disposed) return;
		paintAnswer(answerCanvas, answer.text);
		answerTexture.needsUpdate = true;
		const hazy = answer.tone === "hazy";
		haze.animateTo(hazy ? 1 : 0, 0.6);
		const finalTextAlpha = hazy ? HAZY_TEXT_ALPHA : 1;
		if (reducedMotion) {
			depth.jumpTo(1);
			dieTurn.jumpTo(0);
			textAlpha.animateTo(finalTextAlpha, 0.3);
		} else {
			depth.animateTo(1, 1.5, 0.1, easeOutCubic);
			dieTurn.animateTo(0, 1.7, 0.1, easeOutCubic);
			textAlpha.animateTo(finalTextAlpha, 1.3, 0.4);
		}
		const settled = new Promise<void>((resolve) => {
			pendingReveal = resolve;
		});
		requestFrame();
		return settled;
	}

	function shake(intensity: number) {
		const clamped = MathUtils.clamp(intensity, 0, 1);
		agitation = Math.min(MAX_AGITATION, agitation + 0.5 + clamped * 0.7);
		settlePendingReveal();
		sinkDie();
		requestFrame();
	}

	function drag(dx: number, dy: number) {
		const limit = 0.45;
		positionX.target = MathUtils.clamp(dx * unitsPerPixel * 0.5, -limit, limit);
		positionY.target = MathUtils.clamp(-dy * unitsPerPixel * 0.5, -limit, limit);
		tiltY.target = MathUtils.clamp(dx * 0.004, -0.7, 0.7);
		tiltX.target = MathUtils.clamp(dy * 0.004, -0.7, 0.7);
		requestFrame();
	}

	function release() {
		for (const spring of springs) spring.target = 0;
		requestFrame();
	}

	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(canvas);
	document.addEventListener("visibilitychange", onVisibilityChange);

	function dispose() {
		disposed = true;
		stopFrames();
		settlePendingReveal();
		resizeObserver.disconnect();
		document.removeEventListener("visibilitychange", onVisibilityChange);
		disposeObject(pivot);
		answerTexture.dispose();
		answerGlow.dispose();
		environmentTexture.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	}

	return { shake, drag, release, reveal, dispose };
}
