import { writeFileSync } from "fs";
import BoyerMoore from "./boyermoore.js";
import { BinaryReader } from "./misc.js";
import { CollisionBinary, VertexGroup } from "./types.js";

export function parseCSB(buffer: ArrayBuffer): CollisionBinary {
	// skip long and weird header and skip to the string section
	let stringsBegin = findCollisionString(buffer)
	
	let reader = new BinaryReader(buffer, stringsBegin, true)
	
	// skip forward to the end of the string section
	while (true) {
		let read = reader.readInt16()
		
		if (read == 0)
			break
	}
	
	reader.position -= 2
	reader.alignTo(4)
	
	let vertexGroupCount = reader.readInt32() >> 16
	
	// skip vertex group header information
	// this part contains 4 bytes for every vertex group:
	// 1 byte - the index of the group, this literally just counts up
	// 1 byte - ?
	// 1 byte - seems to indicate whether the group's name is in the group (1) or in the string section (0)
	// 1 byte - ?
	reader.position += vertexGroupCount * 4
	
	let groups = Array.from({ length: vertexGroupCount }, () => VertexGroup.fromBinaryReader(reader))
	
	return new CollisionBinary(groups)
}

function findCollisionString(buffer: ArrayBuffer) {
	let boyerMoore = new BoyerMoore(new TextEncoder().encode('Collision'))
	let result = boyerMoore.findIndex(buffer)
	return result
}
