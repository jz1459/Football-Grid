import React, { useState } from 'react';
import AutoSuggest from 'react-autosuggest';
import data from '../data/roster.json';
function Suggestions(value, ) {
    playerNames = JSON.parse(data).map(player => {
        return Object.keys(player)[0];
    });

    const getSuggestions = value => {
        const inputValue = value.trim().toLowerCase();
        const inputLength = inputValue.length;

        return inputLength === 0 ? [] : playerNames.filter(player =>
            player.name.toLowerCase().slice(0, inputLength) === inputValue
        );
    };

    const getSuggestionValue = suggestion => suggestion.name;

    const renderSuggestion = suggestion => (
        <div>
            {suggestion.name}
        </div>
    );
    
    const [value, setValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    const onChange = (event, { newValue }) => {
        setValue(newValue);
    };

    const onSuggestionsFetchRequested = ({ value }) => {
        setSuggestions(getSuggestions(value))
    };
  
    const onSuggestionsClearRequested = () => {
        setSuggestions([]);
    };

    
    return (
        <Autosuggest
            suggestions={suggestions}
            onSuggestionsFetchRequested={onSuggestionsFetchRequested}
            onSuggestionsClearRequested={onSuggestionsClearRequested}
            getSuggestionValue={getSuggestionValue}
            renderSuggestion={renderSuggestion}
            inputProps={value={value} onChange={onChange}}
      />
    );
};

export default Suggestions;