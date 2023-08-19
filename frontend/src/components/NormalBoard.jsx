import React from "react";
import Square from "./Square";

function NormalBoard({squares, onClick}) {
    const styles = {
        border: '4px solid black',
        borderRadius: '10px',
        width: '250px',
        height: '250px',
        margin: '0 auto',
        display: 'grid',
        gridTemplate: 'repeat(3, 1fr) / repeat(3, 1fr)'
    };

    return (
        <div className="board" style={styles}>
            {squares.map((square, i) => (
                <Square key={i} value={square} handleClick={() => onClick(i)} />
            ))}
        </div>
    );
};

export default NormalBoard;