import { ThemeContext } from "../App";
import React, { useContext } from "react";
import { Button } from "react-bootstrap";
import { BsMoonFill, BsSunFill } from "react-icons/bs";

export default function DarkModeButton() {
    const { darkMode, setDarkMode } = useContext(ThemeContext);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        localStorage.setItem('darkMode', !darkMode);
    };

    return (
        <Button 
            onClick={toggleDarkMode}
            className="theme-toggle-button"
            variant={darkMode ? 'dark' : 'light'}
        >
            {darkMode ? <BsSunFill style={{ color: 'white' }}/> : <BsMoonFill />}
        </Button>
    );
}
