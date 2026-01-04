---
description: Generate or update the GEMINI.md context file
---
# Generate GEMINI.md

This workflow generates the `GEMINI.md` file which serves as a context file for AI agents.

## Steps

1. **Analyze the Codebase**: Scan the project (`package.json`, config files, source code patterns) to identify the tech stack, directory structure, and established coding patterns.

2. **Generate GEMINI.md**: Create a concise Markdown file in the project root (`GEMINI.md`) with the following sections:

   * **User/Project details**: Brief summary of what the project does.
   * **Tech Stack**: Core frameworks, libraries, and tools (including versions).
   * **Project Structure**: A high-level visual tree of key directories and their purposes.
   * **Development Workflow**: Exact shell commands for:
     * Installing dependencies
     * Running the dev server
     * Running tests
     * Building for production
   * **Coding Standards**:
     * Naming conventions
     * Component structure
     * Styling preferences
     * Error handling rules

## Tone
Keep the output strict, concise, and instruction-heavy.
