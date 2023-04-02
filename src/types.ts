import { BinaryReader, Vector3 } from "./misc.js";
import { readVector3 } from "./util.js";

export class VertexGroupHeader {
	field_0x0: number
	groupIndex: number
	field_0x8: number
	field_0xc: number
	field_0x10: number
	field_0x14: number
	name: string
	field_0x58: number
	vertexAmount: number
	triAmount: number
	field_0x64: number
	field_0x68: number
	field_0x6c: number
	field_0x70: number
	field_0x74: number
	field_0x78: number
	
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
		
		header.name = id
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
}

export class Tri {
	indices: Int32Array
	normal: Vector3
	
	constructor(indices: Int32Array, normal: Vector3) {
		this.indices = indices;
		this.normal = normal;
	}
	
	static fromBinaryReader(reader: BinaryReader): Tri {
		let indices = new Int32Array(Array.from({ length: 3 }, () => reader.readInt32()))
		let normal = new Vector3(
			reader.readFloat32(),
			reader.readFloat32(),
			reader.readFloat32(),
		)
		
		return new Tri(indices, normal)
	}
}

export class VertexGroup {
	header: VertexGroupHeader
	otherVectors: Vector3[]
	vertices: Vector3[]
	faces: Tri[]
	
	constructor(header: VertexGroupHeader, otherVectors: Vector3[], vertices: Vector3[], faces: Tri[]) {
		this.header = header
		this.otherVectors = otherVectors
		this.vertices = vertices;
		this.faces = faces;
	}
	
	static fromBinaryReader(reader: BinaryReader) {
		let header = VertexGroupHeader.fromBinaryReader(reader)
		
		let otherVectors: Vector3[]
		let vertices: Vector3[]
		
		if (header.vertexAmount == 0) {
			otherVectors = Array.from({ length: 6 }, () => readVector3(reader))
			vertices = []
		} else {
			otherVectors = Array.from({ length: 3 }, () => readVector3(reader))
			vertices = Array.from({ length: header.vertexAmount }, () => readVector3(reader))
		}
		
		let faces = Array.from({ length: header.triAmount }, () => Tri.fromBinaryReader(reader))
		
		return new VertexGroup(header, otherVectors, vertices, faces)
	}
}

export class CollisionBinary {
	vertexGroups: VertexGroup[]
	otherVectors: Vector3[]
	
	constructor(vertexGroups: VertexGroup[], otherVectors: Vector3[]) {
		this.vertexGroups = vertexGroups;
		this.otherVectors = otherVectors
	}
}
