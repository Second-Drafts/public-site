import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseGlb } from "./glb";

const TRIANGLE_POSITIONS = [0, 0, 0, 1, 0, 0, 0, 1, 0];
const TRIANGLE_NORMALS = [0, 0, 1, 0, 0, 1, 0, 0, 1];

function padded(bytes: Uint8Array, fill: number) {
	const result = new Uint8Array(Math.ceil(bytes.length / 4) * 4).fill(fill);
	result.set(bytes);
	return result;
}

function encodeGlb(json: object, binary: Uint8Array, magic = 0x46546c67): ArrayBuffer {
	const jsonBytes = padded(new TextEncoder().encode(JSON.stringify(json)), 0x20);
	const binaryBytes = padded(binary, 0);
	const binaryStart = 20 + jsonBytes.length;
	const buffer = new ArrayBuffer(binaryStart + 8 + binaryBytes.length);
	const view = new DataView(buffer);
	view.setUint32(0, magic, true);
	view.setUint32(4, 2, true);
	view.setUint32(8, buffer.byteLength, true);
	view.setUint32(12, jsonBytes.length, true);
	view.setUint32(16, 0x4e4f534a, true);
	new Uint8Array(buffer, 20).set(jsonBytes);
	view.setUint32(binaryStart, binaryBytes.length, true);
	view.setUint32(binaryStart + 4, 0x004e4942, true);
	new Uint8Array(buffer, binaryStart + 8).set(binaryBytes);
	return buffer;
}

function triangleGlb(overrides: { indexComponentType?: number; rotation?: number[] } = {}) {
	const positions = new Float32Array(TRIANGLE_POSITIONS);
	const normals = new Float32Array(TRIANGLE_NORMALS);
	const indices = new Uint16Array([0, 1, 2]);
	const binary = new Uint8Array(78);
	binary.set(new Uint8Array(positions.buffer), 0);
	binary.set(new Uint8Array(normals.buffer), 36);
	binary.set(new Uint8Array(indices.buffer), 72);
	return encodeGlb(
		{
			nodes: [
				{ name: "Holder", children: [1], translation: [0, 0, 0.5], rotation: overrides.rotation },
				{ name: "Triangle", mesh: 0 },
			],
			meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
			materials: [{ name: "Ink" }],
			accessors: [
				{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
				{ bufferView: 1, componentType: 5126, count: 3, type: "VEC3" },
				{ bufferView: 2, componentType: overrides.indexComponentType ?? 5123, count: 3, type: "SCALAR" },
			],
			bufferViews: [
				{ byteOffset: 0, byteLength: 36 },
				{ byteOffset: 36, byteLength: 36 },
				{ byteOffset: 72, byteLength: 6 },
			],
		},
		binary,
	);
}

describe("parseGlb", () => {
	it("reads nodes, where they sit and their meshes", () => {
		const nodes = parseGlb(triangleGlb());
		expect(nodes.get("Holder")).toEqual({ translation: [0, 0, 0.5], primitives: [] });
		const [triangle] = nodes.get("Triangle")!.primitives;
		expect(triangle.materialName).toBe("Ink");
		expect([...triangle.positions]).toEqual(TRIANGLE_POSITIONS);
		expect([...triangle.normals]).toEqual(TRIANGLE_NORMALS);
		expect([...triangle.indices]).toEqual([0, 1, 2]);
		expect(triangle.uvs).toBeNull();
	});

	it("rejects a file that isn't binary glTF", () => {
		expect(() => parseGlb(encodeGlb({}, new Uint8Array(4), 0x12345678))).toThrow("Not a binary glTF file");
	});

	it("rejects index types the renderer can't draw", () => {
		expect(() => parseGlb(triangleGlb({ indexComponentType: 5125 }))).toThrow("Accessor 2");
	});

	it("rejects nodes that rotate", () => {
		expect(() => parseGlb(triangleGlb({ rotation: [0, 0, 0, 1] }))).toThrow("Holder");
	});

	it("reads the shipped 8 ball model", () => {
		const file = readFileSync(new URL("../../../../public/models/magic-8-ball.glb", import.meta.url));
		const nodes = parseGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
		const materials = [...nodes.values()].flatMap((node) => node.primitives.map((primitive) => primitive.materialName));
		expect(materials.sort()).toEqual([
			"AnswerBlue",
			"DieBlue",
			"DiscInk",
			"DiscWhite",
			"LiquidIndigo",
			"ShellBlack",
			"ShellRim",
			"WindowGlass",
		]);
		expect(nodes.get("AnswerFace")!.primitives[0].uvs).toHaveLength(6);
	});
});
