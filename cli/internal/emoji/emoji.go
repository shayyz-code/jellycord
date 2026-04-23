package emoji

import (
	"strings"

	"github.com/kyokomi/emoji/v2"
)

// Map returns a map of all available emoji aliases to their unicode characters.
func Map() map[string]string {
	return emoji.CodeMap()
}

// Replace replaces all emoji aliases in the string with their unicode characters.
func Replace(s string) string {
	return emoji.Sprint(s)
}

// Suggestions returns a list of emoji aliases that start with the given prefix.
func Suggestions(prefix string) []string {
	if !strings.HasPrefix(prefix, ":") {
		return nil
	}
	
	alias := strings.TrimPrefix(prefix, ":")
	var matches []string
	for name := range emoji.CodeMap() {
		// remove the surrounding colons from the name in the map if they exist
		// kyokomi/emoji map keys are usually like ":smile:"
		nameTrimmed := strings.Trim(name, ":")
		if strings.HasPrefix(nameTrimmed, alias) {
			matches = append(matches, name)
		}
	}
	return matches
}
