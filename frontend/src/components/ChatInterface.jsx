import React from 'react';
import ChatBox from "./ChatBox";
import { ThemeContext } from '../App';
import { BsMoonFill, BsSunFill } from 'react-icons/bs';
import { Button } from 'react-bootstrap';
import { useContext } from 'react';

const ChatInterface = () => {
    const { darkMode, setDarkMode } = useContext(ThemeContext);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <div className="chat-interface">
            <h1 className="page-heading">Cloud Resource AI Bot</h1>
            <Button 
                onClick={toggleDarkMode} 
                className="theme-toggle-button"
                variant={darkMode ? 'dark' : 'light'}
            >
                {darkMode ? <BsSunFill style={{ color: 'white' }}/> : <BsMoonFill />}
            </Button>
            <ChatBox darkMode={darkMode} />
        </div>
    );
}

export default ChatInterface;
