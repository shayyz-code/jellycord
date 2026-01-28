import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getScreenSources: () => Promise<Array<Source>>
      setWindowTitle: (title: string) => void
    }
  }
}
