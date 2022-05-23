import { debug, setFailed } from '@actions/core'
import { context } from '@actions/github'

async function run (): Promise<void> {
  try {
    const payload: string = JSON.stringify(context.payload, null, 2)
    debug(`The event payload: ${payload}`)
  } catch (error) {
    if (error instanceof Error) setFailed(error.message)
  }
}

run()
