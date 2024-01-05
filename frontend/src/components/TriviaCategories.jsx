import React from "react";

function TriviaCategories({ arr, direction }) {
    const className = `trivia-${direction}`;
    return (
        <div className={className}>
            {arr.map((team, i) => (
                <div key={i} className="trivia">
                    <p>{team}</p>
                </div>
            ))}
        </div>
    );
};


export default TriviaCategories;