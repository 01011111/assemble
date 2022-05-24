
import { context } from '@actions/github'

import { Team, Repo, Permission } from './types'

export async function getOrgTeams (octokit: any): Promise<Team[]> {
  const { data, status } = await octokit.rest.teams.list({
    org: context.payload.organization.login,
    per_page: 100
  })

  if (status !== 200) {
    throw Error(`Failed to get org teams: ${status}\n${data}`)
  }

  return data
}

export async function getOrgRepos (octokit: any): Promise<Repo[]> {
  const { data, status } = await octokit.rest.repos.listForOrg({
    org: context.payload.organization.login,
    per_page: 100
  })

  if (status !== 200) {
    throw Error(`Failed to get org repos: ${status}\n${data}`)
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
