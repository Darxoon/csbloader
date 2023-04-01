import BoyerMoore from "./boyermoore.js";
import { BinaryReader } from "./misc.js";

export function parseCSB(buffer: ArrayBuffer) {
	let stringsBegin = findCollisionString(buffer)
}

function findCollisionString(buffer: ArrayBuffer) {
	let boyerMoore = new BoyerMoore(new TextEncoder().encode('Collision'))
	let result = boyerMoore.findIndex(buffer)
	return result
}