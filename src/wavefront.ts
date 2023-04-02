import { CollisionBinary, VertexGroup } from "./types.js";

export function serializeWavefrontObj(binary: CollisionBinary): string {
	let totalVertexCount = 0
	let groupVertexOffsets: Map<VertexGroup, number> = new Map()
	
	let output = ""
	
	// serialize all vertices
	for (const group of binary.vertexGroups) {
		groupVertexOffsets.set(group, totalVertexCount)
		
		for (const vertex of group.vertices) {
			output += `v ${vertex.x} ${vertex.y} ${vertex.z}\n`
		}
		
		totalVertexCount += group.vertices.length
	}
	
	output += "\n"
	
	// serialize faces
	for (const group of binary.vertexGroups) {
		if (group.faces.length == 0)
			continue
		
		const offset = groupVertexOffsets.get(group) + 4
		output += `o ${group.header.name}\n`
		
		for (const face of group.faces) {
			const [a, b, c] = face.indices
			
			output += `f ${a + offset} ${b + offset} ${c + offset}\n`
		}
		
		output += "\n"
	}
	
	return output
}