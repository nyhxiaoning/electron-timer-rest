/// <reference types="vite/client" />

interface TimerAPI {
  stop: () => Promise<void>
  reset: () => Promise<void>
  getRemainingTime: () => Promise<number>
  setDuration: (seconds: number) => Promise<void>
  onUpdate: (callback: (remainingTime: number) => void) => void
  removeUpdateListener: (callback: (remainingTime: number) => void) => void
  onFinish: (callback: () => void) => void
  removeFinishListener: (callback: () => void) => void
}

interface Window {
  timer: TimerAPI
  electron: any
  api: any
  versions: {
    node: () => string
    chrome: () => string
    electron: () => string
    ping: () => Promise<string>
  }
}
