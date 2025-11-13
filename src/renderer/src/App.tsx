// App 组件
import { Suspense } from 'react'
import { Routes, Route, HashRouter as Router, Navigate } from 'react-router-dom'
import Overlook from './views/Overlook'
import Home from './views/Home'
import SettingMenu from './views/SettingMenu'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

function App(): JSX.Element {
  return (
    <>
      <Router>
        <Suspense fallback={null}>
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary title="首页异常">
                  <Layout type="upDown" defaultVisible={true}>
                    <Home />
                  </Layout>
                </ErrorBoundary>
              }
            />
            <Route
              path="/overlook"
              element={
                <ErrorBoundary title="全屏页异常">
                  <Layout>
                    <Overlook />
                  </Layout>
                </ErrorBoundary>
              }
            />
            <Route
              path="/settingmenu"
              element={
                <ErrorBoundary title="设置菜单异常">
                  <Layout type="none" defaultVisible>
                    <SettingMenu />
                  </Layout>
                </ErrorBoundary>
              }
            />
            {/* 兜底：任何未匹配路径都回首页 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </>
  )
}

export default App
