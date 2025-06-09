import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { FaCopy } from 'react-icons/fa';
import { useContext } from 'react';
import { ThemeContext } from '../App';

export default function ResourceModal({ resource, handleClose, show }) {
    const { darkMode } = useContext(ThemeContext);
    const examplePrompts = {
        "Resource Groups": `
            Create a new resource group named <code>&lt;resource-group-name&gt;</code> in the <b>eastus</b> region.
        `,
        "Storage": `
            Deploy a new storage account named <code>&lt;storage-account-name&gt;</code> in the <b>westus</b> region and within the resource group <code>&lt;resource-group-name&gt;</code>.
        `,
        "Virtual Machines": `
            Deploy a VM with the following specs:<br />
            &nbsp;&nbsp;- name: <code>&lt;vm-name&gt;</code><br />
            &nbsp;&nbsp;- resource group: <code>&lt;resource-group-name&gt;</code><br />
            &nbsp;&nbsp;- location: <b>eastus</b><br />
            &nbsp;&nbsp;- admin username: <code>&lt;username&gt;</code><br />
            &nbsp;&nbsp;- admin password: <code>&lt;password&gt;</code><br />
            &nbsp;&nbsp;- image: <b>ubuntu 18.04</b><br />
            Use default options for the remaining settings.<br />
            Keep in mind that the VM should be low-cost.
        `,
        "Networking": `
            Set up a virtual network named <code>&lt;vnet-name&gt;</code> in the <b>westus</b> region within the resource group <code>&lt;resource-group-name&gt;</code>. Use the default address space.
        `,
        "Key Vault": `
            Create a key vault named <code>&lt;vault-name&gt;</code> in the <b>eastus</b> region and inside the resource group <code>&lt;resource-group-name&gt;</code>. Add the following access policies: for object id <code>&lt;object-id&gt;</code> in the tenant <code>&lt;tenant-id&gt;</code>, get, list and delete for keys and secrets.
        `,
        "Function Apps": `
            Create a function app named <code>&lt;function-app-name&gt;</code> in the location <b>eastus2</b>. Use the resource group <code>&lt;resource-group-name&gt;</code> and storage account <code>&lt;storage-account-name&gt;</code>. The runtime stack should be .NET 8.0 LTS and the hosting plan should be consumption. For the operating system, use windows.
        `,
        "Redis Cache": `
            Deploy a redis cache named <code>&lt;redis-cache-name&gt;</code> in the <b>centralus</b> region, within the resource group <code>&lt;resource-group-name&gt;</code>. Use a low-cost cache size and consumption plan.
        `
    };

    const copyToClipboard = () => {
        const element = document.createElement('div');
        element.innerHTML = examplePrompts[resource];
        const textContent = element.textContent || element.innerText || '';
        const trimmedText = textContent.trim();
        navigator.clipboard.writeText(trimmedText);
    };

    return (
        <Modal show={show} onHide={handleClose} contentClassName={darkMode ? 'dark-mode' : ''}>
            <Modal.Header className={darkMode ? 'dark-mode' : ''} closeButton>
                <Modal.Title>Example prompt</Modal.Title>
            </Modal.Header>
            <Modal.Body className={darkMode ? 'dark-mode' : ''}>
                <span dangerouslySetInnerHTML={{ __html: examplePrompts[resource] }} />
            </Modal.Body>
            <Modal.Footer className={darkMode ? 'dark-mode' : ''}>
                <Button variant="secondary" onClick={copyToClipboard}>
                    <FaCopy />
                </Button>
                <Button variant="primary" onClick={handleClose} href="/chat">
                    Try it out
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
