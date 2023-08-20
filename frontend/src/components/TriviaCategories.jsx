import React from "react";

function TriviaCategories({ arr }) {
    const styles = {
        border: '4px solid black',
        borderRadius: '10px',
        width: '200px',
        height: '200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
    };

    return (
        <>
            {arr.map((team, i) => (
                <div key={i} className="trivia" style={styles}>
                    {team}
                </div>
            ))}
        </>
    );
};

export default TriviaCategories;