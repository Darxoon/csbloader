import { Vector3 } from "./misc.js";
import { BoundingBox, CollisionBinary, Tri, VertexGroup, VertexGroupHeader } from "./types.js";
import { enumerate } from "./util.js";

const DEADBEEF_MOBJ_NAME = "[mobj]_DEADBEEF"

export class WavefrontError extends Error {
	constructor(message = "", options?: ErrorOptions) {
		super(message, options)
	}
}

export function parseWavefrontObj(file: string): CollisionBinary {
	const lines = file.split('\n').map(line => line.trim())
	
	// get all vertices
	const fileVertices: Vector3[] = []
	
	for (const [line, i] of enumerate(lines)) {
		if (!line.startsWith('v '))
			continue
		
		const [, x, y, z] = line.split(' ')
		
		const vertex = new Vector3(
			parseFloat(x),
			parseFloat(y),
			parseFloat(z),
		)
		
		if (isNaN(vertex.x) || isNaN(vertex.y) || isNaN(vertex.z))
			throw new WavefrontError(`Invalid vec3 in line ${i + 1}: ${line}`)
		
		fileVertices.push(vertex)
	}
	
	interface WavefrontObject {
		index: number
		name: string
		isMobjDeadbeef: boolean
		faces: Vector3[][]
		otherVector?: Vector3
	}
	
	// get all Wavefront objects
	const objects: WavefrontObject[] = []
	
	let currentObject: string | undefined = undefined
	let currentObjectFaces: Vector3[][] = []
	let currentObjectOtherVector: Vector3 | undefined = undefined
	
	for (const [line, i] of enumerate(lines)) {
		if (line.startsWith('o ')) {
			if (currentObject) {
				let index = parseInt(currentObject.slice(0, 2))
				
				let isMobjDeadbeef = currentObject.slice(3) == DEADBEEF_MOBJ_NAME
				let name = isMobjDeadbeef ? "DEADBEEF" : currentObject.slice(3)
				
				objects.push({
					index,
					name,
					isMobjDeadbeef,
					faces: currentObjectFaces,
					otherVector: currentObjectOtherVector,
				})
			}
			
			currentObject = line.slice(2).trim()
			currentObjectFaces = []
			currentObjectOtherVector = undefined
			
			continue
		}
		
		if (line.startsWith('f ')) {
			const vertexIndices = line.split(' ').slice(1)
			const vertices = vertexIndices.map(str => fileVertices[parseVertexIndex(str, line, i)])
			
			currentObjectFaces.push(vertices)
			
			continue
		}
		
		if (line.startsWith('l ')) {
			if (currentObjectOtherVector)
				throw new WavefrontError(`Attempting to define the DEADBEEF vector twice in line ${i + 1}: ${line}`)
			
			const [a, b] = line.split(' ').slice(1).map(str => parseInt(str))
			
			currentObjectOtherVector = new Vector3(
				fileVertices[b].x - fileVertices[a].x,
				fileVertices[b].y - fileVertices[a].y,
				fileVertices[b].z - fileVertices[a].z,
			)
			
			continue
		}
	}
	
	// construct binary
	let vertexGroups: VertexGroup[] = []
	
	for (const obj of objects) {
		let vertices = [...new Set(obj.faces.flat())]
		let tris = obj.faces.map(faceVerts => {
			let faceIndices = faceVerts.map(vertex => vertices.indexOf(vertex))
			
			// (v1 - v0) cross (v2 - v0), where v0, v1 and v2 are the elements of the face
			let faceNormal = faceVerts[1].subtract(faceVerts[0]).cross(faceVerts[2].subtract(faceVerts[0]))
			
			return new Tri(
				new Int32Array(faceIndices),
				faceNormal,
			)
		})
		
		let header = new VertexGroupHeader()
		header.name = obj.name
		header.groupIndex = obj.index
		header.vertexAmount = vertices.length
		header.triAmount = tris.length
		
		let boundingBox = obj.name === "DEADBEEF"
			? BoundingBox.fromVertices(fileVertices)
			: BoundingBox.fromVertices(vertices)
		
		if (boundingBox == undefined)
			throw new WavefrontError(`Could not compute bounding box for ${obj.name === "DEADBEEF" ? "the file" : obj.name}: No vertices found`)
		
		vertexGroups.push(new VertexGroup(header, obj.otherVector, boundingBox, vertices, tris))
	}
	
	let isSerializable = objects.find(obj => obj.isMobjDeadbeef) != undefined
	
	return new CollisionBinary(vertexGroups, [], isSerializable)
}

function parseVertexIndex(input: string, line: string, lineIndex: number): number {
	const number = parseInt(input.split('/')[0])
	
	if (isNaN(number))
		throw new WavefrontError(`Invalid vertex index ${JSON.stringify(input)} in line ${lineIndex + 1}: ${line}`)
	
	// wavefront obj uses 1-indexing, function converts it to 0-indexing
	return number - 1
}

export function serializeWavefrontObj(binary: CollisionBinary): string {
	let totalVertexCount = 0
	let groupVertexOffsets: Map<VertexGroup, number> = new Map()
	
	let output = ""
	
	// serialize all vertices
	for (const group of binary.vertexGroups) {
		groupVertexOffsets.set(group, totalVertexCount)
		
		if (group.vertices.length == 0) {
			if (group.otherVector == undefined)
				throw new WavefrontError("No other vector specified for otherwise empty vertex group")
			
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
		const name = group.header.name == "DEADBEEF" && binary.isSerializable ? DEADBEEF_MOBJ_NAME : group.header.name
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
