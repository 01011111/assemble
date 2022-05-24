import { debug, setFailed, getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { loadConfig } from './utils/fs'
import { Team, TeamAccess } from './utils/types'
import { formatTeams, formatTeamName } from './utils/format'
import { getOrgTeams, getOrgRepos, updateTeamAccess } from './utils/github'

async function checkTeams (octokit: any, current: { [key: string]: Team }, target: string[]): Promise<void> {
  for (const team of target) {
    const slug = formatTeamName(team)

    if (current[slug]) {
      debug(`Team ${team} already exists`)
    } else {
      debug(`Creating team ${team}`)
      await octokit.rest.teams.create({
        org: context.payload.organization.login,
        name: team,
        privacy: 'closed'
      })
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
    const orgRepos = await getOrgRepos(octokit)

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

    const orgTeams = await getOrgTeams(octokit)
    debug(`The org teams: ${JSON.stringify(orgTeams, null, 2)}`)

    const { teams = [], access = {} }: { teams: string[], access: { [key: string]: TeamAccess[]; } } = await loadConfig(configPath)
    debug(`The config: ${JSON.stringify({ teams, access }, null, 2)}`)

    await checkTeams(octokit, formatTeams(orgTeams), teams)

    await checkRepoAccess(octokit, access)
  } catch (error) {
    if (error instanceof Error) setFailed(error.message)
  }
}

run()
