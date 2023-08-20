import React from "react";

function TriviaCategories({ arr }) {
    return (
        <div className="trivia-arr">
            {arr.map((team, i) => (
                <li key={i} className="trivia">
                    <p>{team}</p>
                </li>
            ))}
        </div>
    );
};

export default TriviaCategories;