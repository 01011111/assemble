import { debug, setFailed } from '@actions/core'
import { context } from '@actions/github'

import { loadConfig } from './utils/loadConfig'

async function run (): Promise<void> {
  try {
    const payload: string = JSON.stringify(context.payload, null, 2)
    debug(`The event payload: ${payload}`)

    const config = await loadConfig('./assemble.yml')
    debug(`The config: ${JSON.stringify(config, null, 2)}`)
  } catch (error) {
    if (error instanceof Error) setFailed(error.message)
  }
}

run()
