import React from "react";

function TriviaCategories({ arr }) {
    const style = {
        background: "lightblue",
        border: "2px solid darkblue",
        fontSize: "30px",
        fontWeight: "800",
        cursor: "pointer",
        outline: "none",
    };

    return (
        <>
            {arr.map((team, i) => (
                <div key={i} style={style}>
                    {team}
                </div>
            ))}
        </>
    );
};

export default TriviaCategories;