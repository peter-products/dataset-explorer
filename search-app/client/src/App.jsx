import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import DatasetPage from './pages/DatasetPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/dataset/:id" element={<DatasetPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
