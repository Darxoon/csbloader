import { BinaryReader, BinaryWriter, Vector3 } from "./misc.js";
import { readVector3 } from "./util.js";

/**
 * Matches strings like this:
 * 00_[mobj]_DEADBEEF
 * 01_Sync_1_Col [1020:80:5:1]
 * 58_Yeah [:21::1]
 * 
 * ...where the match array will look like this: [
 *     entire match,
 *     group index,
 *     group name excluding "[mobj]_",
 *     group metadata, e.g. "1020:80:5:1", ":21::1" or undefined
 * ]
 */
const VGHEADER_REGEX = /^(\d{2})_(?:\[mobj\]_)?([^ \[\]]+)(?: \[((?:-?[0-9A-F]*:)*-?[0-9A-F]*)\])?$/

export class VertexGroupHeader {
	field_0x0: number
	groupIndex: number
	field_0x8: number
	field_0xc: number
	field_0x10: number
	field_0x14: number
	groupName: string
	field_0x58: number
	vertexAmount: number
	triAmount: number
	field_0x64: number
	field_0x68: number
	field_0x6c: number
	field_0x70: number
	field_0x74: number
	field_0x78: number
	
	toBinaryWriter(writer: BinaryWriter) {
		writer.writeInt32(this.field_0x0)
		writer.writeInt32(this.groupIndex)
		writer.writeInt32(this.field_0x8)
		writer.writeInt32(this.field_0xc)
		writer.writeInt32(this.field_0x10)
		writer.writeInt32(this.field_0x14)
		
		let beforeSize = writer.size
		writer.writeString(this.groupName)
		
		let stringSize = writer.size - beforeSize
		writer.writeArrayBuffer(new Uint8Array(64 - stringSize).buffer)
		
		writer.writeInt32(this.field_0x58)
		writer.writeInt32(this.vertexAmount)
		writer.writeInt32(this.triAmount)
		writer.writeInt32(this.field_0x64)
		writer.writeInt32(this.field_0x68)
		writer.writeInt32(this.field_0x6c)
		writer.writeInt32(this.field_0x70)
		writer.writeInt32(this.field_0x74)
		writer.writeInt32(this.field_0x78)
	}
	
	toString(nameOverwrite?: string) {
		let indexStr = String(this.groupIndex).padStart(2, '0')
		
		if (indexStr.length > 2)
			throw new Error(`Too many vertex groups, group ${this.groupIndex} exceeds index 99.`)
		
		const metadataValues = [this.field_0x8, this.field_0xc, this.field_0x10, this.field_0x70, this.field_0x74, this.field_0x78]
		const hasNonZeroValue = metadataValues.find(x => x != 0) != undefined
		
		if (hasNonZeroValue) {
			const metadataStr = metadataValues.map(number => number != 0 ? number.toString(16) : "").join(':').toUpperCase()
			
			return `${indexStr}_${nameOverwrite ?? this.groupName} [${metadataStr}]`
		} else {
			return `${indexStr}_${nameOverwrite ?? this.groupName}`
		}
	}
	
	static fromBinaryReader(reader: BinaryReader): VertexGroupHeader {
		let header = new VertexGroupHeader()
		
		header.field_0x0  = reader.readInt32()
		header.groupIndex = reader.readInt32()
		header.field_0x8  = reader.readInt32()
		header.field_0xc  = reader.readInt32()
		header.field_0x10 = reader.readInt32()
		header.field_0x14 = reader.readInt32()
		
		let idBuffer = reader.arrayBuffer.slice(reader.position, reader.position + 64)
		let idWithNulls = new TextDecoder().decode(idBuffer)
		let id = idWithNulls.slice(0, idWithNulls.indexOf('\0'))
		
		header.groupName = id
		reader.position += 64
		
		header.field_0x58 = reader.readInt32()
		header.vertexAmount = reader.readInt32()
		header.triAmount  = reader.readInt32()
		header.field_0x64 = reader.readInt32()
		header.field_0x68 = reader.readInt32()
		header.field_0x6c = reader.readInt32()
		header.field_0x70 = reader.readInt32()
		header.field_0x74 = reader.readInt32()
		header.field_0x78 = reader.readInt32()
		
		return header
	}
	
	/**
	 * Creates a VertexGroupHeader based on a string in this form:
	 * 00_[mobj]_DEADBEEF
	 * 01_Sync_1_Col [1020:80:5:1]
	 * 58_Yeah [:21::1]
	 * 
	 * @param input The input string
	 * @param vertexAmount The amount of vertices in the vertex group; is a required field in the header
	 * @param faceAmount The amount of faces (tris) in the vertex group; is a required field in the header
	 * @returns The created VertexGroupHeader
	 */
	static fromString(input: string, vertexAmount: number, faceAmount: number): VertexGroupHeader | null {
		const match = input.match(VGHEADER_REGEX)
		
		if (match == null)
			return null
		
		const [, indexStr, name, metadataStr] = match
		
		const index = parseInt(indexStr)
		const metadata = metadataStr == undefined ? [0, 0, 0, 0, 0, 0] : metadataStr.split(':').map(str => str == "" ? 0 : parseInt(str, 16))
		
		if (metadata.length != 6) {
			throw new Error(`Invalid metadata in VertexGroupHeader label ${JSON.stringify(input)}`)
		}
		
		let header = new VertexGroupHeader()
		
		header.field_0x0 = 3
		header.groupIndex = index
		header.field_0x8 = metadata[0]
		header.field_0xc = metadata[1]
		header.field_0x10 = metadata[2]
		header.field_0x14 = 0
		header.groupName = name
		header.field_0x58 = index > 0 ? 1 : 0
		header.vertexAmount = vertexAmount
		header.triAmount = faceAmount
		header.field_0x64 = 0
		header.field_0x68 = 0
		header.field_0x6c = 0
		header.field_0x70 = metadata[3]
		header.field_0x74 = metadata[4]
		header.field_0x78 = metadata[5]
		
		return header
	}
}

export class Tri {
	indices: Int32Array
	normal: Vector3
	
	constructor(indices: Int32Array, normal: Vector3) {
		this.indices = indices;
		this.normal = normal;
	}
	
	toBinaryWriter(writer: BinaryWriter) {
		writer.writeArrayBuffer(this.indices.buffer)
		this.normal.toBinaryWriter(writer)
	}
	
	static fromBinaryReader(reader: BinaryReader): Tri {
		let indices = new Int32Array([
			reader.readInt32(),
			reader.readInt32(),
			reader.readInt32(),
		])
		let normal = new Vector3(
			reader.readFloat32(),
			reader.readFloat32(),
			reader.readFloat32(),
		)
		
		return new Tri(indices, normal)
	}
}

export class BoundingBox {
	low: Vector3
	high: Vector3
	
	constructor(low: Vector3, high: Vector3) {
		this.low = low
		this.high = high
	}
	
	equals(other: any) {
		return other instanceof BoundingBox && this.low.equals(other.low) && this.high.equals(other.high)
	}
	
	/**
	 * Verifies if a bounding box contains the correct coordinates.
	 * @param vertices All vertices included in the bounding box
	 * @returns Returns true if the bounds are correct, otherwise returns the correct bounding box
	 */
	verifyCorrectBounds(vertices: Vector3[]): true | BoundingBox {
		if (vertices.length == 0)
			return true
		
		let verifiedBoundingBox = BoundingBox.fromVertices(vertices)!
		
		return this.equals(verifiedBoundingBox) || verifiedBoundingBox
	}
	
	toString() {
		return `BoundingBox(${this.low} -> ${this.high})`
	}
	
	toBinaryWriter(writer: BinaryWriter) {
		this.low.toBinaryWriter(writer)
		this.high.toBinaryWriter(writer)
	}
	
	static fromBinaryReader(reader: BinaryReader) {
		return new BoundingBox(
			Vector3.fromBinaryReader(reader),
			Vector3.fromBinaryReader(reader),
		)
	}
	
	static fromVertices(vertices: Vector3[]): BoundingBox | undefined {
		if (vertices.length == 0)
			return undefined
		
		// because vector3s are immutable, this is the only way to prevent a lot of allocations
		let smallestCoordinatesX = vertices[0].x
		let smallestCoordinatesY = vertices[0].y
		let smallestCoordinatesZ = vertices[0].z
		let biggestCoordinatesX = vertices[0].x
		let biggestCoordinatesY = vertices[0].y
		let biggestCoordinatesZ = vertices[0].z
		
		for (const vertex of vertices) {
			if (vertex.x < smallestCoordinatesX)
				smallestCoordinatesX = vertex.x
			if (vertex.y < smallestCoordinatesY)
				smallestCoordinatesY = vertex.y
			if (vertex.z < smallestCoordinatesZ)
				smallestCoordinatesZ = vertex.z
			
			if (vertex.x > biggestCoordinatesX)
				biggestCoordinatesX = vertex.x
			if (vertex.y > biggestCoordinatesY)
				biggestCoordinatesY = vertex.y
			if (vertex.z > biggestCoordinatesZ)
				biggestCoordinatesZ = vertex.z
		}
		
		let smallestCoordinates = new Vector3(smallestCoordinatesX, smallestCoordinatesY, smallestCoordinatesZ)
		let biggestCoordinates = new Vector3(biggestCoordinatesX, biggestCoordinatesY, biggestCoordinatesZ)
		
		return new BoundingBox(smallestCoordinates, biggestCoordinates)
	}
}

export class VertexGroup {
	/**
	 * true if it is serializable, otherwise an Error or false explaining why not
	 */
	isSerializable: boolean | Error
	header: VertexGroupHeader
	boundingBox: BoundingBox
	vertices: Vector3[]
	faces: Tri[]
	otherVector?: Vector3
	
	constructor(isSerializable: boolean | Error, header: VertexGroupHeader, boundingBox: BoundingBox, 
		vertices: Vector3[], faces: Tri[], otherVector: Vector3 | undefined) {
		
		this.isSerializable = isSerializable
		this.header = header
		this.boundingBox = boundingBox
		this.vertices = vertices;
		this.faces = faces;
		this.otherVector = otherVector
	}
	
	toBinaryWriter(writer: BinaryWriter) {
		this.header.toBinaryWriter(writer)
		
		if (this.vertices.length == 0) {
			if (this.otherVector == undefined)
				throw new Error("otherVector must be defined on otherwise empty vertex groups")
			
			Vector3.ZERO.toBinaryWriter(writer)
			Vector3.ZERO.toBinaryWriter(writer)
			Vector3.ZERO.toBinaryWriter(writer)
			
			this.otherVector.toBinaryWriter(writer)
			this.boundingBox.toBinaryWriter(writer)
			
			return
		}
		
		Vector3.ZERO.toBinaryWriter(writer)
		this.boundingBox.toBinaryWriter(writer)
		
		for (const vertex of this.vertices) {
			vertex.toBinaryWriter(writer)
		}
		
		for (const face of this.faces) {
			face.toBinaryWriter(writer)
		}
	}
	
	static fromBinaryReader(reader: BinaryReader) {
		let header = VertexGroupHeader.fromBinaryReader(reader)
		
		let otherVector: Vector3 | undefined = undefined
		let boundingBox: BoundingBox
		let vertices: Vector3[]
		let serializableError: Error | undefined
		
		if (header.vertexAmount == 0) {
			for (let i = 0; i < 3; i++) {
				if (!readVector3(reader).equals(Vector3.ZERO))
					serializableError = new Error(`Vertex group does not start with three (0, 0, 0) vectors.`)
			}
			
			otherVector = readVector3(reader)
			boundingBox = BoundingBox.fromBinaryReader(reader)
			vertices = []
		} else {
			if (!readVector3(reader).equals(Vector3.ZERO))
			serializableError = new Error(`Vertex group's origin is not zero.`)
			
			boundingBox = BoundingBox.fromBinaryReader(reader)
			vertices = Array.from({ length: header.vertexAmount }, () => readVector3(reader))
		}
		
		let verifiedBoundingBox = boundingBox.verifyCorrectBounds(vertices)
		
		if (verifiedBoundingBox !== true)
			serializableError = new Error(`Invalid bounding box: should be ${verifiedBoundingBox} when it actually is ${boundingBox}.`)
		
		let faces = Array.from({ length: header.triAmount }, () => Tri.fromBinaryReader(reader))
		
		return new VertexGroup(serializableError ?? true, header, boundingBox, vertices, faces, otherVector)
	}
}

export class CollisionBinary {
	vertexGroups: VertexGroup[]
	otherVectors: Vector3[]
	isSerializable: boolean
	
	constructor(vertexGroups: VertexGroup[], otherVectors: Vector3[], isSerializable: boolean) {
		this.vertexGroups = vertexGroups;
		this.otherVectors = otherVectors
		this.isSerializable = isSerializable
	}
}
