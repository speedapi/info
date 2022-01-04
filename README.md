# Asynchronous Method and Object Governed Upstream Service (AMOGUS)
AMOGUS is a protocol framework designed to be used in high-throughput real-time APIs.
  - **End-to-end API development.** AMOGUS is an integrated tool for API development, not just a standalone data representation format like JSON or MessagePack.
  - **Transaction-based bidirectional data transfer.** Once a connection is established, both the client and the server can send data to each other at any time. Client-to-server requests are encapsulated in something called a transaction, a concept that makes it easy to manage multiple concurrent requests that may require some data later on - like if you have an endpoint that only requires a CAPTCHA only some of the time.
  - **Smaller data representation.** REST uses JSON to represent structured data, which takes up significantly more space compared to AMOGUS.
  - **Little to no need for validation.** Because JSON is very dynamic, the peer is able to send anything, including maliciously or accidentally malformed data that may pass the decoding stage but still compromise the system if no validation is implemented or if it's insufficient. By contrast, you have to define every data structure in AMOGUS. Malformed data will simply fail to decode.

Of course, it's not without its disadvantages:
  - **Binary data representation.** You can't easily make sense of the data like you can with JSON or HTTP just by taking a glance at it.
  - **Static schema.** You have to define every data structure on all communicating sides. Failure to properly do so will lead to decoding errors.

# Parts
AMOGUS consists of four closely linked parts:
  - **Wire protocol.** Think of it as the main specification behind all this. It dictates how basic data types and structures that build upon them are encoded, decoded and validated.
  - **Script for Ubiquitous Structures (SUS).** The description language so that you don't have to define the structures in all languages you're going to be using. The compiler can theoretically output to many if not all mainstream languages, but only TypeScript is implemented for now. Feel free to send a PR to [this repo](https://github.com/amogus-api/susc) with an output module for your favorite language!
  - **Wire protocol implementations.** A library for each of the supported languages that can, using output from the compiler, perform actual communication.
  - **Implied Minimal Protocol Object, Structure and Thing Omission Resolution (IMPOSTOR).** Basically just a fancy name for the SUS standard library that defines some basic common things. Not required but highly recommended. Use it by writing `include impostor.sus`

# Typical workflow
  - **Write SUS.** Define all methods, entities and other things.
  - **Compile SUS.** Use the `set output <language list>` directive in your source code or pass `-l` to the compiler to specify the list of output languages.
  ```
  $ susc MAIN_FILE
  ```
  - **Copy output files to your project directory(-ies).**
  - **Use APIs provided by AMOGUS.** The data structures that contain type annotations if your language supports them are included in the output. The output module may ask you to install a supporting library and provide instructions on how to do so.

# Examples
  - https://github.com/yamka-app/sus