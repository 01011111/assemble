import { parseYAML } from './fs'

export const loadConfig = async (path: string): Promise<any> => {
  const config = await parseYAML(path)
  return config
}
