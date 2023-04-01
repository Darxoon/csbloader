import { BinaryReader, Vector3 } from "./misc.js";

export class VertexGroupHeader {
	field_0x0: number
	groupIndex: number
	field_0x8: number
	field_0xc: number
	field_0x10: number
	field_0x14: number
	id: string
	field_0x58: number
	field_0x5c: number
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
		
		header.id = id
		reader.position += 64
		
		header.field_0x58 = reader.readInt32()
		header.field_0x5c = reader.readInt32()
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
	vertices: Vector3[]
	faces: Tri[]
	
	constructor(header: VertexGroupHeader, vertices: Vector3[], faces: Tri[]) {
		this.header = header
		this.vertices = vertices;
		this.faces = faces;
	}
	
	static fromBinaryReader(reader: BinaryReader) {
		let header = VertexGroupHeader.fromBinaryReader(reader)
		let vertices: Vector3[] = []
		
		while (true) {
			let pos = reader.position
			let x = reader.readInt16()
			let y = reader.readInt16()
			let z = reader.readInt16()
			
			reader.seek(pos)
			
			// if the three 4-byte sequences make sense as integers and as indices into the vertex array,
			// then this is already a tri and we should revert back to its beginning to parse it as a Tri
			// otherwise, this is a Vector3 and we should revert back and iterpret the values as floats
			// if x == 3, then we are already at the next group header, since they always start with 0x3
			let numbersAreIndices = x in vertices && y in vertices && z in vertices
			let numbersAreAllZero = x == 0 && y == 0 && z == 0
			
			if (numbersAreIndices && !numbersAreAllZero || x == 3) {
				break
			}
			
			x = reader.readFloat32()
			y = reader.readFloat32()
			z = reader.readFloat32()
			
			vertices.push(new Vector3(x, y, z))
		}
		
		let faces = Array.from({ length: header.triAmount }, () => Tri.fromBinaryReader(reader))
		
		return new VertexGroup(header, vertices, faces)
	}
}

export class CollisionBinary {
	vertexGroups: VertexGroup[]
	
	constructor(vertexGroups: VertexGroup[]) {
		this.vertexGroups = vertexGroups;
	}
}
