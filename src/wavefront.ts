import { CollisionBinary, VertexGroup } from "./types.js";
import { enumerate } from "./util.js";

export function serializeWavefrontObj(binary: CollisionBinary): string {
	let totalVertexCount = 0
	let groupVertexOffsets: Map<VertexGroup, number> = new Map()
	
	let output = ""
	
	// serialize all vertices
	for (const group of binary.vertexGroups) {
		groupVertexOffsets.set(group, totalVertexCount)
		
		if (group.vertices.length == 0) {
			if (group.otherVector == undefined)
				throw new Error("No other vector specified for otherwise empty vertex group")
			
			output += `v 0 0 0\nv ${group.otherVector.x * 10e40} ${group.otherVector.y * 10e40} ${group.otherVector.z * 10e40}\n`
			totalVertexCount += 2
		}
		
		for (const vertex of group.vertices) {
			output += `v ${vertex.x} ${vertex.y} ${vertex.z}\n`
		}
		
		totalVertexCount += group.vertices.length
	}
	
	output += "\n"
	
	// serialize faces
	for (const [group, i] of enumerate(binary.vertexGroups)) {
		const offset = groupVertexOffsets.get(group)! + 1
		const name = group.header.name == "DEADBEEF" && binary.isSerializable ? "[mobj]_DEADBEEF" : group.header.name
		output += `o ${i.toString().padStart(2, '0')}_${name}\n`
		
		if (group.faces.length == 0) {
			output += `l ${offset} ${offset + 1}\n\n`
			continue
		}
		
		for (const face of group.faces) {
			const [a, b, c] = face.indices
			
			output += `f ${a + offset} ${b + offset} ${c + offset}\n`
		}
		
		output += "\n"
	}
	
	return output
}
