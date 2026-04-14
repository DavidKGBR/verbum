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
import TranslationDivergencePage from "./pages/TranslationDivergencePage";
import AuthorsPage from "./pages/AuthorsPage";
import PeoplePage from "./pages/PeoplePage";
import PlacesPage from "./pages/PlacesPage";
import MapPage from "./pages/MapPage";
import TimelinePage from "./pages/TimelinePage";
import ComparePage from "./pages/ComparePage";
import TopicsPage from "./pages/TopicsPage";
import DevotionalPage from "./pages/DevotionalPage";
import DeepAnalyticsPage from "./pages/DeepAnalyticsPage";
import IntertextualityPage from "./pages/IntertextualityPage";
import OpenQuestionsPage from "./pages/OpenQuestionsPage";
import ThreadsPage from "./pages/ThreadsPage";
import StructurePage from "./pages/StructurePage";

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
        <Route path="/translation-divergence" element={<TranslationDivergencePage />} />
        <Route path="/authors" element={<AuthorsPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/places" element={<PlacesPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/topics" element={<TopicsPage />} />
        <Route path="/devotional" element={<DevotionalPage />} />
        <Route path="/deep-analytics" element={<DeepAnalyticsPage />} />
        <Route path="/intertextuality" element={<IntertextualityPage />} />
        <Route path="/open-questions" element={<OpenQuestionsPage />} />
        <Route path="/threads" element={<ThreadsPage />} />
        <Route path="/structure" element={<StructurePage />} />
      </Route>
    </Routes>
  );
}
