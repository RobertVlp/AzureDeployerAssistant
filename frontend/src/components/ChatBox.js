import { Container, Row, Form, Button, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import { BsMoonFill, BsSunFill } from 'react-icons/bs';
import { marked } from 'marked';
import './style.css';
import { ThemeContext } from '../App';

function ChatBox() {
    const { darkMode, setDarkMode } = useContext(ThemeContext);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);
    const waitingReplyRef = useRef(false);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const scrollContainer = chatContainerRef.current.querySelector('.messages-container');
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    const handleAction = async (action, url) => {
        const tempMessage = { text: '', type: 'assistant', isLoading: true };

        try {
            setMessages((prevMessages) => [...prevMessages, tempMessage]);
            waitingReplyRef.current = true;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: action })
            });

            if (!response.ok) throw new Error(response.status + response.statusText);

            const data = await response.json();
            
            const assistantResponse = String(data['response'][0]);
            const isPending = assistantResponse.startsWith('The following actions will be performed:');
            let formattedResponse = assistantResponse;

            if (isPending) {
                const jsonStringMatch = assistantResponse.match("({.*})");
                if (jsonStringMatch) {
                    try {
                        const jsonObject = JSON.parse(jsonStringMatch[1]);
                        const prettyJsonString = '\n' + JSON.stringify(jsonObject, null, 4);
                        formattedResponse = assistantResponse.replace(jsonStringMatch[1], prettyJsonString);
                    } catch (error) {
                        console.error('Failed to parse JSON:', error);
                    }
                }
            }

            setMessages((prevMessages) => {
                const filteredMessages = prevMessages.filter(msg => msg !== tempMessage);
                return [...filteredMessages, { 
                    text: formattedResponse, 
                    type: 'assistant', 
                    isPending: isPending 
                }];
            });

        } catch (error) {
            setMessages((prevMessages) => {
                const filteredMessages = prevMessages.filter(msg => msg !== tempMessage);
                return [...filteredMessages, { 
                    text: `An error occurred while processing your request: ${error}`, 
                    type: 'assistant' 
                }];
            });
        } finally {
            waitingReplyRef.current = false;
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const action = inputMessage.trim();
        if (action) {
            const serverUrl = 'http://localhost:5000/send_message';
            if (messages.length > 0 && messages[messages.length - 1].isPending) {
                messages[messages.length - 1].isPending = false;
                setMessages([...messages]);
            }
            setMessages([...messages, { text: inputMessage, type: 'user' }]);
            setInputMessage('');
            await handleAction(action, serverUrl);
        }
    };

    const handleConfirmAction = async (action) => {
        const serverUrl = 'http://localhost:5000/confirm_action';
        messages[messages.length - 1].isPending = false;
        setMessages([...messages]);
        await handleAction(action, serverUrl);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const handleKeyDown = async (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !waitingReplyRef.current) {
            event.preventDefault();
            await handleSubmit(event);
        }
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <Container className={darkMode ? 'dark-mode' : ''}>
            <Button 
                onClick={toggleDarkMode} 
                className="theme-toggle-button"
                variant={darkMode ? 'dark' : 'light'}
            >
                {darkMode ? <BsSunFill style={{ color: 'white' }}/> : <BsMoonFill />}
            </Button>
            <Row className="justify-content-md-center" style={{ width: '70%', margin: 'auto' }}>
                <Container className="chat-box" ref={chatContainerRef}>
                    <div className="messages-container">
                        <ListGroup className='d-grid'>
                            {messages.map((msg, index) => (
                                <ListGroup.Item key={index} className={msg.type === 'user' ? 'user-message' : 'assistant-message'} style={{ borderRadius: '1.25em' }}>
                                    <strong>{msg.type === 'user' ? 'You: ' : 'Assistant: '}</strong>
                                    {msg.isLoading && <Spinner animation="border" size="sm" />}
                                    {msg.type === 'user' ? msg.text : !msg.isLoading && <div className='assistant-response' dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}></div>}
                                    {msg.type === 'assistant' && msg.isPending && (
                                        <Container className="d-flex mt-2">
                                            <Button className='confirm-action-button' variant="primary" onClick={() => handleConfirmAction('Yes')}>Yes</Button>
                                            <Button className='confirm-action-button' variant="secondary" onClick={() => handleConfirmAction('No')}>No</Button>
                                        </Container>
                                    )}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
                    <div className="chat-input-container">
                        <Form onSubmit={handleSubmit} className="d-flex justify-content-center">
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
                                <Button type="submit" variant={darkMode ? 'light' : 'dark'} disabled={waitingReplyRef.current}>
                                    <FaPaperPlane/>
                                </Button>
                            </InputGroup>
                        </Form>
                    </div>
                </Container>
            </Row>
        </Container>
    );
}

export default ChatBox;
