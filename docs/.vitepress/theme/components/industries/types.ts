export interface HabitData {
  id: string
  name: string
  description: string
  trigger: 'scheduler' | 'webhook' | 'email' | 'manual'
  bits: string[]
  featured?: boolean
  overview?: string
  flow?: string[]
  components?: string[]
  integrations?: string[]
  stackFile?: string
  stackFolder?: string
}

export interface DepartmentNotice {
  title: string
  text: string
}

export interface DepartmentData {
  id: string
  name: string
  icon: string
  description: string
  habits: HabitData[]
  notice?: DepartmentNotice
  showcaseSlug?: string
}

export interface IndustryData {
  id: string
  name: string
  icon: string
  description: string
  tagline: string
  color: string
  departments: DepartmentData[]
}

export interface DepartmentSummary {
  id: string
  name: string
  description: string
  showcaseSlug: string
}

export interface IndustrySummary {
  id: string
  name: string
  icon: string
  tagline: string
  totalHabits: number
  departmentList: DepartmentSummary[]
}

export interface IndustriesManifest {
  industries: IndustrySummary[]
}
