import { BinaryReader, Vector3 } from "./misc.js";

export function readVector3(reader: BinaryReader): Vector3 {
	return new Vector3(
		reader.readFloat32(),
		reader.readFloat32(),
		reader.readFloat32(),
	)
}

export function* enumerate<T>(arr: T[]): Generator<[T, number], void, unknown> {
	for (let i = 0; i < arr.length; i++) {
		yield [arr[i], i]
	}
}
