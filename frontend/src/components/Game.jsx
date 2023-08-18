import React, {useState} from "react";
import Board from "./Board";

function Game() {
    const [boardSize, setBoardSize] = useState(null);
    const [newGame, setNewGame] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        setNewGame(true);
    };
    

    return (
        <div className="Game">
            {
                newGame ?
                    <div className="game-board">
                        <Board boardSize={boardSize} />
                    </div>
                    :
                    <h1>Choose a grid size to start the game.</h1>
            }
            <input type="text" placeholder="Enter a grid size" id="boardSize" onChange={(event) => setBoardSize(event.target.value)} />
            <button type = "submit" className="submitButton" onClick={(event) => handleSubmit(event)}>Start Game</button>
        </div>
    );
};
    
export default Game;