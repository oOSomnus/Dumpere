import { getVaultState } from '../vault-service'

export function requireVaultPath(): string {
  const state = getVaultState()
  if (!state.isOpen || !state.vaultPath) {
    throw new Error('No vault open')
  }
  return state.vaultPath
}
