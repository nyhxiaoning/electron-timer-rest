import { useEffect, useRef, useState } from 'react'
import FadeComponent, { FadeComponentHandle, FadeComponentProps } from '../Fade'
import { LayoutProvider } from './LayoutContext'

export interface Config {
  position: {
    x: number
    y: number
  }
}

export default function Layout({
  children,
  type,
  defaultVisible = false
}: {
  children: React.ReactNode
  type?: FadeComponentProps['type']
  defaultVisible?: boolean
}): JSX.Element {
  const [winConfig, setConfig] = useState<Config>()
  // 创建一个 ref 来引用子组件的方法
  const fadeRef = useRef<FadeComponentHandle>(null)
  const [win, setWin] = useState<number | null>(null)

  const toggleFade = (visible: boolean): void => {
    // 调用子组件暴露的 toggle 方法
    fadeRef.current?.toggle(visible)
  }

  useEffect(() => {
    // 监听主线程发送的事件
    function invokeRenderMethod(
      _: unknown,
      {
        data,
        win,
        config
      }: {
        data: boolean
        win: number
        config?: Config
      }
    ): void {
      setConfig(config)
      setWin(win)
      toggleFade(data)
    }

    // 优先使用 preload 注入的 ipcRenderer；兜底使用 nodeIntegration 的 require
    const fallbackIpc =
      typeof window !== 'undefined' &&
      // @ts-ignore
      typeof window.require === 'function'
        ? // @ts-ignore
          window.require('electron').ipcRenderer
        : undefined
    const ipc = window.electron?.ipcRenderer ?? fallbackIpc

    if (!ipc) {
      console.warn('[Layout] ipcRenderer 未就绪，尝试延迟绑定')
      const timer = setTimeout(() => {
        const retryIpc = window.electron?.ipcRenderer ?? fallbackIpc
        if (retryIpc) {
          retryIpc.on('invoke-render-method', invokeRenderMethod)
        } else {
          console.error('[Layout] ipcRenderer 仍不可用，跳过绑定')
        }
      }, 100)
      return (): void => clearTimeout(timer)
    }

    ipc.on('invoke-render-method', invokeRenderMethod)

    // 组件挂载时，如果 defaultVisible 为 true，则显示内容
    if (defaultVisible) {
      toggleFade(true)
    }

    return (): void => {
      ipc.removeListener('invoke-render-method', invokeRenderMethod)
    }
  }, [defaultVisible])

  return (
    <LayoutProvider
      toggleFade={toggleFade}
      win={win}
      winConfig={winConfig}
      defaultVisible={defaultVisible}
    >
      <FadeComponent ref={fadeRef} type={type}>
        {children}
      </FadeComponent>
    </LayoutProvider>
  )
}
