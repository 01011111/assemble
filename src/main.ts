import { debug, setFailed, getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { loadConfig } from './utils/fs'

interface Team {
  slug: string
  name: string
  id: number
}

async function getOrgTeams (octokit: any): Promise<Team[]> {
  const { data, status } = await octokit.rest.teams.list({
    org: context.payload.organization.login,
    per_page: 100
  })

  if (status !== 200) {
    throw Error(`Failed to get org teams: ${status}\n${data}`)
  }

  return data
}

interface Repo {
  name: string
  id: number
}

async function getOrgRepos (octokit: any): Promise<[Repo[]]> {
  const { data, status } = await octokit.rest.repos.listForOrg({
    org: context.payload.organization.login,
    per_page: 100
  })

  if (status !== 200) {
    throw Error(`Failed to get org repos: ${status}\n${data}`)
  }

  return data
}

function formatTeams (raw: Team[]): { [key: string]: Team } {
  const teams: { [key: string]: Team } = {}

  for (const team of raw) {
    teams[team.slug] = {
      ...team
    }
  }

  return teams
}

function formatTeamName (name: string): string {
  return name.toLocaleLowerCase().replace(/\s+/g, '-')
}

async function checkTeams (octokit: any, current: { [key: string]: Team }, target: string[]): Promise<void> {
  for (const team of target) {
    const slug = formatTeamName(team)

    if (!current[slug]) {
      debug(`Creating team ${team}`)
      await octokit.rest.teams.create({
        org: context.payload.organization.login,
        name: team
      })
    }
  }
}

async function run (): Promise<void> {
  try {
    const GH_TOKEN = getInput('token')
    const configPath = getInput('config')

    const octokit = getOctokit(GH_TOKEN)

    const teams = await getOrgTeams(octokit)
    debug(`The org teams: ${JSON.stringify(teams, null, 2)}`)

    const repos = await getOrgRepos(octokit)
    debug(`The org repos: ${JSON.stringify(repos, null, 2)}`)

    const config = await loadConfig(configPath)
    debug(`The config: ${JSON.stringify(config, null, 2)}`)

    await checkTeams(octokit, formatTeams(teams), config.teams)
  } catch (error) {
    if (error instanceof Error) setFailed(error.message)
  }
}

run()
