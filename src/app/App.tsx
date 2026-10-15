import { Routes, Route } from 'react-router'
import { AppProvider } from './AppContext'
import Home from '../screens/Home'
import Tree from '../modes/Tree'
import MockExam from '../modes/MockExam'
import MicTest from '../screens/MicTest'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tree" element={<Tree />} />
        <Route path="/mock" element={<MockExam />} />
        <Route path="/mic-test" element={<MicTest />} />
      </Routes>
    </AppProvider>
  )
}
