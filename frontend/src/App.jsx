import React, { createContext, useState } from 'react';
import ChatInterface from './components/ChatInterface';

export const ThemeContext = createContext();

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <div className={darkMode ? 'dark-mode' : ''}>
        <ChatInterface />
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
