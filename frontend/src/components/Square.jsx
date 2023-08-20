import React from "react";

function Square({value, handleClick}) {
    const style = {
        background: "lightblue",
        border: "2px solid black",
        fontSize: "30px",
        fontWeight: "800",
        cursor: "pointer",
        outline: "none",
    };
    
    return (
        <button className="square" style={style} onClick={handleClick}>
            {value}
        </button>
    );
};

export default Square;