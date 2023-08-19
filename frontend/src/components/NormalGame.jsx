import React, { useState } from 'react';
import NormalBoard from './NormalBoard';
import { calculateWinner } from '../NormalWinner';
import Roster from '../data/roster.json';
import { Container, Row, Col } from "react-bootstrap";
import TriviaCategories from './TriviaCategories';

function NormalGame() {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [xIsNext, setXisNext] = useState(true);
    const winner = calculateWinner(board);

    const styles = {
        width: '200px',
        margin: '20px auto',
    };

    console.log(Roster["Jon Feliciano (OL)"])

    const handleClick = i => {
        const boardCopy = [...board];
        // if sqaure is occupied or game is over, return
        if (winner || boardCopy[i]) return;
        // Fill the square
        boardCopy[i] = xIsNext ? 'X' : 'O';
        setBoard(boardCopy);
        setXisNext(!xIsNext);
    };

    const startGame = () => {
        setBoard(Array(9).fill(null));
        setXisNext(true);
        fillTrivia();
    };

    const renderMoves = () => {
        return <button onClick={() => startGame()}>
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
        <div className='board'>
            <Container>
                <Row>
                    <Col>
                        Football Tic Tac Toe
                    </Col>
                    <Col>
                        <div className='trivia-row' style={triviaStyle}>{triviaRow}</div>
                    </Col></Row>
                <Row>
                    <Col>
                        <div className='trivia-col'><TriviaCategories arr={triviaColumn} /></div>
                    </Col>
                    <Col>
                        <NormalBoard squares={board} onClick={handleClick} />
                        <div style={styles}>
                            <p>{winner ? 'Winner: ' + winner : 'Next Player: ' + (xIsNext ? 'X' : 'O')}</p>
                            {renderMoves()}
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default NormalGame;