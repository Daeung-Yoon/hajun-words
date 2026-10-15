import { Routes, Route } from 'react-router'
import { AppProvider } from './AppContext'
import Home from '../screens/Home'
import Placeholder from '../screens/Placeholder'
import Range from '../screens/Range'
import Tree from '../modes/Tree'
import QuizScreen from '../modes/QuizScreen'
import MockExam from '../modes/MockExam'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/range" element={<Range />} />
        <Route path="/tree" element={<Tree />} />
        <Route path="/blank" element={<QuizScreen mode="blank" />} />
        <Route path="/pick" element={<QuizScreen mode="pick" />} />
        <Route path="/mock" element={<MockExam />} />
        <Route path="/stats" element={<Placeholder title="기록" />} />
        <Route path="/settings" element={<Placeholder title="설정" />} />
      </Routes>
    </AppProvider>
  )
}
