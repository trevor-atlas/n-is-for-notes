#!/usr/bin/env bun
import { readdir } from 'node:fs/promises';
import { createNote, searchNoteContents, searchNoteFiles } from './notes';

const allFiles = await readdir('./', { recursive: true, withFileTypes: true });
const files = allFiles.filter((file) => !file.parentPath.includes('node_modules') && file.isFile() && file.name.endsWith('md'));
console.log(files.map((file) => file.name));

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case 'nn':
      case 'new':
        await createNote(...commandArgs);
        break;

      case 'ns':
      case 'search':
        await searchNoteContents(...commandArgs);
        break;

      case 'nl':
      case 'list':
        await searchNoteFiles();
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`Notes CLI - A simple note-taking tool

Usage:
  bun cli.ts <command> [arguments]

Commands:
  nn, new [name]   Create a new note with optional name
  ns, search [term]   Search note contents
  nl, list         List and search note filenames
  help             Show this help message

Examples:
  bun cli.ts nn meeting-notes    Create a new note named meeting-notes.md
  bun cli.ts ns typescript       Search notes for "typescript"
  bun cli.ts nl                  Search through note filenames
`);
}

main().catch((error: any) => {
  console.error('Unhandled error:', error.message || error);
  process.exit(1);
});
