#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { exit } from "process";
import { parseCSB } from "./parser.js";
import { InvalidFileError, parseWavefrontObj, serializeWavefrontObj } from "./wavefront.js";
import { serializeCSB } from "./serializer.js";
import colors from "colors";
import { CollisionBinary } from "./types.js";
import { parseArgs } from "util";

{
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		
		options: {
			version: {
				type: 'boolean',
				short: 'v',
				default: false,
			},
			help: {
				type: 'boolean',
				short: 'h',
				default: false,
			},
		}
	})
	
	if (values.help) {
		printHelp()
		exit()
	}
	
	if (values.version) {
		console.log('v2.0.1')
		exit()
	}
	
	const [method, input, output] = positionals
	
	if (positionals.length != 3 || !['extract', 'build', '_debug'].includes(method)) {
		console.error("Invalid arguments. Use --help to get info on how to use this utility.")
		exit(2)
	}
	
	// input and output are directories
	if (method == '_debug') {
		// check arguments
		let inputStats = await fs.stat(input).catch(e => {
			console.error(`${JSON.stringify(input)} does not exist or is not accessible.`)
			exit(2)
		})
		
		if (inputStats.isDirectory() == false) {
			console.error(`${JSON.stringify(input)} is not a directory. Use --help to get info on how to use this utility.`)
			exit(2)
		}
		
		let outputStats = await fs.stat(output).catch(e => {
			// Output doesn't exist so it is created
			fs.mkdir(output, { recursive: true })
		})
		
		if (outputStats && outputStats.isDirectory() == false) {
			console.error(`${JSON.stringify(output)} exists already and is not a directory. Use --help to get info on how to use this utility.`)
			exit(2)
		}
		
		const files = await fs.readdir(input)
		
		for (const file of files) {
			if (!file.endsWith('.csb'))
				continue
			
			await testCsbFile(file, output)
			
			console.log(colors.blue(`File ${path.basename(file)} completed.`))
		}
		
		exit()
	}
	
	// input is a file and output is a file
	{
		let inputStats = await fs.stat(input).catch(e => {
			console.error(`${JSON.stringify(input)} does not exist or is not accessible.`)
			exit(2)
		})
		
		if (inputStats.isFile() == false) {
			console.error(`${JSON.stringify(input)} is not a file. Use --help to get info on how to use this utility.`)
			exit(2)
		}
		
		let outputStats = await fs.stat(output).catch(e => {
			// output doesn't exist, which is fine
		})
		
		if (outputStats && outputStats.isFile() == false) {
			console.error(`${JSON.stringify(output)} exists already and is not a file. Use --help to get info on how to use this utility.`)
			exit(2)
		}
	}
	
	if (method == 'extract') {
		let csb = await fs.readFile(input)
		let binary = parseCSB(csb.buffer)
		
		let obj = serializeWavefrontObj(binary)
		await fs.writeFile(output, obj, 'utf8')
		
		exit()
	}
	
	if (method == 'build') {
		let textfile = await fs.readFile(input, 'utf8')
		let binary: CollisionBinary
		
		try {
			binary = parseWavefrontObj(textfile)
		}
		catch (e) {
			if (e instanceof InvalidFileError)
				console.error(colors.red(`Unable to parse file ${input}.`))
			
			throw e
		}
		
		let csb = serializeCSB(binary)
		await fs.writeFile(output, new Uint8Array(csb))
		
		exit()
	}
}

async function testCsbFile(filename: string, outDirectory: string) {
	try {
		var original: Buffer | undefined = await fs.readFile('out/in/' + filename)
		var parsed: CollisionBinary | undefined = parseCSB(original.buffer)
		
		var wavefront: string | undefined = serializeWavefrontObj(parsed)
		var fromWavefront: CollisionBinary | undefined = parseWavefrontObj(wavefront)
		
		var serialized: ArrayBuffer | undefined = serializeCSB(parsed)
		var fromWavefrontSerialized: ArrayBuffer | undefined = serializeCSB(fromWavefront)
	} catch (e) {
		console.error("Issue in file " + filename + ".")
		console.error(e)
	}
	
	await fs.mkdir(path.join(outDirectory, filename))
	
	await Promise.all([
		original && fs.writeFile(path.join(outDirectory, filename, '00_original.csb'), original),
		serialized && fs.writeFile(path.join(outDirectory, filename, '01_reserialized.csb'), new Uint8Array(serialized)),
		fromWavefrontSerialized && fs.writeFile(path.join(outDirectory, filename, '02_fromWavefront.csb'), new Uint8Array(fromWavefrontSerialized)),
		wavefront && fs.writeFile(path.join(outDirectory, filename, '03_wavefront.obj'), wavefront, 'utf8'),
		parsed && fs.writeFile(path.join(outDirectory, filename, '04_original.json'), JSON.stringify(parsed, undefined, '\t'), 'utf8'),
		fromWavefront && fs.writeFile(path.join(outDirectory, filename, '05_fromWavefront.json'), JSON.stringify(fromWavefront, undefined, '\t'), 'utf8'),
	])
}

function printHelp() {
	console.log(`Usage: csbloader extract|build <input> <output>
Load Paper Mario: The Origami King's CSB collision files into Wavefront obj files.

extract:
  Extracts a proprietary CSB collision file and outputs it as a .obj file.
  
  <input>: The input collision mesh (*.csb)
  <output>: The output mesh to be loaded into other applications like blender (*.obj)

build:
  Takes an .obj mesh and builds it into a CSB collision file.
  
  <input>: The input 3D mesh (*.obj)
  <output>: The output CSB file to be loaded into Paper Mario: The Origami King (*.csb)

Options:
  -h, --help     Display this menu.
  -v, --version  Display the version number.`)
}
