// PlayerSearch.jsx

import React from "react";
import { Modal, Row, Container } from "react-bootstrap";
import Autosuggest from 'react-autosuggest';

function PlayerSearch({ 
    show, 
    onClose, 
    handleSearch, 
    userInput, 
    setUserInput,    
    checkPlayer, 
    modalData,
    suggestions,
    onSuggestionsFetchRequested,
    onSuggestionsClearRequested,
    getSuggestionValue
})
{
    const handleCLick = () => {
        checkPlayer(modalData);
        onClose();
    };

    // Autosuggest component's props
    const inputProps = {
        placeholder: "Type a player's name",
        value: userInput,
        onChange: handleSearch
    };

    // Use your imagination to render suggestions.
    const renderSuggestion = suggestion => (
        <div className="suggestion-item">
            {suggestion.name} ({suggestion.position})
        </div>
    );

    return (
        <Modal
            show={show}
            onHide={onClose}
            keyboard={true}
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="search-title">
                    <Container>
                    <Row>
                    <h1>Search Player</h1> </Row>
                        <Row><h2>*Note only players from 2013-2022 are elgible</h2> </Row>
                        </Container>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="search-bar">
                    <div className="autosuggest-container">
                        <Autosuggest
                            suggestions={suggestions}
                            onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                            onSuggestionsClearRequested={onSuggestionsClearRequested}
                            getSuggestionValue={getSuggestionValue}
                            renderSuggestion={renderSuggestion}
                            inputProps={inputProps}
                            onSuggestionSelected={(event, { suggestion }) => {
                                // Autofill the search bar and close the suggestion list
                                setUserInput(getSuggestionValue(suggestion)); // Updated to use setUserInput
                                onSuggestionsClearRequested();
                            }}
                        />
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button className="search-close" onClick={onClose}>Close</button>
                <button className="search-button" onClick={() => { handleCLick() }}>Search</button>
            </Modal.Footer>
        </Modal>
    );
};

export default PlayerSearch;
