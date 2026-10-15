import { Routes, Route } from 'react-router'
import { AppProvider } from './AppContext'
import Home from '../screens/Home'
import Tree from '../modes/Tree'
import QuizScreen from '../modes/QuizScreen'
import MockExam from '../modes/MockExam'
import Stats from '../screens/Stats'
import Settings from '../screens/Settings'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tree" element={<Tree />} />
        <Route path="/blank" element={<QuizScreen mode="blank" />} />
        <Route path="/pick" element={<QuizScreen mode="pick" />} />
        <Route path="/mock" element={<MockExam />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppProvider>
  )
}
