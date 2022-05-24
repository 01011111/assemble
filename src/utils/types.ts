export interface Team {
  slug: string
  name: string
  id: number
}

export interface Repo {
  name: string
  id: number
}

export type Permission = 'pull' | 'push' | 'admin' | 'triage' | 'maintain'

export interface TeamAccess {
  team: string
  permission: Permission
}
