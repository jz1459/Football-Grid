import React from "react";

function Square(props) {
    const style = {
        background: "lightblue",
        border: "2px solid darkblue",
        fontSize: "30px",
        fontWeight: "800",
        cursor: "pointer",
        outline: "none",
    };
    
    return (
        <button className="block" style={style} onClick={props.handleClick}>
            {props.value}
        </button>
    );
};

export default Square;