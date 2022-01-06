import { TlsClient } from "amogus-driver/lib/transport/node";
import * as api from "./api.sus";

const session = api.bind(new TlsClient(api.specSpace, {
    host: "my.awesomeservice.com",
    port: 1234
}));

await session.logIn({
    email: "test@email.com",
    password: "123456"
});

const id = (await session.Article.create({
    "title": "My First Article On High",
    "contents": `
# Welcome!
This is my first article on this service. Hope you're having a **wonderful** time!`
})).id;

const article = await session.Article.get(id);
await article.postComment({
    "text": "I spent a lot of time working on this article! Please like if you can"
});