
import { Organization, Team, Repo, Permission, CreateTeamInput } from './types'

export async function getOrgTeams (octokit: any, org: Organization): Promise<Team[]> {
  const { data, status } = await octokit.rest.teams.list({
    org: org.login,
    per_page: 100
  })

  if (status !== 200) {
    throw Error(`Failed to get org teams: ${status}\n${data}`)
  }

  return data
}

export async function getOrgRepos (octokit: any, org: Organization): Promise<Repo[]> {
  const { data, status } = await octokit.rest.repos.listForOrg({
    org: org.login,
    per_page: 100
  })

  if (status !== 200) {
    throw Error(`Failed to get org repos: ${status}\n${data}`)
  }

  return data
}

export async function createTeam (octokit: any, org: Organization, name: string, parentId: number | null): Promise<Team> {
  const opts: CreateTeamInput = {
    org: org.login,
    name,
    privacy: 'closed'
  }

  if (parentId) {
    opts.parent_team_id = parentId
  }

  const { data, status } = await octokit.rest.teams.create(opts)

  if (status !== 201) {
    throw Error(`Failed to create team ${name}: ${status}\n${data}`)
  }

  return data
}

export async function updateTeamAccess (octokit: any, teamSlug: string, org: Organization, repo: string, permission: Permission): Promise<void> {
  const { data, status } = await octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
    team_slug: teamSlug,
    org: org.login,
    owner: org.login,
    repo,
    permission
  })

  if (status !== 204) {
    throw Error(`Failed to add repo ${repo} to team ${teamSlug}: ${status}\n${data}`)
  }
}
