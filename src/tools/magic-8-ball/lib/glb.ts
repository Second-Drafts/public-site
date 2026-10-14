import type { Vector3 } from "./transform";

export interface ModelPrimitive {
	materialName: string;
	positions: Float32Array;
	normals: Float32Array;
	uvs: Float32Array | null;
	indices: Uint16Array;
}

export interface ModelNode {
	translation: Vector3;
	primitives: ModelPrimitive[];
}

interface GltfJson {
	nodes: { name: string; mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[] }[];
	meshes: {
		primitives: { attributes: Record<string, number>; indices?: number; material?: number; mode?: number }[];
	}[];
	materials: { name: string }[];
	accessors: { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string }[];
	bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
}

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BINARY_CHUNK = 0x004e4942;
const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const TRIANGLES = 4;
const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3 };

/** Reads the subset of binary glTF that the 8 ball's Blender export uses: triangle meshes with packed float attributes and 16-bit indices, on nodes that only move. Throws on anything else. */
export function parseGlb(buffer: ArrayBuffer): Map<string, ModelNode> {
	const view = new DataView(buffer);
	if (buffer.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) throw new Error("Not a binary glTF file");
	const jsonLength = view.getUint32(12, true);
	if (view.getUint32(16, true) !== JSON_CHUNK) throw new Error("The glTF file has no JSON chunk");
	const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength))) as GltfJson;
	const binaryStart = 20 + jsonLength;
	if (view.getUint32(binaryStart + 4, true) !== BINARY_CHUNK) throw new Error("The glTF file has no binary chunk");
	const binaryOffset = binaryStart + 8;

	/** Where an accessor's packed values start in the file, and how many there are. */
	function locateAccessor(index: number, componentType: number, type: string) {
		const accessor = gltf.accessors[index];
		if (accessor.componentType !== componentType || accessor.type !== type)
			throw new Error(`Accessor ${index} is ${accessor.componentType} ${accessor.type}, not ${componentType} ${type}`);
		const bufferView = gltf.bufferViews[accessor.bufferView ?? -1];
		if (!bufferView || bufferView.byteStride) throw new Error(`Accessor ${index} isn't tightly packed`);
		const offset = binaryOffset + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
		return [offset, accessor.count * COMPONENTS[type]] as const;
	}

	const readFloats = (index: number, type: string) => new Float32Array(buffer, ...locateAccessor(index, FLOAT, type));
	const readIndices = (index: number) => new Uint16Array(buffer, ...locateAccessor(index, UNSIGNED_SHORT, "SCALAR"));

	function readPrimitive(primitive: GltfJson["meshes"][number]["primitives"][number]): ModelPrimitive {
		if ((primitive.mode ?? TRIANGLES) !== TRIANGLES || primitive.indices === undefined)
			throw new Error("Only indexed triangle meshes are supported");
		const { POSITION, NORMAL, TEXCOORD_0 } = primitive.attributes;
		return {
			materialName: gltf.materials[primitive.material ?? -1]?.name ?? "",
			positions: readFloats(POSITION, "VEC3"),
			normals: readFloats(NORMAL, "VEC3"),
			uvs: TEXCOORD_0 === undefined ? null : readFloats(TEXCOORD_0, "VEC2"),
			indices: readIndices(primitive.indices),
		};
	}

	const nodes = new Map<string, ModelNode>();
	for (const node of gltf.nodes) {
		if (node.rotation || node.scale) throw new Error(`Node ${node.name} rotates or scales`);
		const [x = 0, y = 0, z = 0] = node.translation ?? [];
		nodes.set(node.name, {
			translation: [x, y, z],
			primitives: node.mesh === undefined ? [] : gltf.meshes[node.mesh].primitives.map(readPrimitive),
		});
	}
	return nodes;
}
