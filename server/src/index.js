// Inposibal relay: a Worker routing WebSockets to two Durable Objects.
//   /ws/room/:CODE[?create=1]  a 2-player room that relays messages between host and guest
//   /ws/queue                  public matchmaking; pairs two waiters and hands both a room code

const send = (ws, o) => {
  try {
    ws.send(JSON.stringify(o));
  } catch (e) {}
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.headers.get("Upgrade") !== "websocket")
      return new Response("inposibal relay", { status: 200 });
    let m = url.pathname.match(/^\/ws\/room\/([A-Z0-9]{4,6})$/);
    if (m) {
      const stub = env.ROOM.get(env.ROOM.idFromName(m[1]));
      return stub.fetch(req);
    }
    if (url.pathname === "/ws/queue") {
      const stub = env.QUEUE.get(env.QUEUE.idFromName("main"));
      return stub.fetch(req);
    }
    return new Response("not found", { status: 404 });
  },
};

export class Room {
  constructor() {
    this.host = null;
    this.guest = null;
    this.created = false;
  }
  async fetch(req) {
    const create = new URL(req.url).searchParams.get("create") === "1";
    const pair = new WebSocketPair();
    const [client, ws] = Object.values(pair);
    ws.accept();
    const occupied = this.host || this.guest;
    if (create) {
      if (occupied) {
        send(ws, { t: "error", msg: "taken" });
        ws.close();
        return new Response(null, { status: 101, webSocket: client });
      }
      this.created = true;
    } else if (!this.created && !occupied) {
      send(ws, { t: "error", msg: "notfound" });
      ws.close();
      return new Response(null, { status: 101, webSocket: client });
    }
    let role;
    if (!this.host) {
      role = "host";
      this.host = ws;
    } else if (!this.guest) {
      role = "guest";
      this.guest = ws;
    } else {
      send(ws, { t: "error", msg: "full" });
      ws.close();
      return new Response(null, { status: 101, webSocket: client });
    }
    send(ws, { t: "role", role });
    const other = () => (role === "host" ? this.guest : this.host);
    if (role === "guest") {
      send(this.host, { t: "peer" });
      send(ws, { t: "peer" });
    }
    if (role === "host" && this.guest) send(ws, { t: "peer" });
    ws.addEventListener("message", (e) => {
      if (typeof e.data !== "string" || e.data.length > 20000) return;
      const o = other();
      if (o) o.send(e.data);
    });
    const gone = () => {
      if (role === "host" && this.host === ws) this.host = null;
      if (role === "guest" && this.guest === ws) this.guest = null;
      const o = other();
      if (o) send(o, { t: "left" });
      if (!this.host && !this.guest) this.created = false;
    };
    ws.addEventListener("close", gone);
    ws.addEventListener("error", gone);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export class Queue {
  constructor() {
    this.waiting = null;
  }
  async fetch() {
    const pair = new WebSocketPair();
    const [client, ws] = Object.values(pair);
    ws.accept();
    const w = this.waiting;
    if (w && w.ws.readyState === 1) {
      this.waiting = null;
      const code = Array.from(
        { length: 5 },
        () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)],
      ).join("");
      // the first waiter hosts (creates the room); the second joins it
      send(w.ws, { t: "match", code, create: true });
      send(ws, { t: "match", code, create: false });
      w.ws.close();
      ws.close();
    } else {
      this.waiting = { ws };
      send(ws, { t: "waiting" });
      const drop = () => {
        if (this.waiting && this.waiting.ws === ws) this.waiting = null;
      };
      ws.addEventListener("close", drop);
      ws.addEventListener("error", drop);
      ws.addEventListener("message", (e) => {
        if (e.data === "cancel") {
          drop();
          ws.close();
        }
      });
    }
    return new Response(null, { status: 101, webSocket: client });
  }
}
