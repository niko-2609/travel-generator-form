export function formatSuggestions(inputString:string ) {
    // Split the string into an array of words
    const words = inputString.split(' ');
  
    // Check if there are enough words
    if (words.length <= 3) {
      return inputString; // Return the original string if it has 3 or fewer words
    }
  
    // Select the first two words and the last word
    const trimmedString = [...words.slice(0, 3), words[words.length - 1]].join(' ');
  
    return trimmedString;
  }