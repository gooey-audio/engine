# OpenCode Configuration

## Build/Test Commands
- **Rust (lib/)**: `cargo build`, `cargo test`, `cargo test <test_name>` for single test
- **WASM Build**: `cd lib && wasm-pack build --target web --out-dir ../debug-ui/public/wasm -- --features web`
- **Debug UI**: `cd debug-ui && npm run dev`, `npm run build`, `npm run lint`
- **Combined**: `cd debug-ui && npm run wasm:dev` (builds WASM + starts dev server)

## Code Style Guidelines

### Rust
- Use `snake_case` for functions, variables, modules; `PascalCase` for structs/enums
- Organize modules: `instruments/`, `effects/`, `gen/`, `filters/`, `platform/`
- Error handling: Use `anyhow::Result` for fallible operations
- Config structs: Use `clamp()` for parameter validation, provide `new()` constructors
- WASM bindings: Prefix with `Wasm`, use `#[wasm_bindgen]` attribute
- Imports: Group std, external crates, then local modules with `use crate::`

### TypeScript/React
- Use `camelCase` for variables/functions, `PascalCase` for components
- Strict TypeScript: Enable all strict options, use explicit types
- React: Functional components with hooks, use `useRef` for WASM instances
- Props: Define interfaces for component props with descriptive names
- State: Use descriptive state variable names like `isLoading`, `activeTab`
- Imports: External libraries first, then relative imports with `./` or `../`