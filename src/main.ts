import { debug, setFailed, getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { loadConfig } from './utils/fs'

async function getOrgTeams (octokit: any): Promise<void> {
  const teams = await octokit.rest.teams.list({
    org: context.payload.organization.login,
    per_page: 100
  })
  return teams
}

async function getOrgRepos (octokit: any): Promise<void> {
  const repos = await octokit.rest.repos.listForOrg({
    org: context.payload.organization.login,
    per_page: 100
  })
  return repos
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
  } catch (error) {
    if (error instanceof Error) setFailed(error.message)
  }
}

run()
