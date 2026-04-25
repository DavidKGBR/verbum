import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ReaderPage from "./pages/ReaderPage";
import SearchPage from "./pages/SearchPage";
import BookmarksPage from "./pages/BookmarksPage";
import NotesPage from "./pages/NotesPage";
import PlansPage from "./pages/PlansPage";
import WordStudyPage from "./pages/WordStudyPage";
import DictionaryPage from "./pages/DictionaryPage";
import TranslationDivergencePage from "./pages/TranslationDivergencePage";
import AuthorsPage from "./pages/AuthorsPage";
import PeoplePage from "./pages/PeoplePage";
import PlacesPage from "./pages/PlacesPage";
import MapPage from "./pages/MapPage";
import TimelinePage from "./pages/TimelinePage";
import ComparePage from "./pages/ComparePage";
import DevotionalPage from "./pages/DevotionalPage";
import DeepAnalyticsPage from "./pages/DeepAnalyticsPage";
import OpenQuestionsPage from "./pages/OpenQuestionsPage";
import StructurePage from "./pages/StructurePage";
import EmotionalLandscapePage from "./pages/EmotionalLandscapePage";
import CommunityPage from "./pages/CommunityPage";
import SpecialPassagePage from "./pages/SpecialPassagePage";
import GenealogyPage from "./pages/GenealogyPage";
import AboutPage from "./pages/AboutPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import ConceptsPage from "./pages/ConceptsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/reader" element={<ReaderPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/word-study/:strongsId" element={<WordStudyPage />} />
        <Route path="/dictionary" element={<DictionaryPage />} />
        <Route path="/translation-divergence" element={<TranslationDivergencePage />} />
        <Route path="/authors" element={<AuthorsPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/places" element={<PlacesPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/devotional" element={<DevotionalPage />} />
        <Route path="/deep-analytics" element={<DeepAnalyticsPage />} />
        <Route path="/open-questions" element={<OpenQuestionsPage />} />
        <Route path="/structure" element={<StructurePage />} />
        <Route path="/emotional" element={<EmotionalLandscapePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/special-passages" element={<SpecialPassagePage />} />
        <Route path="/special-passages/:passageId" element={<SpecialPassagePage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Consolidated wrappers (Entregável 2) */}
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/concepts" element={<ConceptsPage />} />

        {/* Backwards-compat redirects: legacy URLs → consolidated wrappers.
            Direct components still mounted for embed use by the wrappers. */}
        <Route path="/arc-diagram" element={<Navigate to="/connections?tab=arc" replace />} />
        <Route path="/semantic-graph" element={<Navigate to="/connections?tab=graph" replace />} />
        <Route path="/intertextuality" element={<Navigate to="/connections?tab=citations" replace />} />
        <Route path="/topics" element={<Navigate to="/concepts?tab=topics" replace />} />
        <Route path="/threads" element={<Navigate to="/concepts?tab=threads" replace />} />
        <Route path="/genealogy" element={<Navigate to="/concepts?tab=genealogy" replace />} />
        {/* Deep-link to a specific concept keeps rendering GenealogyPage so
            existing bookmarks like /genealogy/chesed continue to work. */}
        <Route path="/genealogy/:conceptId" element={<GenealogyPage />} />
      </Route>
    </Routes>
  );
}
