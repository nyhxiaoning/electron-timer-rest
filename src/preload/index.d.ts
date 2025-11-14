import { ElectronAPI } from '@electron-toolkit/preload'
import { NotesAPI } from './notesAPI'

declare global {
  interface Window {
    electron: ElectronAPI
    api: NotesAPI
    timer: {
      reset: () => void
      getRemainingTime: () => Promise<number>
      onUpdate: (callback: (remainingTime: number) => void) => void
    }
    versions: {
      node(): string
      ping: () => Promise<string>
    }
  }
}
