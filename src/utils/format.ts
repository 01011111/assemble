import { Team } from './types'

export function formatTeams (raw: Team[]): { [key: string]: Team } {
  const teams: { [key: string]: Team } = {}

  for (const team of raw) {
    teams[team.slug] = {
      ...team
    }
  }

  return teams
}

export function formatTeamName (name: string): string {
  return name.toLocaleLowerCase().replace(/\s+/g, '-')
}
