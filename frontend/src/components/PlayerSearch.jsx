import React from "react";
import {Modal} from "react-bootstrap";

function PlayerSearch({ show, onClose, handleSearch, userInput, search, data}) {
    const handleCLick = () => {
        search(data);
        onClose()
    };

    return (
        <Modal 
            show={show}
            onHide={onClose}
            keyboard={true}
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header>
                <Modal.Title>
                    Search Player
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="search-bar">
                    <input type="text" name="player" placeholder="Enter Player Name" value={userInput} onChange={(event) => handleSearch(event)} />
                    <button onClick={() => { handleCLick() }}>Enter</button>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button className="search-close" onClick={onClose}>Close</button>
            </Modal.Footer>
            </Modal>
    );
};

export default PlayerSearch;