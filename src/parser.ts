import BoyerMoore from "./boyermoore.js";
import { BinaryReader } from "./misc.js";
import { CollisionBinary, VertexGroup } from "./types.js";
import { readVector3 } from "./util.js";

export function parseCSB(buffer: ArrayBuffer): CollisionBinary {
	// skip long and weird header and skip to the string section
	let stringsBegin = findCollisionString(buffer)
	
	let reader = new BinaryReader(buffer)
	
	reader.position = 0x28
	
	if (reader.readInt32() != 1) {
		console.warn("Warning: File is not serializable, header is larger than expected.\n")
	}
	
	// skip forward to the end of the string section
	reader.position = stringsBegin
	
	while (true) {
		if (reader.readInt16() == 0 && reader.readInt8() == 0)
			break
		else
			reader.position -= 1
	}
	
	let vertexGroupCount = reader.readInt16()
	let definedGroupCount = countDefinedGroups(reader, vertexGroupCount)
	
	if (reader.readInt32() != 3) {
		throw new Error("Invalid file, invalid beginning of vertex group")
	}
	
	reader.position -= 4
	
	let groups = Array.from({ length: definedGroupCount }, () => VertexGroup.fromBinaryReader(reader))
	
	let nonSerializableGroup = groups.find(group => group.isSerializable !== true)
	let otherVectors = definedGroupCount == 1 ? Array.from({ length: 3 }, () => readVector3(reader)) : []
	
	if (nonSerializableGroup) {
		console.warn(`Warning: File is not serializable, issue in Vertex Group ${JSON.stringify(nonSerializableGroup.header.groupName)}:`)
		console.warn((nonSerializableGroup.isSerializable as Error).message + "\n")
	}
	
	return new CollisionBinary(groups, otherVectors, stringsBegin == 0x4e && nonSerializableGroup == undefined)
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
