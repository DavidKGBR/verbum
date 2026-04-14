import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ArcDiagramPage from "./pages/ArcDiagramPage";
import ReaderPage from "./pages/ReaderPage";
import SearchPage from "./pages/SearchPage";
import BookmarksPage from "./pages/BookmarksPage";
import NotesPage from "./pages/NotesPage";
import PlansPage from "./pages/PlansPage";
import WordStudyPage from "./pages/WordStudyPage";
import DictionaryPage from "./pages/DictionaryPage";
import SemanticGraphPage from "./pages/SemanticGraphPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/reader" element={<ReaderPage />} />
        <Route path="/arc-diagram" element={<ArcDiagramPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/word-study/:strongsId" element={<WordStudyPage />} />
        <Route path="/dictionary" element={<DictionaryPage />} />
        <Route path="/semantic-graph" element={<SemanticGraphPage />} />
      </Route>
    </Routes>
  );
}
