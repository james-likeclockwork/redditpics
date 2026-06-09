// Allows importing single-file components from .ts files (e.g. test files).
// vue-tsc supplies precise types for .vue → .vue imports; this is the fallback.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}
