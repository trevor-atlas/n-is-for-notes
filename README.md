# n-is-for-notes

A simple note-taking CLI built with Bun and TypeScript.

## Features

- Create markdown notes with `nn` (new note)
- Search notes content with `ns` (note search)
- Search note filenames with `nl` (note list)

## Prerequisites

- [Bun](https://bun.sh/) for running the scripts

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/n-is-for-notes.git
cd n-is-for-notes

# Install dependencies
bun install

# Optional: Make the CLI globally accessible
bun link
```

## Usage

### Create a new note

```bash
# Create a note with the current date as filename
bun nn

# Create a note with a specific name
bun nn meeting-notes
```

### Search note contents

```bash
# Search all notes for a specific term
bun ns typescript

# Open the interactive search interface without an initial search term
bun ns
```

### Search note filenames

```bash
# Browse through all note filenames
bun nl
```

## Environment Variables

- `N_NOTES_DIR`: Directory where notes are stored (defaults to `$HOME/notes`)
- `EDITOR`: Editor to use for opening files (defaults to `nvim`)

## License

MIT
