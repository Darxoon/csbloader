import { BinaryReader, Vector3 } from "./misc.js";

export function readVector3(reader: BinaryReader): Vector3 {
	return new Vector3(
		reader.readFloat32(),
		reader.readFloat32(),
		reader.readFloat32(),
	)
}
