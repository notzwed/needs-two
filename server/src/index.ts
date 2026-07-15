import { createNeedsTwoServer } from "./app.js";

const port = Number(process.env.PORT ?? 3001);
const server = createNeedsTwoServer({
  port,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
});

server.listen().then((actualPort) => {
  console.log(`Needs Two server listening on http://localhost:${actualPort}`);
});
