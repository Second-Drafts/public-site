import {
	ACESFilmicToneMapping,
	AmbientLight,
	CanvasTexture,
	CircleGeometry,
	Color,
	DirectionalLight,
	Euler,
	Fog,
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
	Quaternion,
	Scene,
	SRGBColorSpace,
	type Texture,
	Vector3,
	WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Answer } from "./lib/answers";
import { fitTextInTriangle } from "./lib/triangle-text";

export interface BallRenderer {
	/** Shows the 8 side for a beat, then turns to the window. Shaking turns it at once. */
	introduce(): void;
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
const AGITATION_DECAY_PER_SECOND = 0.7;
const DIE_FACE_DISTANCE = 0.286;
const DIE_FACE_RISEN_Z = 0.79;
const DIE_FACE_SUNK_Z = 0.4;
const DIE_RISEN_SCALE = 1.6;
const DIE_SUNK_SCALE = 1;
const DIE_RESTING_TILT = new Quaternion().setFromEuler(new Euler(0.7, -1.1, 0.5));
const ANSWER_FACING_GLASS = new Quaternion();
const TUMBLE_RADIANS_PER_SECOND = 9;
const GLASS_Z = 0.826;
const LIQUID_FLOOR_Z = 0.12;
const WATER_COLOR = new Color(0.01, 0.02, 0.12);
const INTRO_HOLD_SECONDS = 0.8;
const INTRO_TURN_SECONDS = 1.4;
const HURRIED_TURN_SECONDS = 0.45;
const ANSWER_FONT_FAMILY = '"Josefin Sans", sans-serif';
const ANSWER_FONT_WEIGHT = 600;
const ANSWER_TEXTURE_WIDTH = 640;
const ANSWER_TEXTURE_HEIGHT = Math.round(ANSWER_TEXTURE_WIDTH * (Math.sqrt(3) / 2));
const HAZY_TEXT_ALPHA = 0.7;

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
	answerFace: Mesh;
	window: Mesh;
	liquid: Mesh;
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

/** The environment is given to each material that reflects it, because three ignores a material's own `envMapIntensity` when it falls back to `scene.environment`. */
function tuneMaterials(root: Object3D, environment: Texture): BallParts {
	root.traverse((child) => {
		const mesh = child as Mesh;
		if (!mesh.isMesh) return;
		const source = mesh.material as MeshStandardMaterial;
		if (source.name === "ShellBlack") mesh.material = glossyShellMaterial(source, environment);
		if (source.name === "ShellRim") mesh.material = rimMaterial(source, environment);
		if (source.name === "DiscWhite") mesh.material = whiteDiscMaterial(source, environment);
	});

	const window = requireNode<Mesh>(root, "Window");
	window.material = glassMaterial(environment);
	window.renderOrder = 3;

	const liquid = requireNode<Mesh>(root, "Liquid");
	liquid.material = liquidMaterial();

	const die = requireNode<Object3D>(root, "Die");
	const dieMaterial = firstMaterial(die);
	dieMaterial.color.setRGB(0.02, 0.04, 0.2);
	dieMaterial.roughness = 0.6;
	dieMaterial.envMap = environment;
	dieMaterial.envMapIntensity = 0.3;
	dieMaterial.flatShading = true;

	const answerFace = requireNode<Mesh>(root, "AnswerFace");
	answerFace.renderOrder = 1;

	return { root, die, answerFace, window, liquid };
}

function glossyShellMaterial(source: MeshStandardMaterial, environment: Texture) {
	const shell = new MeshPhysicalMaterial({
		color: new Color(0.012, 0.012, 0.016),
		roughness: 0.32,
		metalness: 0,
		clearcoat: 1,
		clearcoatRoughness: 0.2,
		envMap: environment,
		envMapIntensity: 0.24,
	});
	source.dispose();
	return shell;
}

function rimMaterial(source: MeshStandardMaterial, environment: Texture) {
	const rim = new MeshPhysicalMaterial({
		color: new Color(0.008, 0.008, 0.011),
		roughness: 0.6,
		envMap: environment,
		envMapIntensity: 0.1,
	});
	source.dispose();
	return rim;
}

function whiteDiscMaterial(source: MeshStandardMaterial, environment: Texture) {
	const disc = new MeshPhysicalMaterial({
		color: new Color(0.82, 0.82, 0.8),
		roughness: 0.38,
		clearcoat: 0.6,
		clearcoatRoughness: 0.2,
		envMap: environment,
		envMapIntensity: 0.5,
	});
	source.dispose();
	return disc;
}

function glassMaterial(environment: Texture) {
	return new MeshPhysicalMaterial({
		color: new Color(0.01, 0.012, 0.03),
		roughness: 0.03,
		metalness: 0,
		clearcoat: 1,
		clearcoatRoughness: 0.02,
		transparent: true,
		opacity: 0.12,
		depthWrite: false,
		envMap: environment,
		envMapIntensity: 0.7,
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

function createCloudPlane(windowRadius: number) {
	const cloud = new Mesh(
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
	cloud.position.z = GLASS_Z;
	cloud.renderOrder = 2;
	return cloud;
}

/** Fogs only what sits in the chamber, thickening from clear at the glass to solid water at the chamber floor. */
function fillChamberWithWater(scene: Scene, ball: Object3D, underwater: Object3D[]) {
	scene.fog = new Fog(WATER_COLOR, CAMERA_DISTANCE - GLASS_Z, CAMERA_DISTANCE - LIQUID_FLOOR_Z);
	setFog(ball, false);
	for (const node of underwater) setFog(node, true);
}

function setFog(root: Object3D, enabled: boolean) {
	root.traverse((child) => {
		const mesh = child as Mesh;
		if (mesh.isMesh) (mesh.material as MeshStandardMaterial).fog = enabled;
	});
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

	const key = new DirectionalLight(0xffffff, 1.8);
	key.position.set(2.5, 3.5, 5);
	const rim = new DirectionalLight(0x8aa4ff, 1.8);
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

	const parts = tuneMaterials(model, environmentTexture);
	const dieRest = parts.die.position.clone();
	const cloud = createCloudPlane(0.41);
	pivot.add(cloud);

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
	fillChamberWithWater(scene, pivot, [parts.liquid, parts.die]);

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
	const answerFacing = new Track(0);
	const haze = new Track(0);
	const turnFromWindow = new Track(0);
	const tracks = [depth, textAlpha, answerFacing, haze, turnFromWindow];
	const dieTumble = DIE_RESTING_TILT.clone();
	const tumbleAxis = new Vector3();
	const tumbleStep = new Quaternion();
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
		pivot.position.set(
			positionX.value + Math.sin(now * 41) * 0.045 * agitation,
			positionY.value + Math.sin(now * 37 + 1) * 0.045 * agitation,
			0,
		);
		pivot.rotation.set(
			tiltX.value + Math.sin(now * 29 + 2) * 0.16 * agitation,
			tiltY.value + turnFromWindow.value + Math.sin(now * 23 + 4) * 0.16 * agitation,
			Math.sin(now * 33 + 3) * 0.13 * agitation,
		);
	}

	/** The die tumbles freely until it starts turning to the answer, so that turn always starts from a fixed pose. */
	function tumbleDie(seconds: number, now: number) {
		if (agitation === 0 || answerFacing.value > 0) return;
		tumbleAxis.set(Math.sin(now * 1.3), Math.cos(now * 1.3), Math.sin(now * 0.7)).normalize();
		tumbleStep.setFromAxisAngle(tumbleAxis, agitation * TUMBLE_RADIANS_PER_SECOND * seconds);
		dieTumble.premultiply(tumbleStep);
	}

	function applyDiePose() {
		const rise = easeOutCubic(depth.value);
		const scale = MathUtils.lerp(DIE_SUNK_SCALE, DIE_RISEN_SCALE, rise);
		const faceZ = MathUtils.lerp(DIE_FACE_SUNK_Z, DIE_FACE_RISEN_Z, rise);
		parts.die.position.set(dieRest.x, dieRest.y, faceZ - DIE_FACE_DISTANCE * scale);
		parts.die.scale.setScalar(scale);
		parts.die.quaternion.slerpQuaternions(dieTumble, ANSWER_FACING_GLASS, answerFacing.value);
	}

	function applyAnswerAndHaze() {
		answerMaterial.opacity = textAlpha.value;
		answerGlow.intensity = textAlpha.value * 0.35;
		cloud.material.opacity = haze.value * 0.6;
		glass.opacity = MathUtils.lerp(0.12, 0.35, haze.value);
		glass.color.copy(glassColor).lerp(hazyGlassColor, haze.value);
	}

	function updateScene(seconds: number, now: number) {
		for (const spring of springs) spring.step(seconds);
		for (const track of tracks) track.update(now);
		tumbleDie(seconds, now);
		agitation = Math.max(0, agitation - AGITATION_DECAY_PER_SECOND * seconds);
		applyBallPose(now);
		applyDiePose();
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
		dieTumble.copy(parts.die.quaternion);
		answerFacing.jumpTo(0);
	}

	function hurryToWindow() {
		if (turnFromWindow.isRunning) turnFromWindow.animateTo(0, HURRIED_TURN_SECONDS);
	}

	function introduce() {
		if (reducedMotion) return;
		turnFromWindow.jumpTo(Math.PI);
		turnFromWindow.animateTo(0, INTRO_TURN_SECONDS, INTRO_HOLD_SECONDS);
		requestFrame();
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
			answerFacing.jumpTo(1);
			textAlpha.animateTo(finalTextAlpha, 0.3);
		} else {
			depth.animateTo(1, 1.5, 0, easeOutCubic);
			answerFacing.animateTo(1, 1.7, 0, easeOutCubic);
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
		if (!reducedMotion) agitation = Math.min(MAX_AGITATION, agitation + 0.5 + clamped * 0.7);
		settlePendingReveal();
		hurryToWindow();
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

	return { introduce, shake, drag, release, reveal, dispose };
}
