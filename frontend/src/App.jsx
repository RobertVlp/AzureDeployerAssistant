import React, { createContext, useState } from 'react';
import  { BrowserRouter, Route, Routes } from 'react-router-dom';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';

export const ThemeContext = createContext();

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' || false;
  });

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <div className={darkMode ? 'dark-mode' : ''}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/chat" element={<ChatInterface />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
