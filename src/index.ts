#!/usr/bin/env node

import { readFile, writeFile } from "fs/promises";
import { exit } from "process";
import { parseCSB } from "./parser.js";
import { serializeWavefrontObj } from "./wavefront.js";

{
	const [, , a, b] = process.argv
	
	if (a == '-h' || a == '--help' || b == '-h' || b == '--help') {
		printHelp()
		exit()
	}
	
	if (a == '-v' || a == '--version' || b == '-v' || b == '--version') {
		console.log('v1.0')
		exit()
	}
	
	const csb = await readFile(a)
	
	let binary = parseCSB(csb.buffer)
	
	let obj = serializeWavefrontObj(binary)
	
	await writeFile(b, obj, { encoding: 'utf8' })
}

function printHelp() {
	console.log(`Usage: csbloader <input> <output>
Load Paper Mario: The Origami King's CSB collision files into Wavefront obj files.

<input>: The input collision mesh (*.csb)
<output>: The output mesh to be loaded into other applications like blender (*.obj)

Options:
  -h, --help     Display this menu.
  -v, --version  Display the version number.`)
}
