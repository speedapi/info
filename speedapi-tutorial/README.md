This is a tutorial on how to write an SpeedAPI-based API client for an imaginary article publishing service with **TypeScript**. Hopefully by the end of it you're going to be able to apply certain key concepts to your actual service.
> All `npm` commands in this tutorial are going to be invoked with `pnpm` - a drop-in replacement that doesn't waste disk space. I recommend that you use it too, but you don't have to.

## Step 1. Creating a project and downloading the necessary tools
```console
$ pip3 install -U susc
$ mkdir speedapi-tutorial
$ cd speedapi-tutorial
$ pnpm init -y
$ pnpm i @speedapi/driver @speedapi/node
$ pnpm i -D typescript
$ mkdir src
$ touch src/index.ts
$ touch src/api.sus
$ git init
$ echo "node_modules" > .gitignore
$ echo "*.sus.ts" >> .gitignore
```
You can also install the **SusLang** extension for VSCode for syntax highlighting.

## Step 2. Setting end goals
First of all, let's set some goals for our service:
  - Users should be able to **create accounts and log in**
  - **No access tokens** are going to be involved for simplicity sake
  - Users should be able to **publish articles**
  - Users should be able to **like and comment on each others' articles, as well as like those comments**

Simple, right?

## Step 3. Writing SUS
SUS is a special language that lets you describe your API: what methods there are, what objects can the server and the client send to each other, and so on.
> A special common language is desired when your frontends and the backend are written in different languages, which they probably are.

### Standard library
Include it with:
```sus
# <-- by the way, comments start with a hash
include impostor.sus
```

### Account creation
The "create account" operation should take three parameters (email, username and password) and return either nothing or an error. This operation is not exactly attached to anything, and in SUS it is best described with something called a **global method**. Take a look:
```sus
globalmethod sign_up(0) {
    email: Str;
    username: Str;
    password: Str;
}
```
Whoa, hold on! What does that `0` there mean? It's the **method value** - a special number that distinguishes this method from others. Why can't SpeedAPI use its name? Because it's a protocol that's aimed at maximum encoding efficiency - it's cheaper to send one number over the wire than a string. This number can range between `0` and `127`, thus giving you a maximum of `128` global methods. You can't have two methods with matching names, and you can't have ones with matching values either.

We're not quite pushing SpeedAPI to its limits yet. Let's say that you want to make sure that whatever your clients send you in the `email` field is an email address before you even try to send the confirmation email or whatever - quite a sensible requirement. You can use **validators** to perform this task. Take a look:
```sus
globalmethod sign_up(0) {
    email: Str[match: /[^ @]@[^ @]/]; # please don't use this regex in production
    username: Str[match: /\w*/, len: 3..32];
    password: Str[len: 6..64];
}
```
`match: /[^ @]@[^ @]/` in square brackets is a validator, and so is `len: 3..32`. Every type has its own set of validators. `Str` has two: `match` that takes a **regular expression** (three flags are supported: `i`, `m` and `s`) and `len` that takes a **range** (can be written in one of two ways: `start..end`, both ends inclusive, and `start+` that goes up to infinity).

We said that `sign_up` may also return an error if something goes wrong. How do we describe that?
```sus
enum(2) ErrorCode {
    email_in_use(0),
    username_taken(1)
}

globalmethod sign_up(0) {
    email: Str[match: /[^ @]@[^ @]/];
    username: Str[match: /\w*/, len: 3..32];
    password: Str[len: 6..64];

    errors { email_in_use, username_taken }
}
```
That `ErrorCode` **enum** describes all possible errors that all of the methods may return. That `2` means that the members are encoded using a 2-byte (16-bit) number, giving you a maximum of `65536` members. Each member also has a **value** associated with it - just like in the case of methods, it's used to identify them when sent over the wire. The `errors` declaration describes which of the errors this specific method may return. **Note**: the server also sends a human-readable error message along with this machine-readable code. What exactly is sent in that message is entirely up to you and is specified by the server code. **Note**: If any of the validations fail, the server-side SpeedAPI library will automatically return a `validation_failed` error before any data even reaches your code.

### Logging in
Great! Now that the user has an account, they can log in. Just kidding! They can't, because we haven't yet written a method for that.
```sus
enum(2) ErrorCode {
    email_in_use(0),
    username_taken(1),
    invalid_email(2),
    invalid_password(3)
}

globalmethod log_in(1) {
    email: Str[match: /[^ @]@[^ @]/];
    password: Str[len: 6..64];

    returns {
        username: Str[match: /\w*/, len: 3..32];
    }

    ratelimit 5 every 60s;
    errors { invalid_email, invalid_password }
}
```
Now we have. Two new directives: `returns`, which specifies the return fields and `ratelimit` which specifies the rate limit. The time interval can be anything - from `[number]ms` to `[number]y`: `ms`, `s`, `m`, `h`, `d`, `mo`, `y`.

Let's sprinkle in some docstrings! They're not comments: comments are completely ignored, whereas docstrings are emitted in the output, and are especially useful in combination with the `html` output module. **They** _support_ **_markdown_**!
```
include impostor.sus

enum(2) ErrorCode {
    @> Email supplied to `sign_up()` is already in use <@
    email_in_use(0),
    @> Username supplied to `sign_up()` has already been taken <@
    username_taken(1),
    @> Email supplied to `log_in()` is not associated with an account <@
    invalid_email(2),
    @> Password supplied to `log_in()` is invalid <@
    invalid_password(3)
}

@> Creates a user account <@
globalmethod sign_up(0) {
    @> User's email address <@
    email: Str[match: /[^ @]@[^ @]/]; # please don't use this regex in production
    @> Desired username <@
    username: Str[match: /\w*/, len: 3..32];
    @> Desired password <@
    password: Str[len: 6..64];

    errors { email_in_use, username_taken }
}

@> Logs in to an account for the rest of this session <@
globalmethod log_in(1) {
    @> User's email <@
    email: Str[match: /[^ @]@[^ @]/];
    @> User's password <@
    password: Str[len: 6..64];

    returns {
        @> Username associated with that email <@
        username: Str[match: /\w*/, len: 3..32];
    }

    ratelimit 3 every 60s;
    errors { invalid_email, invalid_password }
}
```

### Generating docs
Our API is quite far from done, but let's just see how the built-in doc generator works. Run this command:
```console
$ susc -l html src/api.sus
```
This command should create an `api_output` folder right next to the original file with an `html` directory inside it. Open `index.html` in a browser!

![](images/1.png)

There's somehow 11 whole members in the `ErrorCode` enum, even though we only defined 4. What? Let's look inside the standard library that we included (`impostor.sus`)
```sus
@> Represents operation error codes <@
enum(2) ErrorCode {
    @> Field value validation failed <@
    validation_failed(65534),
    @> Rate limit got exceeded <@
    rate_limit(65533),
    @> Confirmation check failed <@
    confirmation_failed(65532),
    @> EntityGet failed (invalid ID) <@
    invalid_id(65531),
    @> EntityGet failed (failed to apply modifiers) <@
    invalid_get_modifier(65530),
    @> EntityUpdate failed <@
    invalid_entity(65529)
}
```
Even though this `ErrorCode` enum has been defined two times in two separate files, susc combined these definitions into one enum! In other words,
```sus
enum(1) Name {
    member_one(0)
}
enum(1) Name {
    member_two(1)
}
```
...is equivalent to the following:
```sus
enum(1) Name {
    member_one(0),
    member_two(1)
}
```
...even if the definition is split across multiple files, as long as these files are `include`d.

Lastly, you may have noticed these messages from the compiler:

![](images/3.png)

We don't yet have a logo for our service, nor do we have a name. I'm going to name it "High", because I'm not good at coming up with sensible names, and this imaginary project is kind of similar to Medium. Let's put `set html_topbar_title HighAPI` at the top of our file and run that command again:

![](images/4.png)

Excellent!

### Articles
We could just use a massive amount of global methods, but we will employ a much more powerful mechanism: **entities**. An entity is like a class in OOP languages: it has a set of fields, static and dynamic methods, and is thus best suited for logical objects in your API. We're going to have three entities: `User`, `Article` and `Comment`. Let's start with the second one:
```
entity Article(1) {
    id: Int(8);
    title: Str[len: 5..80];
    contents: opt(0) Str;
}
```
  - Every entity must have a numeric type ID for the same reason as with global methods, though in this case it can only range from `0` to `63`.
  - Every entity must have an `id` field of any type. The value of this field distinguishes particular instances of this entity, and the server must ensure that there's only 0 or 1 entity instances with a given **id**.
  - The `Int(8)` type represents an 8-byte (64-bit) nonnegative (0 or more) integer. Notice that the `8` is inside parentheses instead of square brackets because it's an **argument** to this type, not a validator. `Str`s do not require any arguments, and it's okay to omit the parentheses in that case. `Int`s can be validated too, by testing whether or not the value is in a range like this: `Int(1)[val: 30..40]`.
  - This `opt(0)` means that the field is **optional**. Why would such an important field be optional? Because we may get an article in two different contexts: first, in response to a "I know the id, give me the article" request, and second, in response to a "give me the list of all articles that user [id] has published". It's more efficient to skip sending the contents in the latter case because we don't need them anyway. SpeedAPI uses the number `0` to distinguish this particular optional field from other ones. It can range from `0` to `127`, giving you a maximum of `128` optional fields per entity type. The number of normal (required) fields is unlimited. **Note**: Method parameters/return values can be marked as optional as well.
  - Notice that we don't restrict `contents` by length simply because the `Str` type itself limits the length: it can't exceed 65536 bytes because of the way data is encoded. **Note**: Bytes does not equal characters! A Latin character may only take up one byte; Cyrillic ones usually take up two; Chinese and Japanese symbols tend to span 3-4 bytes; and emojis can take up significantly more space - from 3-4 bytes for simple ones to something like 🤦🏼‍♂️ that [actually spans 5 codepoints and takes up 17 whole bytes](https://hsivonen.fi/string-length/)! Don't worry: 64 KB is plenty of data - this tutorial up to this point (excluding the images) is around 11.5 KB. **Note**: The `Str[len]` validator validates length based on the number of Unicode codepoints, not the number of bytes. That emoji from before is thus going to be counted as 5 characters by `Str[len]`.

### Publishing articles
We're going to create a **static method** in the `Article` entity. It's called a _static_ method because it's not attached to a particular instance of an entity, but it is attached to the entity type. _Global_ methods like the ones we created earlier are attached to neither.
```sus
entity Article(1) {
    id: Int(8);
    title: Str[len: 5..140];
    contents: opt(0) Str;

    staticmethod create(0) {
        title: Str[len: 5..140];
        contents: Str;

        returns {
            id: Int(8);
        }

        ratelimit 1 every 1m;
    }
}
```
Value `127` is reserved for the "get entity by ID" operation, thus you can have up to `127` static methods per entity.

### Liking articles
We're going to add a like counter and a method to like an article. Because this `like` method is attached to a particular article, we're going to make it a **dynamic method**
```sus
entity Article(1) {
    # ...
    likes: Int(3); # allows us to count up to ~16.7M likes
    # ...
    method like(0) {
        ratelimit 2 every 10s; # this rate limit applies to calls to `Article.like()` across all `Article` instances
    }
}
```
You can have up to `127` dynamic methods per entity as value `127` is reserved for the "update entity value" operation. Notice that `create(0)` and `like(0)` are not in conflict because one is static and the other one is not.

### User entities
Now that we know what entities are, we can create a `User` entity and update our `log_in` method so that it returns a reference to the user account that your backend has hopefully created when we called `sign_up`
```sus
entity User(0) {
    id: Int(8);
    name: Str[match: /\w*/, len: 3..32];
    avatar: Str[match: /https?:\/\/.*\.(webp|png|jpe?g)/, len: 0..128];

    method report(0) {
        reason: Str[len: 10+];
        ratelimit 1 every 1m;
    }

    method get_articles(1) {
        returns {
            articles: List(Int(8), 1);
        }
        ratelimit 1 every 1s;
    }
}

globalmethod log_in(1) {
    # ... 
    returns {
        @> User account associated with that email <@
        user: Int(8);
    }
    # ...
}
```
New type! `List` takes two arguments: the type of the elements and the header length. It's set to `1` byte or 8 bits, so this list can't have more than `255` elements. `List`s can be validated by their length, e.g. `List(Int(1), 1)[len: 10..20]`. Values inside the list can be validated too! `List(Int(1)[val: 30..40], 1)[len: 10..20]` is a valid expression.

### Comments
No new concepts here, we're just defining two `Article` methods and the `Comment` entity.
```sus
entity Article(1) {
    # ...
    method get_comments(1) {
        returns {
            comments: List(Int(8), 2);
        }
        ratelimit 1 every 1s;
    }

    method post_comment(2) {
        text: Str[len: 1..280];
        ratelimit 2 every 10s;
    }
}

entity Comment(2) {
    id: Int(8);
    author: Int(8);
    text: Str[len: 1..280];

    method like(0) {
        ratelimit 2 every 10s;
    }
}
```

### Done!
Woohoo! We've successfully written our first SUS file. Now run
```console
$ susc -l html src/api.sus
```
again and browse the final docs.

![](images/5.png)

**Note**: This `ArticleFieldSelect` bitfield was generated automatically. It's not generated by newer versions of SUSC and I'm too lazy to update this screenshot :)

We have learned about almost anything there is to SpeedAPI. The two things that we haven't talked about yet are **bitfields** and **confirmations**, the latter being an extremely powerful mechanism that we're going to explore later.

## Developing the client
Run the compiler:
```
$ susc -l ts src/api.sus
```
and put this in `src/index.ts`:
```ts
// import the libraries
import * as speedapi from "@speedapi/driver";
import { TlsClient } from "@speedapi/node";
// load our protocol definition
import * as api from "./api_output/ts/index";

// create the session
const session = api.$bind(new TlsClient(api.$specSpace, {
    host: "my.awesomeservice.com",
    port: 1234
}));
```
If everything is working properly, IntelliSense should suggest all the things we've defined when you type `session.`:

![](images/6.png)

Try this:
```ts
await session.logIn({
    email: "test@email.com",
    password: 123
});
```
Because we defined `password` to be a string and because TypeScript is awesome, the code above does not compile:

![](images/7.png)

If we correct the password to be a string, say `"123456"`, the error disappears.

**Note**: Only the type is validated at compile time. Validators in square brackets run at run time. Even though we've specified a regex for our `email` field, TypeScript won't complain if we assign `"not.an.email"` to it.

Static methods do not need an entity instance and are called like this:
```ts
const contents = `
# Welcome!
This is my first article on this service. Hope you're having a **wonderful** time!
`;
const { id } = await session.Article.create({
    title: "My First Article On High",
    contents: contents
});
```

Dynamic methods, however, do, and they're called like this:
```ts
const article = await session.Article.$get(id); // `$get` is a standard wrapper for `get`
await article.postComment({
    text: "I spent a lot of time working on this article! Please like if you choose to"
});
```

## Developing the server
The server-side API is inspired by the way GenServers work in Erlang and Elixir. The library keeps track of all clients and session states and calls your handler whenever some event happens. Servers are created like this:
```ts
import * as speedapi from "@speedapi/driver";
import { TlsListener } from "@speedapi/node";
import * as api from "./api_output/ts/index";
import * as fs from "fs";

// Create a TLS listener (acceptor)
const listener = new TlsListener(api.$specSpace, {
    port: 1234,
    cert: fs.readFileSync(__dirname + "/certs/server.cert"), // read certs
    key: fs.readFileSync(__dirname + "/certs/server.key")
}, async (client) => {
    console.log("client connected");
    // `listener` is an instance if `TlsListener` that listens to incoming connections on a port and creates a `TlsServer` instance for each of them.
    // Thus, `client` here is an instance of `TlsServer`.
    
    // Servers store an arbitrary value called the state; it gets passed to your event handlers. They can, in turn, modify it.
    // We'll use an object to store the ID of the user
    type State = { userId?: bigint };
    const session = new speedapi.Server(client, { userId: null } as State);
    const boundApi = api.$bind(client); // use this instead of `api` to access the things you've defined

    // sign_up() handler
    session.onInvocation("sign_up", async (method, _state) => {
        // TypeScript rocks!!!
        const params = method.params; // { email: string, username: string, password: string }

        // Find email/username duplicates
        if(emailInUse(params.email)) { // we don't care how this function's defined at the moment
            await method.error(boundApi.ErrorCode.email_in_use, "email already in use");
            return;
        } else if(nameInUse(params.username)) {
            await method.error(boundApi.ErrorCode.username_taken, "username already taken");
            return;
        }

        createUser(params);
        await method.return({ }); // This method has no return values, but we still have to call .return, otherwise the client will timeout waiting for the response.

        // We don't return anything here, so the state won't be modified.
        // However, a `return { userId: 123n };` here will update the state.
    });
});
```

# Other features
...that weren't touched upon in the High example

## Pushing entities to the client
Being a full-duplex protocol, SpeedAPI allows the server to send data to the client without a prior request.
```ts
// Here we're assuming that `client` is an instance of Session on the server side, like TlsServer or DummyServer, and that `boundApi` is the result of calling `api.$bind(client)`
await client.pushEntity(new boundApi.User({
    id: 123,
    name: "Imaginary Name"
}) as speedapi.ValuedEntity);
```
To handle entity updates on the client side, we need to add an event handler
```ts
// Here we're assuming that `client` is an instance of Session on the _client_ side, like TlsClient or DummyClient, and that `session` is the result of calling `api.$bind(client)`
client.subscribe((event) => {
    if(event.type !== "entity_update") return;
    const entity = event.entity;
    // At this point we know that an entity has been sent to us, but we don't know which one.
    // We can use TypeScript's `instanceof` to refine the type
    if(entity instanceof session.User) {
        // `entity` is now fully covered by TS
        console.log(`The server has just pushed a User with ID ${entity.id} to us. Full value: ${entity.value}`);
        // Note that `entity.property` is just an alias of `entity.value.property`
    }
});
```
Client-side update events can be abstracted away by the `Cache` class. Read on.

## Confirmations
`Confirmation`s are a way to request data from the client in the context of a method invocation by that client. In other words, it's a way to call methods on the client while that client is calling some method on the server. Take a look:
```sus
include impostor.sus

globalmethod echo(0) {
    str: Str;
    returns { str: Str; }
    confirmations { Captcha }
}

confirmation Captcha(0) {
    # here we're essentially defining a method on the client
    # but one that can only be invoked in the context of a client-to-server call
    request { url: Str; }
    response { code: Str; }
}
```
Let's write a method handler that uses this confirmation
```ts
// Server side
session.onInvocation("echo", async (method, _state) => {
    // Here we're demonstrating that confirmations don't have to be always invoked
    const suspicious = runBotDetection();
    if(suspicious) {
        const { url, code } = generateCaptcha();
        const { code: response } = await method.confirm(new boundApi.Captcha(), { url });
        if(response !== code) {
            await method.error(boundApi.ErrorCode.validation_failed, "Invalid captcha");
            return;
        }
    }
    // The client isn't suspicious or it has passed the captcha
    await method.return(method.params);
});

// Client side
const { str } = await session.echo({ str: "Hello, World!" }, async (conf) => {
    // At this point `conf` is any `speedapi.Confirmation`, let's narrow it down
    if(conf instanceof session.Captcha) {
        console.log(`Got captcha with url ${conf.request.url}`);
        return { code: "5p33dAp1" }; // our response
    }
});
```

## Rapid testing
You don't have to set up a server/client pair that communicates over some legitimate protocol like TCP. Instead, you can use the `createDummyPair` function that creates a server and a client that exchange data by passing `Buffer`s to each other. It's aimed primarily towards testing.

```ts
import * as speedapi from "@speedapi/driver";
import { createDummyPair } from "@speedapi/driver/transport/universal";
import * as api from "./api_output/ts/index";

const { client, server } = createDummyPair(api.$specSpace);

async function server() {
    const session = new speedapi.Server(server, null);
    const boundApi = api.$bind(server);
    // ...
}

async function client() {
    const session = api.$bind(client);
    // ...
}

void server();
await client();
```

## Compounds
Compounds combine several fields together. They can be used like any other type, but unlike other data structures they can be used outside of an API setting, i.e. they allow you to use the same efficient serialization techniques that form the core of SpeedAPI, but without wrapping it into methods, entities and other things. This method of using SpeedAPI can be thought of as a replacement for standalone JSON, BSON, MessagePack and other similar things.
```sus
compound Color {
    r: Int(1);
    g: Int(1);
    b: Int(1);
}
compound Style {
    background: Color;
    border: Color;
}
compound Config {
    style: Style;
    random_string_cuz_why_not: Str;
    other_random_string: opt(0) Str; # optional fields are still supported
}
```
Using this over JSON has advantages as well as disadvantages:
  - This encoding is mega-super-duper efficient. With the strings set to `"foo"` and `"bar"` and irregardless of the other values, the whole `Config` compound will take **18** bytes, compared to an equivalent minified JSON (`{"style":{"background":{"r":123,"g":123,"b":123},"border":{"r":123,"g":123,"b":123}},"random_string_cuz_why_not":"foo","other_random_string":"bar"}`) which takes **147** whole bytes, which is **8 times** larger.
  - Data is automatically validated without any external tools.
  - A schema _is_ required, unlike with JSON.
  - The serialized data doesn't make sense to humans, although this issue is shared by BSON and similar techniques.

You can use it like this:
```ts
import { Serializer } from "@speedapi/driver";
import { ConfigSpec } from "./config.sus";
const serializer = new Serializer(ConfigSpec);

let config = {
    style: {
        background: { r: 123, g: 12, b: 3 },
        border: { r: 14, g: 213, b: 186 }
    },
    random_string_cuz_why_not: "foo",
    other_random_string: "bar"
};

const binary = await serializer.serialize(config);
config = await serializer.deserialize(binary);
```

## Partial list updates
TODO

## Cache
TODO
