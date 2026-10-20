<div align="center">

# CricScore

**Real-time cricket scoring platform for local tournaments**

Ball-by-ball scoring, live scorecards, points tables with NRR — built for grassroots cricket.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4ea94b?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

</div>

---

## What it does

- **Scorer console** (mobile-first) — big-tap ball pad (0/1/2/3/4/6, wide, no-ball, bye, leg-bye), full wicket flows with fielder credits, batsman/bowler pickers that enforce the laws (no consecutive overs, over limits, dismissed players can't return), free-hit tracking, and **exact undo** of any ball.
- **Live viewer** — real-time score header with this-over strip, CRR/RRR and projected score, full scorecards, fall of wickets, Manhattan chart, ball-by-ball commentary, all pushed over WebSocket.
- **Tournaments** — fixtures, results, and a points table with net run rate (standard all-out adjustment).

## The scoring engine

The heart of the platform is a pure, **event-sourced scoring engine**
(`server/engine/scoringEngine.js`). Every figure — score, batsman and
bowler stats, run rates, fall of wickets, partnerships — is *derived* by
folding the ball-by-ball event log, never stored as a mutable counter.
The scorecard cannot drift from the log, and undo/edit is simply a
re-fold. It implements real cricket law:

- legal-ball counting for wides and no-balls (a no-ball counts as a ball faced, a wide doesn't)
- free hits after no-balls (bowled/caught/lbw etc. rejected on a free hit)
- bowler wicket credit done properly (run outs excluded), maidens, economy and strike rates on fractional overs
- retired hurt (not a wicket, may return), bowler max-overs and consecutive-over rules
- innings completion by wickets, overs, or a chased target; match results with margins

Covered by 20 unit tests: `cd server && npm test`.

## Architecture

```
server/   Express 5 + Mongoose + Socket.io API
  engine/     pure scoring engine (no I/O, fully tested)
  services/   scoring service: event log -> derived snapshot -> sockets
  models/     BallEvents (the log), Innings (snapshot), Match, Teams, Players
user/     React 19 + Vite + Tailwind 4 — viewer AND scorer console in one app
docs/     the code reviews that drove the rebuild
```

**Security:** scoring endpoints require a logged-in scorer, and only the
scorer who created a match can score it. JWTs are signed with an
env-provided secret with expiry; the session cookie is httpOnly.

## Run it

```bash
# API
cd server
cp .env.example .env   # set JWT_SECRET and MONGODB_URI
npm install
npm start              # http://localhost:5000

# Web app
cd user
cp .env.example .env   # VITE_API_URL if the API isn't on localhost:5000
npm install
npm run dev            # http://localhost:5173
```

You need a running MongoDB (local or Atlas). Create a scorer account from
the app's login page, set up a tournament, teams and a match, then score
it live from `/score`.

---

*Originally built as a BSc CSIT major project at Shreeyantra College
(Tribhuvan University) and used in local tournaments. This repository is
the modernized rebuild.*
