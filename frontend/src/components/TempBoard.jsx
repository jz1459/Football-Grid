import React from "react";
import Square from "./Square";

function TempBoard({ squares, onClick, style, n }) {
    const constructBoard = (n) => {
        const boardArray = []
        for (let i = 0; i < (n * n); i++) {
            boardArray.push(<Square handleClick={() => onClick(i)} key={i} value={squares[i]} />);
        };
        return boardArray;
    };
    return (
        
        <div className="board" style={style}>
            {/* {squares.map((square, i) => {
                <Square key={i} value={square} handleClick = {() => onClick(i)} />
            })} */}
            {constructBoard(n)}
            <h1>    </h1>
        </div>
    );
};

export default TempBoard;