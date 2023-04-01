import { readFile } from "fs/promises";
import { parseCSB } from "./parser.js";

{
	const csb = await readFile('res/Mobj_BlockSave.csb')
	
	parseCSB(csb.buffer)
}
