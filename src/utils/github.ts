
import { Team, Repo, Permission } from './types'

export async function getOrgTeams (octokit: any, org: string): Promise<Team[]> {
  const { data, status } = await octokit.rest.teams.list({
    org,
    per_page: 100
  })

  if (status !== 200) {
    throw Error(`Failed to get org teams: ${status}\n${data}`)
  }

  return data
}

export async function getOrgRepos (octokit: any, org: string): Promise<Repo[]> {
  const { data, status } = await octokit.rest.repos.listForOrg({
    org,
    per_page: 100
  })

  if (status !== 200) {
    throw Error(`Failed to get org repos: ${status}\n${data}`)
  }

  return data
}

export async function createTeam (octokit: any, org: string, name: string, parentId: number | null): Promise<Team> {
  const { data, status } = await octokit.rest.teams.create({
    org,
    name,
    privacy: 'closed',
    parent_team_id: parentId
  })

  if (status !== 201) {
    throw Error(`Failed to create team ${name}: ${status}\n${data}`)
  }

  return data
}

export async function updateTeamAccess (octokit: any, teamSlug: string, org: string, repo: string, permission: Permission): Promise<void> {
  const { data, status } = await octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
    team_slug: teamSlug,
    org,
    owner: org,
    repo,
    permission
  })

  if (status !== 204) {
    throw Error(`Failed to add repo ${repo} to team ${teamSlug}: ${status}\n${data}`)
  }
}
