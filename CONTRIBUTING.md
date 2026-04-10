# Contributing to d5-mermaid

Thank you for your interest in contributing! This project follows outside-in TDD and values clean, well-tested code.

## Getting Started

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`

## Development Workflow

### TDD Approach

This project was built using acceptance-first (outside-in) TDD. We encourage the same approach for contributions:

1. **Write a failing acceptance test** describing the desired behavior from the user's perspective
2. **Write failing unit tests** for the smallest piece of behavior needed
3. **Implement the minimum code** to make the test pass
4. **Refactor** while keeping all tests green
5. **Repeat** until the acceptance test passes

### Project Structure

```
src/
  index.ts                    # Entry point — exports d5Diagrams for Mermaid registration
  d5-domain/                  # Zoom Level 1: Domain view
    detector.ts               # Detects d5-domain diagram text
    db.ts                     # State management for parsed data
    parser.ts                 # Parses d5-domain Mermaid syntax
    renderer.ts               # Renders SVG output
  d5-subdomain/               # Zoom Level 2: Subdomain / Context Map
    ...
  d5-context/                 # Zoom Level 3: Context / Tactical Structure
    ...
  d5-aggregate/               # Zoom Level 4: Aggregate / Domain Objects
    ...
tests/
  acceptance.test.ts          # End-to-end tests through Mermaid API
  d5-domain-integration.test.ts  # Integration tests for Mermaid wiring
  d5-domain-db.test.ts        # Unit tests for domain db
  d5-domain-parser.test.ts    # Unit tests for domain parser
  d5-domain-renderer.test.ts  # Unit tests for domain renderer
  d5-subdomain.test.ts        # Tests for subdomain diagram type
  d5-context.test.ts          # Tests for context diagram type
  d5-aggregate.test.ts        # Tests for aggregate diagram type
  detector.test.ts            # Tests for detector functions
```

### Architecture

Each diagram type follows the same four-module pattern:

- **Detector** — A function that identifies whether text is this diagram type
- **Database (db)** — A class that stores parsed diagram state
- **Parser** — A function that parses Mermaid text syntax into the db
- **Renderer** — A function that generates SVG from the db state

These are wired together in `src/index.ts` as Mermaid `ExternalDiagramDefinition` objects.

## Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Run in watch mode
npm run lint          # Type-check with TypeScript
npm run build         # Build distribution files
```

## Submitting Changes

1. Create a feature branch from `main`
2. Write tests first, then implementation
3. Ensure all tests pass: `npm test`
4. Ensure types check: `npm run lint`
5. Ensure build succeeds: `npm run build`
6. Submit a pull request with a clear description of the change

## Reporting Issues

When reporting bugs, please include:
- The D5 diagram syntax that caused the issue
- Expected vs actual behavior
- Mermaid.js version

## Code Style

- TypeScript with strict mode
- ESM modules
- Vitest for testing with jsdom environment
- Keep parsers simple (regex-based line matching)
- SVG rendering uses `document.createElementNS` with the SVG namespace
