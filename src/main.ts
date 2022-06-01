import { info, notice, error, debug, setFailed, getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { loadConfig } from './utils/fs'
import { ConfigTeams, Team, TeamAccess, TeamAccessList, AssembleConfig } from './utils/types'
import { formatTeams, formatTeamName } from './utils/format'
import { getOrgTeams, getOrgRepos, createTeam, updateTeamAccess } from './utils/github'

async function checkTeam (octokit: any, org: string, current: { [key: string]: Team }, team: string, parentId: number | null = null): Promise<Team> {
  const slug = formatTeamName(team)

  if (current[slug]) {
    notice(`Team ${team} already exists`)
    return current[slug]
  } else {
    info(`Creating team ${team}`)
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
      error(`Invalid team configuration: ${JSON.stringify(team, null, 2)}`)
      throw new Error('Cannot parse team configuration')
    }
  }
}

async function extractSchema (ref: string, schemas: TeamAccessList): Promise<TeamAccess[]> {
  try {
    const refKey: string = ref.replace(/^#\/schemas\//, '')
    debug(`Parsing ref key: ${ref} -> ${refKey}`)
    const refSchema: TeamAccess[] = schemas[refKey]
    if (!refSchema) {
      error(`Invalid schema reference: ${ref} / ${refKey}`)
      throw Error('Invalid schema reference')
    }

    return refSchema
  } catch (err: any) {
    error(err)
    throw err
  }
}

async function applyRepoAccess (octokit: any, org: string, repo: string, teams: TeamAccess[], schemas: TeamAccessList): Promise<void> {
  for (const team of teams) {
    const { team: name, permission, $refs } = team
    debug(JSON.stringify({ team, name, permission, $refs }, null, 2))

    if ($refs) {
      const refs = []

      if (typeof $refs === 'string') {
        refs.push($refs)
      }

      if (Array.isArray($refs) || refs.length > 0) {
        if (refs.length === 0) refs.push(...$refs)
        debug(`Refs: ${JSON.stringify(refs, null, 2)}`)

        for (const ref of refs) {
          const refSchema: TeamAccess[] = await extractSchema(ref, schemas)
          debug(`Ref schema extracted: ${JSON.stringify(refSchema, null, 2)}`)
          info(`Applying repo access for ${repo} with schema ${ref}`)
          await applyRepoAccess(octokit, org, repo, refSchema, schemas)
        }
      } else {
        error(`Invalid schema reference: ${JSON.stringify($refs, null, 2)}`)
        throw Error('Invalid schema reference')
      }
    }

    info(`Applying ${permission} access for ${repo} to ${name}`)
    const slug = formatTeamName(name)

    await updateTeamAccess(octokit, slug, org, repo, permission)
  }
}

async function checkRepoAccess (octokit: any, org: string, config: TeamAccessList, schemas: TeamAccessList): Promise<void> {
  const repoList = Object.keys(config)

  if (repoList.indexOf('*') > -1) {
    const orgRepos = await getOrgRepos(octokit, org)

    const promises = orgRepos.map(repo => applyRepoAccess(octokit, org, repo.name, config['*'], schemas))
    await Promise.all(promises)
  }

  for (const repoKey in config) {
    if (repoKey === '*') {
      continue
    } else {
      await applyRepoAccess(octokit, org, repoKey, config[repoKey], schemas)
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
      error(`No organization found: ${JSON.stringify(context.payload, null, 2)}`)
      throw Error('Missing organization in the context payload')
    }

    const orgTeams = await getOrgTeams(octokit, org)
    debug(`The org teams: ${JSON.stringify(orgTeams, null, 2)}`)

    const { teams = [], access = {}, schemas = {} }: AssembleConfig = await loadConfig(configPath)
    debug(`The config: ${JSON.stringify({ teams, access, schemas }, null, 2)}`)

    await checkTeams(octokit, org, formatTeams(orgTeams), teams)

    await checkRepoAccess(octokit, org, access, schemas)
  } catch (err: any) {
    error(err)
    if (err instanceof Error) setFailed(err.message)
  }
}

run()
