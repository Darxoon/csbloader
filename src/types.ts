import { Vector3 } from "./misc.js";

export class Tri {
	indices: Int32Array
	normal: Vector3
	
	constructor(indices: Int32Array, normal: Vector3) {
		this.indices = indices;
		this.normal = normal;
	}
}

export class VertexGroup {
	vertices: Vector3[]
	faces: Tri[]
	
	constructor(vertices: Vector3[], faces: Tri[]) {
		this.vertices = vertices;
		this.faces = faces;
	}
}