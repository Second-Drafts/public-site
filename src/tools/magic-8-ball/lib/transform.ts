export type Vector3 = readonly [x: number, y: number, z: number];
export type Quaternion = readonly [x: number, y: number, z: number, w: number];
/** Column-major, as WebGL expects. */
export type Matrix4 = Float32Array;

export const IDENTITY_QUATERNION: Quaternion = [0, 0, 0, 1];

/** Matches three's default `XYZ` Euler order, which turns a point about Z first, then Y, then X. */
export function quaternionFromEuler(x: number, y: number, z: number): Quaternion {
	const [cx, cy, cz] = [Math.cos(x / 2), Math.cos(y / 2), Math.cos(z / 2)];
	const [sx, sy, sz] = [Math.sin(x / 2), Math.sin(y / 2), Math.sin(z / 2)];
	return [
		sx * cy * cz + cx * sy * sz,
		cx * sy * cz - sx * cy * sz,
		cx * cy * sz + sx * sy * cz,
		cx * cy * cz - sx * sy * sz,
	];
}

export function quaternionFromAxisAngle([x, y, z]: Vector3, angle: number): Quaternion {
	const length = Math.hypot(x, y, z);
	const s = Math.sin(angle / 2) / length;
	return [x * s, y * s, z * s, Math.cos(angle / 2)];
}

/** The rotation `b` followed by `a`. */
export function multiplyQuaternions([ax, ay, az, aw]: Quaternion, [bx, by, bz, bw]: Quaternion): Quaternion {
	return [
		ax * bw + aw * bx + ay * bz - az * by,
		ay * bw + aw * by + az * bx - ax * bz,
		az * bw + aw * bz + ax * by - ay * bx,
		aw * bw - ax * bx - ay * by - az * bz,
	];
}

/** Turns from `a` toward `b` the short way round. */
export function slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
	const cosine = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
	const shortWay = cosine < 0 ? -1 : 1;
	const angle = Math.acos(Math.min(1, cosine * shortWay));
	if (angle < 0.001) return normalize(weightedSum(a, 1 - t, b, t * shortWay));
	const sine = Math.sin(angle);
	return weightedSum(a, Math.sin((1 - t) * angle) / sine, b, (shortWay * Math.sin(t * angle)) / sine);
}

function weightedSum(a: Quaternion, weightA: number, b: Quaternion, weightB: number): Quaternion {
	return [
		a[0] * weightA + b[0] * weightB,
		a[1] * weightA + b[1] * weightB,
		a[2] * weightA + b[2] * weightB,
		a[3] * weightA + b[3] * weightB,
	];
}

function normalize([x, y, z, w]: Quaternion): Quaternion {
	const length = Math.hypot(x, y, z, w);
	return [x / length, y / length, z / length, w / length];
}

/** Scales, then rotates, then moves. */
export function composeMatrix([px, py, pz]: Vector3, [x, y, z, w]: Quaternion, scale: number): Matrix4 {
	const [x2, y2, z2] = [x + x, y + y, z + z];
	const [xx, xy, xz] = [x * x2, x * y2, x * z2];
	const [yy, yz, zz] = [y * y2, y * z2, z * z2];
	const [wx, wy, wz] = [w * x2, w * y2, w * z2];
	return new Float32Array([
		(1 - (yy + zz)) * scale,
		(xy + wz) * scale,
		(xz - wy) * scale,
		0,
		(xy - wz) * scale,
		(1 - (xx + zz)) * scale,
		(yz + wx) * scale,
		0,
		(xz + wy) * scale,
		(yz - wx) * scale,
		(1 - (xx + yy)) * scale,
		0,
		px,
		py,
		pz,
		1,
	]);
}

export function translationMatrix(position: Vector3): Matrix4 {
	return composeMatrix(position, IDENTITY_QUATERNION, 1);
}

/** The transform `b` followed by `a`. */
export function multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
	const product = new Float32Array(16);
	for (let column = 0; column < 4; column++) {
		for (let row = 0; row < 4; row++) {
			let sum = 0;
			for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[column * 4 + k];
			product[column * 4 + row] = sum;
		}
	}
	return product;
}

/** Maps a camera looking down -Z to clip space, with depth running from -1 at `near` to 1 at `far`. */
export function perspectiveMatrix(verticalFieldOfView: number, aspect: number, near: number, far: number): Matrix4 {
	const focal = 1 / Math.tan(verticalFieldOfView / 2);
	const depth = 1 / (near - far);
	return new Float32Array([
		focal / aspect,
		0,
		0,
		0,
		0,
		focal,
		0,
		0,
		0,
		0,
		(far + near) * depth,
		-1,
		0,
		0,
		2 * far * near * depth,
		0,
	]);
}
