import { readFile as readFileContent } from 'fs'
import { load } from 'js-yaml'

export const readFile = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    readFileContent(path, (err: any, data: Buffer) => {
      if (err) {
        reject(err)
        return
      }
      resolve(data.toString())
    })
  })
}

export const parseYAML = async (path: string): Promise<any> => {
  const content = await readFile(path)
  return load(content)
}

export const loadConfig = async (path: string): Promise<any> => {
  const config = await parseYAML(path)
  return config
}
