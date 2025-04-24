import React from "react";
import { Button, Card } from "react-bootstrap";
import DarkModeButton from "./DarkModeButton";

export default function LandingPage() {
    const services = [
        { name: "Resource Groups", description: "Manage and organize your Azure resources.", icon: "fas fa-layer-group" },
        { name: "Storage", description: "Efficiently store and manage essential data for your application.", icon: "fas fa-database" },
        { name: "Virtual Machines", description: "Create and manage virtual machines in the cloud.", icon: "fas fa-server" },
        { name: "Networking", description: "Set up and manage networking resources.", icon: "fas fa-network-wired" },
        { name: "Key Vault", description: "Safeguard cryptographic keys and secrets.", icon: "fas fa-key" },
        { name: "Function Apps", description: "Run event-driven code without managing infrastructure.", icon: "fas fa-bolt" },
        { name: "Redis Cache", description: "Improve application performance with caching.", icon: "fas fa-memory" }
    ];

    return (
        <div className="landing-page-container">
            <div className="landing-page">
                <div className="landing-header">
                    <h1><a href="/">Cloud Resource AI Bot</a></h1>
                    <DarkModeButton />
                </div>
                <div className="services-container">
                    <div className="service-list">
                        {services.map((service, index) => (
                            <Card key={index} className="service-card">
                                <Card.Body>
                                    <Card.Title><i className={service.icon}></i> {service.name}</Card.Title>
                                    <Card.Text>{service.description}</Card.Text>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                </div>
                <div className="start-chat-button-container">
                    <p>Get personalized assistance with your Azure resources.</p>
                    <Button variant="primary" href="/chat">
                        Chat with CRAB
                    </Button>
                </div>
            </div>
            <footer className="landing-footer">
                <p>&copy; 2025 Cloud Resource AI Bot</p>
            </footer>
        </div>
    );
}
