export type ConfigTeams = string | { [key: string]: string[] | any }[]

export interface CreateTeamInput {
  org: string
  name: string
  privacy: 'closed' | 'secret'
  parent_team_id?: number
}

export interface Organization {
  login: string
  id: number
}

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
