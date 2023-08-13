import React, { useState } from "react";
import Square from "./Square";

function Board(props) {
    const boardSize = props.boardSize;
    const [board, setBoard] = useState(Array(boardSize * boardSize).fill(null));
    const [player2Next, setPlayer2Next] = useState(true);
    const [message, setMessage] = useState("Football Grid Tic Tac Toe!");

    const style = {
        display: 'grid',
        gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
        gridGap: '1px',
        margin: '100px'
    };

    const constructBoard = (n) => {
        const boardArray = []
        for (let i = 0; i < (n * n); i++) {
            boardArray.push(<Square handleClick={() => handleClick(i)} key={i} value={board[i]} />);
        };
        return boardArray;
    };

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
        const size = parseInt(boardSize);
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

    const winner = calculateWinner(board);
    if (winner) {
        setMessage("Winner: " + winner);
    } else {
        setMessage(player2Next ? "X's" : "O's" + "turn");
    }

    return (
        <div>
            <div className="message">{message}</div>
            <div className="board" style={style}>
                {constructBoard(boardSize)}
            </div>
        </div>
    );
};

export default Board;


// import React, { useState } from 'react'
// import Square from './Square'

// function Board(props) {
//   const boardSize = props.boardSize
//   const [blocks, setBlocks] = useState(Array(boardSize*boardSize).fill(null))
//   const [xIsNext, setXIsNext] = useState(true)
  
//   const style = {
//     display: 'grid',
//     gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
//     gridGap: '1px',
//     margin: '100px'
//   }
  
//   // generate n * n blocks
//   function renderBlocks(n) {
//     const genBlocks = []
//     for(let i = 0; i < n*n; i++) {
//       genBlocks.push(<Square handleClick={() => handleClick(i)} key={i} value={blocks[i]} />)
//     }
//     return genBlocks
//   }

//   // fill block on click with X or O
//   function handleClick(i) {
//     const newBlocks = [...blocks]
//     // return if match ended or block already filled
//     if(calculateWinner(blocks) || blocks[i]) {
//       return
//     }
//     newBlocks[i] = xIsNext ? 'X' : 'O'
//     setBlocks(newBlocks)
//     setXIsNext(!xIsNext)
//   }

//   function winningConditionsGen() {
//     var size = parseInt(boardSize);
//     var totalSquares = size * size;
//     var numOfArr = size * 2;
//     var wArr = new Array(numOfArr);
//     var diagStrk1 = '';
//     var diagStrk2 = '';

//     for (var j = 0; j < size; j++) {
//       let horiStrk = '';
//       let vertiStrk = '';
//       for (var i = 0; i < totalSquares; i++) {
//         if (i / size === j) {
//           horiStrk += i + ",";
//           for (var k = 1; k < size; k++) {
//             horiStrk += i + k + ",";
//           }
//         }
//         if (i % size === j) {
//           vertiStrk += i + ",";
//         }
//       }
//       horiStrk = horiStrk.substring(0, horiStrk.length - 1);
//       vertiStrk = vertiStrk.substring(0, vertiStrk.length - 1);
//       var h = horiStrk.split(",");
//       var v = vertiStrk.split(",");

//       wArr[j] = v;
//       wArr[j + size] = h;
//       diagStrk1 += j * (size + 1) + ",";
//       diagStrk2 += (j + 1) * (size - 1) + ",";
//     }
//     diagStrk1 = diagStrk1.substring(0, diagStrk1.length - 1);
//     diagStrk1 = diagStrk1.split(",");
//     wArr.push(diagStrk1);

//     diagStrk2 = diagStrk2.substring(0, diagStrk2.length - 1);
//     diagStrk2 = diagStrk2.split(",");
//     wArr.push(diagStrk2);
//     //console.log(diagStrk2);
//     const winCondition = wArr;
//     //console.log("win condition: ", winCondition)
//     return winCondition
//   }

//   function calculateWinner(squares) {
//     const lines = winningConditionsGen()
//     for(let i = 0; i < lines.length; i++) {
//       for(let j = 0; j < lines[i].length; j++) {
//         if(squares[lines[i][j]] && squares[lines[i][j]]) {
//           if(lines[i].every((val, index, arr) => squares[val] === squares[arr[0]])) {
//             return squares[lines[i][j]]
//           }
//         }
//       }
//     }
//     const newSquares = squares.filter(Boolean)
//     if(newSquares.length === squares.length) {
//       console.log("draw")
//     }
//     console.log('newSquares: ', newSquares)
//     console.log('square: ', squares)
//     console.log('lines: ', lines)
//     return null;
//   }

//   let status
//   const winner = calculateWinner(blocks)
//   if(winner) {
//     status = 'Winner: ' + winner
//   } else {
//     status = (xIsNext ? 'X' : 'O') + ' turn'
//   }

//   return (
//     <div>
//       <div className="status">{status}</div>
//       <div className="board" style={style}>
//         { renderBlocks(boardSize) }
//       </div>
//     </div>
//   )
// }

// export default Board