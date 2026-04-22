package main

import (
	"flag"
	"fmt"
)

func main() {
	var (
		server = flag.String("server", "http://localhost:8080", "server base URL")
	)
	flag.Parse()

	fmt.Print(jellyCordBanner())
	fmt.Printf("\nServer: %s\n\n", *server)
	fmt.Println("Next: auth + rooms + chat (coming in the next steps).")
}

func jellyCordBanner() string {
	return `
       _      _ _        _____              _ 
      | |    | | |      / ____|            | |
      | | ___| | |_   _| |     ___  _ __ __| |
  _   | |/ _ \ | | | | | |    / _ \| '__/ _` + "`" + ` |
 | |__| |  __/ | | |_| | |___| (_) | | | (_| |
  \____/ \___|_|_|\__, |\_____\___/|_|  \__,_|
                   __/ |                      
                  |___/                       
`
}

