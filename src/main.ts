import { debug, setFailed, getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { loadConfig } from './utils/fs'
import { ConfigTeams, Team, TeamAccess } from './utils/types'
import { formatTeams, formatTeamName } from './utils/format'
import { getOrgTeams, getOrgRepos, createTeam, updateTeamAccess } from './utils/github'

async function checkTeam (octokit: any, org: string, current: { [key: string]: Team }, team: string, parentId: number | null = null): Promise<Team> {
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

async function checkTeams (octokit: any, org: string, current: { [key: string]: Team }, target: ConfigTeams, parentId: number|null = null): Promise<void> {
  for (const team of target) {
    if (typeof team === 'string') {
      await checkTeam(octokit, org, current, team, parentId)
    } else if (typeof team === 'object' && !Array.isArray(team) && team !== null) {
      for (const parent in team) {
        const parentTeam = await checkTeam(octokit, org, current, parent, parentId)

        await checkTeams(octokit, org, current, team[parent], parentTeam.id)
      }
    } else {
      throw new Error(`Invalid team configuration: ${JSON.stringify(team)}`)
    }
  }
}

async function applyRepoAccess (octokit: any, org: string, repo: string, teams: TeamAccess[]): Promise<void> {
  debug(`Applying repo access for ${repo}`)
  for (const team of teams) {
    const { team: name, permission } = team
    debug(`Applying ${permission} access for ${repo} to ${name}`)
    const slug = formatTeamName(name)

    await updateTeamAccess(octokit, slug, org, repo, permission)
  }
}

async function checkRepoAccess (octokit: any, org: string, config: { [key: string]: TeamAccess[] }): Promise<void> {
  const repoList = Object.keys(config)

  if (repoList.indexOf('*') > -1) {
    const orgRepos = await getOrgRepos(octokit, org)

    const promises = orgRepos.map(repo => applyRepoAccess(octokit, org, repo.name, config['*']))
    await Promise.all(promises)
  }

  for (const repoKey in config) {
    if (repoKey === '*') {
      continue
    } else {
      await applyRepoAccess(octokit, org, repoKey, config[repoKey])
    }
  }
}

async function run (): Promise<void> {
  try {
    const GH_TOKEN = getInput('token')
    const configPath = getInput('config')

    const octokit = getOctokit(GH_TOKEN)

    const org: string = context.repo?.owner

    if (!org) {
      debug(`No organization found: ${JSON.stringify(context.payload, null, 2)}`)
      throw Error('Missing organization in the context payload')
    }

    const orgTeams = await getOrgTeams(octokit, org)
    debug(`The org teams: ${JSON.stringify(orgTeams, null, 2)}`)

    const { teams = [], access = {} }: { teams: ConfigTeams, access: { [key: string]: TeamAccess[]; } } = await loadConfig(configPath)
    debug(`The config: ${JSON.stringify({ teams, access }, null, 2)}`)

    await checkTeams(octokit, org, formatTeams(orgTeams), teams)

    await checkRepoAccess(octokit, org, access)
  } catch (error) {
    if (error instanceof Error) setFailed(error.message)
  }
}

run()
