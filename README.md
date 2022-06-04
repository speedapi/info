<img align="right" width="128" src="logos/logo_color.png">

![License](https://img.shields.io/github/license/speedapi/susc)
![Schema not included](https://img.shields.io/badge/schema-not%20included-red)
![PRs and issues](https://img.shields.io/badge/PRs%20and%20issues-welcome-brightgreen)

# What is SpeedAPI?
This is a protocol toolkit designed to be used in high-throughput realtime APIs.
  - **End-to-end API development.** SpeedAPI is an integrated tool for API development, not just a standalone data representation format like JSON or MessagePack. It can be used as such too!
  - **Transaction-based bidirectional data transfer.** Once a connection is established, both the client and the server can send data to each other at any time. Client-to-server requests are encapsulated in concurrent transactions that may also require some data later on - like if you have an endpoint that only requires a CAPTCHA only some of the time.
  - **Smaller data representation.** REST uses JSON to represent structured data, which takes up significantly more space compared to SpeedAPI.

Some features are double-edged:
  - **Static schemas** guarantee type safety **but** don't let you exchange structured data.
  - **Binary data representation** is extremely fast and takes almost no space on the wire **but** requires specialized tools to decode and inspect. As of now, this tool is only planned.

# Parts
SpeedAPI consists of four closely linked parts:
  - **Wire protocol.** Think of it as the main specification behind all this. It dictates how basic data types and structures that build upon them are encoded, decoded and validated.
  - **Script for Ubiquitous Structures (SUS).** The description language so that you don't have to define the structures in all languages you're going to be using. The compiler can theoretically output to all mainstream languages, but only TypeScript is implemented for now. Feel free to send a PR to [this repo](https://github.com/speedapi/susc) with an output module for your favorite language!
  - **Wire protocol implementations.** A library for each of the supported languages that can, using output from the compiler, perform actual communication.
  - **Implied Minimal Protocol Object, Structure and Thing Omission Resolution (IMPOSTOR).** Basically just a fancy name for the SUS standard library that defines some basic common things. Not required but highly recommended. Use it by writing `include impostor`

All official repositories are hosted under [this](https://github.com/speedapi) organization.

# Examples
  - https://github.com/speedapi/info/tree/master/speedapi-tutorial
  - https://github.com/portasynthinca3/blaze
