import { TlsClient } from "@speedapi/node";
import * as api from "./api_output/ts/index";

const session = api.$bind(new TlsClient(api.$specSpace, {
    host: "localhost",
    port: 1234,
    rejectUnauthorized: false
}));

async function main() {
    session.$session.subscribe((event) => {
        if(event.type !== "entity_update")
            return;
        const entity = event.entity;

        if(entity instanceof session.User)
            console.log("🆕 User update from the server!", entity.value);
    });

    await session.signUp({
        email: "speedapi@example.org",
        username: "speedapi",
        password: "123456"
    });
    console.log("✅ signed up");
    
    const { user: id } = await session.logIn({
        email: "speedapi@example.org",
        password: "123456"
    });
    console.log(`✅ logged in with ID ${id}`);
    
    const user = await session.User.$get(id);
    console.log(`✅ our name is "${user.name}" and email is "${user.email}"`);
}

main().catch(({ code, message }) => {
    const codeName = session.ErrorCode[code];
    console.error(`❌ error ${codeName} (${code}): ${message}`);
});
