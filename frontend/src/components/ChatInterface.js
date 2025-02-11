import React from 'react';
import ChatBox from "./ChatBox";
import './style.css';

const ChatInterface = () => {
    return (
        <div className="chat-interface">
            <h1 className="page-heading">Cloud Resource AI Bot</h1>
            <ChatBox/>
        </div>
    );
}

export default ChatInterface;
