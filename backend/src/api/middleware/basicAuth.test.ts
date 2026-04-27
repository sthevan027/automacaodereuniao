import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { basicAuth } from "./basicAuth";

describe("basicAuth middleware", () => {
  it("retorna 401 sem Authorization", async () => {
    const app = express();
    app.get("/protected", basicAuth({ user: "u", pass: "p" }), (_req, res) =>
      res.json({ ok: true })
    );

    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("retorna 200 com credenciais corretas", async () => {
    const app = express();
    app.get("/protected", basicAuth({ user: "u", pass: "p" }), (_req, res) =>
      res.json({ ok: true })
    );

    const token = Buffer.from("u:p", "utf8").toString("base64");
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Basic ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

