// 弹窗遮罩win

import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getWindowPosition, rendererVisible, tray, windowsMap } from '../index'
import { createSettingMenu, childWindow } from './SettingMenu'
import { createFullscreen } from './Fullscreen'
export let mainWindow: BrowserWindow | null = null

const winIsVisible = function (): boolean {
  return !!(mainWindow && mainWindow.isVisible())
}

export function toggleWindow(): void {
  if (winIsVisible()) {
    rendererVisible({ visible: false, mainWindow })
  } else {
    showWindow()
  }
}

function showWindow(): void {
  if (mainWindow) {
    const position = getWindowPosition({ mainWindow })
    mainWindow.setPosition(position.x, position.y, false)
    rendererVisible({
      visible: true,
      mainWindow: mainWindow
    })
  } else {
    console.error('Main window is not created yet')
  }
}

export const createHomescreen = (): BrowserWindow => {
  // 如果窗口已经存在，直接返回
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('Home window already exists')
    return mainWindow
  }

  // 获取主屏幕的完整尺寸（包括信号栏/任务栏区域）
  mainWindow = new BrowserWindow({
    resizable: false, // 禁止调整窗口大小
    show: false, // 窗口创建时不显示
    width: 310,
    height: 410,
    // hasShadow: false,
    frame: false, // 无边框窗口
    enableLargerThanScreen: true, // 允许窗口超出屏幕 yyds
    transparent: true, // 背景透明
    focusable: true, // 确保窗口可聚焦
    alwaysOnTop: false, // 如果需要检测焦点丢失，避免使用 alwaysOnTop
    // vibrancy: 'fullscreen-ui', // 启用毛玻璃效果
    movable: false, // 禁止移动
    minimizable: false,
    maximizable: false,
    webPreferences: {
      sandbox: false,
      preload: join(__dirname, '../preload/index.js'),
      backgroundThrottling: false,
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  // 注册快捷键
  app.whenReady().then(() => {
    globalShortcut.register('Escape', () => {
      if (winIsVisible()) {
        console.log('隐藏窗口，快捷键生效')
        rendererVisible({ visible: false, mainWindow })
      } else {
        console.log('隐藏了，别按了')
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      windowsMap.set(mainWindow.id, mainWindow)
      // 项目第一次启动，自动打开
      console.log('Home window ready to show')
      // 延迟显示窗口，确保渲染进程准备就绪
      setTimeout(() => {
        showWindow()
      }, 100)
    }

    tray?.on('click', () => {
      toggleWindow()
    })
  })

  mainWindow.on('blur', () => {
    if (BrowserWindow.getFocusedWindow() == childWindow) {
      return
    } else {
      winIsVisible() && rendererVisible({ visible: false, mainWindow })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '#/'
    })
  }

  ipcMain.on('createSettingMenu', () => {
    createSettingMenu({ top: mainWindow as BrowserWindow })
  })

  ipcMain.on('createFullscreen', () => {
    winIsVisible() && rendererVisible({ visible: false, mainWindow })
    setTimeout(() => {
      createFullscreen()
    }, 100)
  })
  return mainWindow
}
