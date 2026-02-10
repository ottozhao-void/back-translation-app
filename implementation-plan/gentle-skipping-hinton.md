# Security and Reliability Fixes Plan

## Context

Based on a comprehensive code review, this plan addresses **critical security and reliability issues** in the Aether Translate application before production deployment. The issues include:

1. **Security vulnerabilities**: Path traversal, SSRF, API key exposure, unsafe JSON parsing
2. **Reliability issues**: Type assertions without validation, biased random algorithm
3. **Code duplication**: API endpoints duplicated between `server.js` and `vite.config.ts`

**Note**: The `useVocabulary.ts` race condition mentioned in the review appears already fixed (uses functional updates).

---

## Issues to Fix

### 1. Unsafe JSON Parsing (Critical)
**Files**: `server.js`, `vite.config.ts`
**Locations**: ~15 locations where `JSON.parse()` is called without try-catch

**Risk**: Server crashes on malformed JSON, potential prototype pollution

**Fix Strategy**: Create a shared validation utility module

### 2. Path Traversal Vulnerability (High)
**Files**: `server.js:540,592`, `vite.config.ts:606`
**Risk**: Attackers could access files outside articles directory

**Fix Strategy**: Add robust filename validation (null bytes, path patterns, length limits)

### 3. SSRF Vulnerability (High)
**File**: `server/llm/executor.ts:87`, `server.js:177`
**Risk**: Attackers who can modify LLM config could access internal network

**Fix Strategy**: Validate and sanitize baseUrl before fetch requests

### 4. API Key Exposure (Medium)
**File**: `server/llm/executor.ts:99-102`
**Risk**: Error messages may contain API keys from external APIs

**Fix Strategy**: Sanitize error messages before returning to client

### 5. Biased Random Shuffle (Low)
**File**: `utils/sentenceLoader.ts:321`
**Risk**: Random selection is not uniformly distributed

**Fix Strategy**: Replace with Fisher-Yates shuffle algorithm

---

## Implementation Plan

### Phase 1: Create Shared Security Utilities

**New File**: `utils/security.ts`

Create centralized validation and sanitization functions:

```typescript
// Safe JSON parsing with validation
export function safeJsonParse<T>(json: string, schema?: Schema): T | null

// Filename validation (blocks null bytes, path traversal, special chars)
export function validateFilename(filename: string): { valid: boolean; error?: string }

// URL validation (blocks private IPs, internal addresses)
export function validateProviderUrl(url: string): { valid: boolean; error?: string }

// Error message sanitization (removes API keys, sensitive data)
export function sanitizeErrorMessage(message: string): string
```

### Phase 2: Fix JSON Parsing

**Files to modify**:
- `server.js` (lines: 55, 289, 416, 628, 660, 685, 717, 733, 198)
- `vite.config.ts` (lines: 58, 116, 179, 247, 283, 320, 410, 445, 482, 532, 597)

**Pattern**:
```typescript
// Before
const data = JSON.parse(content);

// After
const result = safeJsonParse(content);
if (!result) {
  return res.status(400).json({ error: 'Invalid JSON format' });
}
const data = result;
```

### Phase 3: Add Filename Validation

**Files to modify**:
- `server.js` (lines: 540, 562-563, 592-593)
- `vite.config.ts` (lines: 606, 634, 636)

**Pattern**:
```typescript
// Before
const safeFilename = path.basename(filename);

// After
const validation = validateFilename(filename);
if (!validation.valid) {
  return res.status(400).json({ error: validation.error });
}
const safeFilename = path.basename(filename);
```

### Phase 4: Add SSRF Protection

**Files to modify**:
- `server/llm/executor.ts` (lines: 86-96)
- `server.js` (lines: 177-185)

**Pattern**:
```typescript
// Before
const apiUrl = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

// After
const validation = validateProviderUrl(provider.baseUrl);
if (!validation.valid) {
  return { success: false, error: validation.error };
}
const apiUrl = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
```

### Phase 5: Sanitize Error Messages

**File**: `server/llm/executor.ts` (lines: 99-102, 168-172)

**Pattern**:
```typescript
// Before
return {
  success: false,
  error: `API error (${response.status}): ${errorText}`,
};

// After
return {
  success: false,
  error: sanitizeErrorMessage(`API error (${response.status})`),
};
```

### Phase 6: Fix Random Shuffle

**File**: `utils/sentenceLoader.ts` (lines: 320-322)

**Implementation**:
```typescript
// Replace biased sort with Fisher-Yates shuffle
case 'random':
  const shuffled = [...sentences];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const count = filter.count && filter.count < shuffled.length
    ? filter.count
    : shuffled.length;
  return shuffled.slice(0, count);
```

---

## File Summary

| File | Changes |
|------|---------|
| **New**: `utils/security.ts` | Create shared security utilities |
| `utils/sentenceLoader.ts` | Fix random shuffle algorithm |
| `server/llm/executor.ts` | Add SSRF protection, sanitize errors |
| `server.js` | Safe JSON parsing, filename validation (15+ locations) |
| `vite.config.ts` | Safe JSON parsing, filename validation (15+ locations) |

---

## Verification

1. **Test JSON parsing**: Send malformed JSON to all API endpoints
2. **Test path traversal**: Try `../../../etc/passwd`, `file\0 malicious` as filenames
3. **Test SSRF**: Try `http://localhost:8080`, `http://192.168.1.1` as provider URLs
4. **Test random shuffle**: Verify distribution is uniform (run 10,000 times)
5. **Run existing tests**: `npm run build` to verify no regressions

---

## Execution Order

1. Create `utils/security.ts` first (all other fixes depend on it)
2. Fix `sentenceLoader.ts` (independent, simple)
3. Fix `server/llm/executor.ts` (medium complexity)
4. Fix `server.js` (many locations, careful with existing logic)
5. Fix `vite.config.ts` (mirror server.js changes)

---

## Dependencies

None - all fixes are self-contained security improvements
