<img align="right" width="128" src="logos/logo_color.png">

![License](https://img.shields.io/github/license/speedapi/susc)
![Schema not included](https://img.shields.io/badge/schema-not%20included-red)
![PRs and issues](https://img.shields.io/badge/PRs%20and%20issues-welcome-brightgreen)

# What is SpeedAPI?
This is a protocol toolkit designed to be used in high-throughput realtime APIs.
  - **End-to-end API development.** SpeedAPI is an integrated tool for API development, not just a standalone data representation format like JSON or MessagePack. It can be used as one too!
  - **Transaction-based bidirectional data transfer.** Once a connection is established, both the client and the server can send data to each other at any time. Client-to-server requests are encapsulated in concurrent transactions that may also require some data later on - like if you have an endpoint that requires a CAPTCHA only some of the time.
  - **Smaller data representation.** REST uses JSON to represent structured data, which takes up significantly more space compared to SpeedAPI.

Some features are double-edged:
  - **Static schemas** guarantee type safety **but** don't let you exchange unstructured data.
  - **Binary data representation** takes almost no time and space **but** requires a specialized tool to decode and inspect. As of now, this tool is only planned.

# Parts
SpeedAPI consists of five closely linked parts:
  - **Wire protocol.** The main specification behind all this. It dictates how basic data types and structures that build upon them are encoded, decoded and validated. You can read the [specification](WIRE_SPEC.md)
  - **Script for Ubiquitous Structures (SUS).** The description language so that you don't have to define the structures in all languages you're going to be using. The compiler can theoretically output to all mainstream languages, but only TypeScript is implemented for now. Feel free to send a PR to [this repo](https://github.com/speedapi/susc) with an output module for your favorite language!
  - **The SUS Compiler** that converts SUS definitions to your target programming languages.
  - **Wire protocol implementations.** A library for each of the supported languages that can, using output from the compiler, perform actual communication.
  - **The standard library** that defines some basic common things. Not required but highly recommended. Use it by writing `include impostor`

All official repositories are hosted under [this](https://github.com/speedapi) organization.

# Basic usage
### Install the compiler
```
$ pip3 install susc
```

### Create a TypeScript project
```
$ mkdir speedapi-test
$ cd speedapi-test
$ npm init -y
$ npm i @speedapi/driver
$ npm i -D typescript ts-node @types/node
```

### Write a simple API description
`api.sus`:
```sus
globalmethod say_hi(0) {
    name: Str;
    returns {
        greeting: Str;
    }
}
```

### Compile the API
```
$ susc -l ts api.sus
```

### Test your API
`index.ts`:
```typescript
import { Server } from "@speedapi/driver";
import { createDummyPair } from "@speedapi/driver/transport/universal";
import * as api from "./api_output/ts/index";

const { client, server } = createDummyPair(api.$specSpace);
const clientSession = api.$bind(client);
const serverHandler = new Server(server, {});

serverHandler.onInvocation("say_hi", async (method, _) => {
    await method.return({
        greeting: `Hello, ${method.params.name}!`
    });
});

// you can simply use await in non-top-level contexts :)
clientSession.sayHi({ name: "reader" }).then(({ greeting }) =>
    console.log(greeting));
```

```
$ npx ts-node index.ts
```

### Want to learn more?
Check out the first example below:

# Examples
  - https://github.com/speedapi/info/tree/master/speedapi-tutorial
  - https://github.com/portasynthinca3/blaze
