import * as speedapi from "@speedapi/driver";
import { TlsListener } from "@speedapi/node";
import * as api from "./api_output/ts/index";
import * as fs from "fs";

const userDb: {
    [id: string]: {
        id: bigint;
        email: string;
        name: string;
        password: string; // don't store passwords in plain text in production
    }
} = {};

// create a TLS listener (acceptor)
new TlsListener(api.$specSpace, {
    port: 1234,
    cert: fs.readFileSync(__dirname + "/certs/server.cert"),
    key: fs.readFileSync(__dirname + "/certs/server.key"),
    rejectUnauthorized: false
}, async (client) => {
    console.log("⚡ client connected");
    // the second argument is the initial state
    // it will be passed down to the method handlers, they can also modify it
    type State = { userId?: bigint };
    const session = new speedapi.Server(client, { userId: null } as State);
    const boundApi = api.$bind(client);

    // sign_up() handler
    session.onInvocation("sign_up", async (method, _state) => {
        const params = method.params;
        console.log(`🆕 sign_up: email: "${params.email}", name: "${params.username}", password: "${params.password}"`);

        // find email/username duplicates
        if(Object.values(userDb).some(x => x.email === params.email)) {
            await method.error(boundApi.ErrorCode.email_in_use, "email already in use");
            return;
        } else if(Object.values(userDb).some(x => x.name === params.username)) {
            await method.error(boundApi.ErrorCode.username_taken, "username already taken");
            return;
        }

        // create the user
        const id = BigInt(Math.floor(Math.random() * 100000)); // don't do this in production
        userDb[String(id)] = { id, email: params.email, name: params.username, password: params.password };
        console.log(`👤 created user with id ${id}`);
        await method.return({ });
    });

    // log_in() handler
    session.onInvocation("log_in", async (method, _state) => {
        const params = method.params;
        console.log(`➡️ log_in: email: "${params.email}", password: "${params.password}"`);

        // find the user
        const user = Object.values(userDb).find(x => x.email === params.email);
        if(!user) {
            await method.error(boundApi.ErrorCode.invalid_email, "unknown email");
            return;
        }
        if(user.password !== params.password) {
            await method.error(boundApi.ErrorCode.invalid_password, "invalid password");
            return;
        }

        // logged in!
        await method.return({ user: user.id });
        return { userId: user.id }; // here we're modifying the state
    });

    session.onInvocation("User.get", async (method, state) => {
        const params = method.params;
        console.log(`⬇️ user_get: user: ${params.id}`);

        // find the user
        const user = userDb[String(params.id)];
        if(!user) {
            await method.error(boundApi.ErrorCode.invalid_id, "unknown entity");
            return;
        }

        // return the user
        await method.return({ entity: new boundApi.User(user) as speedapi.ValuedEntity });

        // push a fake update after one second (showcase!)
        setTimeout(async () => {
            await client.pushEntity(new boundApi.User({
                id: state.userId,
                name: "SpeedAPI"
            }) as speedapi.ValuedEntity);
        }, 1000);
    });

    session.onClose((state) => {
        console.log(`❌ client (id ${state.userId}) disconnected`);
    });
});

console.log("\n🎉 Listening on port 1234");
