// Re-export all types
export * from './reddit'
export * from './media'

// Common utility types
export type Nullable<T> = T | null | undefined

export interface ApiResponse<T> {
  data: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  after: string | null
  before: string | null
}
