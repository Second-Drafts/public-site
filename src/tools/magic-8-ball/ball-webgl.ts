import { lerp } from "../../lib/math";
import { createAnswerCanvas, paintAnswer } from "./answer-face";
import { parseGlb, type ModelNode, type ModelPrimitive } from "./lib/glb";
import {
	composeMatrix,
	multiplyMatrices,
	perspectiveMatrix,
	translationMatrix,
	type Matrix4,
	type Quaternion,
	type Vector3,
} from "./lib/transform";

export interface BallPose {
	ballPosition: Vector3;
	ballRotation: Quaternion;
	dieRotation: Quaternion;
	dieScale: number;
	/** How far forward the die's answer face sits in the ball, along the axis through the window. */
	answerFaceZ: number;
	answerOpacity: number;
	/** 0 is clear glass, 1 is the clouded glass of a hazy answer. */
	haze: number;
}

export interface BallWebGL {
	/** How far the ball moves for each CSS pixel of drag at the current size. */
	readonly unitsPerPixel: number;
	resize(width: number, height: number): void;
	showAnswer(text: string): void;
	draw(pose: BallPose): void;
	dispose(): void;
}

interface Shading {
	cell: number;
	/** Mixed in by the haze. */
	hazyCell?: number;
	fogged?: boolean;
	/** For walls that face further from the camera than any point on the ball's sphere. Their cell is baked head-on. */
	viewLookup?: boolean;
}

interface Mesh {
	vertexArray: WebGLVertexArrayObject;
	indexCount: number;
	buffers: WebGLBuffer[];
}

interface LitPart {
	mesh: Mesh;
	offset: Matrix4;
	cell: [number, number];
	hazyCell: [number, number];
	fogged: boolean;
	viewLookup: boolean;
}

interface Program<Name extends string> {
	program: WebGLProgram;
	uniforms: Record<Name, WebGLUniformLocation | null>;
}

const MODEL_URL = "/models/magic-8-ball.glb";
const MATCAP_URL = "/models/magic-8-ball-matcaps.webp";
const CAMERA_DISTANCE = 5.5;
/** Tangent of the angle between the camera's axis and the edge of the ball. */
const SILHOUETTE_TANGENT = 1 / Math.sqrt(CAMERA_DISTANCE ** 2 - 1);
const BALL_FRACTION_OF_CANVAS = 0.71;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 50;
const MAX_PIXEL_RATIO = 2;
const VIEW = translationMatrix([0, 0, -CAMERA_DISTANCE]);
const IN_PLACE = translationMatrix([0, 0, 0]);
const DIE_FACE_DISTANCE = 0.286;
const GLASS_Z = 0.826;
const LIQUID_FLOOR_Z = 0.12;
const WATER_COLOR: Vector3 = [0.0999, 0.1517, 0.3811];
const CLOUD_RADIUS = 0.41;
const CLOUD_SEGMENTS = 48;
const HAZY_CLOUD_OPACITY = 0.6;
const CLEAR_GLASS_OPACITY = 0.12;
const HAZY_GLASS_OPACITY = 0.35;
const POSITION_ATTRIBUTE = 0;
const NORMAL_ATTRIBUTE = 1;
const UV_ATTRIBUTE = 2;

/**
 * Cells of `magic-8-ball-matcaps.webp`, four across and two down. Each is a unit sphere in one material, lit and tone mapped
 * as the three.js renderer at commit 0e57180 drew it, seen from the camera's distance, or head-on for a `viewLookup` cell.
 */
const MATCAP_COLUMNS = 4;
const MATCAP_ROWS = 2;
const SHADING: Record<string, Shading> = {
	ShellBlack: { cell: 0 },
	ShellRim: { cell: 1, viewLookup: true },
	DiscWhite: { cell: 2 },
	DiscInk: { cell: 3 },
	DieBlue: { cell: 4, fogged: true },
	LiquidIndigo: { cell: 5, fogged: true },
	WindowGlass: { cell: 6, hazyCell: 7 },
};

const LIT_UNIFORMS = [
	"projection",
	"modelView",
	"cell",
	"hazyCell",
	"haze",
	"opacity",
	"fogged",
	"viewLookup",
] as const;
const TEXTURED_UNIFORMS = ["projection", "modelView", "opacity", "fogged"] as const;

const glslFloat = (value: number) => (Number.isInteger(value) ? value.toFixed(1) : String(value));
const glslVector = (vector: readonly number[]) => `vec${vector.length}(${vector.map(glslFloat).join(", ")})`;

/** Clear at the glass, solid water at the chamber floor, mixed in display colours as three's fog was. */
const WATER_FOG = `
	vec3 underWater(vec3 color, float viewDepth) {
		float depth = smoothstep(${glslFloat(CAMERA_DISTANCE - GLASS_Z)}, ${glslFloat(CAMERA_DISTANCE - LIQUID_FLOOR_Z)}, viewDepth);
		return mix(color, ${glslVector(WATER_COLOR)}, depth);
	}
`;

const LIT_VERTEX = `#version 300 es
	layout(location = ${POSITION_ATTRIBUTE}) in vec3 position;
	layout(location = ${NORMAL_ATTRIBUTE}) in vec3 normal;
	uniform mat4 projection;
	uniform mat4 modelView;
	out vec3 viewPosition;
	out vec3 viewNormal;

	void main() {
		vec4 positionInView = modelView * vec4(position, 1.0);
		viewPosition = positionInView.xyz;
		viewNormal = mat3(modelView) * normal;
		gl_Position = projection * positionInView;
	}
`;

const LIT_FRAGMENT = `#version 300 es
	precision highp float;
	in vec3 viewPosition;
	in vec3 viewNormal;
	uniform sampler2D matcaps;
	uniform vec2 cell;
	uniform vec2 hazyCell;
	uniform float haze;
	uniform float opacity;
	uniform bool fogged;
	uniform bool viewLookup;
	out vec4 fragColor;
	${WATER_FOG}

	// Where the ball's own sphere has this normal, seen from the camera. Exact for the shell, which is that sphere.
	vec2 onBall(vec3 normal) {
		return normal.xy / (${glslFloat(CAMERA_DISTANCE)} - normal.z) * ${glslFloat(1 / SILHOUETTE_TANGENT)};
	}

	// three's MeshMatcapMaterial lookup, for walls that face away from the camera further than the sphere ever does.
	vec2 facingView(vec3 normal) {
		vec3 toCamera = normalize(-viewPosition);
		vec3 right = normalize(vec3(toCamera.z, 0.0, -toCamera.x));
		vec3 up = cross(toCamera, right);
		return vec2(dot(right, normal), dot(up, normal));
	}

	vec2 matcapCoordinate(vec3 normal) {
		vec2 onSphere = viewLookup ? facingView(normal) : onBall(normal);
		// Grazing normals stop just inside the baked sphere, off its antialiased edge.
		onSphere *= min(1.0, 0.98 / max(length(onSphere), 0.0001));
		return (vec2(onSphere.x, -onSphere.y) * 0.5 + 0.5) * ${glslVector([1 / MATCAP_COLUMNS, 1 / MATCAP_ROWS])};
	}

	void main() {
		vec2 inCell = matcapCoordinate(normalize(viewNormal));
		vec3 color = mix(texture(matcaps, cell + inCell).rgb, texture(matcaps, hazyCell + inCell).rgb, haze);
		fragColor = vec4(fogged ? underWater(color, -viewPosition.z) : color, opacity);
	}
`;

const TEXTURED_VERTEX = `#version 300 es
	layout(location = ${POSITION_ATTRIBUTE}) in vec3 position;
	layout(location = ${UV_ATTRIBUTE}) in vec2 uv;
	uniform mat4 projection;
	uniform mat4 modelView;
	out vec2 textureCoordinate;
	out float viewDepth;

	void main() {
		vec4 positionInView = modelView * vec4(position, 1.0);
		viewDepth = -positionInView.z;
		textureCoordinate = uv;
		gl_Position = projection * positionInView;
	}
`;

const TEXTURED_FRAGMENT = `#version 300 es
	precision highp float;
	in vec2 textureCoordinate;
	in float viewDepth;
	uniform sampler2D map;
	uniform float opacity;
	uniform bool fogged;
	out vec4 fragColor;
	${WATER_FOG}

	void main() {
		vec4 texel = texture(map, textureCoordinate);
		fragColor = vec4(fogged ? underWater(texel.rgb, viewDepth) : texel.rgb, texel.a * opacity);
	}
`;

export async function loadBallWebGL(canvas: HTMLCanvasElement): Promise<BallWebGL> {
	const gl = canvas.getContext("webgl2");
	if (!gl || gl.isContextLost()) throw new Error("WebGL2 is unavailable");
	const [model, matcaps] = await Promise.all([loadModel(), loadMatcaps()]).catch((error: unknown) => {
		loseContext(gl);
		throw error;
	});
	return createBallWebGL(canvas, gl, model, matcaps);
}

function loseContext(gl: WebGL2RenderingContext) {
	gl.getExtension("WEBGL_lose_context")?.loseContext();
}

async function loadModel() {
	const response = await fetch(MODEL_URL);
	if (!response.ok) throw new Error(`Couldn't load ${MODEL_URL}: ${response.status}`);
	return parseGlb(await response.arrayBuffer());
}

async function loadMatcaps() {
	const image = new Image();
	image.src = MATCAP_URL;
	await image.decode();
	return image;
}

function requireNode(model: Map<string, ModelNode>, name: string) {
	const node = model.get(name);
	if (!node) throw new Error(`Ball model is missing the ${name} node`);
	return node;
}

function cameraFieldOfView(aspect: number) {
	return 2 * Math.atan(SILHOUETTE_TANGENT / BALL_FRACTION_OF_CANVAS / Math.min(1, aspect));
}

function seededRandom(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

/** Soft blobs in the cloud's final colour: the pale blue three's tint made of them. */
function drawCloud() {
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
		blob.addColorStop(0, "rgba(104, 116, 195, 0.55)");
		blob.addColorStop(1, "rgba(104, 116, 195, 0)");
		context.fillStyle = blob;
		context.fillRect(0, 0, size, size);
	}
	return canvas;
}

function cloudDisc() {
	const positions = [0, 0, GLASS_Z];
	const uvs = [0.5, 0.5];
	const indices: number[] = [];
	for (let segment = 0; segment <= CLOUD_SEGMENTS; segment++) {
		const angle = (segment / CLOUD_SEGMENTS) * 2 * Math.PI;
		positions.push(CLOUD_RADIUS * Math.cos(angle), CLOUD_RADIUS * Math.sin(angle), GLASS_Z);
		uvs.push((Math.cos(angle) + 1) / 2, (Math.sin(angle) + 1) / 2);
		if (segment > 0) indices.push(segment, segment + 1, 0);
	}
	return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
}

function createProgram<Name extends string>(
	gl: WebGL2RenderingContext,
	vertexSource: string,
	fragmentSource: string,
	uniformNames: readonly Name[],
): Program<Name> {
	const program = gl.createProgram();
	for (const [type, source] of [
		[gl.VERTEX_SHADER, vertexSource],
		[gl.FRAGMENT_SHADER, fragmentSource],
	] as const) {
		const shader = gl.createShader(type) as WebGLShader;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		gl.attachShader(program, shader);
		gl.deleteShader(shader);
	}
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost())
		throw new Error(`Ball shader failed to link: ${gl.getProgramInfoLog(program)}`);
	const uniforms = Object.fromEntries(uniformNames.map((name) => [name, gl.getUniformLocation(program, name)]));
	return { program, uniforms: uniforms as Program<Name>["uniforms"] };
}

function createMesh(
	gl: WebGL2RenderingContext,
	indices: Uint16Array,
	attributes: [location: number, size: number, data: Float32Array][],
): Mesh {
	const vertexArray = gl.createVertexArray();
	gl.bindVertexArray(vertexArray);
	const buffers = attributes.map(([location, size, data]) => {
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(location);
		gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
		return buffer;
	});
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
	gl.bindVertexArray(null);
	return { vertexArray, indexCount: indices.length, buffers: [...buffers, indexBuffer] };
}

function createTexturedMesh(
	gl: WebGL2RenderingContext,
	{ positions, uvs, indices }: Pick<ModelPrimitive, "positions" | "uvs" | "indices">,
) {
	if (!uvs) throw new Error("A textured part of the ball has no texture coordinates");
	return createMesh(gl, indices, [
		[POSITION_ATTRIBUTE, 3, positions],
		[UV_ATTRIBUTE, 2, uvs],
	]);
}

function cellOrigin(cell: number): [number, number] {
	return [(cell % MATCAP_COLUMNS) / MATCAP_COLUMNS, Math.floor(cell / MATCAP_COLUMNS) / MATCAP_ROWS];
}

function createLitParts(
	gl: WebGL2RenderingContext,
	node: ModelNode,
	offset = translationMatrix(node.translation),
): LitPart[] {
	return node.primitives.map(({ materialName, positions, normals, indices }) => {
		const shading = SHADING[materialName];
		if (!shading) throw new Error(`Ball model has no shading for the ${materialName} material`);
		return {
			mesh: createMesh(gl, indices, [
				[POSITION_ATTRIBUTE, 3, positions],
				[NORMAL_ATTRIBUTE, 3, normals],
			]),
			offset,
			cell: cellOrigin(shading.cell),
			hazyCell: cellOrigin(shading.hazyCell ?? shading.cell),
			fogged: shading.fogged ?? false,
			viewLookup: shading.viewLookup ?? false,
		};
	});
}

function createTexture(gl: WebGL2RenderingContext, source: TexImageSource, flipY: boolean) {
	const texture = gl.createTexture();
	uploadTexture(gl, texture, source, flipY);
	return texture;
}

function uploadTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, source: TexImageSource, flipY: boolean) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
	gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/** Everything that lives on the GPU, so it can all be made again when the browser restores a lost context. */
function createGpuResources(
	gl: WebGL2RenderingContext,
	model: Map<string, ModelNode>,
	matcaps: HTMLImageElement,
	answer: HTMLCanvasElement,
) {
	return {
		lit: createProgram(gl, LIT_VERTEX, LIT_FRAGMENT, LIT_UNIFORMS),
		textured: createProgram(gl, TEXTURED_VERTEX, TEXTURED_FRAGMENT, TEXTURED_UNIFORMS),
		ballParts: ["Shell", "EightDisc", "Liquid"].flatMap((name) => createLitParts(gl, requireNode(model, name))),
		dieParts: createLitParts(gl, requireNode(model, "Die"), IN_PLACE),
		glassParts: createLitParts(gl, requireNode(model, "Window")),
		answerFace: createTexturedMesh(gl, requireNode(model, "AnswerFace").primitives[0]),
		cloud: createTexturedMesh(gl, cloudDisc()),
		matcapTexture: createTexture(gl, matcaps, false),
		cloudTexture: createTexture(gl, drawCloud(), true),
		answerTexture: createTexture(gl, answer, false),
	};
}

function deleteGpuResources(gl: WebGL2RenderingContext, resources: ReturnType<typeof createGpuResources>) {
	const parts = [...resources.ballParts, ...resources.dieParts, ...resources.glassParts];
	for (const mesh of [...parts.map((part) => part.mesh), resources.answerFace, resources.cloud]) {
		gl.deleteVertexArray(mesh.vertexArray);
		for (const buffer of mesh.buffers) gl.deleteBuffer(buffer);
	}
	for (const texture of [resources.matcapTexture, resources.cloudTexture, resources.answerTexture])
		gl.deleteTexture(texture);
	gl.deleteProgram(resources.lit.program);
	gl.deleteProgram(resources.textured.program);
}

function createBallWebGL(
	canvas: HTMLCanvasElement,
	gl: WebGL2RenderingContext,
	model: Map<string, ModelNode>,
	matcaps: HTMLImageElement,
): BallWebGL {
	const answer = createAnswerCanvas();
	const [dieX, dieY] = requireNode(model, "Die").translation;
	let resources = createGpuResources(gl, model, matcaps, answer);
	let projection = perspectiveMatrix(1, 1, NEAR_PLANE, FAR_PLANE);
	let unitsPerPixel = 0.005;
	let lastPose: BallPose | null = null;

	function onContextLost(event: Event) {
		event.preventDefault();
	}

	function onContextRestored() {
		resources = createGpuResources(gl, model, matcaps, answer);
		if (lastPose) draw(lastPose);
	}

	canvas.addEventListener("webglcontextlost", onContextLost);
	canvas.addEventListener("webglcontextrestored", onContextRestored);

	function resize(width: number, height: number) {
		const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
		canvas.width = Math.floor(width * pixelRatio);
		canvas.height = Math.floor(height * pixelRatio);
		const fieldOfView = cameraFieldOfView(width / height);
		projection = perspectiveMatrix(fieldOfView, width / height, NEAR_PLANE, FAR_PLANE);
		unitsPerPixel = (2 * CAMERA_DISTANCE * Math.tan(fieldOfView / 2)) / height;
	}

	function showAnswer(text: string) {
		paintAnswer(answer, text);
		uploadTexture(gl, resources.answerTexture, answer, false);
	}

	function drawLit(part: LitPart, space: Matrix4, haze = 0, opacity = 1) {
		const { uniforms } = resources.lit;
		gl.uniformMatrix4fv(uniforms.modelView, false, multiplyMatrices(space, part.offset));
		gl.uniform2fv(uniforms.cell, part.cell);
		gl.uniform2fv(uniforms.hazyCell, part.hazyCell);
		gl.uniform1f(uniforms.haze, haze);
		gl.uniform1f(uniforms.opacity, opacity);
		gl.uniform1i(uniforms.fogged, part.fogged ? 1 : 0);
		gl.uniform1i(uniforms.viewLookup, part.viewLookup ? 1 : 0);
		drawMesh(part.mesh);
	}

	function drawTextured(mesh: Mesh, modelView: Matrix4, texture: WebGLTexture, opacity: number, fogged: boolean) {
		const { uniforms } = resources.textured;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniformMatrix4fv(uniforms.modelView, false, modelView);
		gl.uniform1f(uniforms.opacity, opacity);
		gl.uniform1i(uniforms.fogged, fogged ? 1 : 0);
		drawMesh(mesh);
	}

	function drawMesh(mesh: Mesh) {
		gl.bindVertexArray(mesh.vertexArray);
		gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
	}

	function useProgram(program: Program<"projection">) {
		gl.useProgram(program.program);
		gl.uniformMatrix4fv(program.uniforms.projection, false, projection);
	}

	function draw(pose: BallPose) {
		lastPose = pose;
		const ballView = multiplyMatrices(VIEW, composeMatrix(pose.ballPosition, pose.ballRotation, 1));
		const diePosition: Vector3 = [dieX, dieY, pose.answerFaceZ - DIE_FACE_DISTANCE * pose.dieScale];
		const dieView = multiplyMatrices(ballView, composeMatrix(diePosition, pose.dieRotation, pose.dieScale));
		const { lit, textured } = resources;

		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.depthMask(true);
		gl.disable(gl.BLEND);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		useProgram(lit);
		gl.bindTexture(gl.TEXTURE_2D, resources.matcapTexture);
		for (const part of resources.ballParts) drawLit(part, ballView);
		for (const part of resources.dieParts) drawLit(part, dieView);

		gl.depthMask(false);
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		useProgram(textured);
		drawTextured(resources.answerFace, dieView, resources.answerTexture, pose.answerOpacity, true);
		drawTextured(resources.cloud, ballView, resources.cloudTexture, pose.haze * HAZY_CLOUD_OPACITY, false);

		useProgram(lit);
		gl.bindTexture(gl.TEXTURE_2D, resources.matcapTexture);
		const glassOpacity = lerp(CLEAR_GLASS_OPACITY, HAZY_GLASS_OPACITY, pose.haze);
		for (const part of resources.glassParts) drawLit(part, ballView, pose.haze, glassOpacity);
		gl.bindVertexArray(null);
	}

	function dispose() {
		canvas.removeEventListener("webglcontextlost", onContextLost);
		canvas.removeEventListener("webglcontextrestored", onContextRestored);
		deleteGpuResources(gl, resources);
		loseContext(gl);
	}

	return {
		get unitsPerPixel() {
			return unitsPerPixel;
		},
		resize,
		showAnswer,
		draw,
		dispose,
	};
}
