import React, { useState } from 'react';
import NormalBoard from './NormalBoard';
import { calculateWinner } from '../NormalWinner';
import Roster from '../data/roster.json';
import { Container, Row, Col} from "react-bootstrap";
import TriviaCategories from './TriviaCategories';
import PlayerSearch from './PlayerSearch';

function NormalGame() {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [xIsNext, setXisNext] = useState(true);
    const winner = calculateWinner(board);

    const [userInput, setUserInput] = useState("");
    const [modalData, setModalData] = useState(null);
    const showModal = (i) => setModalData(i);
    const hideModal = () => setModalData(null);
    const handleSearch = (event) => {
        setUserInput(event.target.value);
    };


    const checkPlayer = i => {
        const boardCopy = [...board];
        // if sqaure is occupied or game is over, return
        if (winner || boardCopy[i]) return;

        // Grab the trivia parameter indexes
        const x = Math.floor(i / 3);
        const y = i - (3 * x);

        // Fill the square if the value is right
        if (userInput.length !== 0) {
            console.log(userInput.length);
            const values = Roster[userInput];
            if (values && values.includes(triviaRow[y]) && values.includes(triviaColumn[x])) {
                boardCopy[i] = xIsNext ? 'X' : 'O';
                setBoard(boardCopy);
                setXisNext(!xIsNext);
                setUserInput("");
            } else {
                alert("Incorrect Answer!");
                setUserInput("");
                return;
            }
        }
    };


    const handleClick = i => {
        showModal(i);
    };

    const startGame = () => {
        setBoard(Array(9).fill(null));
        setXisNext(true);
        fillTrivia();
    };

    const renderMoves = () => {
        return <button className = "start-game" onClick={() => startGame()}>
            Start Game
        </button>
    };

    const [triviaRow, setTriviaRow] = useState((Array(3).fill(null)));
    const [triviaColumn, setTriviaColumn] = useState((Array(3).fill(null)));
    const teams = ["Bills", "Dolphins", "Patriots", "Jets", "Bengals", "Ravens", "Steelers", "Browns", "Eagles", "Cowboys", "Giants", "Commanders",
            "Vikings", "Lions", "Packers", "Bears", "49ers", "Seahawks", "Rams", "Cardinals", "Buccaneers", "Panthers", "Saints", "Falcons", 
            "Chiefs", "Chargers", "Raiders", "Broncos", "Jaguars", "Titans", "Colts", "Texans"]

    const triviaStyle = {
        background: "lightblue",
        border: "2px solid darkblue",
        fontSize: "30px",
        fontWeight: "800",
        cursor: "pointer",
        outline: "none",
    };

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
                    <div className='title'>
                        Football Tic Tac Toe
                    </div>
                    {modalData && (<PlayerSearch show={modalData} userInput={userInput} onClose={hideModal} handleSearch={handleSearch} search={checkPlayer} data={modalData} />)}
                    <Row>
                        <Col>
                        </Col>
                        <Col>
                            <div className='trivia-row'>{triviaRow}</div>
                        </Col>
                    </Row>
                    <Row>
                        <Col xl={6}>
                            <div className='trivia-col'><TriviaCategories arr={triviaColumn} /></div>
                        </Col>
                        <Col xl={6}>
                            <NormalBoard squares={board} onClick={handleClick} />
                            <div className='message'>
                                <p>{winner ? 'Winner: ' + winner : 'Next Player: ' + (xIsNext ? 'X' : 'O')}</p>
                                {renderMoves()}
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
        </section>
    );
};

export default NormalGame;
