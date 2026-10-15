import { Routes, Route } from 'react-router'
import { AppProvider } from './AppContext'
import Home from '../screens/Home'
import Placeholder from '../screens/Placeholder'
import Range from '../screens/Range'
import Tree from '../modes/Tree'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/range" element={<Range />} />
        <Route path="/tree" element={<Tree />} />
        <Route path="/blank" element={<Placeholder title="예문 빈칸" />} />
        <Route path="/pick" element={<Placeholder title="뜻 고르기" />} />
        <Route path="/mock" element={<Placeholder title="학원 모의시험" />} />
        <Route path="/stats" element={<Placeholder title="기록" />} />
        <Route path="/settings" element={<Placeholder title="설정" />} />
      </Routes>
    </AppProvider>
  )
}
