---
description: Inspect project for code style guideline violations and document files to refactor
---

# Refactor Workflow

This workflow inspects the project codebase for alignment with the defined code style guidelines and documents any violations in a `to_refactor.md` file.

## Phase 1: Inspection

### Step 1.1: Review Code Style Guidelines
Before starting, familiarize yourself with the code style guidelines defined in the user's global memory (MEMORY[user_global]). The key areas to check are:

**Architecture Principles:**
- Separation of Concerns (Interface vs Domain/Business Logic)
- Modularity (high cohesion, low coupling)
- Single Responsibility

**Backend Guidelines:**
- Layered Architecture (Interface-Service Pattern)
  - Interface Layer: Only request handling, validation, auth, response formatting. **NO business logic.**
  - Domain Layer: Business rules, algorithms, data transformations. **Transport-agnostic.**
- Resource Lifecycle Management (Singleton, Connection Pooling, DI for expensive resources)
- Data Contracts & Typing (DTOs, strict typing)

**Frontend Guidelines:**
- Separation of View and Logic
  - View Layer: UI rendering only, "dumb" components
  - Logic Layer: State management, API integrations, side effects in dedicated modules
- Component Atomicity (generic, reusable, not coupled to business domain)
- Contract Synchronization (frontend interfaces mirror backend DTOs)

**General Coding Standards:**
- Configuration Management (secrets/env vars separate from code)
- Error Handling (standardized wrapper)
- Documentation (self-documenting code, public interface docs)

---

### Step 1.2: Identify Project Structure
// turbo
1. List the project's directory structure to understand the codebase layout.
2. Identify:
   - Backend files (API endpoints, services, models)
   - Frontend files (components, hooks, utils)
   - Configuration files

---

### Step 1.3: Inspect Backend Files
For each backend file, check for violations:

1. **Interface Layer files** (e.g., `endpoints.py`, `routes.ts`, `controllers/`):
   - [ ] Contains only request handling, validation, auth, response formatting?
   - [ ] Does NOT contain business logic or complex data processing?
   - [ ] Uses DTOs for inputs/outputs?

2. **Domain Layer files** (e.g., `services/`, `engine.py`):
   - [ ] Contains business rules and algorithms?
   - [ ] Is transport-agnostic (no HTTP-specific code)?
   - [ ] Raises domain exceptions instead of transport exceptions (e.g., HTTPException)?

3. **Resource Management**:
   - [ ] Expensive resources (DB, AI models) initialized at startup, not per-request?
   - [ ] Uses appropriate patterns (Singleton, DI, Connection Pooling)?

---

### Step 1.4: Inspect Frontend Files
For each frontend file, check for violations:

1. **View Layer files** (e.g., `*.tsx` components):
   - [ ] Focused on UI rendering and layout?
   - [ ] Contains minimal logic (calls hooks/utils for complex logic)?
   - [ ] Is the component "dumb" (presentational)?

2. **Logic Layer files** (e.g., `hooks/`, `services/`, `utils/`):
   - [ ] State management and side effects isolated here?
   - [ ] API integrations handled in dedicated modules?

3. **Component Atomicity**:
   - [ ] Generic components are reusable and not coupled to specific business domains?

4. **Contract Synchronization**:
   - [ ] Frontend types/interfaces mirror backend DTOs?

---

### Step 1.5: Check General Standards
1. **Configuration**: Secrets and environment variables stored separately from code?
2. **Error Handling**: Consistent error handling patterns used?
3. **Documentation**: Functions/classes have appropriate documentation?

---

## Phase 2: Documentation

### Step 2.1: Create `to_refactor.md`
Create a `to_refactor.md` file in the project root with the following structure:

```markdown
# Files to Refactor

> Generated on: [DATE]

## Summary
[Brief overview of the inspection results]

## Violations by Category

### Architecture Violations
| File | Violation | Recommendation |
|------|-----------|----------------|
| [file path] | [description] | [how to fix] |

### Backend Violations
| File | Violation | Recommendation |
|------|-----------|----------------|
| [file path] | [description] | [how to fix] |

### Frontend Violations
| File | Violation | Recommendation |
|------|-----------|----------------|
| [file path] | [description] | [how to fix] |

### General Coding Standard Violations
| File | Violation | Recommendation |
|------|-----------|----------------|
| [file path] | [description] | [how to fix] |

## Priority Order
1. [High priority items]
2. [Medium priority items]
3. [Low priority items]

## Next Steps
[Recommended order of refactoring]
```

---

### Step 2.2: Report Findings
After creating `to_refactor.md`, notify the user with:
- A summary of violations found
- The path to the `to_refactor.md` file
- Ask if they want to proceed with implementing refactoring recommendations

---

## Phase 3: Implementation (Optional)

If the user approves, proceed with implementing the refactoring recommendations in priority order:

1. Pick the highest priority item from `to_refactor.md`
2. Create an implementation plan for that specific refactor
3. Implement the changes
4. Verify the changes
5. Update `to_refactor.md` to mark the item as completed
6. Repeat for remaining items
