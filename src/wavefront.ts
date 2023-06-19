import { Vector3 } from "./misc.js";
import { BoundingBox, CollisionBinary, Tri, VertexGroup, VertexGroupHeader } from "./types.js";
import { enumerate } from "./util.js";

const DEADBEEF_MOBJ_NAME = "[mobj]_DEADBEEF"

export class InvalidFileError extends Error {
	constructor(message = "", options?: ErrorOptions) {
		super(message, options)
		this.name = "InvalidFileError"
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
			throw new InvalidFileError(`Invalid vec3 in line ${i + 1}: ${line}`)
		
		fileVertices.push(vertex)
	}
	
	interface WavefrontObject {
		label: string
		isMobjDeadbeef: boolean
		faces: number[][]
		otherVector?: Vector3
	}
	
	// get all Wavefront objects
	const objects: WavefrontObject[] = []
	
	let currentObject: WavefrontObject | undefined
	
	for (const [line, i] of enumerate(lines)) {
		if (line.startsWith('o ')) {
			if (currentObject) {
				objects.push(currentObject)
			}
			
			let label = line.slice(2).trim()
			let isMobjDeadbeef = label == "00_" + DEADBEEF_MOBJ_NAME
			
			currentObject = {
				label: isMobjDeadbeef ? "00_DEADBEEF" : label,
				isMobjDeadbeef,
				faces: [],
			}
			
			continue
		}
		
		if (line.startsWith('f ')) {
			const vertexIndices = line.split(' ').slice(1)
			const vertices = vertexIndices.map(str => parseVertexIndex(str, line, i))
			
			if (currentObject == undefined)
				throw new InvalidFileError(`Geometry data outside of any object in line ${i + 1}: ${line}`)
			
			currentObject.faces.push(vertices)
			
			continue
		}
		
		if (line.startsWith('l ')) {
			if (currentObject == undefined || !currentObject.label.slice(3).startsWith("DEADBEEF") || currentObject.otherVector != undefined)
				throw new InvalidFileError(`\
Found a single floating edge in object ${currentObject?.label}; \
edges cannot be represented in csb files and need to be deleted manually \
(with the exception of the special vector in DEADBEEF). Found in line ${i + 1}: ${line}`)
			
			const [a, b] = line.split(' ').slice(1).map(str => parseInt(str) - 1)
			
			currentObject.otherVector = new Vector3(
				(fileVertices[b].x - fileVertices[a].x) / 10e40,
				(fileVertices[b].y - fileVertices[a].y) / 10e40,
				(fileVertices[b].z - fileVertices[a].z) / 10e40,
			)
			
			continue
		}
	}
	
	if (currentObject)
		objects.push(currentObject)
	
	// construct binary
	let vertexGroups: VertexGroup[] = []
	
	for (const obj of objects) {
		const name = obj.label.slice(3, obj.label.includes(' ') ? obj.label.indexOf(' ') : undefined)
		
		let vertexIndices = [...new Set(obj.faces.flat())].sort((a, b) => a - b)
		let vertices = vertexIndices.map(index => fileVertices[index])
		
		let tris = obj.faces.map(faceVerts => {
			let verts = faceVerts.map(index => fileVertices[index])
			let faceIndices = faceVerts.map(vertex => vertexIndices.indexOf(vertex))
			
			// (v1 - v0) x (v2 - v0), normalized, where v0, v1 and v2 are the elements of the face
			let faceNormal = Vector3.sub(verts[1], verts[0]).cross(Vector3.sub(verts[2], verts[0])).normalized()
			
			return new Tri(
				new Int32Array(faceIndices),
				faceNormal,
			)
		})
		
		let header = VertexGroupHeader.fromString(obj.label, vertexIndices.length, tris.length)
		
		if (header == undefined) {
			throw new InvalidFileError(`Invalid object name ${JSON.stringify(obj.label)}, \
expected a string of this pattern: "01_Name [a:b:c:d]", where 01 could be any two-digit number, \
Name is the name of the vertex group and a, b, c and d are hexadecimal numbers for metadata \
or left empty for the value 0.`)
		}
		
		let boundingBox = name === "DEADBEEF"
			? BoundingBox.fromVertices(fileVertices.slice(2)) // item 1 contains otherVector
			: BoundingBox.fromVertices(vertices)
		
		if (boundingBox == undefined)
			throw new InvalidFileError(`Could not compute bounding box for ${name === "DEADBEEF" ? "the file" : name}: No vertices found`)
		
		vertexGroups.push(new VertexGroup(name != "DEADBEEF", header, boundingBox, vertices, tris, obj.otherVector))
	}
	
	let isSerializable = objects.find(obj => obj.isMobjDeadbeef) != undefined
	
	return new CollisionBinary(vertexGroups, [], isSerializable)
}

function parseVertexIndex(input: string, line: string, lineIndex: number): number {
	const number = parseInt(input.split('/')[0])
	
	if (isNaN(number))
		throw new InvalidFileError(`Invalid vertex index ${JSON.stringify(input)} in line ${lineIndex + 1}: ${line}`)
	
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
				throw new InvalidFileError("No other vector specified for otherwise empty vertex group")
			
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
	for (const group of binary.vertexGroups) {
		const offset = groupVertexOffsets.get(group)! + 1
		const applyCustomDeadbeefName = group.header.groupName == "DEADBEEF" && binary.isSerializable
		
		output += `o ${group.header.toString(applyCustomDeadbeefName ? DEADBEEF_MOBJ_NAME : undefined)}\n`
		
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
