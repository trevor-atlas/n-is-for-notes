import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'path';
import * as fastGlob from 'fast-glob';
import { search as searchInFile } from 'search-in-file';
import { search } from '@inquirer/prompts';
import * as fuzzySearch from 'fuzzy';
import colors from 'picocolors';
import { marked } from 'marked';
import { existsSync } from 'fs';

const N_CONFIG = {
  notesDir: process.env.N_NOTES_DIR || join(process.env.HOME || '', 'notes'),
  editor: process.env.EDITOR || 'nvim',
  noteExt: 'md',
}

// Function to highlight content with syntax highlighting
async function highlightMarkdown(content: string, lineNumber?: number): Promise<string> {
  const lines = content.split('\n');

  if (lineNumber !== undefined) {
    // Highlight the specific line
    const highlightedLines = lines.map((line, index) => {
      if (index + 1 === lineNumber) {
        return colors.bgYellow(colors.black(line));
      }
      return line;
    });
    return highlightedLines.join('\n');
  }

  return content;
}

// Function to preview file content
async function previewFile(filePath: string, lineNumber?: number): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return highlightMarkdown(content, lineNumber);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error reading file: ${errorMessage}`;
  }
}

/**
 * Create a new note and open it in the editor
 * @param noteName Optional name for the note
 */
export async function createNote(...args: string[]): Promise<void> {
  const noteName = args.join(' ');
  const noteDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const noteExt = N_CONFIG.noteExt;

  const fileName = noteName
    ? `${noteName}.${noteExt}`
    : `${noteDate}.${noteExt}`;

  // Ensure notes directory exists
  await mkdir(N_CONFIG.notesDir, { recursive: true });

  // Open the file in the default editor
  const editorCommand = N_CONFIG.editor;
  const filePath = join(N_CONFIG.notesDir, fileName);

  console.log(`Creating/opening note: ${filePath}`);

  // Use Bun's spawn to run the editor
  const proc = Bun.spawn([editorCommand, filePath], {
    stdio: ['inherit', 'inherit', 'inherit']
  });

  await proc.exited;
}

interface SearchResult {
  filePath: string;
  line: number;
  match: string;
  fullText?: string;
}

interface SearchInFileResult {
  [key: string]: Array<{
    line: number;
    text: string;
  }>;
}

/**
 * Search note contents using search-in-file and inquirer
 * @param searchTerms Search terms to look for in notes
 */
export async function searchNoteContents(...args: string[]): Promise<void> {
  const initialQuery = args.join(' ');

  async function searchInFiles(query: string): Promise<string[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    try {
      const allFiles = await readdir(N_CONFIG.notesDir, { recursive: true, withFileTypes: true });
      const files = allFiles.filter((file) => !file.parentPath.includes('node_modules') && file.isFile() && file.name.endsWith(N_CONFIG.noteExt));
      const results: string[] = [];

      for (const file of files) {
        const fcontent = await Bun.file(join(file.parentPath, file.name)).text();
        const hasMatch = await searchInFile(query, fcontent, {
          ignoreCase: true,
        });
        if (hasMatch) {
          results.push(
             join(file.parentPath, file.name),
          );
        }
      }

      return results;
    } catch (error: unknown) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  // Function for displaying search results and handling selection
  async function handleSearch() {
    let searchResults: SearchResult[] = [];
    let currentQuery = initialQuery;

    if (currentQuery) {
      searchResults = await searchInFiles(currentQuery);
    }

    const { searchChoice } = await autocomplete([
      {
        type: 'autocomplete',
        name: 'searchChoice',
        message: 'Search in notes:',
        source: async (answers: any, input: string = currentQuery) => {
          currentQuery = input || '';
          if (!input) return [];

          searchResults = await searchInFiles(input);

          return searchResults.map((result, index) => ({
            name: `${colors.cyan(basename(result.filePath))}:${colors.yellow(result.line.toString())} ${result.match.trim()}`,
            value: index
          }));
        },
        pageSize: 10
      }
    ]);

    // Open the selected file at the specified line
    if (searchChoice !== undefined && searchResults[searchChoice]) {
      const selectedResult = searchResults[searchChoice];

      const editorCommand = N_CONFIG.editor;
      const proc = Bun.spawn([editorCommand, selectedResult.filePath, `+${selectedResult.line}`], {
        stdio: ['inherit', 'inherit', 'inherit']
      });

      await proc.exited;
    }
  }

  await handleSearch();
}

interface FileOption {
  name: string;
  value: string;
  short: string;
}

/**
 * Search note filenames using glob and inquirer
 */
export async function searchNoteFiles(): Promise<void> {
  // Get all markdown files in the notes directory
  const files = await fastGlob.glob(`**/*.${N_CONFIG.noteExt}`, {
    cwd: N_CONFIG.notesDir,
    absolute: true
  });

  // Helper function for fuzzy search
  const fuzzyFilter = (input: string = '') => {
    return new Promise<FileOption[]>((resolve) => {
      const fileOptions: FileOption[] = files.map(file => ({
        name: basename(file),
        value: file,
        short: basename(file)
      }));

      if (!input) {
        resolve(fileOptions);
        return;
      }

      const fuzzyResult = fuzzySearch.filter(input, fileOptions, {
        extract: (item: FileOption) => item.name
      });

      resolve(fuzzyResult.map(result => result.original));
    });
  };

  try {
    const { selectedFile } = await search([
      {
        type: 'autocomplete',
        name: 'selectedFile',
        message: 'Select a note:',
        source: (answers: any, input: string) => fuzzyFilter(input),
        pageSize: 10,
        async suggestOnly(answers: any, input: string) {
          return false;
        },
      }
    ]);

    if (selectedFile) {
      // Preview the content of the selected file
      console.log(colors.dim('File preview:'));

      if (existsSync(selectedFile)) {
        const preview = await previewFile(selectedFile);
        console.log(preview.substring(0, 300) + (preview.length > 300 ? '...' : ''));
      }

      // Open the selected file in the editor
      const editorCommand = N_CONFIG.editor;
      const proc = Bun.spawn([editorCommand, selectedFile], {
        stdio: ['inherit', 'inherit', 'inherit']
      });

      await proc.exited;
    }
  } catch (error: unknown) {
    console.error('Error selecting file:', error);
  }
}
