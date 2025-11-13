import React from 'react'
import { Result, Button } from 'antd'

interface ErrorBoundaryProps {
  children: React.ReactNode
  title?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  info?: React.ErrorInfo
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 这里可以接入你的日志系统，比如 Sentry 或自建上报
    console.error('[Route ErrorBoundary]', error, info)
    this.setState({ info })
  }

  handleReload = (): void => {
    // 简单回退策略：刷新当前窗口
    window.location.hash = '#/'
    window.location.reload()
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title={this.props.title ?? '页面加载失败'}
          subTitle={this.state.error?.message ?? '请稍后重试或返回首页'}
          extra={[
            <Button key="reload" type="primary" onClick={this.handleReload}>
              返回首页并刷新
            </Button>
          ]}
        />
      )
    }
    return this.props.children
  }
}