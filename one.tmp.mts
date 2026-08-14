import { callTool } from './tools/art/mcp.mts';
console.log(await callTool('get_topdown_tileset', { tileset_id: process.argv[2] }));
