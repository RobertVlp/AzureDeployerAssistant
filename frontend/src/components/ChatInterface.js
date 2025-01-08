import React from 'react';
import ChatBox from "./ChatBox";
import './style.css';

const ChatInterface = () => {
    return (
        <>
            <div className="App">
                <h1 className="page-heading">Azure Deployer Assistant</h1>
            </div>
        
            <ChatBox/>
        </>
    );
}

export default ChatInterface;
