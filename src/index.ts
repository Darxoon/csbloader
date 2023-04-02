import { readFile, writeFile } from "fs/promises";
import { parseCSB } from "./parser.js";
import { serializeWavefrontObj } from "./wavefront.js";

{
	const csb = await readFile('res/Mobj_BlockSave.csb')
	
	let binary = parseCSB(csb.buffer)
	
	let obj = serializeWavefrontObj(binary)
	
	await writeFile("out/mesh.obj", obj, { encoding: 'utf8' })
}
