import React, { useState } from 'react';
import NormalBoard from './NormalBoard';
import { calculateWinner } from '../NormalWinner';

function NormalGame() {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [xIsNext, setXisNext] = useState(true);
    const winner = calculateWinner(board);

    const styles = {
        width: '200px',
        margin: '20px auto',
    };

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
    };

    const renderMoves = () => {
        return <button onClick={() => startGame()}>
            Start Game
        </button>
    };

    return (
        <div className='board'>
            <NormalBoard squares={board} onClick={handleClick} />
            <div style={styles}>
                <p>{winner ? 'Winner: ' + winner : 'Next Player: ' + (xIsNext ? 'X' : 'O')}</p>
                {renderMoves()}
            </div>
        </div>
    );
};

export default NormalGame;