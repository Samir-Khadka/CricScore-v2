<div align="center">

# CricScore
*Cricket Scorer and Live Update System for Local Tournaments*

![GitHub last commit](https://img.shields.io/github/last-commit/Samir-Khadka/CricScore-v2)
![GitHub language count](https://img.shields.io/github/languages/count/Samir-Khadka/CricScore-v2)
![GitHub top language](https://img.shields.io/github/languages/top/Samir-Khadka/CricScore-v2)

*Built with these tools and technologies.*

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black&style=for-the-badge) 
![Express Js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=fff&style=flat)
![Node JS](https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=Socket.io&logoColor=white&style=flat-square)  


![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white&style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC?logo=tailwind-css&logoColor=white&style=for-the-badge) 
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b?style=for-the-badge&logo=mongodb&logoColor=white) 
![Mongoose](https://img.shields.io/badge/Mongoose-%23CC2041?logo=mongoose&logoColor=white&style=for-the-badge) 
![npm](https://img.shields.io/badge/npm-%23CB3837?logo=npm&logoColor=white&style=for-the-badge)
![Vite](https://img.shields.io/badge/vite-%23646CFF?logo=vite&logoColor=white&style=for-the-badge) 

</div>

---
# Introduction

CricScore is a final year project developed for local cricket tournaments, aiming to replace traditional paper-based scoring systems with a modern, efficient digital solution. The platform enables real-time score tracking, reduces scorer workload, and increases engagement among fans, players, and organizers.
This system addresses the gap in affordable, accessible cricket scoring tools specifically designed for grassroots-level tournaments.

# Features

- Real-time scoring
- Ball-by-ball data storage and retrieval
- WebSocket-based real-time data broadcasting
- Secure user authentication and authorization
- Cross-platform web accessibility

# Installation

### Clone Repository

```
git clone https://github.com/Samir-Khadka/CricScore-v2.git
cd CricScore-v2
```

### Scorer Frontend Setup

```
cd client
npm install
```

### User Frontend Setup

```
cd user
npm install
```

### Backend Setup

```
cd server
npm install
```
---

# About Us

<div align="center">

## Shreeyantra College

*Damak, Jhapa, Koshi, Nepal*

*Affiliated to Tribhuvan University, Institute of Science and Technology*

</div>

### Members:

- Binayak Niraula 
- Sagar Bhandari 
- Samir Khadka 

*BSc.CSIT, Seventh Semester, 2082 BS (2025 AD)*

*Academic Year: 2078 BS (2021/22 AD)*

---

# 2026 Modernization

The platform was rebuilt around an **event-sourced scoring engine**:

- **`server/engine/scoringEngine.js`** — a pure, unit-tested engine that derives
  every figure (score, batsman/bowler stats, CRR/RRR, fall of wickets,
  Manhattan data, partnerships) by folding the ball-by-ball event log.
  The scorecard can never drift from the log, and **undo/edit of any ball
  is exact** (re-fold). It enforces real cricket law: legal-ball counting
  for wides/no-balls, free hits, bowler over limits and consecutive-over
  bans, maidens, retired hurt, correct bowler wicket credit (run outs
  excluded), and fractional-over run-rate maths.
  Tests: `cd server && npm test` (59 cases — scoring engine, legacy
  payload translation, and the API auth/ownership contract; CI runs
  the suite plus the frontend lint/build on every push).
- **Secured scoring API** — ball-by-ball routes now require a logged-in
  scorer, and only the scorer who created a match can score it. The
  same ownership rule covers every organizer write (matches,
  tournaments, teams, squads): ids travel in the URL, updates pass a
  per-resource field allowlist, and non-owners get 403. JWT
  secret/expiry and all config come from the environment
  (see `server/.env.example`); the auth cookie is httpOnly.
- **One modern frontend** — the `user/` app (React 19 + Vite + Tailwind 4)
  now contains both the live viewer (scorecard, fall of wickets, Manhattan
  chart, ball-by-ball commentary, points table with NRR) and a mobile-first
  **scorer console** at `/score/:matchId` (big tap targets, extras/wicket
  flows, batsman/bowler pickers, undo). Set `VITE_API_URL` (see
  `user/.env.example`).
- **`client/` is legacy** — the original Create-React-App scorer is kept
  for reference only and is no longer the supported frontend. The new API
  remains backward-compatible with its payload format.
- Public viewer endpoints: `GET /api/cricscore/view/matches`,
  `/view/matches/:id`, `/view/tournaments/:id/points-table`.
