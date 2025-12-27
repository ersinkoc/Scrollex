import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import GettingStarted from './pages/GettingStarted'
import ApiReference from './pages/ApiReference'
import Examples from './pages/Examples'
import Plugins from './pages/Plugins'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/getting-started" element={<GettingStarted />} />
        <Route path="/api" element={<ApiReference />} />
        <Route path="/examples" element={<Examples />} />
        <Route path="/plugins" element={<Plugins />} />
      </Routes>
    </Layout>
  )
}
