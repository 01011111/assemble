import { debug, setFailed, getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { loadConfig } from './utils/fs'
import { ConfigTeams, Team, TeamAccess } from './utils/types'
import { formatTeams, formatTeamName } from './utils/format'
import { getOrgTeams, getOrgRepos, createTeam, updateTeamAccess } from './utils/github'

async function checkTeam (octokit: any, current: { [key: string]: Team }, org: string, team: string, parentId: number | null = null): Promise<Team> {
  const slug = formatTeamName(team)

  if (current[slug]) {
    debug(`Team ${team} already exists`)
    return current[slug]
  } else {
    debug(`Creating team ${team}`)
    const newTeam = await createTeam(octokit, org, team, parentId)
    return newTeam
  }
}

async function checkTeams (octokit: any, current: { [key: string]: Team }, target: ConfigTeams): Promise<void> {
  for (const team of target) {
    if (typeof team === 'string') {
      await checkTeam(octokit, current, context.payload.organization.login, team)
    } else if (typeof team === 'object' && !Array.isArray(team) && team !== null) {
      for (const parent in team) {
        const parentTeam = await checkTeam(octokit, current, context.payload.organization.login, parent, null)

        for (const subteam of team[parent]) {
          await checkTeam(octokit, current, context.payload.organization.login, subteam, parentTeam.id)
        }
      }
    } else {
      throw new Error(`Invalid team configuration: ${JSON.stringify(team)}`)
    }
  }
}

async function applyRepoAccess (octokit: any, repo: string, teams: TeamAccess[]): Promise<void> {
  debug(`Applying repo access for ${repo}`)
  for (const team of teams) {
    const { team: name, permission } = team
    debug(`Applying ${permission} access for ${repo} to ${name}`)
    const slug = formatTeamName(name)

    await updateTeamAccess(octokit, slug, context.payload.organization.login, repo, permission)
  }
}

async function checkRepoAccess (octokit: any, config: { [key: string]: TeamAccess[] }): Promise<void> {
  const repoList = Object.keys(config)

  if (repoList.indexOf('*') > -1) {
    const orgRepos = await getOrgRepos(octokit, context.payload.organization.login)

    const promises = orgRepos.map(repo => applyRepoAccess(octokit, repo.name, config['*']))
    await Promise.all(promises)
  }

  for (const repoKey in config) {
    if (repoKey === '*') {
      continue
    } else {
      await applyRepoAccess(octokit, repoKey, config[repoKey])
    }
  }
}

async function run (): Promise<void> {
  try {
    const GH_TOKEN = getInput('token')
    const configPath = getInput('config')

    const octokit = getOctokit(GH_TOKEN)

    const orgTeams = await getOrgTeams(octokit, context.payload.organization.login)
    debug(`The org teams: ${JSON.stringify(orgTeams, null, 2)}`)

    const { teams = [], access = {} }: { teams: ConfigTeams, access: { [key: string]: TeamAccess[]; } } = await loadConfig(configPath)
    debug(`The config: ${JSON.stringify({ teams, access }, null, 2)}`)

    await checkTeams(octokit, formatTeams(orgTeams), teams)

    await checkRepoAccess(octokit, access)
  } catch (error) {
    if (error instanceof Error) setFailed(error.message)
  }
}

run()
