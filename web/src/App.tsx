import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { DashboardPage } from './pages/DashboardPage'
import { TaskPage } from './pages/TaskPage'

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/task/:id" element={<TaskPage />} />
      </Routes>
    </MainLayout>
  )
}

export default App
