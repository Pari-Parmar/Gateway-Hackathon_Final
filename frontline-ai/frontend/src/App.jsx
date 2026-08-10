import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analyze from './pages/Analyze.jsx';
import Queue from './pages/Queue.jsx';
import Evaluation from './pages/Evaluation.jsx';
import Health from './pages/Health.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar geminiStatus="operational" />
      <div className="main-content">
        <Topbar />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/evaluation" element={<Evaluation />} />
            <Route path="/health" element={<Health />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
