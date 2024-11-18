import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Upload from './components/Upload';
import Translation from './components/Translation';
import PDFTranslation from './components/PDFTranslation';
import { TranslationProvider } from './context/TranslationContext';

function App() {
  return (
    <TranslationProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-gray-900">
          <Sidebar />
          <main className="flex-1 p-8">
            <Routes>
              <Route path="/" element={
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <Upload />
                  </div>
                  <footer className="mt-4">
                    <p className="text-xs text-gray-500 text-center">Powered by Quantum AI</p>
                  </footer>
                </div>
              } />
              <Route path="/translation/:id" element={<Translation />} />
              <Route path="/pdf-translation/:id" element={<PDFTranslation />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TranslationProvider>
  );
}

export default App;