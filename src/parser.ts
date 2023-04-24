import BoyerMoore from "./boyermoore.js";
import { BinaryReader } from "./misc.js";
import { CollisionBinary, VertexGroup } from "./types.js";
import { readVector3 } from "./util.js";

export function parseCSB(buffer: ArrayBuffer): CollisionBinary {
	// skip long and weird header and skip to the string section
	let stringsBegin = findCollisionString(buffer)
	
	let reader = new BinaryReader(buffer, stringsBegin, true)
	
	// skip forward to the end of the string section
	while (true) {
		if (reader.readInt16() == 0 && reader.readInt8() == 0)
			break
		else
			reader.position -= 1
	}
	
	reader.position -= 3
	reader.alignTo(4)
	
	let vertexGroupCount = reader.readInt32() >> 16
	let definedGroupCount = countDefinedGroups(reader, vertexGroupCount)
	
	let groups = Array.from({ length: definedGroupCount }, () => VertexGroup.fromBinaryReader(reader))
	
	let otherVectors = definedGroupCount == 1 ? Array.from({ length: 3 }, () => readVector3(reader)) : []
	
	return new CollisionBinary(groups, otherVectors, stringsBegin == 0x4e)
}

function findCollisionString(buffer: ArrayBuffer) {
	let boyerMoore = new BoyerMoore(new TextEncoder().encode('Collision'))
	let result = boyerMoore.findIndex(buffer)
	return result
}

function countDefinedGroups(reader: BinaryReader, vertexGroupCount: number): number {
	// starts at 1 because DEADBEEF vertex group is always defined but it is not marked as such
	let definedGroupCount = 1
	
	// this part contains 4 bytes for every vertex group:
	// first byte - the index of the group, this literally just counts up
	// second byte - ?
	// third byte - seems to be either 0, 1 or 3. 1 means that the vertex group is defined in the file
	// fourth byte - ?
	for (let i = 0; i < vertexGroupCount; i++) {
		let id = reader.readUint16()
		
		let x = reader.readInt8()
		
		if (x == 1) {
			definedGroupCount += 1
		}
		
		reader.position += 1
	}
	
	return definedGroupCount
}
