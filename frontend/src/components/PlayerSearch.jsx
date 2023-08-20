import React from "react";
import {Modal} from "react-bootstrap";

function PlayerSearch({ show, onClose, handleSearch, userInput, checkPlayer, modalData}) {
    const handleCLick = () => {
        checkPlayer(modalData);
        onClose();
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
                <div className="search-title">
                    <h1>Search Player</h1>
                </div>
            </Modal.Header>
            <Modal.Body>
                <div className="search-bar">
                    <input type="text" name="player" placeholder="Enter Player Name" value={userInput} onChange={(event) => handleSearch(event)} />
                    <button onClick={() => { handleCLick() }}>Search</button>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button className="search-close" onClick={onClose}>Close</button>
            </Modal.Footer>
        </Modal>
    );
};

export default PlayerSearch;