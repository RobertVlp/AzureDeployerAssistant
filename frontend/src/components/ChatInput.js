import React, { useState, useRef, useEffect } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { FaPaperPlane } from 'react-icons/fa';

function ChatInput({ onSubmit, isWaitingReply, darkMode }) {
    const [inputMessage, setInputMessage] = useState('');
    const textareaRef = useRef(null);

    const handleSubmitAsync = async (event) => {
        event.preventDefault();
        const message = inputMessage.trim();
        if (message && !isWaitingReply) {
            setInputMessage('');
            await onSubmit(message);
        }
    };

    const handleKeyDown = async (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !isWaitingReply) {
            event.preventDefault();
            await handleSubmitAsync(event);
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            const scrollPosition = window.scrollY;
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
            if (window.scrollY !== scrollPosition) {
                window.scrollTo({ top: scrollPosition, behavior: 'instant' });
            }
        }
    }, [inputMessage]);

    return (
        <div className="chat-input-container">
            <Form onSubmit={handleSubmitAsync} className="d-flex justify-content-center">
                <InputGroup className="input-group-width">
                    <Form.Control
                        as="textarea"
                        rows={1}
                        name="prompt"
                        placeholder="Enter your message here"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        ref={textareaRef}
                        style={{ overflowY: 'auto' }}
                        onKeyDown={handleKeyDown}
                    />
                    <Button 
                        type="submit" 
                        variant={darkMode ? 'light' : 'dark'} 
                        disabled={isWaitingReply}
                    >
                        <FaPaperPlane/>
                    </Button>
                </InputGroup>
            </Form>
        </div>
    );
}

export default ChatInput;