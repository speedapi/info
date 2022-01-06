This is a tutorial on how to write an AMOGUS-based API client for an imaginary article publishing service with **Typescript** and **Webpack**. Hopefully by the end of it you're going to be able to apply certain key concepts to your actual service.
> All `npm` commands in this tutorial are going to be invoked with `pnpm` - a drop-in replacement that doesn't waste disk space. I recommend that you use it too, but you don't have to.

## Step 1. Creating a project and downloading the necessary tools
```console
$ pip3 install -U susc
$ mkdir amogus-tutorial
$ cd amogus-tutorial
$ pnpm init -y
$ pnpm i amogus-driver
$ pnpm i -D webpack webpack-cli sus-loader
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
Whoa, hold on! What does that `0` there mean? It's the **method value** - a special number that distinguishes this method from others. Why can't AMOGUS use its name? Because it's a protocol that's aimed at maximum encoding efficiency - it's cheaper to send one number over the wire than a string. This number can range between `0` and `127`, thus giving you a maximum of `128` global methods. You can't have two methods with matching names, and you can't have ones with matching values either.

We're not quite pushing AMOGUS to its limits yet. Let's say that you want to make sure that whatever your clients send you in the `email` field is an email address before you even try to send the confirmation email or whatever - quite a sensible requirement. You can use **validators** to perform this task. Take a look:
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
That `ErrorCode` **enum** describes all possible errors that all of the methods may return. That `2` means that the members are encoded using a 2-byte (16-bit) number, giving you a maximum of `65536` members. Each member also has a **value** associated with it - just like in the case of methods, it's used to identify them when sent over the wire. The `errors` declaration describes which of the errors this specific method may return. **Note**: the server also sends a human-readable error message along with this machine-readable code. What exactly is sent in that message is entirely up to you and is specified by the server code. **Note**: If any of the validations fail, the servers-side AMOGUS library will automatically return a `validation_failed` error before any data even reaches your code.

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

How do you prevent someone from logging in twice? How do you make sure that once a user has logged in, they can't log in a second time? Or that they can't create another account while they're logged in? States! Take a look:
```
enum(1) State {
    awaiting_login(0)
}
set default_state awaiting_login

globalmethod sign_up(0) {
    # ... all the stuff we've already written
    states { awaiting_login }
}

globalmethod log_in(1) {
    # ... all the stuff we've already written
    states { awaiting_login }
}
```
This `states` directive tells us that this method can only be called while the session is in the `awaiting_login` state. There's a second state defined by `impostor.sus`: `normal`. Your server code will have to switch the state from `awaiting_login` to `normal` once authentication succeeds. The `set default_state` directive tells us to start in the `awaiting_login` state - without that it'd start in `normal`.

Let's sprinkle in some docstrings! They're different from comments: comments are completely ignored, whereas docstrings are emitted in the output, and are especially useful in combination with the `html` output module. **They** _support_ **_markdown_**!
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

enum(1) State {
    @> The client is yet to log in <@
    awaiting_login(0)
}
set default_state awaiting_login

@> Creates a user account <@
globalmethod sign_up(0) {
    @> User's email address <@
    email: Str[match: /[^ @]@[^ @]/]; # please don't use this regex in production
    @> Desired username <@
    username: Str[match: /\w*/, len: 3..32];
    @> Desired password <@
    password: Str[len: 6..64];

    states { awaiting_login }
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
    states { awaiting_login }
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

This is `State`:

![](images/2.png)

Here's our `awaiting_login`. Where is that `normal` coming from though? Let's look inside the standard library that we included (`impostor.sus`)
```sus
@> Represents connection states <@
enum(1) State {
    normal(255)
}
```
Even though this `State` enum has been defined two times in two separate files, susc combined these definitions into one enum! In other words,
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

There's also somehow 11 whole members in the `ErrorCode` enum, even though we only defined 4 - the mechanism is the same.

Lastly, you may have noticed these messages from the compiler:

![](images/3.png)

We don't yet have a logo for our service, nor do we have a name. I'm going to name it "High", because (as you could probably already tell) i'm not good at coming up with sensible names, and this imaginary project is not at all similar in concept to Medium. Let's put `set html_topbar_title High API` at the top of our file and run that command again:

![](images/4.png)

Excellent!
