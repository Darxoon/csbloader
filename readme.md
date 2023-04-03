# CSB Loader

Turns Paper Mario: The Origami King's CSB file collision meshes into Wavefront obj files to visualize them.

## Usage

To use this, you need a full dump of Paper Mario: The Origami King's RomFS, as well as a tool to decompress the ZSTD files (recommended is [Origami Wand](https://darxoon.neocities.org/OrigamiWand)). To decompress the files in Origami Wand, navigate to the menu bar and click `Zstd` > `Decompress File`. Select the files you want to load with CSB Loader to decompress them.

With these files, use csbloader like this, to obtain the obj files:

```csbloader <path to CSB file> <path to output file>```

These files can be treated like usual model files, e.g., be opened in Blender.

## Installation

Make sure you have the latest node.js LTS Version, NPM and TypeScript installed.

Open the Command Prompt, Git Bash or a Shell in a convenient location (not PowerShell), clone the repository with ```git clone https://github.com/Darxoon/csbloader``` and enter the new directory.

Type ```npm install && tsc && npm link``` to build the program and have access to the csbloader command at all times in any location in the command line.

## Contact

For any discussions or help regarding modding Paper Mario: The Origami King or this program, join the Paper Mario: The Origami King Refolded server (<https://discord.gg/y7qfTKyhZy>) or the Paper Mario Modding server (<https://discord.gg/Pj4u7wB>).
