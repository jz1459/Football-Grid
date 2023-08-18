import React, {useState, useEffect} from "react";
import TempBoard from "./TempBoard";

function TempGame() {
    const [boardSize, setBoardSize] = useState(null);
    const [newGame, setNewGame] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        setNewGame(true);
        setBoard(Array(boardSize * boardSize).fill(null))
    };

    const [board, setBoard] = useState(Array(boardSize * boardSize).fill(null));
    const [player2Next, setPlayer2Next] = useState(true);
    const [message, setMessage] = useState("Football Grid Tic Tac Toe!");

    const style = {
        display: 'grid',
        gridTemplateColumns: `repeat(${boardSize}, 10px)`,
        gridGap: '10px',
        margin: '50px'
    };

    // const constructBoard = (n) => {
    //     const boardArray = []
    //     for (let i = 0; i < (n * n); i++) {
    //         boardArray.push(<Square handleClick={() => handleClick(i)} key={i} value={board[i]} />);
    //     };
    //     return boardArray;
    // };

    const handleClick = (i) => {
        const newSquares = [...board]
        if (calculateWinner(board) || board[i]) {
            return
        } else {
            newSquares[i] = player2Next ? 'X' : 'O';
            setBoard(newSquares);
            setPlayer2Next(false);
        }
    };

    const calculateWinner = (arr) => {
        const size = boardSize
        const rows = new Array(size).fill(0);
        const cols = new Array(size).fill(0);
        const diag = new Array(2).fill(0);

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const square = arr[row * size + col];
                if (square === 'X') {
                    rows[row]++;
                    cols[col]++;
                } else if (square === 'O') {
                    rows[row]--;
                    cols[col]--;
                }

                if (row === col) {
                    diag[0] += square === "X" ? 1 : -1;
                }

                if (row === size - col - 1) {
                    diag[1] += square === "X" ? 1 : -1;
                }
            };
        };

        for (let i = 0; i < size; i++) {
            if (rows[i] === size || cols[i] === size) {
                return "X";
            } else if (rows[i] === -size || cols[i] === -size) {
                return "O";
            }
        };

        if (diag[0] === size || diag[1] === size) {
            return "X";
        } else if (diag[0] === -size || diag[1] === -size) {
            return "O";
        }

        return null;
    };

    // const winner = calculateWinner(board);

    useEffect(() => {
        const winner = calculateWinner(board)
        if (winner) {
        setMessage("Winner: " + winner);
        } else {
        setMessage(player2Next ? "X's" : "O's" + "turn");
        }
    });

    return (
        <div className="Game">
            {
                newGame ?
                    <div className="game-board">
                        <div className="message">{message}</div>
                        <TempBoard squares={board} onClick={handleClick} style={style} n={boardSize} />
                    </div>
                    : <h1>Choose a grid size to start the game.</h1>
            }
            <input type="text" placeholder="Enter a grid size" id="boardSize" onChange={(event) => setBoardSize(event.target.value)} />
            <button type = "submit" className="submitButton" onClick={(event) => handleSubmit(event)}>Start Game</button>
        </div>
    );
};
    
export default TempGame;