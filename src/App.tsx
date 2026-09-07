import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStudyStore } from './store/studyStore';
import { getActiveProfile, isAccessGranted } from './services/authService';
import { AppLayout } from './components/layout/AppLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SyllabusNodePage from './pages/SyllabusNode';
import TopicDetail from './pages/TopicDetail';
import SearchPage from './pages/SearchPage';
import RevisionPage from './pages/RevisionPage';
import ProgressPage from './pages/ProgressPage';
import StagePage from './pages/StagePage';
import ManageSyllabus from './pages/ManageSyllabus';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const {
    setUser,
    setAuthLoading,
    loadSyllabus,
    loadStudentData,
    subscribeToStudentData,
  } = useStudyStore();

  useEffect(() => {
    async function init() {
      if (isAccessGranted()) {
        const profile = await getActiveProfile();
        setUser(profile);
        await loadSyllabus();
        if (profile) {
          await loadStudentData(profile.uid);
          subscribeToStudentData(profile.uid);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    }
    init();
  }, [setUser, setAuthLoading, loadSyllabus, loadStudentData, subscribeToStudentData]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stage/:stageId" element={<StagePage />} />
          <Route path="/prelims" element={<PrelimsShortcut />} />
          <Route path="/mains" element={<MainsShortcut />} />
          <Route path="/node/:nodeId" element={<SyllabusNodePage />} />
          <Route path="/topic/:topicId" element={<TopicDetail />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/revision" element={<RevisionPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/manage" element={<ManageSyllabus />} />
          <Route path="/import-export" element={<ImportExport />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function PrelimsShortcut() {
  const { syllabusTree } = useStudyStore();
  const prelimsNode = syllabusTree.find(n => n.title.toLowerCase().includes('prelim'));
  if (prelimsNode) {
    return <Navigate to={'/stage/' + prelimsNode.id} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function MainsShortcut() {
  const { syllabusTree } = useStudyStore();
  const mainsNode = syllabusTree.find(n => n.title.toLowerCase().includes('main'));
  if (mainsNode) {
    return <Navigate to={'/stage/' + mainsNode.id} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export default App;
