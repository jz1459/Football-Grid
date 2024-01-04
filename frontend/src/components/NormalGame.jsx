import React, { useState } from 'react';
import NormalBoard from './NormalBoard';
import { calculateWinner } from '../NormalWinner';
import Roster from '../data/roster.json';
import { Container, Row, Col} from "react-bootstrap";
import TriviaCategories from './TriviaCategories';
import PlayerSearch from './PlayerSearch';
import axios from 'axios';
import Autosuggest from 'react-autosuggest';

function NormalGame() {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [xIsNext, setXisNext] = useState(true);
    const [newGame, setNewGame] = useState(false);
    const winner = calculateWinner(board);

    const [userInput, setUserInput] = useState("");
    const [modalData, setModalData] = useState(null);
    const [show, setShow] = useState(false);

    const [suggestions, setSuggestions] = useState([]);
    const [value, setValue] = useState("");

    // Teach Autosuggest how to calculate suggestions for any given input value.
    const getSuggestions = async (value) => {
        const inputValue = value.trim().toLowerCase();
        const inputLength = inputValue.length;
        
        if(inputLength === 0) return [];
        
        try {
            const response = await axios.post('http://localhost:5000/search_players', { searchTerm: value });
            return response.data;  // Returns a list of suggestions
        } catch (error) {
            console.error('Error fetching data: ', error);
            return [];
        }
    };

     // Autosuggest will call this function every time you need to update suggestions.
    const onSuggestionsFetchRequested = async ({ value }) => {
        setSuggestions(await getSuggestions(value));
    };

    // Autosuggest will call this function every time you need to clear suggestions.
    const onSuggestionsClearRequested = () => {
        setSuggestions([]);
    };

    // // Use your imagination to render suggestions.
    // const renderSuggestion = suggestion => (
    //     <div>
    //         {suggestion.name} ({suggestion.position})
    //     </div>
    // );

    const onChange = (event, { newValue }) => {
        setValue(newValue);
    };

    const handleSearchChange = (event, { newValue }) => {
        setUserInput(newValue);
    };

    // Autosuggest component's props
    const inputProps = {
        placeholder: "Type a player's name",
        value,
        onChange: onChange
    };

    // When suggestion is clicked, Autosuggest needs to populate the input
    // based on the clicked suggestion. Teach Autosuggest how to calculate the
    // input value for every given suggestion.
    const getSuggestionValue = suggestion => suggestion.name + ' (' + suggestion.position + ')';

    const showModal = (i) => {
        if (!winner && newGame === true) {
            setModalData(i);
            setShow(true);
        }
    };

    const hideModal = () => {
        setModalData(null);
        setShow(false);
    }
    const handleSearch = (event) => {
        setUserInput(event.target.value);
    };

    const checkPlayer = async (i) => {
        const boardCopy = [...board];
        if (winner || boardCopy[i]) return;

        const x = Math.floor(i / 3);
        const y = i - (3 * x);

        if (userInput.length !== 0) {
            try {
                // Extract the player's name from userInput before sending it to the endpoint
                // Assuming the format is "PlayerName (Position)"
                const playerName = userInput.split(' (')[0]; // This will get just the name part

                console.log(playerName); // Log the extracted player name

                const response = await axios.post('http://localhost:5000/get_player', { playerName: playerName });
                const values = response.data;

                if (values && values.includes(triviaRow[y]) && values.includes(triviaColumn[x])) {
                    boardCopy[i] = xIsNext ? 'X' : 'O';
                    setBoard(boardCopy);
                    setXisNext(!xIsNext);
                    setUserInput("");
                } else {
                    alert("Incorrect Answer!");
                    setUserInput("");
                }
            } catch (error) {
                console.error('Error fetching data: ', error);
                alert("Player not found or error fetching player data.");
                setUserInput("");
            }
        }
    };
    // const checkPlayer = (i) => {
    //     const boardCopy = [...board];
    //     // if sqaure is occupied or game is over, return
    //     if (winner || boardCopy[i]) return;

    //     // Grab the trivia parameter indexes
    //     const x = Math.floor(i / 3);
    //     const y = i - (3 * x);

    //     // Fill the square if the value is right
    //     if (userInput.length !== 0) {
    //         console.log(userInput.length);
    //         const values = Roster[userInput];
    //         if (values && values.includes(triviaRow[y]) && values.includes(triviaColumn[x])) {
    //             boardCopy[i] = xIsNext ? 'X' : 'O';
    //             setBoard(boardCopy);
    //             setXisNext(!xIsNext);
    //             setUserInput("");
    //         } else {
    //             alert("Incorrect Answer!");
    //             setUserInput("");
    //             return;
    //         }
    //     }
    // };


    const startGame = () => {
        setBoard(Array(9).fill(null));
        setNewGame(true);
        setXisNext(true);
        fillTrivia();
    };

    const renderMoves = () => {
        return <button className = "start-game" onClick={() => startGame()}>
            {newGame ? "New Game" : "Start Game"}
        </button>
    };

    const [triviaRow, setTriviaRow] = useState((Array(3).fill(null)));
    const [triviaColumn, setTriviaColumn] = useState((Array(3).fill(null)));
    // const teams = ["Bills", "Dolphins", "Patriots", "Jets", "Bengals", "Ravens", "Steelers", "Browns", "Eagles", "Cowboys", "Giants", "Commanders",
    //     "Vikings", "Lions", "Packers", "Bears", "49ers", "Seahawks", "Rams", "Cardinals", "Buccaneers", "Panthers", "Saints", "Falcons",
    //     "Chiefs", "Chargers", "Raiders", "Broncos", "Jaguars", "Titans", "Colts", "Texans"];
    const teams = [
        "Arizona Cardinals",
        "Atlanta Falcons",
        "Baltimore Ravens",
        "Buffalo Bills",
        "Carolina Panthers",
        "Chicago Bears",
        "Cincinnati Bengals",
        "Cleveland Browns",
        "Dallas Cowboys",
        "Denver Broncos",
        "Detroit Lions",
        "Green Bay Packers",
        "Houston Texans",
        "Indianapolis Colts",
        "Jacksonville Jaguars",
        "Kansas City Chiefs",
        "Las Vegas Raiders",
        "Los Angeles Chargers",
        "Los Angeles Rams",
        "Miami Dolphins",
        "Minnesota Vikings",
        "New England Patriots",
        "New Orleans Saints",
        "New York Giants",
        "New York Jets",
        "Philadelphia Eagles",
        "Pittsburgh Steelers",
        "San Francisco 49ers",
        "Seattle Seahawks",
        "Tampa Bay Buccaneers",
        "Tennessee Titans",
        "Washington Commanders"
    ];

    const length = teams.length;

    const fillTrivia = () => {
        // setTriviaRow(["Bills", "Bills", "Bills"]);
        // setTriviaColumn(["Giants", "Giants", "Giants"]);
        var usedRow = [];
        var usedCol = [];
        var usedIndexes = [];
        while (usedIndexes.length < 6) {
            var index = Math.floor(Math.random() * length);
            if (usedIndexes.indexOf(index) === -1) {
                usedIndexes.push(index)
                if (usedIndexes.length < 4) {
                    usedRow.push(teams[index])
                } else {
                    usedCol.push(teams[index])
                }
            }  
        };
        setTriviaRow(usedRow);
        setTriviaColumn(usedCol);
    };

    return (
        <section className='game' id='game'>
            <div>
                <Container>
                    <div className='proj-modal'>
                        {/* {show && (<PlayerSearch show={show} userInput={userInput} onClose={hideModal} handleSearch={handleSearch} checkPlayer={checkPlayer} modalData={modalData} />)} */}
                        {show && <PlayerSearch
                    show={show}
                    onClose={() => setShow(false)}
                    handleSearch={handleSearchChange}
                    userInput={userInput}
                    setUserInput= {setUserInput}        
                    checkPlayer={checkPlayer}
                    modalData={modalData}
                    suggestions={suggestions}
                    onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                    onSuggestionsClearRequested={onSuggestionsClearRequested}
                    getSuggestionValue={getSuggestionValue}
                />}
                    </div>
                    <Row>
                        <div className='title'>
                            <h1>Football Tic Tac Toe</h1>
                        </div>
                    </Row>
                    <Row>
                        <div className='trivia-row'><TriviaCategories arr={triviaRow} /></div>
                    </Row>
                    <Row>
                        <Col xl={5}>
                            <div className='trivia-col'><TriviaCategories arr={triviaColumn} /></div>
                        </Col>
                        <Col xl={7}>
                            <NormalBoard squares={board} onClick={(i) => {showModal(i)}} />
                            <div className='message'>
                                <p>{winner ? 'Winner: ' + winner : 'Next Player: ' + (xIsNext ? 'X' : 'O')}</p>
                                {renderMoves()}
                            </div>
                        </Col>
                    </Row>
                    {/* <Autosuggest
                        suggestions={suggestions}
                        onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                        onSuggestionsClearRequested={onSuggestionsClearRequested}
                        getSuggestionValue={getSuggestionValue}
                        renderSuggestion={renderSuggestion}
                        inputProps={inputProps}
                        /> */}
                </Container> 
            </div>
        </section>
    );
};

export default NormalGame;
