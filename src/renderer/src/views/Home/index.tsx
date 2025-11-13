import { useTranslation } from 'react-i18next'
import { Button, Statistic } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'

const { Countdown } = Statistic

export default function Home(): JSX.Element {
  const { t, i18n } = useTranslation()
  const [time, setTime] = useState(0)
  const getIpc = () => {
    const fallbackIpc =
      typeof window !== 'undefined' &&
      // @ts-ignore
      typeof window.require === 'function'
        ? // @ts-ignore
          window.require('electron').ipcRenderer
        : undefined
    return window.electron?.ipcRenderer ?? fallbackIpc
  }

  const ipcHandle = (): void => getIpc()?.send('ping')
  const ipcHandleCreateSettingMenu = (): void => getIpc()?.send('createSettingMenu')
  const ipcHandleCreateFull = (): void => getIpc()?.send('createFullscreen')

  useEffect(() => {
    // 初始化倒计时显示
    const initTimer = async (): Promise<void> => {
      try {
        if (window.timer && typeof window.timer.getRemainingTime === 'function') {
          const remainingTime = await window.timer.getRemainingTime()
          console.log(`Time updated: ${remainingTime}s`)
          setTime(Date.now() + remainingTime * 1000)
        } else {
          console.warn('Timer API not available, using default time')
          setTime(Date.now() + 25 * 60 * 1000) // 默认25分钟
        }
      } catch (error) {
        console.error('Failed to get remaining time:', error)
        setTime(Date.now() + 25 * 60 * 1000) // 默认25分钟
      }
    }
    
    initTimer()
  }, [])

  return (
    <div className="flex flex-col px-6 pt-6 pb-10 bg-gradient-to-t from-[#cbcbca] to-[#c0bfbe] h-full w-full rounded-lg  shadow-lg">
      <div className=" flex items-center justify-end">
        <SettingOutlined
          onClick={ipcHandleCreateSettingMenu}
          className="transition-all  opacity-70 hover:opacity-100 cursor-pointer"
        />
      </div>
      <div className=" flex-1 flex items-center justify-center flex-col">
        <div className=" flex-1 flex items-center justify-center">loading...</div>
        <div className="actions hidden">
          <div className=" p-4 rounded-lg ">
            <h1 className="text-2xl font-bold text-red-500">{t('title')}</h1>
          </div>
          <Button
            type="primary"
            onClick={() => {
              i18n.changeLanguage('ja')
            }}
          >
            test
          </Button>
          <div className="action">
            <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
              Send IPC
            </a>
          </div>
        </div>
        <Countdown className=" pt-[20px]" value={time} format="mm:ss" />
        <p className="pt-[10px]">
          <span>工作结束，休息20秒</span>
        </p>
        <div className=" flex items-center justify-center w-full pt-[40px]">
          <Button className=" w-[36%]" type="default">
            重置
          </Button>
          <div className=" w-[10%]"></div>
          <Button className=" w-[36%]" type="primary" onClick={ipcHandleCreateFull}>
            休息
          </Button>
        </div>
      </div>
    </div>
  )
}
