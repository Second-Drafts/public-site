import { describe, expect, it } from "vitest";
import {
	IDENTITY_QUATERNION,
	composeMatrix,
	multiplyMatrices,
	multiplyQuaternions,
	perspectiveMatrix,
	quaternionFromAxisAngle,
	quaternionFromEuler,
	slerp,
	translationMatrix,
	type Matrix4,
	type Quaternion,
	type Vector3,
} from "./transform";

function transformPoint(matrix: Matrix4, [x, y, z]: Vector3): Vector3 {
	const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
	return [
		(matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
		(matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
		(matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
	];
}

function rotate(rotation: Quaternion, point: Vector3) {
	return transformPoint(composeMatrix([0, 0, 0], rotation, 1), point);
}

function expectClose(actual: readonly number[], expected: readonly number[]) {
	expect(actual).toHaveLength(expected.length);
	actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 5));
}

const QUARTER_TURN = Math.PI / 2;

describe("quaternions", () => {
	it("turns about each Euler axis", () => {
		expectClose(rotate(quaternionFromEuler(QUARTER_TURN, 0, 0), [0, 1, 0]), [0, 0, 1]);
		expectClose(rotate(quaternionFromEuler(0, QUARTER_TURN, 0), [1, 0, 0]), [0, 0, -1]);
		expectClose(rotate(quaternionFromEuler(0, 0, QUARTER_TURN), [1, 0, 0]), [0, 1, 0]);
	});

	it("turns a point about Z first, then Y, then X", () => {
		const turned = rotate(quaternionFromEuler(QUARTER_TURN, QUARTER_TURN, QUARTER_TURN), [1, 0, 0]);
		const aboutZ = rotate(quaternionFromEuler(0, 0, QUARTER_TURN), [1, 0, 0]);
		const thenAboutY = rotate(quaternionFromEuler(0, QUARTER_TURN, 0), aboutZ);
		expectClose(turned, rotate(quaternionFromEuler(QUARTER_TURN, 0, 0), thenAboutY));
	});

	it("matches an axis-angle turn", () => {
		expectClose(quaternionFromAxisAngle([0, 2, 0], QUARTER_TURN), quaternionFromEuler(0, QUARTER_TURN, 0));
	});

	it("multiplies right to left", () => {
		const aboutX = quaternionFromEuler(QUARTER_TURN, 0, 0);
		const aboutZ = quaternionFromEuler(0, 0, QUARTER_TURN);
		expectClose(rotate(multiplyQuaternions(aboutZ, aboutX), [0, 1, 0]), rotate(aboutZ, [0, 0, 1]));
	});

	it("slerps from one end to the other", () => {
		const turned = quaternionFromEuler(0, QUARTER_TURN, 0);
		expectClose(slerp(IDENTITY_QUATERNION, turned, 0), IDENTITY_QUATERNION);
		expectClose(slerp(IDENTITY_QUATERNION, turned, 1), turned);
		expectClose(slerp(IDENTITY_QUATERNION, turned, 0.5), quaternionFromEuler(0, QUARTER_TURN / 2, 0));
	});

	it("slerps the short way round", () => {
		const turned = quaternionFromEuler(0, QUARTER_TURN, 0);
		const sameTurnNegated: Quaternion = [-turned[0], -turned[1], -turned[2], -turned[3]];
		const halfway = slerp(IDENTITY_QUATERNION, sameTurnNegated, 0.5);
		expectClose(rotate(halfway, [1, 0, 0]), rotate(quaternionFromEuler(0, QUARTER_TURN / 2, 0), [1, 0, 0]));
	});

	it("stays a unit rotation between nearly equal ends", () => {
		const almost = quaternionFromEuler(0, 0.0001, 0);
		expect(Math.hypot(...slerp(IDENTITY_QUATERNION, almost, 0.5))).toBeCloseTo(1, 6);
	});
});

describe("matrices", () => {
	it("scales, then rotates, then moves", () => {
		const matrix = composeMatrix([1, 2, 3], quaternionFromEuler(0, 0, QUARTER_TURN), 2);
		expectClose(transformPoint(matrix, [1, 0, 0]), [1, 4, 3]);
	});

	it("multiplies right to left", () => {
		const moveRight = translationMatrix([1, 0, 0]);
		const turn = composeMatrix([0, 0, 0], quaternionFromEuler(0, 0, QUARTER_TURN), 1);
		expectClose(transformPoint(multiplyMatrices(turn, moveRight), [0, 0, 0]), [0, 1, 0]);
	});

	it("projects the near and far planes to the ends of clip depth", () => {
		const projection = perspectiveMatrix(Math.PI / 3, 2, 0.1, 50);
		expect(transformPoint(projection, [0, 0, -0.1])[2]).toBeCloseTo(-1, 5);
		expect(transformPoint(projection, [0, 0, -50])[2]).toBeCloseTo(1, 4);
	});

	it("fits the vertical field of view to the top of clip space", () => {
		const fieldOfView = Math.PI / 3;
		const projection = perspectiveMatrix(fieldOfView, 2, 0.1, 50);
		const top: Vector3 = [0, Math.tan(fieldOfView / 2) * 5, -5];
		const right: Vector3 = [Math.tan(fieldOfView / 2) * 5 * 2, 0, -5];
		expect(transformPoint(projection, top)[1]).toBeCloseTo(1, 5);
		expect(transformPoint(projection, right)[0]).toBeCloseTo(1, 5);
	});
});
